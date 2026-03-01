# Baseline: Shared Project Context

*Last updated: 2026-03-01*

## What Baseline Is

A local-first web app that scores your health data coverage. You input labs, vitals, wearable metrics, and lifestyle data. It tells you where you stand (NHANES percentile benchmarks), what's missing, and what to do next.

Think of it as a health data credit score — one number that captures how well you're monitoring your health, with actionable gap analysis.

## Where It Lives

- **Repo root**: `/Users/adeal/src/baseline/`
- **Web app**: `/app/` — the main product
- **Entry point**: `/app/index.html`
- **JS source**: `/app/src/` (ES modules, vanilla JS, no framework)
- **Scoring engine**: `/app/score.js`
- **NHANES data**: `/app/nhanes.js` + `nhanes_percentiles.json`
- **Storage**: `/app/storage.js` + `/app/db.js` (IndexedDB via Dexie)
- **CSS**: `/app/css/app.css`
- **Build**: Vite — `pnpm build` → `/app/dist/`
- **Dev server**: `python3 -m http.server 8787` from repo root → `http://localhost:8787/app/index.html`
- **Docs**: `/docs/` — architecture, scoring algorithm, research, etc.
- **Tests**: `voice.test.js` — 39 tests for voice parser (`node voice.test.js`)
- **Landing page**: `/landing/` — separate static page (GitHub Pages)

## Architecture

**Local-first.** All health data stays in the browser. IndexedDB stores a time-series profile: each metric has an array of `{value, date, source}` observations. No server stores health data.

**Voice-first intake.** The hero experience is dictation: "I'm 35, male, 5'10, 195 pounds, blood pressure 115 over 69, no family history." Web Speech API transcribes → custom parser extracts structured data → form fields auto-populate.

**3-phase flow** (just implemented):
1. **Phase 1 — About You**: Voice or form tab. 7 core fields: age, sex, height, weight, BP, waist, family history.
2. **Phase 2 — Import & Enrich**: Shared screen for both paths. Labs (PDF upload/paste/manual), equipment check (BP cuff, scale, tape measure), medications (typeahead search), PHQ-9 depression screening (direct score or full questionnaire).
3. **Phase 3 — Results**: Coverage score ring, tier bars with standing colors, NHANES percentile benchmarks, "next 3 moves," gap cards, post-score action modules (BP tracking protocol).

**Scoring**: Tiered metric system. Tier 1 (high weight): ApoB, BP, metabolic panel, sleep, cardiorespiratory fitness. Tier 2 (lower weight): inflammation, liver, thyroid, PHQ-9, etc. Each metric gets a standing (Optimal → Concerning) and NHANES percentile. Total coverage score is weighted sum.

**Post-score modules**: After scoring, users get action prompts. First one built: 7-day BP tracking protocol (log daily readings → average → re-score).

## Key Files Quick Reference

| File | What it does |
|------|-------------|
| `app/index.html` | Full app HTML — phases, voice UI, form fields, results |
| `app/src/main.js` | Entry point — init, window bindings, phase navigation, compute flow |
| `app/src/form.js` | Form state, step navigation, `buildProfile()`, `populateForm()` |
| `app/src/intake.js` | Voice dictation, speech recognition, checklist, extraction |
| `app/src/render.js` | Results rendering — score ring, tiers, moves, gaps, insights |
| `app/src/lab-import.js` | Lab PDF/text parsing, paste zone, file upload |
| `app/src/meds.js` | Medication typeahead search + tag management |
| `app/src/phq9.js` | PHQ-9 depression screening (questionnaire + direct entry) |
| `app/src/bp-tracker.js` | Post-score BP tracking protocol module |
| `app/src/logger.js` | Namespaced console logger |
| `app/voice.js` | Voice transcript parser (extracts structured data from speech) |
| `app/score.js` | Scoring engine — tiered metrics, standings, percentiles, freshness |
| `app/nhanes.js` | NHANES percentile lookup tables |
| `app/storage.js` | IndexedDB operations (Dexie wrapper) — save/load profiles |
| `app/db.js` | Low-level Dexie DB setup, export/import |
| `app/css/app.css` | All styles — dark theme, form, results, voice UI, mobile |

## Design Language

