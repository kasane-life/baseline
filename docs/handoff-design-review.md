# Design Review & Handoff — Results Screen + Flow Polish

*Date: 2026-03-01*
*For: Design agent pickup*
*Context: Read `docs/product-vision.md` first — especially "The Thesis: Record + Loop" and "The Score Page IS the Next Intake" sections.*

---

## TL;DR — What to Do

**The results screen is a scroll marathon that buries the most important content.** The redesign is a hierarchy and visual weight pass — no new features, no new data, just restructuring what's already there.

**Priority order:**
1. Move passkey banner from Phase 1 intake → post-score results page
2. Restructure results page: Score rings → Next 3 moves → Protocol card → Save prompt → (fold) → collapsed details
3. Collapse tier tables by default (two walls of "missing / no data" is demoralizing)
4. Elevate "Next Moves" cards — bigger, bolder, green CTAs, prominent +pts badges
5. Make BP Protocol card feel like a feature module, not inline content
6. Upgrade "skip — score with what I have" from gray text to a secondary button (Phase 2)
7. Relocate or redesign evidence cards (great content, wrong placement)

**Key files:** `app/src/render.js` (results rendering), `app/css/app.css` (styles), `app/index.html` (HTML structure)
**Don't touch:** `app/score.js` (scoring engine), voice intake screen, Phase 2 flow, dark theme, fonts

---

## The Product Thesis (What This Design Needs to Serve)

Baseline's thesis is **Record + Loop**:
- **Record (B):** A structured, portable health record that compounds over time
- **Loop (C):** A post-score action sequence that keeps the record alive

The coverage score is the **onramp** — not the product. The results screen is the most important screen in the app because it's where the onramp either converts into a loop or dies. Right now it converts into a wall of data.

---

## Current Flow (Screenshots Reviewed)

### Phase 1: Voice/Form Intake — STRONG

**Voice tab ("Talk It Out"):**
- Checklist fills in real-time as you speak — this is the magic moment
- "EXPERIMENTAL" badge is honest
- 8 items captured, clear submit button
- This screen works. Don't touch it much.

**Form tab ("Type It In"):**
- Standard form fields. Functional. Gets the job done.

**Issue: Passkey banner at top of Phase 1.** "Save your profile across devices?" appears before the user has done anything. They have nothing to save. This should move to post-score, after they have a result worth keeping. Remove from Phase 1 entirely.

### Phase 2: "Fill In The Picture" — SOLID

**Labs tab:**
- "19 biomarkers extracted from 7 files" green banner — satisfying confirmation
- Three input paths (upload, paste, manual) — good coverage
- File list with biomarker counts and dates — reassuring

**Equipment tab:**
- Device cards (BP Cuff, Scale, Tape Measure, None yet) — fast, clear, no-shame "none yet" option
- "What can you measure between lab visits?" — good framing

**Meds tab:**
- Typeahead search with tag chips — clean utility screen

**PHQ-9 tab:**
- Not screenshotted but exists in the flow

