# Checkpoint — March 2, 2026 (evening session #3)

## Current State
31 commits pushed to origin. 7 uncommitted files (UI polish, favicon, privacy page, dashboard).
Results page insights redesign complete (Agents O–R all landed). Content posts live on LinkedIn + X.

## This Session

### Agent N — SDNN HRV Scoring
- Added `hrv_sdnn` cutoff table to score.js (ultra-short Apple Watch norms, age/sex stratified)
- Routes HRV assessment through SDNN vs RMSSD table based on `getHrvType()` from device-db.js
- Metric name shows "HRV SDNN (7-day avg)" vs "HRV RMSSD (7-day avg)"
- Build fix: removed duplicate `selectedDevice` declaration (used existing from line 328)
- **Status**: Done, build clean, uncommitted

### ESC Task Force Research
- ESC 1996: SDNN < 50ms unhealthy, 50-100ms compromised, >100ms healthy (24-hour Holter)
- Apple Watch uses ultra-short (~60s) overnight recordings → lower values, different norms needed
- Population studies (Nunan, Baependi, MESA) confirm age/sex-stratified SDNN decline
- Beyond HRV: Heart rate recovery (HRR) is a strong mortality predictor — future metric candidate
- Other ESC metrics (RHR, BP, VO2) already align with our NHANES-based scoring

### Results Page Insights Redesign — COMPLETE
Full design in `docs/handoff-results-insights.md`. All 4 agents landed.

