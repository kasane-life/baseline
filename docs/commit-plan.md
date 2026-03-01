# Commit Plan — Baseline Repo Cleanup

## Status
~5,500 lines of uncommitted work across 22 modified + 24 untracked files, spanning multiple workstreams. This plan organizes them into clean, logical commits.

## Pre-commit: Gitignore additions
Add to `.gitignore` before anything else:
- `worker/.wrangler/` — local wrangler state (like `app/.wrangler/` already ignored)
- `skincare_log.csv` — personal data, should not be tracked

**Do NOT commit:** `worker/.wrangler/`, `skincare_log.csv`, `app/.env.production` (already covered by `.env` rule — verify)

---

## Commit 1: Passkey identity + sync feature (worker)
**Workstream:** Passkey auth + encrypted profile sync — the server side.

### Files
- `worker/src/auth.ts` (new) — WebAuthn registration/login endpoints
- `worker/src/jwt.ts` (new) — HMAC-SHA256 JWT via Web Crypto
- `worker/src/sync.ts` (new) — Encrypted profile sync endpoints (PUT/GET/meta)
- `worker/src/index.ts` (modified) — Auth + sync route wiring, CORS updates, CREDENTIALS KV
- `worker/wrangler.toml` (modified) — CREDENTIALS KV namespace binding
- `worker/package.json` (modified) — `@simplewebauthn/server` dep
- `worker/pnpm-lock.yaml` (modified)
- `worker/.gitignore` (new) — if it has worker-specific ignores

### Message
```
Add passkey identity layer and encrypted profile sync endpoints

WebAuthn registration/login with HMAC-SHA256 JWT auth.
Encrypted profile sync via KV (PUT/GET/meta) with 1MB size limit.
```

---

## Commit 2: Client identity + sync + db exports (app)
**Workstream:** Client-side identity, sync, and supporting db changes.

### Files
- `app/src/identity.js` (new) — Passkey register/login flows, JWT storage
- `app/src/sync.js` (new) — AES-256-GCM encrypted profile sync client
- `app/db.js` (modified) — exportAll/importAll for sync
- `app/storage.js` (modified) — storage layer changes supporting sync
- `docs/handoff-passkey-identity.md` (new) — Identity layer handoff doc

### Message
```
Add client-side passkey identity and encrypted profile sync

AES-256-GCM encryption with key management in localStorage.
Push/pull/syncOnLogin with debounced auto-push on data changes.
```

---

## Commit 3: 3-phase intake redesign + UI overhaul
**Workstream:** Intake redesign, tailwind migration, bridge.js removal, new modules.

### Files
- `app/index.html` (modified) — Restructured intake flow
- `app/css/app.css` (modified) — Tailwind migration (~1300 lines)
- `app/src/main.js` (modified) — New routing, module wiring
- `app/src/form.js` (modified) — Form changes for 3-phase
- `app/src/intake.js` (modified) — Intake flow changes
- `app/src/render.js` (modified) — Render additions
- `app/src/bridge.js` (deleted) — Removed, replaced by unified flow
- `app/src/phq9.js` (new) — PHQ-9 scoring module
- `app/src/bp-tracker.js` (new) — BP tracking module
- `app/src/feedback.js` (new) — Feedback module
- `app/package.json` (modified) — `@simplewebauthn/browser`, tailwind deps
- `app/pnpm-lock.yaml` (modified)
- `app/vite.config.js` (modified) — Vite config updates
- `app/voice.js` (modified) — Voice parser updates
- `app/voice.test.js` (modified) — New voice test cases
- `app/score.js` (modified) — Scoring changes
- `app/nhanes.js` (modified) — NHANES additions
- `app/favicon.svg` (new)
- `app/public/` (new) — PWA manifest, icons, service worker, NHANES data

### Message
```
Redesign intake as 3-phase flow with Tailwind CSS migration

Phase 1 (About You), Phase 2 (Import & Enrich), Phase 3 (Results).
Delete bridge.js, add PHQ-9 scoring, BP tracker, feedback module.
Tailwind CSS replaces hand-rolled styles. PWA manifest + service worker.
```

---

