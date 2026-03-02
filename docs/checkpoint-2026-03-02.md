# Checkpoint — March 2, 2026

## Current State
21 commits pushed to origin. Clean working tree. Privacy page live. Garmin developer application submitted.

## Commits Today (chronological)

```
eac265b Redesign Phase 2 navigation and add Continue button progressive disclosure
6746a85 Add light mode theme support
6dc2875 Collapse health flags and evidence cards on results page
ba69624 Update checkpoint and design fixes handoff for March 2
d52c736 Add manual light/dark theme toggle in header
7b161fa Fix state management for return visits and fresh starts
4259ec2 Add score reveal interstitial before results
b4c213c Persist height, medications, and device selections across sessions
13c7fab Fix startOver() to fully reset meds, devices, labs, and form state
8efa9ca Extract _resetIntakeUI() helper and remove dead device hydration
35078ac Add wearable data import (Garmin CSV, Apple Health XML, Oura JSON)
242902f Demote "Start fresh" to text link with inline confirmation
bda9795 Merge tracking into gap cards, inline BP protocol, collapse discovery form
6b23ed2 Add voice dictation submit gate
ffd5dfd Update checkpoint with Agent A/D results and add results review doc
30609e1 Pre-populate voice checklist on load previous, slow down score interstitial
24ae3b2 Add fold line after top 3 moves, standardize section spacing, polish gap cards
a21d620 Fix submit gate: defer to updateSubmitGate() instead of hard-disabling on mic start
94b83f1 Fix loaded profile submit and hide empty parse-summary boxes
53cd5ac Fix loaded profile submit, hide empty parse-summary, add wearable strategy docs
73507dc Add privacy policy page and link from landing + app footers
```

## What's Done

### Design Fixes (all landed)
| # | Fix | Commit |
|---|-----|--------|
| 1 | Phase 2 nav — tabs as read-only indicators | eac265b |
| 2 | Continue button — progressive disclosure | eac265b |
| 3 | Equipment-aware gap cards | eac265b |
| 4 | State management (return visits + fresh starts) | 7b161fa |
| 5 | Score reveal interstitial (2200ms) | 4259ec2, 30609e1 |
| 6 | Results page density — collapse health flags + evidence | 6dc2875 |
| R1 | Merge tracking into gap cards | bda9795 |
| R2 | BP protocol inline in moves | bda9795 |
| R3 | Fold line after top 3 moves | 24ae3b2 |
| R4 | Collapse discovery form | bda9795 |
| R5 | Destructive action styling + confirmation | 242902f |
| R6 | Test coverage heading above tier bars | bda9795 |
| R7 | Spacing consistency (2rem rhythm) | 24ae3b2 |
| R8 | Gap card breathing room | 24ae3b2 |
| V1 | Voice dictation submit gate | 6b23ed2, a21d620 |
| G1-G4 | Persist height/meds/devices, startOver reset | b4c213c, 13c7fab |
| W1 | Wearable import parsers | 35078ac |
| — | Checklist hydration on load previous | 30609e1 |
| — | Submit fix for loaded profiles (skip extraction → Phase 2) | 94b83f1 |
| — | Light mode + toggle | 6746a85, d52c736 |
| — | Privacy policy page | 73507dc |

### Wearable Research (documented)
- `docs/wearable-strategy.md` — market share, data contracts, integration paths, Apple Shortcut bridge design, Garmin partner access steps
- `docs/wearable-results-mock.md` — (Agent G writing this now)
- `docs/apple-shortcut-bridge.md` — (Agent F writing this now)

## In Flight

| Agent | Task | Output file | Status |
|-------|------|-------------|--------|
| **F** | Apple Shortcut bridge research + design | `docs/apple-shortcut-bridge.md` | Done |
| **G** | Mock wearable-rich results page analysis | `docs/wearable-results-mock.md` | Done |

### Key findings from Agent F (Apple Shortcut)
- All 5 HealthKit metrics accessible via "Find Health Samples" action — no XML fallback needed
- Designed 6-phase Shortcut: steps, RHR, HRV, sleep, VO2 → Oura-compatible JSON → clipboard
- 2KB JSON vs 900MB XML export — strictly better UX
- Sleep aggregation is the hardest phase (summing asleep stages per night)
- Recommended: clipboard paste for v1, need to add paste-JSON textarea to import UI (~30 min)
- Shortcut must be built on an iPhone (2-3 hours), can't script from desktop

### Key findings from Agent G (results mock)
- Coverage: 49% → 73% (+24 pts) with wearable data
- Top 3 gaps shift from "buy a device" to "order specific labs" — fundamentally different CTA
- Projected close: 73% → 90% (vs 49% → 71% without wearable) — extremely motivating
- **Sleep coverage bug:** sleep_duration_avg satisfies hasData for Sleep Regularity row but only sleep_regularity_stddev is scored. Inflates coverage ~6%. Biggest scoring accuracy issue.
- 6 recommendations (R-W1 through R-W6) in `docs/wearable-results-mock.md`

