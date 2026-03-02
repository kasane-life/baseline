# Apple Shortcut Bridge for Baseline

**Status:** Research & design (no code changes)
**Date:** 2026-03-01

## Problem

Apple Health data is locked behind HealthKit, which requires iOS native access. Baseline is a web app. We need a bridge that lets iPhone/Apple Watch users get their health data into Baseline without building a native app.

## Research Findings

### What "Find Health Samples" Can Access

The Shortcuts app includes a **"Find Health Samples"** action that queries HealthKit directly. Based on research, here's coverage for our target metrics:

| HealthKit Type | Shortcuts Access | Notes |
|---|---|---|
| `HKQuantityTypeIdentifierStepCount` | **Yes** | Returns individual samples (must sum per day) |
| `HKQuantityTypeIdentifierRestingHeartRate` | **Yes** | One value per day from Apple Watch |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | **Yes** | Returns SDNN, not RMSSD (see caveat below) |
| `HKQuantityTypeIdentifierVO2Max` | **Yes** | Listed as "Cardio Fitness" in Shortcuts UI |
| `HKCategoryTypeIdentifierSleepAnalysis` | **Yes** | Returns sleep stage samples; duration requires start/end math |

**All five target metrics are accessible via Shortcuts.** No fallback to manual XML export is needed for data availability.

### Key Capabilities

- **Date filtering:** "is in the last [N] [days/weeks/months/years]" — supports our 30-day window
- **Grouping:** Can group by Minute / Hour / **Day** / Week / Month / 3 Months / Year
- **Sorting:** By Value, Start Date, End Date, Duration, Source, Name
- **Limit:** Can cap the number of results returned
- **Permissions:** Each data type requires explicit user consent in Health → Shortcuts → "Allow Shortcuts to Read Data"

### Limitations Discovered

1. **SDNN vs RMSSD mismatch.** Apple Watch records `HeartRateVariabilitySDNN`. Baseline scores against RMSSD percentiles. These are different statistical measures of HRV. This is a known issue (same as our XML parser — `wearable-import.js:158` maps SDNN into `hrv_rmssd_avg` as-is). Not a Shortcuts-specific problem.

2. **Step count granularity.** Steps are recorded as individual samples (each walk, each workout), not daily totals. The Shortcut must group by Day and sum, or we aggregate client-side.

3. **Sleep duration requires calculation.** Sleep analysis returns category samples (Core, Deep, REM, Awake, InBed) with start/end times. Getting total sleep hours requires summing durations of asleep stages and excluding InBed/Awake. This is complex in Shortcuts' limited scripting environment.

4. **No background automation (practical).** Shortcuts _can_ run via Automation triggers, but the first run each day requires opening the Health app to refresh data. Not truly hands-free.

5. **Grouping + aggregation limits.** "Find Health Samples" with Day grouping returns averaged values per day by default. For steps, we need sums per day (then average across days). Shortcuts' Repeat/Calculate actions can handle this but it's verbose.

6. **Large data volumes.** 30 days of step data could be hundreds of samples. Shortcuts handles this fine but the shortcut gets slow with very large result sets.

7. **No web API.** The Shortcut runs entirely on-device. Data must leave the phone via clipboard, Share Sheet, or HTTP request. No server-side pull possible.

## Shortcut Design

### Output Format

Match the Oura JSON structure our parser already handles (`wearable-import.js:172-196`):

```json
{
  "sleep": [
    { "total": 25920, "hr_average": 54, "rmssd": 38 },
    { "total": 27000, "hr_average": 52, "rmssd": 41 }
  ],
  "activity": [
    { "steps": 9842 },
    { "steps": 11203 }
  ],
  "vo2_max": 42.5,
  "source": "apple_health_shortcut",
  "days": 30,
  "exported": "2026-03-01T12:00:00Z"
}
```

We extend the Oura format slightly with `vo2_max`, `source`, `days`, and `exported` fields. The existing parser would need a small update to handle `vo2_max` at the top level and recognize `source: "apple_health_shortcut"` — but that's a future code change, out of scope here.

