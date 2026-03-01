// jwt.ts — HMAC-SHA256 JWT via Web Crypto API (no npm deps)

interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createJWT(userId: string, secret: string, ttlDays = 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: userId,
    iat: now,
    exp: now + ttlDays * 24 * 60 * 60,
  };

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  return `${signingInput}.${base64urlEncode(signature)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  try {
    const key = await getSigningKey(secret);
    const signature = base64urlDecode(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(signingInput));
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64urlDecode(payloadB64))) as JWTPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  request: Request,
  jwtSecret: string,
): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = await verifyJWT(token, jwtSecret);
  return payload?.sub ?? null;
}
