# Plan: Playwright Screenshot Pipeline

## Problem

Agents build UI blind. Code gets written, `pnpm build` confirms it compiles, but nobody sees what it actually looks like until the user opens a browser. Basic layout issues — overflow, broken spacing, mobile viewport problems — ship constantly because the feedback loop has no visual step.

## Goal

Add a `pnpm screenshot` command that captures the full user flow at key viewports, producing PNGs an agent can review before calling the work done.

## How It Fits the Current Workflow

Current flow (from `docs/dev-workflow.md`):
```
agent edits code → pnpm build → user refreshes preview server → user spots issues
```

New flow:
```
agent edits code → pnpm build → pnpm screenshot → agent reviews PNGs → fixes issues → done
```

Key constraints preserved:
- **Agents still never spawn long-running servers.** Playwright launches its own headless browser, takes screenshots, and exits. No orphan processes.
- **Preview server stays user-owned.** Screenshots run against the build output directly (Playwright can serve static files itself via a test fixture), OR against `localhost:4173` if the preview server is running.
- **pnpm only.** Playwright is a dev dependency in `app/`.

## What Gets Installed

```bash
cd ~/src/baseline/app
pnpm add -D @playwright/test
pnpm exec playwright install chromium  # ~150MB, chromium only (no firefox/webkit needed)
```

We only install Chromium. Why not WebKit (which is what iOS Safari uses)?
- Playwright's WebKit is not the same engine as real iOS Safari — it's a desktop WebKit port
- For actual Safari testing, the iOS Simulator is the real answer (already set up)
- Chromium catches 95% of layout/visual issues and is faster to run

## What Gets Built

### 1. Screenshot script: `app/screenshots/capture.mjs`

A Playwright script (not a test suite) that:
- Starts a local server from `dist/` (dies when the script ends)
- Navigates the main user flow: landing → intake → each phase tab (Labs, Equip, Meds, PHQ-9) → results
- Captures at 2 viewports:
  - **Mobile:** iPhone 16 (393×852)
  - **Desktop:** 1440×900
- Saves PNGs to `app/screenshots/output/` with clear names:
  ```
  mobile-01-landing.png
  mobile-02-intake-labs.png
  mobile-03-intake-equip.png
  mobile-04-intake-meds.png
  mobile-05-intake-phq9.png
  mobile-06-results.png
  desktop-01-landing.png
  ...
  ```

### 2. Package.json script

```json
"screenshot": "pnpm build && node screenshots/capture.mjs"
```

Build + capture in one command. Agent runs `pnpm screenshot`, then reads the output PNGs.

### 3. Gitignore

Add `app/screenshots/output/` to `.gitignore` — these are ephemeral build artifacts.

## What Does NOT Get Built

- **No visual regression / diff tooling** (Percy, Chromatic, etc.) — overkill for a solo project. The agent's eyes are the comparison.
- **No CI integration** — this is a local dev tool, not a gate.
- **No WebKit/Firefox** — Chromium only. Safari quirks get caught in the Simulator.
- **No Playwright Test runner** — just a script. No test framework overhead, no `expect()` assertions. Pure screenshot capture.

## Workflow for Agents

After this ships, the agent workflow doc (`docs/dev-workflow.md`) gets updated:

```markdown
## Visual Check

After CSS/HTML/JS changes:

\```bash
cd ~/src/baseline/app
pnpm screenshot       # builds + captures all screens
\```

Screenshots land in `app/screenshots/output/`. Review them before calling the work done.
Check for: overflow, spacing, text truncation, mobile layout, touch target sizes.
```

## Estimated Scope

- 1 new file: `app/screenshots/capture.mjs` (~80-100 lines)
- 1 edit: `app/package.json` (add dep + script)
- 1 edit: `app/.gitignore` or root `.gitignore`
- 1 edit: `docs/dev-workflow.md` (add visual check section)

## Decisions

1. **Which flows?** Main intake flow + all reachable secondary screens (about, voice modal, etc.).
2. **Light mode?** Yes — capture both dark and light mode variants. Script toggles `prefers-color-scheme` via Playwright's `colorScheme` emulation. This means the app needs to support a light theme (or we'll see exactly where it breaks).
3. **Populated states?** Yes — multiple scenarios to exercise decision branches:
   - **Empty state:** No data entered, all forms blank
   - **Partial fill:** Labs only (common first-time user)
   - **Full fill:** All phases populated with sample data
   - **Edge cases:** Long text values, boundary numbers, fields that trigger conditional UI

   The script defines sample data sets and runs each scenario as a separate pass, naming screenshots accordingly:
   ```
   mobile-dark-empty-01-landing.png
   mobile-dark-full-03-intake-equip.png
   desktop-light-partial-06-results.png
   ```