| Agent | Task | Files | Status |
|-------|------|-------|--------|
| **O** | METRIC_INTERVENTIONS data module (20 metrics) | NEW `interventions.js` | **Done** |
| **P** | Health flags + wins + gap card context | `render.js` | **Done** (also covered Q's scope) |
| **Q** | Enhanced gap cards ("why this matters") | `render.js` | **Done** (P already implemented) |
| **R** | Evidence personalization | `render.js` (renderInsights) | **Done** |
| **Content** | Follow-on LinkedIn + X posts | docs only | **Wearable post LIVE** (LinkedIn + X, Mar 2 ~12:30 ET) |

### Inline UI Polish (after agents)
- Evidence moved from Act 3 carousel to vertical stack inside Health section
- "Your next moves" section title changed from `<h3>` to `moves-section-label` for consistency
- Removed card wrapper (background/border) from `.next-moves` container
- Continue button hidden when "See my score" appears in Phase 2
- Wins block spacing increased (margin 8px → 28px)
- Oxford comma fix for 3+ wins
- `mt-8` added to `.action-plan` for breathing room

### Landing Page
- Favicon (`landing/favicon.svg`) added to landing page and privacy page
- Privacy page already comprehensive from earlier work

## Previous Session (committed)

7 agents (E through M) + inline fixes. 762 lines changed:
- Phase 2 restructured to 5 slides (wearable slide, brand/model selector, 63-device database)
- Sleep coverage bug fixed (split into Duration + Regularity rows)
- Results page restructured (3-act layout: Picture → Moves → Detail)
- Device-aware gap cards (costToClose reflects your specific wearable)
- Gap category tags (Lab/Wearable/Equipment/Lifestyle) on all gap cards
- Evidence relevance badges, cost estimate on projection bar
- Apple Shortcut vo2_max parsing, auto-detect brand from upload

## Known Issues

### SDNN vs RMSSD — RESOLVED
Added SDNN cutoff table and routing in score.js. Apple Watch users now scored against SDNN norms.

### Profile field naming asymmetry (from Agent N)
`hrv_rmssd_avg` field name used even when value is SDNN. Works functionally but semantically misleading. Future refactor: rename to `hrv_avg` + `hrv_type`. Touches intake, parsers, storage — defer.

### U-shaped sleep duration scoring
Cutoff table treats sleep as higher-is-better up to 9.5h. Someone sleeping 11h would score optimally. Needs custom assess function with target range.

### Oura vs Garmin sleep duration inconsistency
Oura `total` = sleep time only. Garmin may include time in bed.

### Return banner "Start fresh" — no confirmation
Banner version not gated. Results page version fixed in 242902f.

### Haiku bounce failure leaves voice gate stuck
If bounceToHaiku() fails, pending items stay pending, submit button never enables.

### Weight Trends is binary (from Agent G)
`weight_lbs` marks Weight Trends as "has data" with standing=GOOD but no percentile.

### Wearable freshness decay
RHR/sleep/HRV go stale in 2 weeks. Single import degrades fast without re-import guidance.

### Stepper steps may not be clickable (from Agent K)
goToEnrichStep onclick handlers not wired in HTML or JS. Pre-existing.

### Feedback overlay hardcoded dark background
`.feedback-overlay` base rule hardcoded for dark. Should be tokenized.

### parseWearablePaste() duplicates showSummary()
Minor DRY opportunity. Low priority.

### No BMI metric in score.js (from Agent O)
Task listed BMI but score.js uses waist circumference instead. BMI doesn't appear in the scoring engine. interventions.js uses `waist` key. If BMI is added later, append a `bmi` entry.

### Missing intervention entries (from Agent O)
Family History, Medication List, PHQ-9, CBC, Liver Enzymes, Thyroid are scored in score.js but not in METRIC_INTERVENTIONS. Low priority — these are mostly binary (has data / doesn't) and don't need levers in the same way.

### hrv_rmssd key mismatch (from Agent O)
Cutoff table uses `hrv_rmssd`, profile field uses `hrv_rmssd_avg`. interventions.js keyed as `hrv_rmssd`. Render.js agents need to map from result name → correct key. Documented in interventions.js header.

### Composite panel key mapping (from Agent O)
Lipid Panel + ApoB and Metabolic Panel are composite results in score.js. interventions.js provides entries for each sub-metric (apob, ldl_c, hdl_c, triglycerides, hba1c, fasting_glucose). Render.js needs to look up the sub-metric key, not the composite name.

### Nested parens on composite flag cards (from Agent P)
Composites like "Lipid Panel + ApoB" have unit "mg/dL (ApoB)" → flag shows "(85 mg/dL (ApoB))". Strip inner parens for display. Minor polish.

### Oxford comma in wins block — RESOLVED
Fixed inline. 3+ wins now joined with Oxford comma.

### "Load previous" doesn't restore wearable/lab uploads
When restarting the flow and clicking "load previous," wearable CSV and lab data aren't preloaded — user has to re-upload every time. Profile fields (form inputs) persist in localStorage but file-based imports don't. Needs either: (a) persist parsed metrics in localStorage so they auto-populate, or (b) show a summary of previously imported data with option to re-import.

### NAME_TO_METRIC_KEY is manual (from Agent P)
Results don't have a `metric` field. Agent P built a name-to-key mapping in render.js. If new metrics are added to score.js, this mapping needs updating. Future fix: add metric key to each result object in score.js.

## Content — Shipped

### "Connect your wearable, close 6 gaps"
- **LinkedIn**: Posted Mar 2, ~12:30 PM ET (9:30 AM PT)
- **X/Twitter**: 9-tweet thread posted same time
- CTA: "Interpret yours" → andrewdeal.info/baseline
- Quote-tweet schedule: +2d (RHR), +3d (sleep), +5d (steps+RHR), +7d (60% on wrist)

### "Sleep regularity > sleep duration"
- Drafted in `docs/draft-sleep-regularity-post.md`, not yet posted
- Schedule for later this week (Thu/Fri)

### Reddit
- Still on calendar: r/QuantifiedSelf (40 metrics ranked), r/longevity, r/Biohackers
- See `docs/content-calendar.md` for schedule

## Beta Launch Session (late night)

### Beta Gate + Analytics + Mobile Fix — SHIPPED
Deployed to `beta.mybaseline.health`. Shared with Paul + family.

| Change | Status |
|--------|--------|
| Email gate (Formspree + localStorage) | **Live** — emails arriving |
| Analytics tracker (sendBeacon → worker KV) | **Live** — fixed wrong worker URL, redeployed |
| Worker `POST /track` endpoint (90-day TTL) | **Deployed** |
| Mobile defaults to form tab (voice unreliable) | **Live** |
| "About" link fix (`../landing/` → `https://mybaseline.health`) | **Live** |

**Files changed (uncommitted):**
- `app/src/gate.js` — NEW
- `app/src/analytics.js` — NEW
- `app/src/main.js` — gate + analytics wiring, mobile form default
- `app/src/discovery.js` — analytics track call
- `app/index.html` — about link fix
- `app/css/app.css` — gate styles
- `worker/src/index.ts` — `/track` endpoint

### Known Issue — Track Events
Analytics URL was wrong in first deploy (`baseline-worker` instead of `baseline-api`). Fixed and redeployed. Need to verify events are landing in KV after a fresh flow-through.

## Still On Deck

1. **Commit all beta gate + analytics + mobile fix changes**
2. **Verify track events in KV** — `npx wrangler kv:key list --binding=LOGS --prefix=track/` from `worker/`
3. **Paul test** — messaged, waiting for him to run through on iPhone
4. **Build Apple Shortcut on iPhone** — Andrew builds per `docs/apple-shortcut-bridge.md`
5. **End-to-end wearable flow test** — Garmin CSV + paste JSON
6. **Garmin approval check** — submitted March 2, expected ~March 4
7. **Reddit posts** — per content calendar schedule
8. **Sleep regularity post** — drafted in `docs/draft-sleep-regularity-post.md`, schedule Thu/Fri
9. **Quote-tweet schedule** — wearable post QTs: +2d (RHR), +3d (sleep), +5d (steps+RHR), +7d (60%)

## Resume Prompt

After /clear, paste this to resume as orchestrator:

```
You are the orchestrator. Read these files before doing anything:
1. docs/checkpoint-2026-03-02.md (full state, what's done, what's next)
2. git log --oneline -10 and git diff --stat

Summary of where we are:
- Beta live at beta.mybaseline.health — shared with Paul + family
- Email gate + analytics + mobile form default all deployed
- 14 agents (E through R) all landed and committed
- Results page insights redesign complete
- Content: wearable post live on LinkedIn + X, sleep regularity post drafted

Next immediate:
1. Commit beta gate + analytics + mobile fix changes
2. Verify track events landing in KV
3. Wait for Paul's test feedback
4. Build Apple Shortcut on iPhone (per docs/apple-shortcut-bridge.md)
5. End-to-end wearable flow test (Garmin CSV + paste JSON)
6. Garmin approval check (~March 4)
7. Reddit posts per content calendar
8. Sleep regularity post Thu/Fri

NEVER use the Agent tool to spawn workers. Write kickoff prompts as text, user spawns them.
Small inline fixes (< 15 lines) are OK to do directly.
Do NOT run pnpm build or pnpm screenshot unless asked.
```
