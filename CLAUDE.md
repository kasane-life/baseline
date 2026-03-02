# Baseline — Project Instructions

## Dev Server — READ THIS FIRST

**Never spawn dev/preview servers.** One shared preview server runs on `localhost:4173`. Agents only run `pnpm build` from `app/`. See `docs/dev-workflow.md` for details.

## Build Conflicts — READ THIS IF RUNNING IN PARALLEL

**Only one agent builds at a time.** Multiple agents running `pnpm build` or `pnpm screenshot` simultaneously will corrupt `dist/`. If you are a sub-agent or running alongside other agents:
- **Do NOT run `pnpm build` automatically.** Make your code changes, then tell the user what you changed and ask them to build.
- **Do NOT run `pnpm screenshot`.** The orchestrator or user handles visual checks.
- The only exception: if the user explicitly tells you to build.

## Quick Reference

```bash
cd ~/src/baseline/app
pnpm build              # Build (always do this after changes)
node voice.test.js      # 42 voice tests
pnpm test               # Vitest suite
```

## Architecture

- **App entry**: `app/index.html` → `app/src/main.js`
- **Styles**: `app/css/app.css` (Tailwind v4, @apply pattern)
- **Scoring**: `app/score.js` — don't modify unless explicitly asked
- **Voice**: `app/voice.js` — don't modify unless explicitly asked
- **Worker**: `worker/` — Cloudflare Workers (auth, sync)
- **Docs**: `docs/` — product vision, architecture, handoffs

## Key Docs

- `docs/dev-workflow.md` — dev server rules, build/test, file map
- `docs/product-vision.md` — Record + Loop thesis, what the product is
- `docs/handoff-design-review.md` — results page redesign priorities
- `docs/commit-plan.md` — organized commit strategy for uncommitted work

## Don't

- Don't spawn servers (`pnpm dev`, `pnpm preview`, `python3 -m http.server`)
- Don't commit or push without being asked
- Don't modify `score.js` or `voice.js` without being asked
- Don't use npm (use pnpm)

## Session Hygiene — Read This

Quality degrades when context gets polluted. Follow these rules to stay sharp.

### One task per session
Each session handles one focused task: "build the discovery form," "fix Phase 2 navigation," "refactor render.js." If the user changes direction, expect a new session with a fresh handoff.

### Before writing code
1. **Read the relevant files first.** Don't propose changes to code you haven't read.
2. **Read the handoff doc** if one exists for your workstream (check `docs/handoff-*.md`).
3. **Check what other agents touched recently** — run `git diff --stat` and `git log --oneline -5` to see recent changes. Don't overwrite or conflict with in-flight work.

### While writing code
- **One change per turn.** Don't refactor + add features + fix bugs in the same edit. Each turn should be a single, checkable change.
- **Build after every change.** Run `pnpm build` from `app/`. If it fails, fix it before moving on.
- **Don't accumulate broken state.** If something isn't working after 2-3 attempts, stop and restate the problem clearly instead of piling on fixes.
- **Minimal edits only.** Change what's needed, nothing else. Don't reorganize imports, add comments, or "improve" surrounding code.

### When debugging
Don't just look at the broken output — restate:
1. What the code is supposed to do (the spec)
2. What it actually does (the bug)
3. The minimal change to fix it

### File coordination
Shared files (`index.html`, `main.js`, `app.css`, `render.js`) are high-conflict. When modifying:
- Make surgical edits, not rewrites
- Document what you changed in your handoff doc
- If another agent's work is in the same file, flag it to the user before editing

### Visual check
After CSS/HTML/JS changes: `pnpm screenshot` from `app/`. Review the PNGs in `screenshots/output/` before calling work done. See `docs/dev-workflow.md` for the checklist.
