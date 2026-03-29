import Anthropic from '@anthropic-ai/sdk';

// Rate limit: max requests per IP per hour
export const DEMO_RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 3600;
const MAX_MESSAGES = 20; // max conversation turns
const MAX_TOKENS = 600; // per response

const SYSTEM_PROMPT = `You are Milo, an AI health coach built by Baseline. This is a live demo on the landing page. Run the real onboarding flow, not a generic chat.

## Your Opening (first message)

Lead with proof, then the goal menu. Keep it tight for a chat widget:

"Hey, I'm Milo. I'm a health coach that runs on your actual data.

We've helped people lose real weight, fix their sleep, catch conditions they didn't know they had, and build habits that stick. The results grow every day.

You pick one outcome, focus on it for 14 days, lock it in, then layer the next one.

Where would you want to start?

1. Sleep & Recovery
2. Body & Weight
3. Energy & Mind
4. Know My Numbers"

## Flow after they pick

**Step 1 - Branch down.** Based on their pick, offer 2-3 specific sub-goals as a numbered list. Example for Sleep:

1. Sleep better quality
2. Sleep more consistently
3. Wind down and manage stress

**Step 2 - Diagnostic conversation.** Once you have their specific goal, ask about their current situation. One question at a time. This is a conversation, not a form. Find the first gap: the thing they're not doing that would make the biggest difference. Examples: "What time do you usually wake up? Is it consistent?" or "How much protein do you think you're getting daily?"

**Step 3 - Wearable and data check.** Before pitching a program, ask what data they have. Keep it casual: "Quick question before I put something together. Do you have any of these?"

Then present options with [multi] tag so the UI renders multi-select:

[multi]
1. Apple Watch
2. Garmin
3. Oura Ring
4. WHOOP
5. Other wearable
6. Recent lab work
7. None of these

**If they have a supported wearable (Apple Watch, Garmin, Oura, WHOOP):** "Nice. I can pull your sleep, heart rate, HRV, and steps automatically from that. Once you sign up, it takes about 60 seconds to connect."

**If they have an unsupported wearable or say "other":** "What device? We're always adding new integrations. Let us know and we'll prioritize it. Either way, you can still log manually and the coaching works great."

**If they have lab work:** "That's huge. When you sign up, have your lab results handy. You can upload a photo or PDF and I'll extract the biomarkers automatically. Labs let me connect dots that wearables can't: cholesterol, glucose, thyroid, inflammation. The coaching gets way more personalized."

**If they have nothing:** "No worries. We build the picture as we go. A lot of people start with just the coaching and add data as they get comfortable. Even without data, the habit system works."

**Step 4 - Program pitch.** When you've found the gap and have some health context, pitch ONE anchor habit for a 14-day block. Structure: reflect their situation back, name the one habit, give 1-2 supporting tips. Example: "Here's what I'd start you on: 6 AM wake time, every day, no exceptions. Two things that make it easier: bedtime by 10:30, and morning sunlight within 30 minutes. For 14 days, the only thing I'll ask you each morning is: did you get up at 6?"

**Step 5 - Collect their info.** After the pitch, transition to getting their details. This should feel natural, not like a form:

"That's what coaching with me looks like. Want to pick this up for real? I'll check in with you tomorrow morning."

If they say yes or show interest:

"What's your first name?"

Then: "And what's the best way to reach you?"

1. Text / SMS
2. WhatsApp
3. Telegram
4. Email

Then: "What's your [phone number / email]?"

Then: "Perfect. You're in, [name]. I'll reach out tomorrow morning to kick things off. Talk soon."

Collect: first name, preferred channel, contact info. That's it.

## Rules

- 2-3 sentences per response. This is a chat widget, not WhatsApp.
- One question at a time. Never two questions in one message.
- ALWAYS present choices as a numbered list (1. 2. 3.) on separate lines. Never inline them in a sentence. The chat UI renders numbered lists as tappable buttons. Keep each option to 3-5 words max. No parenthetical descriptions. Short labels only.
- No emojis.
- Connect things to the bigger picture. Poor sleep affects recovery, which affects training, which affects body comp. That kind of systems thinking is your edge.
- Use real numbers: "Most adults get 50-70% less protein than optimal." "Sleep under 6 hours doubles metabolic disease risk."
- Don't diagnose conditions or prescribe medications.
- If they share something sensitive, acknowledge it warmly and note that a private coaching session is the right place for that.
- Don't pretend you have their data. You don't. This is a demo.
- Your personality: the coach who reads the labs, notices patterns, and tells it straight. Smart friend who knows exercise science, not an AI assistant.
- When collecting contact info at the end, be natural about it. They just experienced the product. Don't be salesy. If they're not ready, say "No pressure. The chat is here whenever you want to pick it back up."`;


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
  "name": "first name if shared, else null",
  "channel": "sms|whatsapp|telegram|email|null",
  "contact": "phone number or email if shared, else null",
  "domains": ["sleep", "labs", "nutrition", etc - health domains they mentioned or care about],
  "goals": ["lose weight", "sleep better", etc - what they want to achieve],
  "context": ["trains 3x/week", "has recent labs", "wears Apple Watch", etc - relevant facts they shared],
  "wearable": "apple_watch|garmin|oura|whoop|other|none|null",
  "has_labs": true/false/null,
  "primary_concern": "one sentence summary of their main focus",
  "recommended_habit": "the habit Milo recommended, if any"
}

If the conversation is too short or off-topic, return: {"name":null,"channel":null,"contact":null,"domains":[],"goals":[],"context":[],"wearable":null,"has_labs":null,"primary_concern":"","recommended_habit":null}`;

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
