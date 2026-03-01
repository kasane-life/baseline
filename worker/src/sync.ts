// sync.ts — Encrypted profile sync endpoints (JWT-protected)

import { authenticateRequest } from './jwt';

interface Env {
  CREDENTIALS: KVNamespace;
  JWT_SECRET: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function handleSync(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  // All sync routes require authentication
  const userId = await authenticateRequest(request, env.JWT_SECRET);
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const kvKey = `profile:${userId}`;

  // GET /sync/profile/meta — metadata only (no blob download)
  if (request.method === 'GET' && path === '/sync/profile/meta') {
    const { value, metadata } = await env.CREDENTIALS.getWithMetadata(kvKey);
    if (!value) {
      return jsonResponse({ empty: true });
    }
    const meta = metadata as { updated_at?: string } | null;
    return jsonResponse({ updated_at: meta?.updated_at || null });
  }

  // GET /sync/profile — full encrypted blob
  if (request.method === 'GET' && path === '/sync/profile') {
    const { value, metadata } = await env.CREDENTIALS.getWithMetadata(kvKey);
    if (!value) {
      return jsonResponse({ empty: true });
    }
    const meta = metadata as { updated_at?: string } | null;
    return jsonResponse({ encrypted: value, updated_at: meta?.updated_at || null });
  }

  // PUT /sync/profile — upload encrypted blob
  if (request.method === 'PUT' && path === '/sync/profile') {
    const body = (await request.json()) as { encrypted: string; updated_at: string };

    if (!body.encrypted || !body.updated_at) {
      return jsonResponse({ error: 'encrypted and updated_at required' }, 400);
    }

    // Sanity check: reject blobs over 1MB (profiles are 2-110KB)
    if (body.encrypted.length > 1_000_000) {
      return jsonResponse({ error: 'Payload too large' }, 413);
    }

    await env.CREDENTIALS.put(kvKey, body.encrypted, {
      metadata: { updated_at: body.updated_at },
    });

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
