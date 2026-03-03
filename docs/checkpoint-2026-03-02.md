# Checkpoint — March 2, 2026 (evening session #4)

## Current State
~40 commits pushed to origin (f3de511). Beta live at `beta.mybaseline.health`.
Landing page live at `mybaseline.health` via GitHub Pages.
First external tester (Mike Deal) went through full flow — feedback captured in `docs/feedback-log.md`.

## This Session (late afternoon/evening)

### Beta Gate + Analytics — SHIPPED (earlier)
Email gate, analytics tracker, mobile form default, About link fix. All deployed.

### Landing Page Polish — SHIPPED
- Fixed 404s on methodology and gaps links (relative paths)
- Added back links to all subpages
- Playwright link test suite (11 tests) + GitHub Actions CI
- b. favicon mark on subpage headers
- Sticky headers: back link left, inverted logo right, stays visible on scroll
- Font readability: `text-muted` bumped from `#7a7a88` → `#a8a8b8` across all 4 pages

### Garmin CSV Parser — SHIPPED
Mike couldn't export data — Garmin Health & Fitness exports are per-metric (Steps, Sleep, etc. separately).
- Built parsers for each Garmin CSV format (Steps, Sleep, HRV, RHR)
- Sleep CSV is the richest: has duration, RHR, and HRV in one file
- Multiple Garmin CSVs merge into one result (file input already accepts `multiple`)
- Updated export guide: "Reports → Health & Fitness → Steps + Sleep"

### Phase 2 Back Button — SHIPPED
- Added back button next to continue button in stepper nav
- Shows after first slide, hidden on slide 0

### Voice Checklist Overwrite — SHIPPED
- Re-dictating now overwrites previously checked items (was locked after first check)
- `source === 'ai'` bypasses `checklistLocked` guard

### Smart Lab Panel Detection — SHIPPED
Mike uploaded an autoimmune panel (Quest/Function Health) — got "no biomarkers found" with no explanation.
- Added `detectPanelType()` to lab-parser.js — detects autoimmune, thyroid, urinalysis, coagulation, allergy panels
- Shows specific message: "looks like an autoimmune panel" + hint to find lipid/metabolic panel
- Upload zone text updated: "Upload your lipid or metabolic panel"
- Added slide hint: "Lipid panel, metabolic panel, CBC — the standard blood work from your annual physical"

### Analytics `/track` → `/t` Rename — SHIPPED
Ad blockers were blocking `/track`. Renamed client-side URL to `/t`, worker accepts both.

### Phase 2 Skip Buttons — SHIPPED
Each slide has a contextual skip: "I don't wear one", "I don't have labs", "None of these", "No medications", "Skip this"

### Feedback Log — CREATED
`docs/feedback-log.md` — Mike's feedback organized by area (Garmin export, landing page, app, messaging).

## Mike's Feedback Summary (full details in docs/feedback-log.md)

**Resolved this session:**
- Garmin export was broken → new per-metric parser
- No back button in Phase 2 → added
- Lab upload unclear → specific panel language + smart detection
- Font hard to read → bumped text-muted brightness

**Open — next priorities:**
- Back to edit values from results page (kick back to Phase 2)
- Consider fusing Phase 1 + Phase 2 into single flow
- Landing page restructure: hooks first → explanation → "what do I do about it"
- "How do I know if I'm healthy?" as lead hook
- BP section needs more context
- Coverage score needs explanation
- "Data is everywhere but nowhere" — lean into this messaging
- Founder story / About page
- Ancillary lab data (autoimmune, etc.) — store but don't score?

## Known Issues (carried forward)

### Profile field naming asymmetry
`hrv_rmssd_avg` field name used even when value is SDNN. Future refactor: rename to `hrv_avg` + `hrv_type`.

### U-shaped sleep duration scoring
Cutoff table treats sleep as higher-is-better up to 9.5h. Needs target range.

### "Load previous" doesn't restore wearable/lab uploads
Profile fields persist in localStorage but file-based imports don't.

### Wearable freshness decay
Single import degrades in 2 weeks without re-import guidance.

### Garmin API
Developer app submitted March 2. OAuth integration will replace the export-import flow.

## Still On Deck

1. **Back to edit from results page** — kick back to Phase 2, let user update values
2. **Phase 1 + Phase 2 fusion question** — separate or combined flow?
3. **Landing page restructure** — per Mike's feedback (hooks first, less scrolling)
4. **Founder story / About page** — Mike's suggestion
5. **Paul test** — messaged, waiting for iPhone feedback
6. **Apple Shortcut build** — per `docs/apple-shortcut-bridge.md`
7. **Garmin API approval** — check ~March 4
8. **Ancillary lab data** — design how to store/display non-scored panels
9. **Reddit posts** — per content calendar
10. **Sleep regularity post** — drafted, schedule Thu/Fri

## Resume Prompt

After /clear, paste this to resume:

```
You are the orchestrator. Read these files before doing anything:
1. docs/checkpoint-2026-03-02.md (full state)
2. docs/feedback-log.md (Mike's feedback)
3. git log --oneline -10 and git diff --stat

Where we are:
- Beta live at beta.mybaseline.health — first external tester (Mike) gave feedback
- ~40 commits pushed, all changes deployed
- Garmin per-metric CSV parser, smart lab panel detection, Phase 2 back button all shipped
- Font readability improved across app + landing
- Landing page: sticky headers, Playwright CI, inverted logo

Next immediate:
1. Back to edit from results page (kick back to Phase 2)
2. Phase 1 + Phase 2 flow fusion decision
3. Landing page restructure (hooks first, per Mike feedback)
4. Wait for Paul's iPhone test
5. Garmin API approval check (~March 4)

NEVER use the Agent tool to spawn workers. Write kickoff prompts as text, user spawns them.
Small inline fixes (< 15 lines) are OK to do directly.
Do NOT run pnpm build or pnpm screenshot unless asked.
```
