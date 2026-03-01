# Handoff: iOS Mobile Compatibility

## Status: Ready for investigation + implementation

## Goal

Get the Baseline app working smoothly on iOS Safari (iPhone) so that Paul (and other iOS users) can run through the full flow on their phone. This is a reach target but high value — most of the target audience is iOS-centric.

## Current State

The app is a single-page vanilla JS web app. No framework, no SSR. It should theoretically work on mobile Safari already, but it hasn't been tested or optimized for it.

- **App location**: `/Users/adeal/src/baseline/app/`
- **Entry point**: `index.html`
- **CSS**: `css/app.css` — has some `@media (max-width: 600px)` rules but not comprehensive
- **JS**: ES modules loaded via `<script type="module" src="src/main.js">`
- **Build**: Vite (`pnpm build`) → `dist/` directory
- **Dev server**: `python3 -m http.server 8787` from project root

## Known Risk Areas

### 1. Web Speech API (Voice Intake)

The voice-first intake uses `webkitSpeechRecognition` / `SpeechRecognition`. This is the biggest iOS risk:

- **Chrome on iOS**: Uses WebKit engine (Apple requirement), Speech API support is inconsistent
- **Safari on iOS**: Has `webkitSpeechRecognition` but behavior differs from desktop Chrome
- **Fallback exists**: The app already has a form tab as fallback. If speech isn't available, `hasSpeechSupport()` in `src/intake.js` hides the voice UI and defaults to form mode.

**What to investigate**: Does `webkitSpeechRecognition` actually work reliably on iOS Safari 17+? If not, the form path needs to be the hero on mobile.

**Key files**: `src/intake.js` (speech recognition), `voice.js` (parser)

### 2. Touch & Layout

The app was designed desktop-first. Things to check:

- **Toggle buttons** (`.toggle-btn`, `.opt-btn`): Do they have adequate touch targets (44x44px minimum)?
- **Device cards** (`.device-card`): Grid layout on narrow screens — do they wrap properly?
- **Input fields**: iOS auto-zoom on inputs with `font-size < 16px` — check all `.field-input` elements
- **Keyboard handling**: When the iOS keyboard opens, does it push content up properly? Are there fixed-position elements that break?
- **Scroll behavior**: `window.scrollTo({ behavior: 'smooth' })` is used for step transitions
- **Safe areas**: iPhone notch/Dynamic Island — need `env(safe-area-inset-*)` in CSS?

**Key file**: `css/app.css`

### 3. IndexedDB on iOS

iOS Safari has historically had issues with IndexedDB:
- Storage quota limits (varies by iOS version)
- Data can be evicted after 7 days of non-use in some configurations
- WebKit has fixed most issues in iOS 16+, but worth verifying

**Key files**: `storage.js`, `db.js` (uses Dexie.js as IndexedDB wrapper)

### 4. Lab File Upload

PDF upload uses `<input type="file">` which works on iOS, but:
- The drag-and-drop zone (`upload-zone`) won't work on mobile — needs a clear tap-to-upload alternative
- File picker on iOS can access Files app, iCloud Drive, or take a photo
- Camera capture of a lab report is a realistic use case — could add `capture="environment"` attribute

**Key file**: `src/lab-import.js`, the upload zone HTML in `index.html`

### 5. PWA / Add to Home Screen

Not required now, but worth considering:
- A `manifest.json` would let iOS users "Add to Home Screen" for a more app-like experience
- Combined with the favicon (just added: `favicon.svg`), this would give it a proper app icon
- Service worker for offline capability is future work

## The Flow to Test

The full user journey on iPhone:

1. Land on app → see voice/form tabs
2. (If voice works) Tap mic, dictate health data, see checklist fill in, submit
3. (If voice doesn't work) Form tab: enter age, sex, height, weight, BP, waist, family history → Next
4. Phase 2: Upload labs (or skip), select equipment, add meds, optionally do PHQ-9 → Score
5. Results: See score ring, tier bars, percentiles, next moves, gap cards
6. Post-score: BP tracking module (if applicable)

## Specific Things to Build/Fix

### Must-have
- [ ] Test every screen on iOS Safari (iPhone 14+, iOS 17+)
- [ ] Fix any layout breaks at 375px width (iPhone SE) and 390px (iPhone 14)
- [ ] Ensure all inputs have `font-size: 16px` or larger (prevents iOS auto-zoom)
- [ ] Make upload zone clearly tappable on mobile (not just drag-and-drop)
- [ ] Verify IndexedDB persistence works

### Nice-to-have
- [ ] Add `<meta name="apple-mobile-web-app-capable" content="yes">` for fullscreen
- [ ] Add `manifest.json` for PWA-like experience
- [ ] Test and optimize the voice path on iOS Safari
- [ ] Add `viewport-fit=cover` and safe area insets for notched iPhones

## Architecture Notes

- The app is vanilla JS — no React, no build framework beyond Vite for bundling
- All state is in IndexedDB (via Dexie) + some localStorage for BP protocol
- No server dependency for core functionality (local-first)
- Fonts: Google Fonts (Barlow Condensed, DM Sans, JetBrains Mono) — these load fine on iOS

## How to Test

If you have an iPhone:
1. Start dev server: `cd /Users/adeal/src/baseline && python3 -m http.server 8787`
2. Find your Mac's local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. On iPhone, go to `http://<mac-ip>:8787/app/index.html`
4. Or deploy `dist/` to any static host and test from there

If you don't have an iPhone:
- Chrome DevTools device emulation (limited — won't test real iOS quirks)
- Xcode Simulator (if available)
- BrowserStack / Sauce Labs for real device testing

## Files Most Likely to Change

| File | Why |
|------|-----|
| `css/app.css` | Mobile responsive fixes, touch targets, safe areas, input font sizes |
| `index.html` | Meta tags for mobile, possible PWA manifest link |
| `src/intake.js` | Speech API mobile behavior, fallback improvements |
| `src/lab-import.js` | Mobile-friendly upload UX |

## User Context

- Andrew (the developer/owner) uses Android + Garmin, not iOS
- Paul is the first iOS test user — needs to successfully complete the full flow
- The audience skews iOS-heavy, so this matters for distribution
- "Get Paul through the flow on his phone" is the success criterion

---

## Implementation Notes (Agent: iOS + PWA session, March 1)

### What was built

All "must-have" items and most "nice-to-have" items from the checklist above are now implemented:

**CSS (app/css/app.css):**
- Global input guard: `input, textarea, select { font-size: max(1rem, 16px); }` — prevents iOS auto-zoom
- `.med-search-input` font-size bumped to `1rem`
- `.paste-area` font-size bumped to `1rem`
- `.opt-btn`, `.toggle-btn`: `min-height: 44px; display: inline-flex; align-items: center;`
- `.phq9-radio`: padding `12px 16px`, `min-height: 44px`
- `.mic-btn`: 40px → 44px
- `.phase2-back`: `min-height: 44px; padding: 10px 0;`
- `.container`: `padding-bottom: env(safe-area-inset-bottom)` for iPhone home indicator
- `-webkit-tap-highlight-color: transparent` on interactive elements
- `.sw-toast` styles for PWA update notification

**HTML (app/index.html):**
- `viewport-fit=cover` on viewport meta
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<meta name="apple-mobile-web-app-title" content="Baseline">`
- `<meta name="theme-color" content="#08080a">`
- `<link rel="manifest" href="manifest.json">`
- `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`
- `type="month"` → `type="text"` with `placeholder="YYYY-MM" pattern="\d{4}-\d{2}"` (iOS Safari doesn't support month picker)
- Upload zone: "Tap to upload or drop files here" (was "Upload lab report")
- Upload hint: removed "or image" (no image parsing exists)
- Voice ring: removed inline `width:40px;height:40px` (CSS handles sizing)

**JS (app/src/main.js):**
- Mobile UA detection defaults to form tab on iOS/Android (voice tab still accessible)
- Service worker registration (production only, gated by `!import.meta.env.DEV`)
- SW update toast: listens for `SW_UPDATED` message, shows "Updated version available. [Refresh]"

**PWA (app/public/):**
- `manifest.json` — app name, standalone display, theme colors, icons
- `sw.js` — stale-while-revalidate for app shell, cache-first for hashed Vite assets, network-first for external APIs
- `icons/` — 192px, 512px (+ maskable), 180px Apple touch icon (generated from favicon.svg via Pillow)
- `favicon.svg` + `nhanes_percentiles.json` — copies required for dist inclusion (Vite only copies from public/)

### What was NOT built
- No camera capture (`capture="environment"` attribute) — future
- No PWA service worker for offline lab parsing (requires network for Cloudflare Worker API call)
- No iOS simulator testing — Xcode 26.3 has a runtime mismatch, blocked on Apple shipping build 23C57

### Testing status
- `pnpm build` passes clean
- Chrome DevTools device emulation verified (iPhone 14, 390px)
- Vite preview server verified: manifest, SW, icons, NHANES all serve correctly
- Real device testing pending: Andrew's Pixel 9 (Android), then Paul's iPhone

### Open questions for next agent
- IndexedDB persistence on iOS: need real device testing to confirm eviction behavior with PWA installed
- Voice intake on iOS: defaulting to form is the safe play, but worth testing if `continuous: false` with manual restart works better than hiding it entirely