## Garmin Developer Access
- Application submitted March 2, 2026
- Expected review: ~2 business days
- Privacy policy live at: `andrewdeal.info/baseline/landing/privacy/`
- Selected: Fitness/Outdoor DTC + Analytics, General Consumer

## Next Up

### 1. Agent E: Phase 2 Restructure — Separate Labs from Wearables
- Separate labs slide from wearable import in Phase 2
- Add per-device import guidance (Garmin CSV export, Apple Shortcut paste, Oura JSON export)
- Add paste-JSON textarea to wearable import (enables Apple Shortcut clipboard flow)
- Files: `index.html`, `src/main.js`, `css/app.css`

### 2. Build Apple Shortcut on iPhone
- Andrew builds on his phone following `docs/apple-shortcut-bridge.md` design
- Test with real Apple Watch data (or Paul's)
- Share via iCloud link for distribution

### 3. Sleep coverage bug fix
- Split Sleep Regularity into two rows: Sleep Duration (wearable) + Sleep Regularity (computed)
- Or: score sleep_duration_avg as fallback when regularity unavailable
- Files: `score.js` — needs explicit permission since CLAUDE.md says don't touch without asking

### 4. Results page adaptations (R-W1 through R-W6)
- R-W3 (shift CTA based on coverage tier) is the biggest UX win
- R-W4 (health flags "all clear" when no flags) makes wearable data feel validated
- R-W5 (cost estimate on projection bar) makes lab gaps more actionable
- R-W6 (auto-expand remaining gaps when ≤5) reduces unnecessary collapse

### 5. Test wearable-rich flow end-to-end
- Andrew imports his Garmin CSV, sees transformed results page
- Compare to mock predictions in `docs/wearable-results-mock.md`

### 6. Waiting on
- Garmin developer approval (~2 business days from March 2)
- Oura OAuth deferred to Push 2

## Known Issues

### Sleep coverage accounting bug (from Agent G) — BLOCKING for wearable accuracy
`sleep_duration_avg` satisfies `hasData` for Sleep Regularity but only `sleep_regularity_stddev` is scored. Inflates coverage ~6%. See `docs/wearable-results-mock.md` R-W2 for fix options.

### SDNN vs RMSSD — Apple Health HRV mismatch
Both XML parser and Shortcut bridge pass SDNN into RMSSD scoring. Affects all Apple Health users. Needs conversion research or separate percentile tables. Confirmed by both Agent F and G.

### Oura vs Garmin sleep duration inconsistency
Oura `total` = sleep time only. Garmin may include time in bed.

### Return banner "Start fresh" — no confirmation
Banner version not gated. Results page version fixed in 242902f.

### Haiku bounce failure leaves voice gate stuck
If bounceToHaiku() fails, pending items stay pending, submit button never enables.

### Weight Trends is binary (from Agent G)
`weight_lbs` marks Weight Trends as "has data" with standing=GOOD but no percentile. Doesn't actually score weight.

### Wearable freshness decay (from Agent G)
RHR/sleep/HRV go stale in 2 weeks. Single import degrades fast without re-import guidance.

### No paste-JSON input in import UI (from Agent F)
Current import only supports file drag-drop. Need textarea for Apple Shortcut clipboard flow.

### Feedback overlay hardcoded dark background
`.feedback-overlay` base rule hardcoded for dark. Should be tokenized.

### Empty tracking-modules div in index.html
Dead DOM when items merge into gap cards. Cleanup candidate.

## Resume Prompt

After /clear, paste this to resume as orchestrator:

```
You are the orchestrator. Read these files before doing anything:
1. docs/checkpoint-2026-03-02.md (full state, what's done, what's next)
2. docs/wearable-strategy.md (market share, data contracts, integration paths)
3. docs/wearable-results-mock.md (scoring analysis, R-W1 through R-W6 recommendations)
4. docs/apple-shortcut-bridge.md (Shortcut design, implementation effort)
5. git log --oneline -5 and git status

All design fixes landed and pushed (22 commits). Garmin developer app submitted.
Agents F and G completed — findings captured in checkpoint and docs above.

Ready to write Agent E kickoff prompt: Phase 2 restructure (separate labs from wearables,
per-device import guidance, add paste-JSON textarea for Apple Shortcut clipboard flow).

Also on deck:
- Sleep coverage bug fix (score.js — needs user permission per CLAUDE.md)
- Results page adaptations R-W1 through R-W6
- Apple Shortcut build on iPhone (Andrew does this manually)
- Garmin approval check (submitted March 2, ~2 business days)

NEVER use the Agent tool to spawn workers. Write kickoff prompts as text, user spawns them.
Small inline fixes (< 15 lines) are OK to do directly.
Do NOT run pnpm build or pnpm screenshot unless asked.
```
