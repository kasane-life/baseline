# Design Fixes — Handoff

Priority UX issues from screenshot review and user testing. These need to land before Push 1 (shipping to 5-10 people).

## 1. Phase 2 Navigation — Tab Bar vs Continue

**Problem:** Two competing navigation patterns. The top tab bar (Labs → Equip → Meds → PHQ-9) and the "Continue →" button both advance the flow. User doesn't know which to use — clicks tabs, clicks Continue, gets confused.

**Fix:** Make the tabs read-only indicators (show progress, don't navigate). Continue is the only forward action. Tapping a completed tab could allow going back to review, but forward movement is always via Continue.

## 2. Continue Button — Progressive Disclosure

**Problem:** Continue is always visible and static. It doesn't respond to user input — same appearance whether you've entered data or not.

**Fix:** Continue starts dormant/muted. Once the user enters any data on the current step (checks an equipment box, types in the meds field, enters a PHQ-9 score), the button activates — color change, subtle glow, maybe a micro-animation. This pulls the user forward naturally. On steps where skipping is valid (all of Phase 2), keep a secondary "Skip" affordance but make Continue the hero once there's input.

## 3. Recommendations Ignore Equipment Inputs

**Problem:** User selects "None yet" for equipment in Phase 2, then results say "Track your blood pressure" and "Start your 7-day BP protocol." The app told you to do something it knows you can't do yet — you don't have a cuff.

**Fix:** The gap cards and tracking suggestions need to read `profile._devices`. Logic:
- If user has a BP cuff → "Start your 7-day BP protocol"
- If user does NOT have a BP cuff → "Get a BP cuff (~$40, Omron) — then start your 7-day protocol"
- Same pattern for scale (weight tracking) and tape measure (waist tracking)

The `renderTrackingToday()` function in `render.js:378` already filters by devices, but the gap cards in `renderMoves()` don't. The gap card `costToClose` text and the BP tracker card need to be equipment-aware.

**Files:** `src/render.js` (renderMoves, renderTrackingToday), `src/bp-tracker.js`

## 4. State Management — Start Fresh / Previous Visit

**Problem:** "Start fresh" doesn't properly clear state. Loading a previous visit doesn't hydrate the form. The app doesn't feel like it remembers you.

**Fix:**
- `clearAndRestart()` needs to clear IndexedDB profile + sessionStorage + reset all form fields to defaults
- `loadSavedProfile()` needs to hydrate every form field from the stored profile (age, sex, height, weight, BP, waist, family history, devices, meds)
- After hydration, the form should visually reflect the loaded state (selected sex button highlighted, values in fields)
- Return banner should show a preview: "Welcome back. Last visit: March 1 — 47% coverage, 75th percentile."

**Files:** `src/main.js` (loadSavedProfile, clearSaved, startOver, clearAndRestart), `index.html` (return-banner)

## 5. Score Reveal Moment

**Problem:** "Score with what I have →" is a flat button. The transition from intake to results feels like submitting a form, not getting a result. The payoff moment is undersold.

**Fix:** This is the lightbulb moment — treat it like one. Ideas:
- Brief loading state with a message ("Crunching your numbers..." or "Comparing against 15,000 NHANES profiles...")
- Score rings animate in (already partly there with the count-up animation)
- The button itself could transform — grow, change color, pulse — as a "your score is ready" moment
- Consider a brief interstitial before results render (500-800ms) that builds anticipation

**Files:** `css/app.css` (score-cta styling, transition states), `src/main.js` (computeResults flow)

## Already Done

- **Discovery form** — "What should we build next?" form is now embedded in results, between evidence cards and utility buttons. New file: `src/discovery.js`. Wired into `render.js`. Sends to Formspree + stores locally.

## Files to Avoid

These were just modified by another agent — coordinate before touching:
- `src/discovery.js` (new)
- The discovery-related CSS at the bottom of `css/app.css`
- The `#discovery-slot` div in `index.html` (line ~607)
