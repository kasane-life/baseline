# Platform Strategy — Web, PWA, Native

*Last updated: 2026-03-01*

## Current State

Baseline is a vanilla JS app (Vite build, no framework) deployed to GitHub Pages. All scoring and data storage happens client-side. The Cloudflare Worker is a stateless proxy for LLM-powered lab parsing.

As of March 2026, the app runs on:
- **Desktop Chrome** — full experience including voice intake
- **iOS Safari** — form intake works, voice defaults to form (iOS `continuous: true` is unreliable)
- **Android Chrome** — full experience, no storage eviction issues

## Web Ceiling — What Safari Will Never Do Well

These are hard limits of staying browser-only on iOS:

| Limitation | Impact | Workaround |
|---|---|---|
| **Storage eviction** | iOS Safari evicts IndexedDB after ~7 days of inactivity. `navigator.storage.persist()` is ignored. | PWA (Add to Home Screen) extends retention. Export/import JSON as backup. |
| **No HealthKit** | Can't read Apple Watch, Health app, or connected device data. Web apps are fully locked out. | Manual CSV import from wearable apps (Garmin, Oura exports). |
| **No background activity** | Can't poll wearable APIs, send push notifications, or sync in background. | Calendar integration pushes reminders into Google Calendar. |
| **Camera capture is clunky** | `<input capture="environment">` launches full camera app. No viewfinder overlay, no framing guidance. | Tap-to-upload works; camera is a nice-to-have, not a blocker. |
| **Speech recognition** | Web Speech API on iOS Safari is unreliable for continuous dictation. Native `SFSpeechRecognizer` is excellent. | Default to form tab on mobile. Voice stays accessible but not default. |

## Decision Framework — When to Go Native

Don't build native because you can. Build it when one of these triggers fires:

| Trigger | Signal | Why It Matters |
|---|---|---|
| **Storage eviction causes churn** | Users report lost profiles; return visits show empty state | Direct product failure the web can't fix |
| **Wearable data becomes core to scoring** | Scoring engine heavily weights HRV, sleep, steps | HealthKit access becomes table stakes for 55%+ of users |
| **Camera-based lab capture is primary input** | "Photograph your lab report" is how most users enter data | Native camera UX is materially better than file upload |
| **Push notifications drive re-engagement** | Post-score nudges (re-test, measurement protocols) need a delivery channel | Calendar is a workaround; push is the real thing |
| **User base justifies overhead** | >100 active users | Native means two codebases, App Store review, TestFlight, update cycles |

## Platform Sequence

### Phase 1: PWA (now)
- Web app manifest + service worker
- Offline scoring with cached NHANES data
- "Add to Home Screen" prompt on iOS/Android
- Full-screen standalone mode (no browser chrome)
- **Cost**: ~2 hours, zero dependencies
- **Gets you**: Install experience, longer storage retention on iOS, offline capability

### Phase 2: Watch & Measure
- Track storage eviction incidents (are users actually losing profiles?)
- Track mobile vs desktop usage split
- Track which input path dominates (upload vs paste vs voice)
- Track wearable adoption (how many users have Garmin/Oura data?)
- **Duration**: 1-3 months of real usage data

### Phase 3: iOS Native Shell (when triggers fire)
- SwiftUI wrapper with WKWebView for the scoring engine
- Native HealthKit integration (read Apple Watch metrics)
- Native camera with viewfinder overlay for lab report capture
- Native `SFSpeechRecognizer` for voice intake
- Push notifications via APNs
- **The scoring engine stays JS** — no rewrite. WebView loads the existing app.
- **Cost**: 2-4 weeks for a competent iOS developer

### Phase 4: Full Native (if PMF justifies)
- Rewrite scoring engine in Swift (performance, offline-first)
- Native UI throughout
- iCloud sync across devices
- **Only if**: The product has clear PMF and the WebView shell is limiting

## iOS vs Android — Different Calculations

**iOS** (55-58% of target wearable audience):
- HealthKit is the crown jewel — unified API, every Apple Watch metric, every connected device
- Storage eviction is the biggest web pain point
- App Store is the expected distribution channel
- Native shell (SwiftUI + WKWebView) is the pragmatic first step

**Android** (Andrew's device, 38-42% of target):
- Health Connect exists but is fragmented
- Garmin CSV import already works (Andrew's path)
- No storage eviction (Chrome on Android respects `persist()`)
- Web app works great on Android Chrome — less urgency for native
- Play Store distribution is optional; web is fine

**The asymmetry**: iOS users need native more than Android users do. If you build native, start with iOS.

## What PWA Does NOT Get You

For clarity, PWA on iOS still cannot:
- Access HealthKit
- Run background sync
- Send push notifications (Safari Web Push exists but is limited and unreliable)
- Provide native camera overlay
- Guarantee storage persistence (it helps, but iOS can still evict)

PWA is the right middle step. It proves the install experience and offline value without the native overhead.

## What We're Not Doing

- No React Native / Flutter — the web codebase is vanilla JS with zero framework debt. Wrapping in a WebView is simpler and preserves the existing investment.
- No cross-platform framework — if we go native, it's SwiftUI for iOS. Android stays web.
- No server-side rendering — local-first architecture means the server never sees health data.
- No app store submission until triggers fire — premature App Store presence creates maintenance overhead with no user benefit.

---

## Review Notes (March 1 — after PWA implementation)

### Phase 1 (PWA) is implemented

The PWA layer described in Phase 1 is now built and in the working tree (not yet deployed):
- `app/public/manifest.json` — standalone display, theme colors, app icons
- `app/public/sw.js` — stale-while-revalidate for app shell + HTML, cache-first for Vite hashed assets, network-first for API calls. No manual cache busting needed — new builds produce new hashed filenames automatically.
- Offline scoring works: NHANES JSON is pre-cached on first visit
- SW update toast: when a new version deploys, users see "Updated version available. [Refresh]"
- App icons generated (192, 512, apple-touch-icon 180)

### Phase 2 (Watch & Measure) needs success metrics

The current doc says "track storage eviction incidents" and "track mobile vs desktop usage" but doesn't define:
- What **count** of lost profiles triggers the native decision? 5% of return visits? 10%?
- What's the measurement mechanism? The feedback module (`feedback.js`) can capture this — add a breadcrumb when `checkReturnVisit()` finds an empty profile on a device that previously had data.
- How do you distinguish "user cleared data intentionally" from "iOS evicted it"?

Suggest adding concrete thresholds to each trigger in the decision framework table.

### Android native: explicit non-goal

The doc implies Android stays web permanently but doesn't say it explicitly. Worth adding: "Android native is not on the roadmap. Chrome on Android provides full PWA support including persistent storage, Add to Home Screen, and push notifications (when needed). The web app is the Android app."

### Cost implications missing

Phase 3 (iOS Native Shell) says "2-4 weeks for a competent iOS developer" but doesn't address:
- Apple Developer Program: $99/year
- TestFlight setup and review overhead
- Ongoing maintenance: iOS version updates, API deprecations
- App Store review for health-related content (Apple has specific guidelines for health apps)

These aren't blockers but should be visible when evaluating the trigger decision.
