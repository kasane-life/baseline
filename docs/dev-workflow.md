# Dev Workflow — Baseline

## Dev Server

**One shared preview server. Agents never spawn servers.**

```
http://localhost:4173/baseline/app/
```

### Rules

1. **The user starts the preview server** — `pnpm preview --port 4173 --strictPort` from `app/`. This is the only server instance.
2. **Agents run `pnpm build`** — this writes to `dist/`. The preview server serves whatever's in `dist/`, so the user sees the latest build by refreshing.
3. **Agents never run `pnpm preview`, `pnpm dev`, or `python3 -m http.server`** — no spawning servers. If you need to verify your changes compile, `pnpm build` is sufficient.
4. **If the server isn't running**, tell the user: "Preview server isn't up — run `pnpm preview --port 4173 --strictPort` from `app/`."

### Why

Multiple agents spawning servers burns through ports (4173, 4174, 4175...) and leaves orphan processes. One server, many builders.

## Build & Test

```bash
cd ~/src/baseline/app
pnpm build              # Production build (~200ms)
node voice.test.js      # 42 voice parser tests
pnpm test               # Vitest (sync, encryption tests)
```

Always run `pnpm build` after CSS/HTML/JS changes to verify they compile. Run `node voice.test.js` if you touched voice.js or score.js.

## Visual Check

After CSS/HTML/JS changes, **always** run the screenshot pipeline:

```bash
cd ~/src/baseline/app
pnpm screenshot       # builds + captures all screens at mobile/desktop, dark/light
```

Screenshots land in `app/screenshots/output/`. **Review them before calling work done.**

Check for:
- Overflow and clipping
- Spacing and padding between elements
- Text alignment (centered vs left-justified)
- Touch target sizes on mobile
- Duplicate or competing CTAs (only one red button per screen)
- Empty state vs populated state differences
- Content that floats without visual containment

## File Structure

| Path | What |
|------|------|
| `app/index.html` | Main HTML — intake phases + results |
| `app/css/app.css` | All styles (Tailwind v4 + @apply) |
| `app/src/main.js` | Entry point, phase navigation, event wiring |
| `app/src/render.js` | Results page rendering |
| `app/src/form.js` | Form field handling |
| `app/src/intake.js` | Intake flow logic |
| `app/score.js` | Scoring engine (don't touch unless asked) |
| `app/voice.js` | Voice parser (don't touch unless asked) |

## CSS Conventions

- Tailwind v4 with `@theme {}` block for design tokens
- Component styles use `@apply` — keeps class names semantic, internals are Tailwind utilities
- Inline Tailwind classes for one-off elements in HTML
- Design tokens: `--color-bg`, `--color-accent`, `--color-success`, etc.

## Git

- Working directory: `/Users/adeal/src/baseline/`
- Don't commit unless the user asks
- Don't push unless the user asks
- See `docs/commit-plan.md` for the organized commit strategy

## Session Management

### When to start a new session
- Switching workstreams (e.g., worker API → frontend design)
- Context has >30 messages or 2-3 direction changes
- You've been pasting broken code back and forth without progress
- The agent suggestions start feeling off or repetitive

### When to stay in the same session
- Iterating on the same module with focused, linear refinements
- Last 5-10 messages are directly about the same artifact
- You're doing small adjustments: "tighter spacing," "rename this," "add a test"

### Handoff protocol
When ending a session or passing work to another agent:
1. Run `pnpm build` — confirm it passes
2. Run `pnpm screenshot` — confirm visual output looks right
3. Update or create a `docs/handoff-*.md` with:
   - What was built/changed
   - Which files were modified
   - Open items or known issues
   - Files to avoid (if another agent owns them)
4. The next session starts by reading `CLAUDE.md` + the relevant handoff doc

### Multi-agent file ownership
High-conflict files that multiple agents touch:

| File | Coordination rule |
|------|-------------------|
| `index.html` | Add slots/containers only — don't restructure |
| `css/app.css` | Append new sections at the bottom with a comment header |
| `src/main.js` | Import + one-line wiring only — logic goes in dedicated modules |
| `src/render.js` | Import + one-line calls — rendering logic goes in dedicated modules |

New features should live in their own module (`src/discovery.js`, `src/bp-tracker.js`, etc.) and wire into shared files with minimal surface area.