### Shortcut Step-by-Step

The shortcut has 6 phases. Each phase queries one metric, aggregates it, and appends to a running data structure.

---

#### Phase 0: Setup

```
Action: Date
  → Get Current Date

Action: Adjust Date
  → Subtract 30 days from Current Date
  → Save as "startDate"

Action: Set Variable
  → sleepEntries = [] (empty list)
  → activityEntries = [] (empty list)
```

#### Phase 1: Steps (daily totals)

```
Action: Find Health Samples
  → Type: Step Count
  → Start Date: is after "startDate"
  → Group By: Day
  → Sort By: Start Date (Oldest First)

Action: Repeat with Each (Health Samples)
  → Get Value of Health Sample
  → Create Dictionary: { "steps": [value] }
  → Add to Variable: activityEntries
```

**Note:** When grouped by Day, steps are summed automatically (HealthKit aggregates cumulative quantity types). This gives us one value per day — exactly what we need.

#### Phase 2: Resting Heart Rate

```
Action: Find Health Samples
  → Type: Resting Heart Rate
  → Start Date: is after "startDate"
  → Sort By: Start Date (Oldest First)

Action: Repeat with Each (Health Samples)
  → Get Value of Health Sample
  → Save individual values to list: rhrValues

Action: Calculate Statistics
  → Average of rhrValues
  → Save as: avgRHR (round to integer)
```

RHR is typically one reading per day from Apple Watch, so we average all readings across 30 days.

#### Phase 3: HRV (SDNN)

```
Action: Find Health Samples
  → Type: Heart Rate Variability
  → Start Date: is after "startDate"
  → Sort By: Start Date (Oldest First)

Action: Repeat with Each (Health Samples)
  → Get Value of Health Sample
  → Save to list: hrvValues

Action: Calculate Statistics
  → Average of hrvValues
  → Save as: avgHRV (round to integer)
```

**Caveat:** This is SDNN, not RMSSD. We pass it through as-is (matches current behavior in `wearable-import.js`). A conversion factor or separate percentile table is a separate workstream.

#### Phase 4: Sleep Duration

This is the most complex phase because sleep analysis returns category samples, not simple numeric values.

```
Action: Find Health Samples
  → Type: Sleep Analysis
  → Start Date: is after "startDate"
  → Sort By: Start Date (Oldest First)

Action: Set Variable
  → sleepByDate = {} (dictionary, date → total seconds)

Action: Repeat with Each (Health Samples)
  → Get Type of Health Sample → If contains "Asleep" (Core, Deep, REM)
    → Get Start Date of Health Sample
    → Get End Date of Health Sample
    → Get Time Between: start → end, in Seconds
    → Format Start Date as "yyyy-MM-dd" → dateKey
    → If sleepByDate has dateKey: add seconds to existing
    → Else: set sleepByDate[dateKey] = seconds
  → End If

Action: Repeat with Each (sleepByDate entries)
  → Create Dictionary: { "total": [seconds], "hr_average": avgRHR, "rmssd": avgHRV }
  → Add to Variable: sleepEntries
```

**Complexity note:** Shortcuts' dictionary manipulation is clunky. An alternative is to skip per-night aggregation in the Shortcut and just sum all asleep seconds, divide by number of distinct dates. This is less accurate but much simpler to build.

**Simplified alternative:**
```
Action: Find Health Samples → Sleep Analysis → Asleep stages only
Action: Count → total samples
Action: Get Time Between first and last → total span in days
Action: Sum all durations → total seconds asleep
Action: Calculate: totalSeconds / distinctDays / 3600 → avgSleepHours
```

#### Phase 5: VO2 Max

```
Action: Find Health Samples
  → Type: Cardio Fitness (VO2 Max)
  → Start Date: is after "startDate"
  → Sort By: Start Date (Most Recent First)
  → Limit: 1

Action: Get Value of Health Sample
  → Save as: vo2Max
```

