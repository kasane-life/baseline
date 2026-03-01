// sync.test.js — Tests for encrypted profile sync
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// AES-256-GCM encryption (inline — module-private in sync.js)
// ---------------------------------------------------------------------------

const IV_LENGTH = 12;

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function generateKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bytesToBase64(combined);
}

async function decrypt(base64, key) {
  const combined = base64ToBytes(base64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ---------------------------------------------------------------------------
// Encryption round-trip tests
// ---------------------------------------------------------------------------

describe('AES-256-GCM encryption', () => {
  it('encrypts and decrypts a simple string', async () => {
    const key = await generateKey();
    const plaintext = 'hello world';
    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts large JSON', async () => {
    const key = await generateKey();
    const data = { profile: { age: 35, labs: Array(100).fill({ marker: 'HDL', value: 55 }) } };
    const plaintext = JSON.stringify(data);
    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);
    expect(JSON.parse(decrypted)).toEqual(data);
  });

  it('produces unique ciphertexts (random IV)', async () => {
    const key = await generateKey();
    const plaintext = 'same input';
    const a = await encrypt(plaintext, key);
    const b = await encrypt(plaintext, key);
    expect(a).not.toBe(b);
    // Both decrypt to same value
    expect(await decrypt(a, key)).toBe(plaintext);
    expect(await decrypt(b, key)).toBe(plaintext);
  });

  it('rejects decryption with wrong key', async () => {
    const key1 = await generateKey();
    const key2 = await generateKey();
    const encrypted = await encrypt('secret', key1);
    await expect(decrypt(encrypted, key2)).rejects.toThrow();
  });

  it('rejects tampered ciphertext', async () => {
    const key = await generateKey();
    const encrypted = await encrypt('secret', key);
    const bytes = base64ToBytes(encrypted);
    // Flip a byte in the ciphertext area (after IV)
    bytes[IV_LENGTH + 1] ^= 0xff;
    const tampered = bytesToBase64(bytes);
    await expect(decrypt(tampered, key)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Key management tests (via sync.js exports)
// ---------------------------------------------------------------------------

describe('key management', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; },
    });
  });

  it('getOrCreateEncryptionKey generates and persists a key', async () => {
    // Dynamic import so stubs are in place
    vi.resetModules();
    const { getOrCreateEncryptionKey, hasEncryptionKey } = await import('./sync.js');

    expect(hasEncryptionKey()).toBe(false);
    const key = await getOrCreateEncryptionKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(hasEncryptionKey()).toBe(true);
  });

  it('exportEncryptionKeyBase64 returns stored base64', async () => {
    vi.resetModules();
    const { getOrCreateEncryptionKey, exportEncryptionKeyBase64 } = await import('./sync.js');

    await getOrCreateEncryptionKey();
    const exported = exportEncryptionKeyBase64();
    expect(typeof exported).toBe('string');
    // Should be valid base64 decoding to 32 bytes
    const raw = base64ToBytes(exported);
    expect(raw.length).toBe(32);
  });

  it('importEncryptionKey sets key and invalidates cache', async () => {
    vi.resetModules();
    const { getOrCreateEncryptionKey, importEncryptionKey, exportEncryptionKeyBase64 } = await import('./sync.js');

    // Generate initial key
    await getOrCreateEncryptionKey();
    const original = exportEncryptionKeyBase64();

    // Generate a different key, export its base64
    const newKey = await generateKey();
    const newRaw = await crypto.subtle.exportKey('raw', newKey);
    const newBase64 = bytesToBase64(new Uint8Array(newRaw));

    await importEncryptionKey(newBase64);
    expect(exportEncryptionKeyBase64()).toBe(newBase64);
    expect(exportEncryptionKeyBase64()).not.toBe(original);
  });

  it('hasEncryptionKey returns false before and true after key creation', async () => {
    vi.resetModules();
    const { getOrCreateEncryptionKey, hasEncryptionKey } = await import('./sync.js');

    expect(hasEncryptionKey()).toBe(false);
    await getOrCreateEncryptionKey();
    expect(hasEncryptionKey()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sync logic tests
// ---------------------------------------------------------------------------

describe('syncOnLogin', () => {
  let storage;
  let mockFetch;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; },
    });

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    vi.stubGlobal('window', { location: { reload: vi.fn() } });
  });

  it('returns noop when not authenticated', async () => {
    vi.resetModules();
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => false,
      getAuthToken: () => null,
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn(),
      importAll: vi.fn(),
    }));

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('noop');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('pushes when remote is empty', async () => {
    vi.resetModules();
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => true,
      getAuthToken: () => 'fake-jwt',
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn().mockResolvedValue({ profile: { meta: {} } }),
      importAll: vi.fn(),
    }));

    // Set encryption key so it doesn't skip to "first device" path
    storage['baseline_encryption_key'] = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ empty: true }) })  // meta
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });     // push

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('pushed');
  });

  it('pushes when local is newer', async () => {
    vi.resetModules();
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => true,
      getAuthToken: () => 'fake-jwt',
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn().mockResolvedValue({
        profile: { meta: { updated_at: '2026-03-01T12:00:00Z' } },
      }),
      importAll: vi.fn(),
    }));

    storage['baseline_encryption_key'] = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated_at: '2026-02-28T12:00:00Z' }),
      })  // meta — remote older
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });  // push

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('pushed');
  });

  it('returns noop when timestamps match', async () => {
    vi.resetModules();
    const ts = '2026-03-01T12:00:00Z';
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => true,
      getAuthToken: () => 'fake-jwt',
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn().mockResolvedValue({
        profile: { meta: { updated_at: ts } },
      }),
      importAll: vi.fn(),
    }));

    storage['baseline_encryption_key'] = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ updated_at: ts }),
    });

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('noop');
  });

  it('returns noop gracefully on network error', async () => {
    vi.resetModules();
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => true,
      getAuthToken: () => 'fake-jwt',
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn().mockResolvedValue({ profile: { meta: {} } }),
      importAll: vi.fn(),
    }));

    storage['baseline_encryption_key'] = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('noop');
  });

  it('pushes on first device (no encryption key)', async () => {
    vi.resetModules();
    vi.doMock('./identity.js', () => ({
      isAuthenticated: () => true,
      getAuthToken: () => 'fake-jwt',
    }));
    vi.doMock('../db.js', () => ({
      exportAll: vi.fn().mockResolvedValue({ profile: { meta: {} } }),
      importAll: vi.fn(),
    }));

    // No encryption key in storage = first device
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const { syncOnLogin } = await import('./sync.js');
    const result = await syncOnLogin();
    expect(result).toBe('pushed');
  });
});
