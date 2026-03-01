// auth.ts — WebAuthn registration/login endpoints with KV credential storage

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { createJWT } from './jwt';

interface Env {
  CREDENTIALS: KVNamespace;
  JWT_SECRET: string;
}

interface StoredCredential {
  id: string;               // base64url credential ID
  publicKey: string;         // base64url public key
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}

interface UserRecord {
  id: string;
  credentials: StoredCredential[];
  created_at: string;
}

interface ChallengeRecord {
  challenge: string;
  userId?: string;
  type: 'registration' | 'authentication';
}

// Rate limiting: 10 attempts per IP per minute
async function checkRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= 10) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 60 });
  return true;
}

function getRpID(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  try {
    return new URL(origin).hostname;
  } catch {
    return 'localhost';
  }
}

function getOrigin(request: Request): string {
  return request.headers.get('Origin') || '';
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function handleAuth(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (!(await checkRateLimit(env.CREDENTIALS, ip))) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again in a minute.' }, 429);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    switch (path) {
      case '/auth/register/begin':
        return await registerBegin(request, env);
      case '/auth/register/complete':
        return await registerComplete(request, env);
      case '/auth/login/begin':
        return await loginBegin(request, env);
      case '/auth/login/complete':
        return await loginComplete(request, env);
      default:
        return jsonResponse({ error: 'Not found' }, 404);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Auth error:', message);
    return jsonResponse({ error: 'Internal auth error' }, 500);
  }
}

// ── POST /auth/register/begin ──
async function registerBegin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { userId?: string };
  const userId = body.userId || crypto.randomUUID();

  const rpID = getRpID(request);

  // Load existing user to get excludeCredentials
  const existingUser = await env.CREDENTIALS.get(`user:${userId}`, 'json') as UserRecord | null;
  const excludeCredentials = (existingUser?.credentials || []).map((c) => ({
    id: c.id,
    transports: c.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName: 'Baseline',
    rpID,
    userName: userId,
    userID: new Uint8Array(new TextEncoder().encode(userId).buffer) as Uint8Array<ArrayBuffer>,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials,
  });

  // Store challenge in KV with 5-min TTL
  const challengeId = crypto.randomUUID();
  const challengeRecord: ChallengeRecord = {
    challenge: options.challenge,
    userId,
    type: 'registration',
  };
  await env.CREDENTIALS.put(
    `challenge:${challengeId}`,
    JSON.stringify(challengeRecord),
    { expirationTtl: 300 },
  );

  return jsonResponse({ options, challengeId, userId });
}

// ── POST /auth/register/complete ──
async function registerComplete(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    challengeId: string;
    credential: RegistrationResponseJSON;
  };

  // Retrieve and delete challenge (one-time use)
  const challengeKey = `challenge:${body.challengeId}`;
  const challengeRecord = await env.CREDENTIALS.get(challengeKey, 'json') as ChallengeRecord | null;
  if (!challengeRecord || challengeRecord.type !== 'registration') {
    return jsonResponse({ error: 'Invalid or expired challenge' }, 400);
  }
  await env.CREDENTIALS.delete(challengeKey);

  const rpID = getRpID(request);
  const origin = getOrigin(request);

  const verification = await verifyRegistrationResponse({
    response: body.credential,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return jsonResponse({ error: 'Registration verification failed' }, 400);
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const storedCred: StoredCredential = {
    id: credential.id,
    publicKey: base64urlFromUint8Array(credential.publicKey),
    counter: credential.counter,
    transports: body.credential.response.transports as AuthenticatorTransportFuture[] | undefined,
  };

  // Load or create user record
  const userId = challengeRecord.userId!;
  let userRecord = await env.CREDENTIALS.get(`user:${userId}`, 'json') as UserRecord | null;
  if (!userRecord) {
    userRecord = { id: userId, credentials: [], created_at: new Date().toISOString() };
  }
  userRecord.credentials.push(storedCred);
  await env.CREDENTIALS.put(`user:${userId}`, JSON.stringify(userRecord));

  // Reverse lookup: credential ID → userId (for discoverable login)
  await env.CREDENTIALS.put(`cred:${credential.id}`, JSON.stringify({ userId }));

  // Issue JWT
  const token = await createJWT(userId, env.JWT_SECRET);

  return jsonResponse({
    verified: true,
    token,
    userId,
    credentialDeviceType,
    credentialBackedUp,
  });
}

// ── POST /auth/login/begin ──
async function loginBegin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { userId?: string };

  const rpID = getRpID(request);
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;

  if (body.userId) {
    const userRecord = await env.CREDENTIALS.get(`user:${body.userId}`, 'json') as UserRecord | null;
    if (!userRecord) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    allowCredentials = userRecord.credentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    }));
  }
  // If no userId, allowCredentials is undefined → discoverable credentials

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  const challengeId = crypto.randomUUID();
  const challengeRecord: ChallengeRecord = {
    challenge: options.challenge,
    userId: body.userId,
    type: 'authentication',
  };
  await env.CREDENTIALS.put(
    `challenge:${challengeId}`,
    JSON.stringify(challengeRecord),
    { expirationTtl: 300 },
  );

  return jsonResponse({ options, challengeId });
}

// ── POST /auth/login/complete ──
async function loginComplete(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    challengeId: string;
    credential: AuthenticationResponseJSON;
  };

  // Retrieve and delete challenge
  const challengeKey = `challenge:${body.challengeId}`;
  const challengeRecord = await env.CREDENTIALS.get(challengeKey, 'json') as ChallengeRecord | null;
  if (!challengeRecord || challengeRecord.type !== 'authentication') {
    return jsonResponse({ error: 'Invalid or expired challenge' }, 400);
  }
  await env.CREDENTIALS.delete(challengeKey);

  // Find the user — by challengeRecord.userId or by credential reverse lookup
  let userId = challengeRecord.userId;
  if (!userId) {
    const credLookup = await env.CREDENTIALS.get(`cred:${body.credential.id}`, 'json') as { userId: string } | null;
    if (!credLookup) {
      return jsonResponse({ error: 'Credential not recognized' }, 400);
    }
    userId = credLookup.userId;
  }

  const userRecord = await env.CREDENTIALS.get(`user:${userId}`, 'json') as UserRecord | null;
  if (!userRecord) {
    return jsonResponse({ error: 'User not found' }, 404);
  }

  const storedCred = userRecord.credentials.find((c) => c.id === body.credential.id);
  if (!storedCred) {
    return jsonResponse({ error: 'Credential not found for user' }, 400);
  }

  const rpID = getRpID(request);
  const origin = getOrigin(request);

  const verification = await verifyAuthenticationResponse({
    response: body.credential,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: storedCred.id,
      publicKey: uint8ArrayFromBase64url(storedCred.publicKey) as Uint8Array<ArrayBuffer>,
      counter: storedCred.counter,
      transports: storedCred.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    return jsonResponse({ error: 'Authentication verification failed' }, 400);
  }

  // Update counter
  storedCred.counter = verification.authenticationInfo.newCounter;
  await env.CREDENTIALS.put(`user:${userId}`, JSON.stringify(userRecord));

  const token = await createJWT(userId, env.JWT_SECRET);

  return jsonResponse({ verified: true, token, userId });
}

// ── Base64url helpers ──
function base64urlFromUint8Array(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function uint8ArrayFromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