## Commit 4: Test infrastructure for encrypted profile sync
**Workstream:** This session's work — vitest setup + tests.

### Files
- `app/vitest.config.js` (new) — Vitest config (node env)
- `app/src/sync.test.js` (new) — 15 tests: encryption, key mgmt, sync logic
- `worker/vitest.config.ts` (new) — Cloudflare vitest pool config
- `worker/src/jwt.test.ts` (new) — 7 tests: JWT create/verify/authenticate
- `worker/src/sync.test.ts` (new) — 8 tests: sync CRUD, auth, validation, isolation
- `app/package.json` (modified) — `vitest` dev dep, `test`/`test:legacy` scripts
- `worker/package.json` (modified) — `vitest`, `@cloudflare/vitest-pool-workers`, `test` script, workers-types update
- `worker/wrangler.toml` (modified) — `nodejs_compat` flag
- `worker/tsconfig.json` (modified) — vitest pool types
- `app/pnpm-lock.yaml` (modified)
- `worker/pnpm-lock.yaml` (modified)

### Message
```
Add vitest test infrastructure for sync and auth

App: 15 tests covering AES-256-GCM encryption, key management, sync logic.
Worker: 7 JWT tests + 8 sync endpoint tests via @cloudflare/vitest-pool-workers.
Legacy voice tests preserved as pnpm run test:legacy (42 tests).
```

---

## Commit 5: Documentation
**Workstream:** Standalone docs that don't belong to a specific feature commit.

### Files
- `docs/handoff-ios-mobile.md` (new)
- `docs/handoff-project-context.md` (new)
- `docs/platform-strategy.md` (new)

### Message
```
Add project handoff and platform strategy docs
```

---

## Files to NOT commit
| File | Reason |
|------|--------|
| `worker/.wrangler/` | Local wrangler state (add to .gitignore) |
| `skincare_log.csv` | Personal data (add to .gitignore) |
| `banner/linkedin-logo.png` | Marketing asset — confirm if should be tracked |
| `banner/linkedin-logo.svg` | Marketing asset — confirm if should be tracked |
| `app/.env.production` | Should be covered by `.env` gitignore — verify |

---

## Execution notes

1. **Order matters.** Commits 1-3 are the feature work that tests (commit 4) depend on. Commit 5 is independent.
2. **Package.json + lockfiles** appear in multiple commits because each commit adds different deps. Stage carefully — the last commit to touch them wins, so commit 4 should be last to stage `package.json` changes.
3. **Practical approach:** Since package.json changes can't be split by hunk, the simplest path is:
   - Commits 1-3: stage only the source files (not package.json/lockfiles)
   - After commit 3: stage both package.json files and lockfiles together (all deps land at once)
   - Commit 4: stage test files, configs, wrangler.toml, tsconfig.json on top
4. **Verify after each commit:** `pnpm test` in both `app/` and `worker/`, plus `pnpm run test:legacy` in `app/`.

---

## Verification
```bash
cd ~/src/baseline/app && pnpm test              # 15 vitest tests
cd ~/src/baseline/app && pnpm run test:legacy    # 42 voice tests
cd ~/src/baseline/worker && pnpm test            # 15 vitest tests (7 JWT + 8 sync)
```

---

## Review Notes (Agent: iOS + PWA session, March 1)

### Commit 3 is too large — recommend splitting

Commit 3 mixes 4 distinct workstreams into ~1,300+ lines:
- 3-phase intake redesign (form.js, intake.js, phq9.js, HTML restructure)
- Tailwind CSS migration (~1,300 lines of CSS)
- PWA infrastructure (sw.js, manifest.json, icons, nhanes_percentiles.json in public/)
- iOS mobile fixes (touch targets, font sizes, safe area, meta tags)
- Feedback module + error boundary
- BP tracker module

**Recommended split:**
- **3a**: 3-phase intake redesign — form.js, intake.js, phq9.js, bridge.js deletion, HTML restructure, main.js routing
- **3b**: Tailwind CSS migration + design polish — app.css, vite.config.js (tailwind plugin)
- **3c**: iOS mobile + PWA — touch targets, font sizes, meta tags, safe area insets, public/ (sw.js, manifest.json, icons, favicon.svg, nhanes_percentiles.json), SW update toast
- **3d**: Feedback + BP tracker — feedback.js, bp-tracker.js, error boundary in main.js

