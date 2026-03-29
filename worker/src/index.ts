import Anthropic from '@anthropic-ai/sdk';
import { VOICE_EXTRACTION_TOOL, LAB_EXTRACTION_TOOL } from './schema';
import { handleAuth } from './auth';
import { handleSync } from './sync';
import { handleDemoChat, handleDemoSummary, DEMO_RATE_LIMIT } from './demo';

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  LOGS: KVNamespace;
  CREDENTIALS: KVNamespace;
  JWT_SECRET: string;
}

// CORS headers for preflight and responses
function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allowedOrigins = allowedOrigin.split(',');
  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Log transcript + extraction to KV with 30-day TTL
async function logExtraction(
  kv: KVNamespace,
  endpoint: string,
  input: string,
  output: unknown,
  durationMs: number,
) {
  const id = `${endpoint}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  await kv.put(
    id,
    JSON.stringify({
      endpoint,
      input: input.slice(0, 2000), // cap input size
      output,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    }),
    { expirationTtl: 30 * 24 * 60 * 60 }, // 30 days
  );
}

// Parse voice transcript → structured health data
async function parseVoice(
  client: Anthropic,
  transcript: string,
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [VOICE_EXTRACTION_TOOL],
    tool_choice: { type: 'tool', name: 'extract_health_data' },
    messages: [
      {
        role: 'user',
        content: `Extract health data from this spoken transcript. The person is describing their health profile for a coverage score assessment.

CRITICAL RULES:
- Only extract values that are EXPLICITLY and CLEARLY stated as health information.
- Do NOT infer health data from ambiguous context. If something could be a health value OR something else, do NOT extract it.
- "30 seconds" is NOT age 30. "5 minutes" is NOT height 5 feet. Numbers must be clearly about health.
- Explicit negations count: "no medications" → has_medications=false, "no labs" → has_labs=false.
- If the transcript is not about health at all (e.g., casual conversation, technical discussion), return empty/null for all fields.
- When in doubt, leave a field null rather than guessing.

Transcript: "${transcript}"`,
      },
    ],
  });

  // Extract the tool use result
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'extract_health_data') {
      return block.input as Record<string, unknown>;
    }
  }

  return {};
}

// Parse lab report text → structured biomarkers
async function parseLab(
  client: Anthropic,
  text: string,
  formatHint?: string,
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools: [LAB_EXTRACTION_TOOL],
    tool_choice: { type: 'tool', name: 'extract_lab_results' },
    messages: [
      {
        role: 'user',
        content: `Extract all biomarker values from this lab report text. The text was extracted from a PDF and may have formatting artifacts.${formatHint ? ` This appears to be from ${formatHint}.` : ''}

Lab report text:
${text}`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'extract_lab_results') {
      return block.input as Record<string, unknown>;
    }
  }

  return {};
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check — allow GET
    if (request.method === 'GET' && (path === '/' || path === '/health')) {
      return Response.json({ status: 'ok', endpoints: ['/parse-voice', '/parse-lab', '/auth/*', '/sync/*', '/track', '/demo-chat'] }, { headers });
    }

    // Analytics tracking — fire-and-forget, never errors
    // Placed before origin validation so sendBeacon with text/plain works without CORS preflight
    if (request.method === 'POST' && (path === '/t' || path === '/track')) {
      try {
        const text = await request.text();
        const payload = JSON.parse(text);
        const event = payload.event || 'unknown';
        const id = `track/${event}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const country = request.headers.get('cf-ipcountry') || '';
        const ua = request.headers.get('user-agent') || '';
        await env.LOGS.put(id, JSON.stringify({ ...payload, country, ip_country: country, ua }), {
          expirationTtl: 90 * 24 * 60 * 60, // 90 days
        });
      } catch { /* swallow all errors */ }
      return new Response('ok', { status: 200, headers: { ...headers, 'Content-Type': 'text/plain' } });
    }

    // Auth routes — handled separately (no Anthropic client needed)
    if (path.startsWith('/auth/')) {
      const response = await handleAuth(request, env, path);
      // Add CORS headers to auth responses
      const authHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) {
        authHeaders.set(k, v as string);
      }
      return new Response(response.body, { status: response.status, headers: authHeaders });
    }

    // Sync routes — JWT-protected encrypted profile storage
    if (path.startsWith('/sync/')) {
      const response = await handleSync(request, env, path);
      const syncHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) {
        syncHeaders.set(k, v as string);
      }
      return new Response(response.body, { status: response.status, headers: syncHeaders });
    }

    // Demo chat — public, rate-limited
    if (request.method === 'POST' && path === '/demo-chat') {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const response = await handleDemoChat(client, request, env.LOGS, ip);
      const demoHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) {
        demoHeaders.set(k, v as string);
      }
      return new Response(response.body, { status: response.status, headers: demoHeaders });
    }

    // Demo summary — extracts structured context from demo conversation
    if (request.method === 'POST' && path === '/demo-summary') {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const response = await handleDemoSummary(client, request);
      const sumHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) {
        sumHeaders.set(k, v as string);
      }
      return new Response(response.body, { status: response.status, headers: sumHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    // Validate origin (skip for localhost dev)
    if (
      !origin.startsWith('http://localhost:') &&
      !origin.startsWith('http://127.0.0.1:') &&
      !env.ALLOWED_ORIGIN.split(',').includes(origin)
    ) {
      return new Response('Forbidden', { status: 403, headers });
    }

    // Lazy Anthropic client — only created for /parse-* routes
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      if (path === '/parse-voice') {
        const body = (await request.json()) as { transcript: string };
        if (!body.transcript?.trim()) {
          return Response.json({ error: 'transcript required' }, { status: 400, headers });
        }

        const start = Date.now();
        const extracted = await parseVoice(client, body.transcript);
        const duration = Date.now() - start;

        // Log for quality monitoring
        await logExtraction(env.LOGS, 'parse-voice', body.transcript, extracted, duration);

        return Response.json({ extracted, duration_ms: duration }, { headers });
      }

      if (path === '/parse-lab') {
        const body = (await request.json()) as { text: string; format_hint?: string };
        if (!body.text?.trim()) {
          return Response.json({ error: 'text required' }, { status: 400, headers });
        }

        const start = Date.now();
        const extracted = await parseLab(client, body.text, body.format_hint);
        const duration = Date.now() - start;

        await logExtraction(env.LOGS, 'parse-lab', body.text, extracted, duration);

        return Response.json({ extracted, duration_ms: duration }, { headers });
      }

      return Response.json({ error: 'not found' }, { status: 404, headers });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Worker error:', message);
      return Response.json({ error: 'internal error' }, { status: 500, headers });
    }
  },
};
