# Infrastructure Decisions

## Status: Active decision log

---

## Decision 1: Serverless Provider

**Date:** Feb 27, 2026
**Decision:** Cloudflare Workers
**Status:** Decided, not yet deployed

### Context

Baseline needs a thin serverless layer for:
1. PDF lab report parsing (proxy to Claude API — can't expose API key client-side)
2. Wearable OAuth token exchange (future — Garmin, Oura, Whoop)
3. Optional encrypted profile sync (future)

The function is trivially simple: receive text, call Claude, return structured JSON. No database, no file system, no long-running computation.

### Options Evaluated

#### Cloudflare Workers
```
+ 0ms cold start (V8 isolates, not containers)
+ Free tier: 100K requests/day (3M/month)
+ Paid: $5/month for 10M requests + higher CPU limits
+ Global edge deployment (runs close to the user)
+ Simple deploy: `wrangler deploy` (one command)
+ KV storage included (for OAuth tokens, rate limiting)
+ R2 object storage available (for future encrypted profile backup)
+ Workers AI available (could run smaller models at the edge — future alternative to Claude for parsing)
+ Sits alongside GitHub Pages without touching hosting
- V8 runtime only — no native Node.js APIs (no fs, child_process, etc.)
- 10ms CPU limit on free tier (but network/IO time doesn't count)
- 30s wall-clock limit on paid
- Smaller ecosystem than AWS (fewer tutorials, examples)
```

#### Vercel Edge Functions / Serverless Functions
```
+ Good developer experience (git push to deploy)
+ Edge functions: 0ms cold start (V8, like Workers)
+ Serverless functions: full Node.js runtime
+ Free tier: 100K edge invocations/month, 100 GB-hours serverless
+ Built-in CI/CD, preview deployments
+ Vercel AI SDK has nice abstractions for streaming LLM responses
- Wants to own your hosting (pushes you toward Vercel for everything)
- Edge functions have same V8 limitations as Workers
- Pro plan at $20/month is more expensive for what we need
- Serverless functions have cold starts (~250ms)
- Would need to move or dual-host (landing on Vercel, app on GitHub Pages = messy)
```

#### AWS Lambda
```
+ Full runtime: Node.js, Python, Go, Rust, whatever
+ Most powerful / flexible
+ Free tier: 1M requests + 400K GB-seconds/month
+ Massive ecosystem, documentation, community
+ Can handle any computation complexity
- Cold starts: 100-500ms (worse with larger bundles)
- Setup complexity: API Gateway, IAM roles, CloudFormation/SAM/CDK
- More infrastructure to maintain (API Gateway config, Lambda layers, etc.)
- Billing is complex (duration × memory × requests)
- Overkill for a single proxy function
- Feels like bringing a tank to a knife fight
```

#### Deno Deploy
```
+ V8 runtime, 0ms cold start (similar to Workers)
+ Free tier: 100K requests/day
+ TypeScript-first
+ Simple deploy
- Smaller ecosystem
- Less mature than Cloudflare
- No equivalent of KV/R2 storage
- Less momentum in the market
```

### Decision Rationale

**Cloudflare Workers wins on:**
1. **Simplest setup.** `wrangler init && wrangler deploy`. No API Gateway, no IAM, no build pipeline.
2. **Fastest cold start.** 0ms means the first user request is as fast as the millionth. Lambda's cold starts are noticeable for a health app where users import infrequently.
3. **Free tier is generous.** 100K requests/day is more than enough for early stage. Even at 10K users, we'd need maybe 50K requests/month.
4. **Sits alongside GitHub Pages.** No hosting migration needed. Workers runs on its own domain (or a custom subdomain like `api.andrewdeal.info`).
5. **R2 + KV included.** When we need OAuth token storage or encrypted profile backup, it's already in the platform. No new service to configure.
6. **Workers AI as a hedge.** If Claude API costs become a concern at scale, Cloudflare offers edge inference on open models. Could run a fine-tuned lab parser locally at the edge.

**Cloudflare Workers loses on:**
1. **V8-only runtime.** Can't use Node.js-specific libraries. But the Anthropic SDK works in V8, and we don't need anything else.
2. **10ms CPU limit (free tier).** Claude API response time is network-bound, not CPU-bound. The Worker just forwards the request. CPU limit is a non-issue for this use case.

### Implementation Plan

```
baseline-api/               # separate repo or directory
├── wrangler.toml           # Cloudflare config
├── src/
│   └── index.ts            # single Worker entry point
├── .dev.vars               # local env (ANTHROPIC_API_KEY)
└── package.json
```

**Endpoints:**
```
POST /parse-lab
  Request:  { text: "extracted PDF text...", format_hint?: "quest" | "labcorp" | "unknown" }
  Response: { draw_date: "2026-01-15", fasting: true, biomarkers: { ldl_c: { value: 128, unit: "mg/dL" }, ... } }
  Auth:     Origin check (only accept requests from andrewdeal.info) + optional API key for rate limiting

POST /parse-lab-image  (future)
  Request:  { image_base64: "...", page_number: 1 }
  Response: same as above

GET /oauth/:provider/authorize  (future)
GET /oauth/:provider/callback   (future)
```

**Estimated cost:**
- Free tier covers all foreseeable usage
- Even at paid tier ($5/month), it's the cheapest option
- Claude API cost per parse: ~$0.003 (Sonnet, ~1K input tokens)
- 1,000 parses/month = $3 Claude + $0 Workers = $3/month total

---

## Decision 2: Client-Side Storage

**Date:** Feb 27, 2026
**Decision:** IndexedDB (replacing localStorage)
**Status:** Decided, migration needed

### Context

v1 uses localStorage via `storage.js`. This works for a flat profile (one value per metric) but doesn't support:
- Time-series data (multiple observations per metric with dates)
- Large datasets (wearable data: 90+ days of daily readings)
- Structured queries (find latest value, compute trends)

### Why IndexedDB over localStorage

| | localStorage | IndexedDB |
|---|---|---|
| **Size limit** | 5-10MB | Effectively unlimited (browser prompts above ~50MB) |
| **Data types** | String only (must JSON.stringify) | Structured objects, binary blobs |
| **API** | Synchronous (blocks main thread) | Async (non-blocking) |
| **Queries** | None (full scan) | Indexes, key ranges, cursors |
| **Transactions** | None | Full ACID transactions |

For a time-series profile with 7 lab reports + 90 days of wearable data (~500KB-2MB), either would work size-wise. But the async API and structured queries make IndexedDB the right choice as data grows.

### IndexedDB Schema

```javascript
// Database: "baseline"
// Version: 1

// Object store: "profile"
// Key: "current" (single profile for now, multi-profile future)
// Contains: demographics, meta, imports array

// Object store: "observations"
// Key: auto-increment
// Indexes: [metric, date], [metric], [source], [import_id]
// Each record: { metric: "ldl_c", value: 128, date: "2026-01-15", source: "quest_pdf", import_id: "imp_001", unit: "mg/dL", flag: null }

// Object store: "imports"
// Key: id
// Each record: { id: "imp_001", filename: "quest_results.pdf", source_type: "lab_pdf", draw_date: "2026-01-15", ... }
```

**Why separate observations from profile?** Observations are the hot data — queried frequently (latest per metric, trends, aggregations). Profile/demographics are cold data — read once on load. Separating them allows IndexedDB indexes to work efficiently on the observations store.

### Alternative Considered: sql.js (SQLite in browser)

```
+ SQL queries on structured data (SELECT latest value per metric, GROUP BY, etc.)
+ Familiar query language
+ Single-file database exportable as a blob
- Adds ~500KB to page weight (WASM module)
- Another dependency to maintain
- IndexedDB with good indexes handles our query patterns fine
- Overkill for 20 metrics × ~100 observations
```

**Verdict:** IndexedDB is sufficient. sql.js would be justified if we were doing complex analytical queries across thousands of observations, but our query patterns are simple (latest per metric, all observations for one metric sorted by date).

### Persistence Safety

```javascript
// Request persistent storage on first use
async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`Persistent storage: ${granted ? 'granted' : 'denied'}`);
    // If denied, storage may be evicted under pressure
    // Show a subtle warning + export prompt
    if (!granted) {
      showExportReminder();
    }
  }
}
```

---

## Decision 3: Hosting

**Date:** Unchanged from v1
**Decision:** GitHub Pages (static hosting)
**Status:** Active

The landing page and app are static HTML/CSS/JS. GitHub Pages is free, fast (Fastly CDN), and simple (`git push` to deploy). No build step needed.

Cloudflare Workers runs on a separate domain/subdomain for the API layer. This keeps concerns cleanly separated:
- `andrewdeal.info/baseline` → GitHub Pages (static app)
- `api.baseline.andrewdeal.info` → Cloudflare Workers (API proxy)

No reason to change this until we need server-side rendering, dynamic routes, or build-time optimization.

---

## Decision 4: Local-First Spectrum

**Date:** Feb 27, 2026
**Decision:** "One step right of pure local"
**Status:** Guiding principle

### The Spectrum

```
Pure Local ◄──────────────────────────────► Full Cloud
     │              │                │            │
     │              │                │            │
  Current       Target v2        Future v3    Not us
  (v1)                                        (SaaS)
     │              │                │
  Everything     PDF parse only   + Cloud backup
  in browser     leaves browser   + Accounts
  localStorage   IndexedDB        + Sync
  No server      CF Worker proxy  + Sharing
```

### What stays local (always):
- All health data (observations, profile, scores)
- Scoring engine (runs client-side, no server dependency)
- NHANES percentile data (embedded JSON)
- Wearable file parsing (client-side parsers)
- All computation and analysis

### What goes through the server (with consent):
- PDF text → Claude API (for AI-assisted lab parsing)
- OAuth token exchange (for wearable API connections)
- Anonymous analytics (score distribution, no PII — via Formspree or similar)

### What we're explicit about:
- "Your files stay in your browser"
- "For AI-assisted lab parsing, extracted text is processed on our server and immediately deleted"
- "No health data is stored on our servers"
- "You can export your full profile as a JSON file at any time"

### Inflection points for moving further right:
1. **Users ask for multi-device** → add encrypted cloud backup (Cloudflare R2, user holds key)
2. **Users want to share with providers** → add shareable report generation (PDF export, not cloud sharing)
3. **>1,000 active users** → consider lightweight accounts for persistence (email + magic link, no passwords)
4. **Medical records integration** → HIPAA compliance enters the picture, full architecture review needed

---

## Decision 5: Testing Strategy

**Date:** Mar 1, 2026
**Decision:** Vitest for unit/integration tests. No E2E or cross-browser testing yet.
**Status:** Decided, partially implemented

### What's implemented

- **App:** Vitest (node env) — 15 tests for AES-256-GCM encryption, key management, sync logic
- **Worker:** Vitest + `@cloudflare/vitest-pool-workers` — 7 JWT tests + 8 sync endpoint tests running in miniflare with real KV
- **Voice parser:** 42 tests via custom Node runner (`pnpm run test:legacy`)

### What we're NOT doing yet (and why)

**No Playwright / E2E browser testing.** The app is pre-launch with major UI workstreams still in flux (3-phase intake redesign, Tailwind migration, PWA, iOS fixes). E2E tests at this stage would:
- Break with every UI change, creating maintenance drag
- Test designs that haven't been locked in
- Slow down the design/build flywheel when speed matters most

**No Sauce Labs / cross-browser matrix.** No production users means no real browser-specific bug reports to drive this investment. Cross-browser testing is expensive to maintain and premature without a stable UI.

### When to revisit

- **Playwright (single browser, happy path):** When core flows are stable and deployed to production. Start with one test: intake → score → result.
- **Cross-browser matrix:** When real users report browser-specific issues, or before a major public launch.
- **Scoring engine tests:** Next priority — the scoring logic is stable and critical. Vitest tests for `score.js` edge cases, freshness decay, NHANES percentile lookups.

### Guiding principle

Test what's locked in. The testing layer should trail the stability of the code, not lead it. Infrastructure (encryption, JWT, sync protocol) is stable → tested. UI (intake flow, CSS, mobile layout) is volatile → not yet tested. As features graduate from "iterating" to "shipping," add tests.

### Commands

```bash
cd ~/src/baseline/app && pnpm test              # vitest: encryption + sync (15 tests)
cd ~/src/baseline/app && pnpm run test:legacy    # voice parser (42 tests)
cd ~/src/baseline/worker && pnpm test            # vitest: JWT + sync endpoints (15 tests)
```

---

## Future Decisions (Not Yet Made)

### Build System
Currently: Vite. Handles ES modules, Tailwind CSS, and production builds. No additional build complexity needed.

### Testing — Next Layers
Covered above in Decision 5. Next candidates for test coverage:
- Scoring engine edge cases (`score.js`)
- Freshness decay calculations
- BIOMARKER_MAP parsing (input text → correct field + value)
- Import merge logic (duplicate detection, conflict resolution)

### Mobile Experience
Currently: responsive CSS. Works on mobile but not optimized for it. The "drop files" UX is desktop-oriented. Mobile users need:
- Camera capture (photograph lab results → OCR)
- Share sheet integration ("share from Files app" → import)
- PWA install prompt (better storage persistence)
- **This is a v3 concern.** Desktop-first is fine for early adopters.

### Domain / Branding
Currently: `andrewdeal.info/baseline` (subdirectory of personal site). Eventually needs its own domain. `getbaseline.health`? `baseline.health`? `usebaseline.com`? Not urgent but should be secured before public launch.