This makes each commit reviewable and individually revertable. A CSS regression in the Tailwind migration doesn't force you to revert the intake redesign.

### Package.json staging strategy needs refinement

The current plan says "stage package.json last" but both `@simplewebauthn/browser` (identity) and `@tailwindcss/vite` (CSS migration) land in the same package.json. Since you can't split a package.json by hunk, consider:
- Stage package.json + lockfile with whichever commit is last before tests (commit 3 or 4)
- Or accept that package.json appears in one commit with all deps and note it in the message

### Missing from commit plan

- `app/public/nhanes_percentiles.json` — copy of NHANES data for dist inclusion (required for production build to work, discovered during PWA testing)
- `app/public/favicon.svg` — same reason, Vite hashes the root copy
- SW update toast CSS (`.sw-toast` in app.css) and listener in main.js
- `app/.env.production` needs to be verified against .gitignore — it contains `VITE_API_URL` which isn't a secret, but .env files are typically ignored

### Commit message for 3 (if kept as one)

Current message doesn't mention iOS fixes, PWA service worker, or mobile touch targets. If keeping as one commit, expand the message:
```
Redesign intake as 3-phase flow with Tailwind CSS, PWA, and iOS mobile fixes

Phase 1 (About You), Phase 2 (Import & Enrich), Phase 3 (Results).
Delete bridge.js, add PHQ-9 scoring, BP tracker, feedback module.
Tailwind CSS replaces hand-rolled styles.
PWA: manifest, service worker (stale-while-revalidate), offline scoring, update toast.
iOS: 44px touch targets, auto-zoom prevention, safe area insets, viewport-fit.
```

### Rollback consideration

No rollback strategy documented. If the Tailwind migration breaks something on production (GitHub Pages), what's the plan? Suggestion: tag the current HEAD before committing (`git tag pre-march-release`) so you can revert quickly.

---

## Review Notes (Agent: Test infra session, March 1)

### Commit 3 split — agree

The 3a-3d split is the right call. Each sub-commit is independently revertable, which matters especially for the Tailwind migration (highest risk of visual regressions). Do it.

### Rollback tag — agree

`git tag pre-march-release` before committing is cheap insurance. Do this first.

### Missing files — agree, good catches

nhanes_percentiles.json in public/, favicon.svg in public/, SW toast CSS — all real gaps in the original plan. These should land in commit 3c (iOS mobile + PWA).

### Package.json staging — resolved

Land both package.json files + lockfiles with commit 3d (last UI commit before tests). This captures all feature deps (`@simplewebauthn/browser`, `@tailwindcss/vite`, tailwindcss) in one place. Then commit 4 adds only test deps (`vitest`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types` bump) on top. Two package.json commits total — clean enough, don't overthink it.

### `.env.production` — keep out of git

`VITE_API_URL` isn't a secret, but `.env.*` files are conventionally gitignored. The `.env` rule in .gitignore already covers it. Document the value in `docs/handoff-project-context.md` or a README instead of committing the file.

### Commit 5 should also include `docs/infrastructure-decisions.md`

Decision 5 (Testing Strategy) was added to `infrastructure-decisions.md` during this session. Include it in the docs commit.

### Execution order (final)

```
0. git tag pre-march-release
1. .gitignore additions (worker/.wrangler/, skincare_log.csv)
2. Commit 1: Passkey identity + sync (worker source only)
3. Commit 2: Client identity + sync (app source only)
4. Commit 3a: 3-phase intake redesign
5. Commit 3b: Tailwind CSS migration
6. Commit 3c: iOS mobile + PWA (including public/ assets)
7. Commit 3d: Feedback + BP tracker + package.json + lockfiles (all deps)
8. Commit 4: Test infrastructure (vitest configs, tests, wrangler.toml, tsconfig.json, test deps in package.json)
9. Commit 5: Documentation (handoff docs, platform strategy, infrastructure-decisions.md update)
```
