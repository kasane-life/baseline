// sync.test.ts — Tests for sync endpoints using miniflare KV
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createJWT } from './jwt';
import { handleSync } from './sync';

const SECRET = 'test-secret-for-vitest';

async function authedRequest(method: string, path: string, body?: unknown): Promise<Request> {
  const token = await createJWT('user-abc', SECRET);
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(`https://example.com${path}`, init);
}

function unauthRequest(method: string, path: string): Request {
  return new Request(`https://example.com${path}`, { method });
}

// Helper to make authed request for a different user
async function authedRequestAs(userId: string, method: string, path: string, body?: unknown): Promise<Request> {
  const token = await createJWT(userId, SECRET);
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(`https://example.com${path}`, init);
}

describe('sync endpoints', () => {
  beforeEach(async () => {
    // Clear KV between tests
    const keys = await env.CREDENTIALS.list();
    for (const key of keys.keys) {
      await env.CREDENTIALS.delete(key.name);
    }
  });

  it('GET /sync/profile/meta returns empty when no profile exists', async () => {
    const req = await authedRequest('GET', '/sync/profile/meta');
    const res = await handleSync(req, env as any, '/sync/profile/meta');
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.empty).toBe(true);
  });

  it('GET /sync/profile returns empty when no profile exists', async () => {
    const req = await authedRequest('GET', '/sync/profile');
    const res = await handleSync(req, env as any, '/sync/profile');
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.empty).toBe(true);
  });

  it('PUT then GET round-trip', async () => {
    const putReq = await authedRequest('PUT', '/sync/profile', {
      encrypted: 'cipher-blob-abc123',
      updated_at: '2026-03-01T12:00:00Z',
    });
    const putRes = await handleSync(putReq, env as any, '/sync/profile');
    expect(putRes.status).toBe(200);
    expect(((await putRes.json()) as any).ok).toBe(true);

    const getReq = await authedRequest('GET', '/sync/profile');
    const getRes = await handleSync(getReq, env as any, '/sync/profile');
    const data = await getRes.json() as any;
    expect(data.encrypted).toBe('cipher-blob-abc123');
    expect(data.updated_at).toBe('2026-03-01T12:00:00Z');
  });

  it('GET /sync/profile/meta returns only timestamp after PUT', async () => {
    const putReq = await authedRequest('PUT', '/sync/profile', {
      encrypted: 'some-data',
      updated_at: '2026-03-01T15:00:00Z',
    });
    await handleSync(putReq, env as any, '/sync/profile');

    const metaReq = await authedRequest('GET', '/sync/profile/meta');
    const metaRes = await handleSync(metaReq, env as any, '/sync/profile/meta');
    const data = await metaRes.json() as any;
    expect(data.updated_at).toBe('2026-03-01T15:00:00Z');
    expect(data.encrypted).toBeUndefined();
    expect(data.empty).toBeUndefined();
  });

  it('returns 401 on unauthenticated request', async () => {
    const req = unauthRequest('GET', '/sync/profile');
    const res = await handleSync(req, env as any, '/sync/profile');
    expect(res.status).toBe(401);
  });

  it('returns 400 on PUT with missing fields', async () => {
    const req = await authedRequest('PUT', '/sync/profile', { encrypted: 'data' });
    const res = await handleSync(req, env as any, '/sync/profile');
    expect(res.status).toBe(400);
  });

  it('returns 413 on oversized payload', async () => {
    const req = await authedRequest('PUT', '/sync/profile', {
      encrypted: 'x'.repeat(1_100_000),
      updated_at: '2026-03-01T12:00:00Z',
    });
    const res = await handleSync(req, env as any, '/sync/profile');
    expect(res.status).toBe(413);
  });

  it('isolates data between users', async () => {
    // User A writes
    const putA = await authedRequestAs('user-a', 'PUT', '/sync/profile', {
      encrypted: 'user-a-data',
      updated_at: '2026-03-01T12:00:00Z',
    });
    await handleSync(putA, env as any, '/sync/profile');

    // User B writes
    const putB = await authedRequestAs('user-b', 'PUT', '/sync/profile', {
      encrypted: 'user-b-data',
      updated_at: '2026-03-01T13:00:00Z',
    });
    await handleSync(putB, env as any, '/sync/profile');

    // User A reads — should see only their data
    const getA = await authedRequestAs('user-a', 'GET', '/sync/profile');
    const dataA = await (await handleSync(getA, env as any, '/sync/profile')).json() as any;
    expect(dataA.encrypted).toBe('user-a-data');

    // User B reads — should see only their data
    const getB = await authedRequestAs('user-b', 'GET', '/sync/profile');
    const dataB = await (await handleSync(getB, env as any, '/sync/profile')).json() as any;
    expect(dataB.encrypted).toBe('user-b-data');
  });
});
