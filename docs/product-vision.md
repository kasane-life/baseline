# Product Vision — Baseline

*Last updated: 2026-03-01*

---

## What Baseline Is (One Sentence)

A health coverage score that tells you where you stand, what's missing, and what to do next — all on your device.

## The Thesis: Record + Loop

Baseline is two things reinforcing each other:

**The Record (B)** — a structured, portable, user-owned health record. Your labs, vitals, wearable data, and history normalized into a single index on your device. Plug it into any AI via MCP. Take it to any doctor. Switch platforms without losing anything. The record is the moat — once you have 6+ months of structured health data, you don't leave.

**The Loop (C)** — a post-score action sequence that keeps the record alive. Baseline tells you what to do this week: track your BP, order an ApoB test, connect your wearable. You do it, the result feeds back into the record. The record gets richer, the coaching gets more contextual, the value compounds.

**Neither works alone:**
- The Record without the Loop is a filing cabinet. Technically impressive, MCP-ready, portable — but no reason to open it on a Tuesday morning. That's the Obsidian risk: power users love it, most vaults collect dust.
- The Loop without the Record is a coaching app with no data moat. Any app can say "order your ApoB test." The structured record is what makes the coaching *yours* — "your LDL dropped 15% since you started rowing" requires the temporal data model underneath.
- Together: the record powers the loop, the loop feeds the record. You come back because Baseline tells you what to do this week. You do it, and that action makes the record more valuable. Switching costs build with every interaction.

**The Coverage Score is the onramp** — not the product. It's the moment that makes someone say "okay, this is worth saving" (→ passkey, → record begins) and "okay, I'll do that next" (→ action, → loop begins). Path A (score as a standalone product) is a feature, not a business. People don't come back quarterly for a number.

```
Visit 1:  Score is the hero        "Here's where you stand"
          ↓
          Passkey prompt            "Save this across devices"  → Record begins
          Post-score actions        "Here's what to do next"    → Loop begins
          ↓
Visit 2:  Action is the hero       "Day 4 of your BP protocol"
          Score is in the corner    Record grows silently
          ↓
Visit N:  The loop compounds        Record is rich, coaching is contextual
          Switching cost is real     6 months of structured health data
```

## The Positioning Stack

### LinkedIn Experience Blurb (Andrew's profile)

> Building the health coverage score I couldn't find anywhere else. I wanted a single, clear picture of where I stand — across labs, vitals, and wearable data — and what to actually do about it. So I built it.
>
> 20 years in fitness. Still training, still learning, now building the tool I wish I'd had for myself — and will drive better outcomes for others.

### LinkedIn Company Page (the seductive version)

> Most people either have no health data or too much of it. Baseline cuts through the noise — mapping your labs, vitals, and wearable data to the metrics that actually drive outcomes.
>
> One score tells you where you stand. A clear action plan tells you what to do next. No doctor dependency, no data overwhelm — just the highest-signal picture of your health and the confidence to act on it.

### The Taglines

- **"Average is not healthy."** — landing page, signal-level hook
- **"Build your health record once. Use it everywhere. Take it with you forever."** — product-level, the MCP/portability thesis
- **"Just a guy trying to understand his health."** — Andrew's voice, content, distribution

### Why This Positioning Works

The LinkedIn copy nails two things the one-liner and taglines don't:

1. **It names the problem from both sides** — "no health data or too much of it." Most health tech only speaks to the quantified-self crowd (too much data). Baseline's real audience includes people who have a drawer full of lab PDFs they've never looked at. The "no data" side is the bigger market.

