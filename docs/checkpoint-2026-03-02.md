# Checkpoint — March 2, 2026

## Current State
19 commits ahead of origin, clean working tree. All design fixes landed. Wearable strategy researched and documented.

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
bda9795 Merge tracking into gap cards, inline BP protocol, collapse discovery form, add test coverage heading
6b23ed2 Add voice dictation submit gate — button disabled until all checklist items resolve
ffd5dfd Update checkpoint with Agent A/D results and add results review doc
30609e1 Pre-populate voice checklist on load previous, slow down score interstitial
24ae3b2 Add fold line after top 3 moves, standardize section spacing, polish gap cards
a21d620 Fix submit gate: defer to updateSubmitGate() instead of hard-disabling on mic start
94b83f1 Fix loaded profile submit and hide empty parse-summary boxes
```

## What's Done

### Design Fixes (all landed)
| # | Fix | Commit |
|---|-----|--------|
| 1 | Phase 2 nav — tabs as read-only indicators | eac265b |
| 2 | Continue button — progressive disclosure | eac265b |
| 3 | Equipment-aware gap cards | eac265b |
| 4 | State management (return visits + fresh starts) | 7b161fa |
| 5 | Score reveal interstitial | 4259ec2 |
| 6 | Results page density — collapse health flags + evidence | 6dc2875 |
| R1 | Merge tracking into gap cards | bda9795 |
| R2 | BP protocol inline in moves | bda9795 |
| R3 | Fold line after top 3 moves | 24ae3b2 |
| R4 | Collapse discovery form | bda9795 |
| R5 | Destructive action styling + confirmation | 242902f |
| R6 | Test coverage heading above tier bars | bda9795 |
| R7 | Spacing consistency (2rem rhythm) | 24ae3b2 |
| R8 | Gap card breathing room | 24ae3b2 |
| V1 | Voice dictation submit gate | 6b23ed2 |
| G1-G4 | Persist height/meds/devices, startOver reset | b4c213c, 13c7fab |
| W1 | Wearable import parsers | 35078ac |
| — | Checklist hydration on load previous | 30609e1 |
| — | Interstitial timing 700ms → 2200ms | 30609e1 |
| — | Submit gate fix for loaded profiles | a21d620, 94b83f1 |
| — | Light mode + toggle | 6746a85, d52c736 |

## Next Up — Wearable Integration (Push 1 scope)

Full strategy in `docs/wearable-strategy.md`.

### Priority order:
1. **Apple Shortcut bridge** — gets Paul flowing on iOS, tests wearable-rich results
2. **Phase 2 restructure** — separate labs from wearables, per-device import guidance
3. **Mock wearable-rich results** — with real data, see how the page transforms
4. **Garmin partner access** — Andrew applies manually, ~2 business day review

### Agent kickoff prompts below (orchestrator writes, user spawns)

---

### Agent E: Phase 2 Restructure — Separate Labs from Wearables

```
Working on Phase 2 restructure. Read docs/wearable-strategy.md and CLAUDE.md before starting.

Task: Separate the Labs slide from wearable import in Phase 2. Currently they're mashed together
in slide 0 (index.html ~340-413). Labs and wearables are fundamentally different data sources.

Changes needed:
1. Slide 0 should be LABS ONLY — paste/dictate values, enter individually, lab file upload.
   Remove the wearable upload zone and "or" divider from this slide.
2. Add a new slide for WEARABLES (before or after Equipment, your call on ordering).
   - Upload zone for wearable export (Garmin CSV, Apple Health XML, Oura JSON)
   - Per-device guidance: "Using Garmin? Here's how to export..." / "Apple Watch? Here's how..."
   - The guidance should be collapsible — device name + 2-3 step instructions
   - Apple Health: Settings → Health → Export All Health Data → share the .xml
   - Garmin: Garmin Connect web → export Activities as CSV
   - Oura: Oura app → Settings → Account → Export Data → JSON
3. Update the stepper tabs in index.html to include the new slide
4. Update main.js slide navigation (advanceEnrichStep, _slideHasData, _initContinueWatchers)
   to handle the additional slide

Files in scope: index.html, src/main.js, css/app.css (if new styles needed for guidance cards)
Do NOT touch: render.js, score.js, wearable-import.js (parsers are fine)
Do NOT run pnpm build or pnpm screenshot — the orchestrator handles that.
When done, list exactly which files you changed and what you did.
```

### Agent F: Apple Health Shortcut Bridge (research + prototype)

```
Research and prototype an Apple Shortcut that reads HealthKit data and formats it for Baseline.

Context: Read docs/wearable-strategy.md for the full picture. Baseline is a web app that scores
health data against NHANES percentiles. Apple Health data is locked behind HealthKit (iOS native
only). We need a bridge that lets users get their data into our web app.

