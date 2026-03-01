// jwt.test.ts — Tests for HMAC-SHA256 JWT implementation
import { describe, it, expect } from 'vitest';
import { createJWT, verifyJWT, authenticateRequest } from './jwt';

const SECRET = 'test-secret-for-vitest';

describe('createJWT + verifyJWT', () => {
  it('round-trips: create then verify', async () => {
    const token = await createJWT('user-123', SECRET);
    const payload = await verifyJWT(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('user-123');
    expect(payload!.iat).toBeGreaterThan(0);
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
  });

  it('rejects token signed with wrong secret', async () => {
    const token = await createJWT('user-123', SECRET);
    const payload = await verifyJWT(token, 'wrong-secret');
    expect(payload).toBeNull();
  });

  it('rejects expired token', async () => {
    // Create token with -1 day TTL (already expired)
    const token = await createJWT('user-123', SECRET, -1);
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyJWT('not.a.jwt', SECRET)).toBeNull();
    expect(await verifyJWT('', SECRET)).toBeNull();
    expect(await verifyJWT('one-part-only', SECRET)).toBeNull();
    expect(await verifyJWT('a.b.c.d', SECRET)).toBeNull();
  });
});

describe('authenticateRequest', () => {
  it('extracts userId from valid Bearer token', async () => {
    const token = await createJWT('user-456', SECRET);
    const req = new Request('https://example.com', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = await authenticateRequest(req, SECRET);
    expect(userId).toBe('user-456');
  });

  it('returns null when Authorization header is missing', async () => {
    const req = new Request('https://example.com');
    const userId = await authenticateRequest(req, SECRET);
    expect(userId).toBeNull();
  });

  it('returns null for non-Bearer auth', async () => {
    const req = new Request('https://example.com', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    const userId = await authenticateRequest(req, SECRET);
    expect(userId).toBeNull();
  });
});