- **Theme**: Dark (#08080a background), red accent (#c83c3c)
- **Fonts**: Barlow Condensed (display/headings), DM Sans (body), JetBrains Mono (data/mono)
- **Vibe**: Premium health tech. Think Oura app meets Linear. Refined minimal, not clinical.
- **Favicon**: `b.` mark — white "b" on dark rounded square with red period dot

## The Altitude Framework

How we decide what to build (see `docs/altitude-framework.md` for full version):

- **10K ft**: Signal detection (landing page, "do you even have labs?")
- **5K ft**: Measurement & benchmarking ← **Baseline lives here**
- **1K ft**: Protocols & interventions (personal, not scalable yet)
- **500 ft**: Longitudinal intelligence (pattern recognition, future)
- **Ground**: Clinical/genomic (out of scope)

Use this as a complexity check. If a feature drops below 5K, ask whether it belongs.

## Active Workstreams (March 2026)

| Stream | Owner | Status | Handoff Doc |
|--------|-------|--------|-------------|
| Phase 2 design polish | Andrew + primary agent | Active | — |
| Garmin integration | Andrew + primary agent | Next up | `/docs/handoff-garmin-integration.md` (TBD) |
| Passkey identity | Separate agent | Ready to start | `/docs/handoff-passkey-identity.md` |
| iOS mobile compat | Separate agent | Ready to start | `/docs/handoff-ios-mobile.md` |

## User Context

- **Andrew Deal**: 35M, former personal trainer + gym owner. Uses Android + Garmin (no iOS/Apple Health). Building this as both user and developer.
- **Paul**: First external test user. iOS. Success = "Paul completes the full flow on his iPhone."
- **Audience**: Health-conscious people who get labs done and want to know what they mean. Skews iOS-heavy.

## Rules

- Use `pnpm` (never npm)
- Use `python3` (never python)
- No secrets in code
- Local-first: no health data leaves the browser
- Avoid over-engineering — build for the current task, not hypothetical futures
- Test: `pnpm build` must succeed, `node voice.test.js` must pass (39 tests)

## How Workstreams Stay in Sync

Each agent should:
1. Read this doc + their specific handoff doc before starting
2. Work within their scope — don't modify files owned by another workstream without flagging it
3. If you need to touch a shared file (like `index.html` or `main.js`), document what you changed and why
4. When done, update your handoff doc with what was built, what changed, and any open items

---

## Review Notes (Agent: iOS + PWA session, March 1)

### Workstream table update needed

The table lists "iOS mobile compat" as "Ready to start" — it's now implemented (CSS fixes, touch targets, PWA, meta tags). Update status to "Implemented — awaiting real device testing."

Also missing from the table:
- **PWA infrastructure** — manifest, service worker, offline scoring, update toast. Implemented March 1. No separate handoff doc needed — covered in `handoff-ios-mobile.md` implementation notes and `platform-strategy.md`.

### Stale doc: `onboarding-intake-map.md`

This doc (if it still exists) describes the old single-question wizard model. The 3-phase flow described in this project context doc supersedes it. Should be deleted or updated to avoid confusing another agent.

### Missing handoff docs

- `docs/handoff-garmin-integration.md` — referenced in workstream table as TBD but doesn't exist. Should be created before that workstream starts.
- Post-score engagement (queue model, timeline cards) — designed in `docs/ux-philosophy.md` but has no implementation handoff. Worth creating when that workstream is assigned.

### Dev server note

Doc says `python3 -m http.server 8787` for dev server. With the Vite + Tailwind setup now in place, `pnpm dev` (Vite dev server on port 8787) is the correct dev path. The python server won't process Tailwind or resolve ES module imports correctly.

### New key files

Add to the quick reference table:
- `app/src/identity.js` — Passkey register/login flows, JWT management
- `app/src/sync.js` — AES-256-GCM encrypted profile sync client
- `app/src/feedback.js` — Error boundary, breadcrumb tracking, feedback overlay
- `app/src/bp-tracker.js` — Post-score 7-day BP tracking protocol
- `app/public/sw.js` — Service worker (stale-while-revalidate caching)
- `app/public/manifest.json` — PWA web app manifest
- `docs/platform-strategy.md` — Web vs native decision framework
- `docs/commit-plan.md` — Organized commit plan for all uncommitted work