2. **"Confidence to act"** — not "here's what to do" (that's a doctor) and not "here's your data" (that's a dashboard). Confidence is the emotional outcome. You see your score, you understand your gaps, and you feel equipped to make a decision. That's the 5,000 ft value proposition in one phrase.

---

## The User Journey Today

```
Landing page (10K ft)          App (5K ft)                        ???
─────────────────────          ──────────────────────             ─────
"Average is not healthy"  →    Phase 1: About You            →   What happens
Email capture (Formspree) →    Phase 2: Import & Enrich      →   after the
"I've done some of these" →    Phase 3: Coverage Score        →   score?
                               Next 3 moves, gap cards
```

The gap is the `???`. Right now, the experience ends at the score. The user sees their number, their tiers, their gaps — and then what? They close the tab. That's the dashboard trap.

---

## The Core Insight: The Score Page IS the Next Intake

The score isn't the end of the flow. It's the beginning of the relationship.

After you see your coverage score, you're in a different mindset than when you started. You came in curious ("what does this even measure?"). Now you're oriented ("okay, I'm at 42%, and ApoB is the biggest gap"). That orientation is the most valuable moment in the product — and right now we waste it.

**What should happen after the score:**

1. **Discovery capture** — not "what do you want to do next?" (too on the nose). Instead, offer 2-3 concrete next actions with clear value:
   - "Track your BP for 7 days → get a real average, not a one-off reading" (built)
   - "Order an ApoB test for $30 → biggest single jump in your coverage score" (designed)
   - "Connect your Garmin/Oura → auto-fill 4 metrics you're missing" (not built)

2. **Watch what they pick.** The choices people make after scoring tell you everything about what this product becomes. Do they want to track? Do they want to buy tests? Do they want to connect devices? The score page is a research instrument disguised as a product feature.

3. **Passkey prompt lives here.** "Save your profile across devices" makes sense right after you've invested 5 minutes entering data and seen a result worth keeping. Not before. Not on a banner. After the score, when they have something to lose.

4. **The loop closes on return.** Visit 2: they see their previous score, what's changed, what's still missing. The queue model (from `ux-philosophy.md`) kicks in: "Day 4 of your BP protocol. Morning reading?" The score shrinks to a corner element. The action becomes the hero.

This is the 5,000 ft → 1,000 ft bridge from the altitude framework — but driven by user choice, not our assumptions about what they need.

### What the Loop Looks Like (Week by Week)

**Week 1** (post-score): User picked "Track your BP for 7 days" from the post-score actions.
- Day 1: "Morning BP reading?" → [Enter BP] → record updated, score unchanged
- Day 4: "Day 4 of 7. You're averaging 118/72." → record building
- Day 7: "Protocol complete. Your 7-day average: 116/71. That's 42nd percentile — solidly normal." → score updates, new gap surfaces

**Week 2**: BP protocol done. Next card surfaces from the queue.
- "Your lipid panel is 11 months old. Quest has a $29 basic panel." → [Order] [Remind me in 2 weeks]
- User clicks Order → we track the intent (even if we can't track the purchase yet)
- Or: "Connect your Garmin → auto-fill resting HR, HRV, sleep, and steps" → [Connect] → 4 metrics fill at once, score jumps

**Week 3**: They ordered labs. Results came back.
- "New labs? Upload or paste your results." → [Upload PDF] → record enriched, multiple metrics update, score recalculates
- New gaps surface. New actions appear. The queue refills itself from the biology.

**Month 2+**: The record is getting deep. Return visits feel like checking in with a coach who remembers everything.
- "Your HbA1c improved from 5.7 to 5.4 since January. That moved you from 'watch' to 'normal'."
- "You haven't logged a waist measurement in 6 weeks. Quick check?" → [Enter measurement]
- Score is a small number in the corner. The relationship is the product.

**This is the B+C flywheel in action.** Every action feeds the record (B). The record powers smarter coaching (C). The coaching drives the next action. Repeat.

---

## The Funnel (What We're Actually Building)

```
              AWARENESS                    ENGAGEMENT                 RETENTION
              ─────────                    ──────────                 ─────────
              Landing page                 App intake                 Post-score loop
              X/Reddit/LinkedIn            Score + gaps               Queue model
              Content hooks                Next 3 moves               Measurement protocols
                                                                      Wearable connections
              ↓                            ↓                          ↓
              Email capture                Passkey identity            Repeat visits
              "I want to try this"         "I want to keep this"      "This is useful ongoing"
```

**Where we are today:** Awareness → Engagement is partially built (landing page exists, app intake works, score renders). Engagement → Retention doesn't exist yet. That's the gap to close.

**What closes it:** The post-score experience. Not a dashboard. A sequence of actions that emerge from your score.

---

## Assumptions We're Making

These are the bets. Each one needs a proof point before we invest deeply.

| # | Assumption | How We Validate | Status |
|---|-----------|----------------|--------|
| 1 | **People will enter their health data into a web form** | Paul completes the full flow on his iPhone | Not tested |
| 2 | **The coverage score is motivating, not depressing** | Post-score behavior: do they take an action or close the tab? | Not tested |
| 3 | **"What's missing" is more valuable than "what you have"** | Do users click gap cards more than tier details? | Not tested |
| 4 | **Passkeys are understood by the target audience** | Registration rate when prompted post-score | Not tested |
| 5 | **Voice intake is a differentiator, not a gimmick** | Voice vs form tab usage split on desktop | Not tested |
| 6 | **iOS users will Add to Home Screen** | PWA install rate on iOS Safari | Not tested |
| 7 | **People come back after the first score** | Return visit rate at 7 and 30 days | Not tested |
| 8 | **The audience will pay for this** | Willingness-to-pay signal from engaged users | Not tested |

**The honest truth:** Every assumption is untested. The next milestone isn't building more features. It's getting 5-10 people through the flow and watching what they do.

---

## Decision-Making Framework

How we decide what to build next, without over-planning or rabbit-holing.

### The Three Checks

Before building anything, ask:

1. **Altitude check** — What altitude is this? (from `altitude-framework.md`)
   - If it's below 5,000 ft, it's premature unless it's Andrew's personal R&D
   - If it's at 5,000 ft, it belongs in the product
   - If it's at 10,000 ft, it belongs in content/landing page

2. **Proof point check** — Do we have evidence this matters?
   - If no users have seen the score yet, don't build post-score features based on assumptions
   - If nobody has asked for wearable connections, don't build integrations
   - Content and conversations count as evidence. So do Paul's reactions.

3. **Reversibility check** — Can we undo this easily?
   - CSS change? Ship it, see what happens.
   - New database schema? Think harder.
   - New dependency? Think even harder.
   - Architectural commitment (cloud sync, native app)? Need strong signal first.

### The Decision Log

When a non-trivial decision is made, capture it:

```
DECISION: [what we decided]
DATE: [when]
CONTEXT: [why we were deciding]
ALTERNATIVES: [what we considered]
SIGNAL: [what evidence informed this]
REVISIT: [when/if to reconsider]
```

Decisions live in `docs/infrastructure-decisions.md` (technical) or this doc (product).

---

## What We're Discovering Next

The next push isn't more features. It's discovery through the product.

### Push 1: Get the Score in Front of People (March)

**Goal:** 5-10 people complete the full flow. Watch what happens after the score.

**What we ship:**
- Current build: 3-phase intake, Tailwind, iOS mobile fixes, PWA
- Deploy to GitHub Pages
- Andrew tests on Pixel 9
- Paul tests on iPhone
- 3-5 more people via landing page email list or direct outreach

**What we learn:**
- Does the flow make sense? Where do people get stuck?
- What do they do after seeing the score? (Close tab? Click a gap? Start BP protocol?)
- Is the coverage score concept intuitive or confusing?
- Voice vs form — does anyone use voice?

### Push 2: Post-Score Discovery (March-April)

Based on what we learn from Push 1, build the post-score experience:

- **If people close the tab after scoring:** The score isn't sticky enough. Fix the results page first. Maybe add "share your score" or "email me my results."
- **If people click gap cards:** Build the gap → action pipeline. "Order this test" → link to Quest/LabCorp. "Connect this device" → Oura PAT integration.
- **If people start BP protocol:** Build out more measurement protocols. The queue model is validated.
- **If people want to save their data:** Passkey prompt is justified. Wire it up.

### Push 3: Content-Driven Growth (March-April, Parallel)

The content calendar (`docs/content-calendar.md`) is ready. Launch:
- X thread (drafted)
- Reddit r/bloodwork post (drafted)
- LinkedIn cross-post
- Cost comparison thread (drafted)

Content drives people to the landing page. Landing page drives them to the app. App generates proof points. Proof points inform what we build next.

---

## The Research Bucket

Research is a standing workstream (see `docs/17-research-workstream.md`). It feeds:
- **New content hooks** — 39+ already documented in `docs/12-content-hooks.md`
- **New scoring insights** — emerging biomarkers, updated NHANES data, global comparisons
- **Product assumptions** — population data on wearable adoption, lab testing frequency, health data behavior

Research doesn't have a deadline. It runs alongside everything else and surfaces when it produces something actionable.

---

## What This Product Becomes (The B+C Thesis in Practice)

The leading thesis is Record + Loop. Here's what that looks like at each stage:

### Now: Score as Onramp (what's built)
- 3-phase intake collects structured health data
- Coverage score orients the user — where you stand, what's missing
- Next 3 moves and gap cards point toward action
- PWA keeps them installed, passkey keeps their data portable
- **The record starts here.** Every field they fill is a structured observation with a date and source.

### Next: Loop Activation (what to build after first users)
- Post-score actions become the product surface: BP protocol, lab ordering links, wearable connections
- Each completed action feeds back into the record — new observation, new date, updated score
- Return visits show what changed, what's still missing, what's next
- Queue model replaces the score page as the default view on visit 2+
- **Revenue signal:** Are people willing to pay to keep the loop running? Subscription ($5-10/mo) for the ongoing relationship, not the one-time score.

### Later: Record as Platform (when the data is deep enough)
- 6+ months of structured data per user → MCP exposure makes sense
- Any AI (Claude, ChatGPT Health, whatever comes next) queries the Baseline index
- "Your LDL dropped 15% since you started rowing" — the AI can say this because the record tracks the trajectory
- Portable: switch AI platforms, switch doctors, the record goes with you
- **Revenue expands:** Subscription + potential MCP API access for third-party apps + affiliate partnerships (Quest, wearable manufacturers)

### The Validation Sequence

Each stage validates the next. Don't build the platform before the loop proves people come back. Don't build the loop before the score proves people care.

```
Score works?          →  Loop works?           →  Record is deep?        →  Platform works?
People complete flow     People come back          6+ months of data         Third parties integrate
Score is motivating      Actions feed record       Temporal trends real      MCP queries are useful
They want to save it     Weekly engagement          Switching cost is real    Revenue diversifies
```

If the score doesn't work, nothing else matters. If the loop doesn't stick, the record never gets deep enough to be a platform. The sequence is the strategy.

---

## Related Docs

| Doc | What It Covers |
|-----|---------------|
| `docs/one-pager-v0.2.md` | Full product exploration, market, positioning, architecture |
| `docs/ux-philosophy.md` | Queue model, "not another dashboard," post-score design |
| `docs/altitude-framework.md` | Complexity check — what altitude are we building at? |
| `docs/13-distribution-strategy.md` | Content voice, channel strategy, wave plan |
| `docs/12-content-hooks.md` | 39+ shareable content ideas by tier |
| `docs/platform-strategy.md` | Web vs native decision framework, PWA status |
| `docs/infrastructure-decisions.md` | Technical decisions log |
| `docs/handoff-project-context.md` | Shared context for all agents |
