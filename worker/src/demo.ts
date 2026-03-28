import Anthropic from '@anthropic-ai/sdk';

// Rate limit: max requests per IP per hour
export const DEMO_RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 3600;
const MAX_MESSAGES = 12; // max conversation turns
const MAX_TOKENS = 512; // per response

const SYSTEM_PROMPT = `You are Milo, an AI health coach built by Baseline. This is a demo conversation on the landing page. Your job is to give the visitor a real taste of what coaching with you feels like.

How to behave:
- Be warm, direct, and curious. Not clinical. Not salesy.
- Ask about what matters to them: sleep, energy, weight, stress, labs, whatever comes up.
- When they share something, connect it to the bigger picture. Show them you think in systems, not isolated metrics. For example: poor sleep affects recovery, which affects training, which affects body comp. That kind of thinking.
- Use real numbers and specifics when you can. "Most adults get 50-70% less protein than optimal" is better than "protein is important."
- Keep responses short. 2-3 sentences usually. This is a chat, not an essay.
- After 3-4 exchanges, naturally mention that signing up gets them a coach that actually tracks their data and follows up daily. Don't force it. Just weave it in when it fits.

What NOT to do:
- Don't store or ask for PII (full name, email, phone, address, SSN, etc.)
- Don't diagnose conditions or prescribe medications
- Don't pretend you have access to their health data. You don't. This is a demo.
- If someone shares sensitive health concerns, acknowledge them warmly but note that a private coaching session (after signup) is the right place for that conversation.
- Don't be preachy or lecture. Coach, don't teach.

Your personality: You're the coach who actually reads the labs, notices the patterns, and tells it to you straight. Think "smart friend who happens to know exercise science and nutrition" not "AI assistant."`;

export async function handleDemoChat(
  client: Anthropic,
  request: Request,
  logs: KVNamespace,
  ip: string,
): Promise<Response> {
  // Rate limit check
  const rateKey = `demo-rate/${ip}/${Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000))}`;
  const currentCount = parseInt((await logs.get(rateKey)) || '0');
  if (currentCount >= DEMO_RATE_LIMIT) {
    return Response.json(
      { error: 'Rate limit exceeded. Try again in a bit.' },
      { status: 429 },
    );
  }

  // Increment rate counter
  await logs.put(rateKey, String(currentCount + 1), {
    expirationTtl: RATE_WINDOW_SECONDS,
  });

  // Parse request
  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }

  // Cap conversation length
  const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: String(m.content).slice(0, 1000), // cap per-message length
  }));

  try {
    const start = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    });

    const duration = Date.now() - start;
    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Log for monitoring (no PII, just message count + duration)
    const logId = `demo/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await logs.put(
      logId,
      JSON.stringify({
        ip_hash: await hashIP(ip),
        message_count: messages.length,
        duration_ms: duration,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
        timestamp: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 },
    );

    return Response.json({ reply: text, duration_ms: duration });
  } catch (err) {
    console.error('Demo chat error:', err);
    return Response.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 },
    );
  }
}

const SUMMARY_PROMPT = `Extract structured coaching context from this demo conversation. Return ONLY valid JSON, no markdown, no explanation.

Format:
{
  "domains": ["sleep", "labs", "nutrition", etc - health domains they mentioned or care about],
  "goals": ["lose weight", "sleep better", etc - what they want to achieve],
  "context": ["trains 3x/week", "has recent labs", etc - relevant facts they shared],
  "primary_concern": "one sentence summary of their main focus"
}

If the conversation is too short or off-topic, return: {"domains":[],"goals":[],"context":[],"primary_concern":""}`;

export async function handleDemoSummary(
  client: Anthropic,
  request: Request,
): Promise<Response> {
  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length < 2) {
    return Response.json({ summary: { domains: [], goals: [], context: [], primary_concern: '' } });
  }

  // Build transcript for extraction
  const transcript = body.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        { role: 'user', content: `${SUMMARY_PROMPT}\n\nConversation:\n${transcript}` },
      ],
    });

    let text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    // Strip markdown code fences if present
    text = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    const summary = JSON.parse(text);
    return Response.json({ summary });
  } catch (err) {
    console.error('Summary extraction error:', err);
    return Response.json({ summary: { domains: [], goals: [], context: [], primary_concern: '' } });
  }
}

// Hash IP for logging without storing raw IPs
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'baseline-demo-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