VO2 Max updates infrequently (after outdoor walks/runs with GPS). We take the most recent reading.

#### Phase 6: Assemble & Output

```
Action: Dictionary
  → {
      "sleep": sleepEntries,
      "activity": activityEntries,
      "vo2_max": vo2Max,
      "source": "apple_health_shortcut",
      "days": 30,
      "exported": [Current Date as ISO 8601]
    }

Action: Get Dictionary Value (convert to JSON text)

--- Output options (pick one): ---

Option A: Copy to Clipboard
  → User pastes into Baseline's import field

Option B: Open URL
  → https://andrewdeal.info/baseline/app/app.html?import=[URL-encoded JSON]
  → Requires adding query param handling to the web app (future work)

Option C: Share Sheet
  → Save as .json file, user uploads to Baseline drag-drop zone
```

**Recommended:** Option A (clipboard) for v1. Simplest, no web app changes needed. User pastes JSON into a text input we'd add to the import UI.

## Implementation Effort

| Component | Effort | Notes |
|---|---|---|
| Build the Shortcut | 2-3 hours | Must be done on an iPhone, can't script from desktop |
| Test with real Apple Watch data | 1 hour | Need an iPhone + Apple Watch with 30 days of data |
| Add "paste JSON" to import UI | 30 min | Textarea + detect JSON, feed to existing parser |
| Update Oura parser for apple_health_shortcut | 30 min | Handle `vo2_max` top-level field, `source` field |
| SDNN → RMSSD conversion | Separate workstream | Research needed, not blocking |

## Comparison to XML Export Fallback

| | Shortcut Bridge | XML Export |
|---|---|---|
| File size | ~2 KB JSON | 100-900 MB XML |
| Setup time | Install shortcut once | Navigate Settings → Health → Export each time |
| Data freshness | Real-time (latest HealthKit) | Snapshot at export time |
| Requires | iPhone + Shortcuts app | iPhone + Health app |
| Aggregation | Done on-device | Done in browser (DOM parser, slow for large files) |
| Metric coverage | Same 5 metrics | Same 5 metrics |
| UX | Tap shortcut → paste → done | Export → wait → find file → upload → wait for parse |

The Shortcut bridge is strictly better UX. XML export remains as fallback for users who don't want to install a Shortcut.

## Open Questions

1. **Should we build a "paste JSON" input in the import UI?** Currently the import only supports file drag-drop. Adding a textarea for pasted JSON is trivial and would enable the clipboard flow.

2. **Should the Shortcut POST directly to a webhook?** This would enable one-tap import without clipboard. Requires a serverless endpoint (Cloudflare Worker) to receive the data and associate it with a user. More complex but better UX long-term.

3. **iCloud Shortcut sharing.** We could host the Shortcut as an iCloud link so users install it with one tap. This is the standard distribution method for Shortcuts.

4. **SDNN vs RMSSD.** Our HRV scoring is technically inaccurate for all Apple Health users (Shortcut and XML alike). This is a scoring-engine concern, not a bridge concern, but worth flagging.

## Sources

- [Matthew Cassinelli — Find Health Samples action](https://matthewcassinelli.com/actions/find-health-samples/)
- [Intervals.icu forum — Getting Wellness Data via Apple Shortcuts](https://forum.intervals.icu/t/getting-wellness-data-from-your-apple-watch-via-apple-shortcuts/86164)
- [Maxime Heckel — Personal Apple Health API with Shortcuts](https://blog.maximeheckel.com/posts/build-personal-health-api-shortcuts-serverless/)
- [Gadget Hacks — Siri Health Data Access (iOS 17.2+)](https://ios.gadgethacks.com/how-to/siri-can-finally-display-and-even-log-health-data-and-fitness-activity-for-you-your-iphone-0385457/)
- [Apple Developer — HealthKit Data Types](https://developer.apple.com/documentation/healthkit/data-types)
- [Momentum AI — What You Can and Can't Do With HealthKit](https://www.themomentum.ai/blog/what-you-can-and-cant-do-with-apple-healthkit-data)