**Issue: "skip — score with what I have" is too subtle.** Gray text at the bottom of each Phase 2 screen. For a first-time user who doesn't have labs handy, this is the escape hatch — and it's easy to miss. The coverage score handles incomplete data beautifully (that's the whole point), but users need to feel like skipping is fine. Consider making it a secondary button rather than gray text.

**Copy note: "FILL IN THE PICTURE" and "Every bit sharpens your score" — excellent.** Don't change this. The language of sharpening (not completing) implies there's value at every stage.

---

## Phase 3: Results Screen — NEEDS WORK

This is the screen that matters most. Here's the full breakdown:

### What's on the screen (top to bottom)

1. **Two score rings** — 7% Coverage (red) + 90th Health percentile (green)
2. **"18 gaps in your coverage"** — text below rings
3. **Coverage bar** — Foundation (T1) / Enhanced (T2) progress
4. **"YOUR NEXT MOVES"** — Top 3 actions with point projections (+8 pts each)
5. **Full ranked metric list** — ~15 metrics with point values
6. **BP Protocol card** — "Track blood pressure for 7 days" + Start protocol button
7. **"START TRACKING TODAY"** — BP, weight, waist measurement instructions
8. **TIER 1: FOUNDATION** — Full metric table (missing/no data)
9. **TIER 2: ENHANCED** — Full metric table (missing/no data)
10. **"THE EVIDENCE"** — 6 research insight cards
11. **Footer** — NHANES citation + local storage note

### What Works

**The score rings are a clear anchor.** 7% coverage in red, 90th health percentile in green — the contrast between "you're healthy but barely measured" is immediately legible. This IS the Baseline value prop in two circles.

**"YOUR NEXT MOVES" is the right idea.** Three prioritized actions with point projections ("7% → 35% projected with these 3") — this is the gap-to-action pipeline that feeds the loop. The +8 pts badges give clear motivation.

**The BP Protocol card is the first real loop touchpoint.** "A single reading is a snapshot. Seven days gives you a real average — the number that actually predicts outcomes." Good copy, clear CTA. This is exactly what the post-score experience should feel like.

**The Evidence cards are strong content.** "+1,000 steps → -15% mortality", "$30 test → best cardiac predictor", "Catches pre-diabetes years early" — these are punchy, research-backed, shareable. They belong somewhere but maybe not here (see below).

### What Doesn't Work

**1. The page is a scroll marathon.**

This is the biggest issue. The results screen is trying to be everything: summary, action plan, detailed breakdown, protocol instructions, full metric tables, AND research education — all on one scroll. A user who just entered their data and got a 7% score is now staring at what looks like an endless page. This is the dashboard trap the UX philosophy doc explicitly warns against.

**The feeling should be: "Here's where you stand, here's what to do next, go."**
**The feeling currently is: "Here's everything we know about health. Good luck."**

**2. The "Next Moves" section gets buried.**

"YOUR NEXT MOVES" — the most important section on the page — sits below the score rings, below the gap count, below the coverage bar. By the time you scroll to it, you've already processed three different data visualizations. And below the next moves is a full ranked list of ~15 metrics, then the BP protocol, then the tracking instructions, then two full tier tables, then six evidence cards.

The next moves should be **the first thing you engage with after seeing the score.** Not the fourth section.

**3. Two full tier tables of "missing / no data" is demoralizing.**

TIER 1: FOUNDATION shows ~10 metrics, all "missing, no data." TIER 2: ENHANCED shows ~8 more, all the same. For a user with 7% coverage, this is a wall of red. It's technically accurate — but emotionally it says "you have nothing." The gap analysis in "Your Next Moves" already communicates this better: "here are the 3 things that matter most." The tier tables add information but subtract motivation.

**4. The BP Protocol section is disconnected from the flow.**

The protocol card ("Track blood pressure for 7 days") appears mid-page between the ranked metric list and the tier tables. Then below it is "START TRACKING TODAY" with text instructions. These should be a unified experience — and ideally only appear if BP was flagged as a next move. Right now the protocol section feels bolted on.

**5. The Evidence cards are great content in the wrong place.**

"+1,000 steps → -15% mortality" is a fantastic hook. But after a long scroll of metrics and tables, the user is in data-processing mode, not learning mode. These would be more impactful as standalone content (shareable cards, email nudges, or surfaced in the queue model on return visits) rather than appended to the bottom of the results page.

**6. Action buttons are underdesigned.**

Top-right corner has three small buttons: "update values", "Export JSON", "Start Phase". These are important actions (especially "update values" for the loop) but they're visually quiet and positioned where users expect navigation chrome, not CTAs.

---

## Design Direction

### The Principle

**The results screen should feel like a coach telling you three things, not a spreadsheet showing you everything.**

The user just spent 5 minutes entering data. They want an answer. Give them:
1. **Where you stand** (score — 5 seconds)
2. **What to do next** (top actions — 15 seconds)
3. **Why it matters** (one insight — 10 seconds)

Everything else is available on demand, not on the default scroll.

### Proposed Structure

**Above the fold (no scroll needed):**
- Score ring(s) — the anchor
- One-line summary: "7% coverage. Your health markers look strong — you just aren't measuring much yet."
- "Your Next 3 Moves" — the three highest-impact actions, prominent, with clear CTAs
- That's it. Nothing else above the fold.

**Below the fold (scroll to explore):**
- The BP Protocol card (if BP is a next move) — or whatever the top protocol-level action is
- Expandable/collapsible detail sections:
  - "See all metrics" → the tier tables (collapsed by default)
  - "See the evidence" → the research cards (collapsed by default)
  - "See your full gap list" → ranked metric list (collapsed by default)

**Post-score prompt (after they've absorbed the score):**
- Passkey CTA: "Save your profile across devices" — this is where it belongs, not Phase 1
- Share/export: "Share your score" or "Email me my results" (future — for discovery capture)

### Visual Tone

The current design is dark, clean, minimal — that's right. But the results screen needs more **contrast and hierarchy.** Right now everything is the same visual weight: score rings, next moves, metric lists, tier tables, evidence cards — they all look similar. The page needs:

- **The score rings should be bigger and more prominent.** They're the hero moment.
- **The "Next Moves" cards need more visual weight** than the metric list below them. Right now they're slightly larger text in boxes, but they don't pop.
- **The tier tables should be de-emphasized.** They're reference material, not the experience. Collapsed by default, or styled as secondary/muted compared to the action-oriented sections above.
- **The BP Protocol card is the closest thing to "the loop" on this page.** It should feel like a distinct, elevated element — not inline with the metric tables.

### Color, Hierarchy, and Visual Weight

**The core problem:** Everything on the results page currently has the same visual weight — dark cards on dark background, similar sizing, similar spacing. It all blends together. The page needs a clear visual hierarchy where your eye knows exactly where to go.

**The red/green path:**
- **Red = the gap.** Coverage ring (7%), warning states, missing data indicators. Red says "here's what you don't have."
- **Green = the action.** Health percentile ring (90th), CTAs, "do this thing" buttons, +pts badges. Green says "here's what to do about it."
- Create a visual journey from red (problem) to green (action). The user should feel pulled from the score toward the next moves.

**Visual weight by section:**
- **Score rings = LOUD.** Biggest elements on the page. More breathing room. Let the moment land. The 7% / 90th juxtaposition ("you're healthy but barely measured") is the most compelling thing on the screen — don't crowd it.
- **Next moves = PROMINENT.** The +8 pts badges should be the second most visible numbers on the page after the score. These are the payoff: "do this one thing, gain 8 points." Green CTAs, bold projection text ("7% → 35%"), card-style with enough contrast to pop against the dark background.
- **Protocol card = ELEVATED.** Should feel like a feature module, not inline content. Different background treatment, progress indicators, clear CTA. This is the first real loop touchpoint — it should look like something you engage with.
- **Tier tables = MUTED.** Reference material. Collapsed by default. When expanded, clearly secondary — smaller text, less contrast, de-emphasized compared to everything above. Don't compete with the actions.
- **Evidence cards = DISTINCT.** These are editorial, not data. They should have a different visual personality — maybe a slightly different card treatment, or a horizontal layout. They're the "did you know?" moments that make people share. If they stay on this page, they should feel like a different kind of content, not more of the same.

**Spacing and breathing room:**
- The current page is dense — section follows section with minimal separation. The score rings need space below them. The next moves need space above and below. The fold (where detail sections begin) needs a clear visual break — a horizontal rule, a color shift, or just significantly more whitespace.
- On a 1080p screen, the above-the-fold experience should be: score rings + summary + next 3 moves. Nothing else. If you have to scroll to see your actions, the page has failed.

---

## Specific Fixes (Priority Order)

### P0: Move Passkey Banner

Remove passkey banner from Phase 1 (voice/form intake screen). Add it to the results screen, after the score and next moves — when the user has something worth saving.

### P1: Restructure Results Page Hierarchy

The results page needs a clear visual hierarchy:

```
[HERO]     Score rings — big, centered, the moment
[ACTION]   Next 3 moves — prominent cards with clear CTAs and point projections
[BRIDGE]   One-line motivational: "Do these 3 and you're at 35%"
[LOOP]     Protocol card (BP tracking, etc.) — if relevant
[SAVE]     Passkey prompt — "Save your profile across devices"
─── fold ───
[DETAIL]   Metric breakdown (collapsed/expandable)
[DETAIL]   Tier tables (collapsed/expandable)
[LEARN]    Evidence cards
[UTILITY]  Export, update values, etc.
```

### P2: Collapse the Tier Tables

Two full tables of "missing / no data" is overwhelming at 7% coverage. Options:
- **Collapse by default** with "Show all metrics" toggle
- **Only show metrics that have data** in the default view, with a "See 18 gaps" expandable section
- **Summary line instead of table**: "Tier 1: 1 of 10 covered. Tier 2: 0 of 10 covered." with expand option

### P3: Elevate the Next Moves Cards

These are the most important interactive elements on the results page. They should:
- Be visually distinct from the metric list (bigger, bolder, maybe card-style with subtle borders or background)
- Have clear action CTAs (not just text labels — buttons or links that say what to do)
- Show the projection prominently: "7% → 35%" should be a visual element, not just text

### P4: Make the BP Protocol Card Feel Like a Feature

Right now it's inline with other content. It should feel like a module — something you engage with, not scroll past. Consider:
- Slightly different background or border treatment
- Progress indicator (0 of 7 days) that updates as you track
- Prominent "Start protocol" CTA (the current red button is fine but could be more elevated)

### P5: Relocate or Redesign Evidence Cards

Options:
- **Keep on results page** but style them as a distinct "Did You Know?" section with a different visual treatment (card carousel? horizontal scroll?)
- **Move to the queue model** — surface one evidence card per return visit as a "health insight of the week"
- **Make them shareable** — each card becomes a social-ready image/link

### P6: "Skip — Score With What I Have" (Phase 2)

Make this a secondary button instead of gray text. It's the most important escape hatch for users who don't have labs ready. The coverage score handles incomplete data perfectly — but users need permission to skip.

### P7: Phase 2 Labs Screen — Basic Layout Issues

The Labs tab (empty state, before any files uploaded) has fundamental spacing and hierarchy problems:

**The content card floats in a void.** Three input options (upload, paste, manual entry) sit in a card that's maybe 40% of the viewport height, with massive dead space below. The card doesn't fill its container and the page feels empty and unfinished.

**"Done, next →" looks disabled.** Full-width gray slab with no color, no contrast, no visual distinction from the collapsible sections above it. Primary actions need to look like primary actions — color, weight, something that says "tap me." Currently it looks like the background.

**All three input paths have identical visual weight.** Upload zone, "Paste or dictate values," and "Enter values individually" are the same height, same border, same text treatment. There's no hierarchy. Upload should be the hero path (larger, more prominent, maybe an icon or illustration). Paste and manual entry are alternatives — they should be visually subordinate (smaller, collapsed by default, lighter border).

**The "or" divider is a crutch.** If the visual hierarchy was right, you wouldn't need the word "or." The upload zone would obviously be primary and the alternatives would obviously be fallbacks.

**Padding is inconsistent.** Tab bar has tight padding, content area has loose padding, the "Done" button has massive padding. Nothing feels aligned to a consistent spacing scale.

**Fix:** This screen needs a spacing/hierarchy pass:
- Upload zone: larger, more visual emphasis (icon, dashed border with more contrast, maybe a subtle background tint)
- Paste/manual: smaller, clearly secondary, collapsed accordion style
- "Done, next →": needs color (red accent or green) and should look like a button, not a background element
- Container: either fill the vertical space or constrain the page height so there's no dead zone
- Apply a consistent spacing scale (8px grid: 8, 16, 24, 32, 48) across all elements

---

## Design References

- **Theme**: Dark (#08080a background), red accent (#c83c3c), green for health/positive
- **Fonts**: Barlow Condensed (display/headings), DM Sans (body), JetBrains Mono (data/mono)
- **Vibe**: Premium health tech. Oura app meets Linear. Refined minimal, not clinical.
- **Favicon**: `b.` mark — white "b" on dark rounded square with red period dot
- **Key CSS file**: `app/css/app.css` (Tailwind migration happened, ~1300 lines)
- **Results rendering**: `app/src/render.js`
- **Score engine**: `app/score.js`

## Key Files

| File | What It Does |
|------|-------------|
| `app/src/render.js` | All results rendering — score ring, tiers, moves, gaps, insights |
| `app/css/app.css` | All styles |
| `app/index.html` | HTML structure for results section |
| `app/src/main.js` | Phase navigation, compute flow |
| `app/score.js` | Scoring engine — produces the data that render.js displays |

## What NOT to Change

- The scoring engine (`score.js`) — the numbers are correct, don't touch the math
- The voice intake screen — it works, leave it alone
- The Phase 2 "Fill In The Picture" flow — solid, only needs the skip button upgrade
- The dark theme and font choices — these are established, stay within them
- The Tailwind setup — CSS changes should work within the existing Tailwind config

## Build/Test

```bash
cd ~/src/baseline/app
pnpm dev          # Vite dev server
pnpm build        # Production build
pnpm preview      # Preview production build (test PWA/SW here)
```

---

## Review of March 1 Changes (Second Pass)

The following changes were applied but the core problems remain. This section documents what was fixed, what wasn't, and what's still wrong.

### What Was Fixed
- Passkey prompt moved from Phase 1 to post-score results — correct
- Tier tables collapsed into "Tier 1: Foundation 7 of 10 covered" expandable lines — correct
- "Score with what I have →" upgraded from gray text to outlined button — correct
- PHQ-9 "Done →" button got the red accent color — correct (but only on this one screen)

### What's Still Broken

**1. "Done, next →" button is still a gray slab on most screens.**
The PHQ-9 screen got the red CTA treatment but Meds (empty), Meds (with tags), and Labs still show a gray-on-dark rectangle that looks disabled. This is a global button class fix, not a per-screen fix. Every primary action button in Phase 2 should have the red accent background (#c83c3c) with white text. One CSS rule.

**2. Dead space below content on Phase 2 screens.**
Meds empty state: search field → gray button → 400px of nothing. Meds with tags: search field → three chips → gray button → 300px of nothing. The content card doesn't fill the viewport. Options:
- Vertically center the content card in the available space
- Or use `min-height: 100vh` on the phase container and push the footer to the bottom
- Or constrain the max-width more tightly so the card feels intentionally compact rather than lost

**3. Results page visual weight is still flat.**
Every section has the same dark-card-on-dark-background treatment. The score rings, next moves, protocol card, passkey prompt, tracking instructions, and evidence cards all look the same. Nothing pops. Specific issues:

- **Score rings need more breathing room** — they're the hero moment but they're crowded by the text below
- **Next moves cards need elevation** — they should look distinctly different from the metric list below. More padding, a subtle background tint (e.g., rgba(200,60,60,0.05) or a left border accent), and the +pts badges should be much more prominent
- **"Remaining 4 gaps · +10 pts" should be collapsed by default** — the top 3 are the focus
- **The protocol card should feel like a distinct module** — different background, more internal padding, the red "Start protocol" button is good but the card itself blends in
- **"START TRACKING TODAY" is a text wall** — three paragraphs of measurement instructions sitting inline. This should be collapsed, or converted to a compact checklist, or moved into the protocol card as expandable detail
- **Evidence cards need a different visual personality** — they're editorial content styled as data. Give them a different card treatment (slightly lighter background, or a colored category tag that's more prominent, or a horizontal scroll layout)

**4. The page is still too long.**
The structural hierarchy (Score → Actions → Loop → Save → Details) was partially applied but the page still scrolls significantly because nothing is collapsed or hidden by default. The "remaining gaps" list is expanded, "START TRACKING TODAY" instructions are fully visible, and the evidence section is fully expanded. Above the fold should be: score rings + next 3 moves. Everything else on demand.

### What "Pops" Actually Means (for the implementing agent)

"Nothing pops" is vague feedback. Here's what it means concretely:

**Elevation.** On a dark background, you create hierarchy with subtle luminosity steps. The page background is #08080a. A card might be #111113. An elevated card might be #18181b. A highlighted card might be #1e1e22. Each step up in luminosity says "this is more important." Right now everything is at the same elevation.

**Border and glow.** A 1px border of rgba(255,255,255,0.06) is invisible. A 1px border of rgba(255,255,255,0.1) is subtle. A 1px border of rgba(200,60,60,0.3) with a box-shadow of `0 0 20px rgba(200,60,60,0.1)` says "look at me." Use this sparingly on the elements that matter: next moves cards, protocol card.

**CTA contrast.** The red accent (#c83c3c) should appear on exactly two things: primary action buttons and the most important data points (+pts badges, score projection). Everything else is neutral. If red is everywhere, nothing is emphasized. If red is only on the things you want people to click, it works.

**Whitespace as emphasis.** The score rings should have 48-64px of space below them before any text. The next moves section should have 32px of space above it. The fold (where detail sections start) should have a visible break — a horizontal rule, or 64px+ of space, or a background color shift. Right now sections are 16-24px apart uniformly, which makes them all feel equal.

**Typography scale.** The score numbers (72%, 75th) should be the biggest text on the page. The next moves headlines (SLEEP REGULARITY, VO2 MAX) should be the second biggest. The +pts numbers should be the third biggest. Everything else — metric lists, descriptions, instructions — should be clearly smaller. If the font sizes don't create a clear 3-level hierarchy, the page feels flat.

---

## Summary for the Agent

**The intake flow (Phase 1 + 2) is good.** Fix the global CTA button color (red accent on all "Done/Next" buttons, not just PHQ-9) and the dead space on sparse screens.

**The results screen is where the product thesis lives or dies.** It currently shows everything at once with uniform visual weight. The redesign isn't about rearranging sections — it's about creating elevation, contrast, and breathing room so the eye knows exactly where to go.

**The hierarchy is: Score → Actions → Loop → Save → Details.**

**The specific techniques are: luminosity stepping for elevation, border/glow for emphasis, red accent only on CTAs and key numbers, whitespace to separate importance levels, typography scale for 3-level hierarchy.**

**Don't build new features.** This is a visual hierarchy pass on what already exists. The data, scoring, and rendering logic all work. The issue is that everything looks the same.