Task:
1. Research what HealthKit data types Apple Shortcuts can access. Specifically:
   - HKQuantityTypeIdentifierStepCount (daily steps)
   - HKQuantityTypeIdentifierRestingHeartRate
   - HKQuantityTypeIdentifierHeartRateVariabilitySDNN
   - HKQuantityTypeIdentifierVO2Max
   - HKCategoryTypeIdentifierSleepAnalysis
   Can Shortcuts read these? Over what time range? Any limitations?

2. Design the Shortcut flow:
   - Query last 30 days of each metric from HealthKit
   - Aggregate: compute daily averages for steps, sleep duration, RHR
   - Format as JSON matching our parser contract (see wearable-import.js Oura format as template)
   - Output: copy to clipboard OR open Baseline URL with data as query param

3. Write the Shortcut definition (or as close as you can get — describe each action step)
   and document any limitations discovered.

4. If Shortcuts can't access certain HealthKit types, document which ones and what the
   fallback is (manual XML export).

Output: A doc at docs/apple-shortcut-bridge.md with findings, the shortcut design, and
any blockers. Do NOT modify any app code — this is research + design only.
```

---

### Agent G: Mock Wearable-Rich Results Page

```
Working on mocking the wearable-rich results experience. Read docs/wearable-strategy.md and
docs/handoff-results-review.md before starting.

Context: The current results page assumes no wearable — top gaps are "Sleep Regularity, VO2 Max,
Daily Steps" all saying "Free with any wearable." With wearable data imported, those gaps close
and the results page transforms fundamentally.

Task: Create a mock profile in the scoring system that simulates a user WITH wearable data, then
analyze what the results page looks like.

1. Read app/score.js to understand the scoring engine inputs
2. Read app/src/wearable-import.js to see the metric keys and realistic value ranges
3. Create a test profile (as a JS object or inline in a scratch file) that has:
   - Demographics: 35M, 5'10", 195 lbs
   - Labs: LDL 120, HDL 55, triglycerides 110, glucose 92, HbA1c 5.4, ApoB 95
   - Wearable data: steps 8200, sleep 7.1h, RHR 62, HRV 38ms, VO2 max 42
   - BP: 122/78
   - Waist: 34"
   - Missing: Lp(a), hs-CRP, insulin, ferritin, sleep regularity
4. Trace through the scoring to determine:
   - What coverage score would this produce?
   - What would the top 3 gaps be?
   - Which health flags would trigger?
   - How does the results page hierarchy change vs. no-wearable?
5. Write up findings in docs/wearable-results-mock.md:
   - Side-by-side: current (no wearable) vs. wearable-rich
   - What sections change, what becomes irrelevant, what becomes prominent
   - Recommendations for results page adaptations

Do NOT modify any app code. This is analysis only.
Do NOT run pnpm build or pnpm screenshot.
```

## Known Issues (non-blocking for Push 1)

### SDNN vs RMSSD — Apple Health HRV mismatch
Apple Health exports `HeartRateVariabilitySDNN` but scoring expects `hrv_rmssd_avg` (RMSSD). Different metrics. Parser maps SDNN through as-is. See `docs/wearable-strategy.md` for details.

### Oura vs Garmin sleep duration inconsistency
Oura `total` = sleep time only (excludes awake). Garmin `Sleep Hours` may include time in bed.

### Return banner "Start fresh" — no confirmation
The return-visit banner has a bare "Start fresh" button with no confirmation gate. Results page version was fixed in 242902f but banner version was not.

### Feedback overlay hardcoded dark background
`.feedback-overlay` base rule has `background: rgba(8, 8, 10, 0.92)` hardcoded for dark. Should be tokenized.

### Haiku bounce failure leaves voice gate stuck
If `bounceToHaiku()` fails, pending items stay pending and submit button never enables. Catch block should fall back to regex-only resolution.

### Empty tracking-modules div in index.html
Standalone `tracking-modules` container renders empty when items merge into gap cards. Dead DOM, cleanup candidate.

## Resume Prompt

After /clear, paste this to resume as orchestrator:

```
You are the orchestrator. Read these files before doing anything:
1. docs/checkpoint-2026-03-02.md (current state + agent kickoff prompts)
2. docs/wearable-strategy.md (wearable research, market share, data contracts, integration paths)
3. git log --oneline -20 and git status

All design fixes are landed (19 commits ahead). Next workstream is wearable integration.
Three agent prompts are ready in the checkpoint:
- Agent E: Phase 2 restructure (separate labs from wearables)
- Agent F: Apple Shortcut bridge (research + prototype)
- Agent G: Mock wearable-rich results page

Andrew needs to apply for Garmin partner access manually:
https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/

NEVER use the Agent tool to spawn workers. Write kickoff prompts as text, user spawns them.
Small inline fixes (< 15 lines) are OK to do directly.
Do NOT run pnpm build or pnpm screenshot unless asked.
```
