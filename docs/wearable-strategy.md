# Wearable Integration Strategy

## Market Share (2025-2026)

| Brand | Global Share | Users | Health Data Quality | API Access | Priority |
|-------|-------------|-------|-------------------|------------|----------|
| **Apple Watch** | **36%** | ~100M+ active | Excellent (HR, HRV, VO2, sleep, steps, ECG) | HealthKit only (native iOS) | **#1** |
| Samsung Galaxy Watch | 10% | | Good (HR, sleep, steps, SpO2) | Samsung Health SDK (Android native) | Low |
| Garmin | 4% | | Excellent (HR, HRV, VO2, sleep, steps, stress) | Partner API (must apply) | **#2** |
| Fitbit | 3% | | Good (HR, HRV, sleep, steps, SpO2) | Google Health Connect (old API deprecated) | Medium |
| **Oura** | niche | ~2.5M | Excellent (HR, HRV, sleep, readiness, temp) | OAuth2 REST (self-serve) | **#3** |
| Whoop | niche | ~1M | Excellent (HRV, strain, recovery, sleep) | Developer API exists | Low for Push 1 |

**Key insight:** Apple is 36% of the market. The next three combined (Samsung + Garmin + Fitbit) barely equal Apple. First tester Paul is on iOS.

Sources:
- [Smartwatch Statistics 2026 – SQ Magazine](https://sqmagazine.co.uk/smartwatch-statistics/)
- [Smart Wearables Statistics 2026](https://scoop.market.us/smart-wearables-statistics/)
- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)

## Data Contracts — What Each Source Gives Us

Metrics mapped to our scoring engine (`score.js`):

| Metric (score.js key) | Apple Health | Garmin CSV | Garmin API | Oura JSON | Fitbit API |
|---|---|---|---|---|---|
| `daily_steps_avg` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sleep_duration_avg` | ✓ | ✓* | ✓ | ✓ | ✓ |
| `sleep_regularity_stddev` | Computable† | ✗ | Computable† | ✗ | Computable† |
| `resting_hr` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `hrv_rmssd_avg` | SDNN only‡ | ✗ | ✓ (RMSSD) | ✓ (RMSSD) | ✓ |
| `vo2_max` | ✓ (estimate) | ✗ | ✓ | ✗ | ✗ |

\* Garmin "Sleep Hours" may include time in bed, not just asleep.
† Need raw sleep timestamps across multiple nights to compute std dev. No source exports this directly.
‡ Apple exports `HeartRateVariabilitySDNN`, we need RMSSD. Different metrics. See Known Issues below.

## Current Parser Coverage

Parsers in `app/src/wearable-import.js` (committed in `35078ac`):

| Parser | Metrics Extracted | Notes |
|--------|------------------|-------|
| **Garmin CSV** | steps, sleep hrs, RHR (3/6) | No HRV, no VO2 in CSV export |
| **Apple Health XML** | steps, sleep hrs, RHR, HRV (SDNN), VO2 (5/6) | SDNN≠RMSSD issue; no sleep regularity |
| **Oura JSON** | steps, sleep hrs, RHR, HRV RMSSD (4/6) | No VO2; Oura RMSSD is correct format |

Form field mapping:
- `daily_steps_avg` → `f-steps`
- `sleep_duration_avg` → `f-sleep-hours`
- `resting_hr` → `f-rhr`
- `vo2_max` → `f-vo2`
- `hrv_rmssd_avg` → `f-hrv`

## Known Issues

### SDNN vs RMSSD (Apple Health)
Apple Health exports `HeartRateVariabilitySDNN` but scoring expects `hrv_rmssd_avg` (RMSSD). These are different statistical measures of heart rate variability. Parser currently maps SDNN through as `hrv_rmssd_avg` — inaccurate but functional. Oura and Garmin API export RMSSD correctly. Needs research on conversion factor or separate percentile tables for SDNN.

### Sleep regularity
No wearable exports sleep regularity (timing consistency) directly. All export sleep duration. Computing regularity requires raw sleep start/end timestamps across 7-14 nights and calculating the standard deviation of sleep onset times. This is a parser enhancement, not an API limitation.

### Device-specific calibration
Garmin, Apple, Oura all use different algorithms for VO2 Max estimation (±5-10 mL/kg/min). Scoring treats them equally. Future work: device-aware confidence intervals or percentile adjustments.

### Freshness decay (from score.js)
Wearable metrics have short freshness windows:
- RHR, sleep, HRV: fresh 2 weeks, stale 1 month
- Steps: fresh 1 month, stale 2 months
- VO2 max: fresh 1 month, stale 3 months

This means wearable data needs regular re-import or live connect to stay fresh.

## Integration Paths

### Apple Health — iOS Bridge (Push 1)

Three options explored:

**Option A: Apple Shortcut (recommended for Push 1)**
- Downloadable Shortcut that reads HealthKit, formats JSON, copies to clipboard
- User pastes into Baseline
- Pros: No app store, no review, instant distribution, testable with Paul immediately
- Cons: Can't run in background, manual trigger, limited HealthKit access
- Reference: [Apple Shortcuts + HealthKit approach](https://blog.maximeheckel.com/posts/build-personal-health-api-shortcuts-serverless/)

**Option B: Third-party bridge ("Health Auto Export")**
- Existing iOS app that exports Apple Health as CSV/JSON
- Document "install this, export, upload to Baseline"
- Pros: Zero dev work. Cons: Third-party dependency, extra friction
- Reference: [Health Auto Export](https://www.healthyapps.dev/)

**Option C: Native iOS companion app (Push 2+)**
- Swift app, HealthKit access, share sheet or local server
- TestFlight for Paul (no App Store needed)
- Pros: Full access, clean UX, branded. Cons: Xcode, Apple Developer ($99/yr), iOS dev
- Reference: [HealthKit docs](https://developer.apple.com/documentation/healthkit), [HealthKit limitations](https://www.themomentum.ai/blog/do-you-need-a-mobile-app-to-access-apple-health-data)

### Garmin Connect API (apply now, build when approved)

1. Apply at [Garmin Access Request Form](https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/)
2. Describe Baseline as health analytics platform, NHANES percentile scoring, needs Health API + Activity API
3. Review takes ~2 business days per [FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
4. Once approved: OAuth1 flow, push-based (Garmin pushes to webhook) or pull via REST
5. Key APIs: [Health API](https://developer.garmin.com/gc-developer-program/health-api/) (daily summaries, sleep, stress, HR), [Activity API](https://developer.garmin.com/gc-developer-program/activity-api/)

While waiting: Garmin CSV export works today.

### Oura OAuth (Push 2)

Self-serve developer access, OAuth2, REST API. Easiest integration technically. Lower priority because Apple+Garmin users outnumber Oura 20:1.

## What Changes on the Results Page With Wearable Data

**Without wearable (current):**
- Coverage: ~50-70%, lots of gaps
- Top 3 gaps: Sleep Regularity, VO2 Max, Daily Steps — all "Free with any wearable"
- Message: "You're missing data sources"
- Tracking section: prominent

**With wearable:**
- Coverage: ~85-95%, most gaps close
- Top gaps shift to: specific labs (ApoB, Lp(a), insulin), waist, BP
- Message: "Here's what your data says. Your RHR is 42nd percentile."
- Health flags become real with actual values
- Tracking/equipment recommendations shrink or disappear
- Results page emphasis shifts from "collect more" to "here's your picture + act on this"

This is a fundamentally different page, not just more data in the same template.

## Priority Order for Push 1

1. **Apple Shortcut bridge** — gets Paul flowing, tests the wearable-rich results experience
2. **Phase 2 restructure** — separate labs from wearables, per-device import guidance
3. **Mock wearable-rich results** — with real Garmin/Oura data, see how the page transforms
4. **Apply for Garmin partner access** — start the clock (Andrew does this manually)
