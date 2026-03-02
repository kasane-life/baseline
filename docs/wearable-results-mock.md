# Wearable-Rich Results Mock — Scoring Analysis

## Mock Profile

```
Demographics: 35M, 5'10", 195 lbs
Labs: LDL 120, HDL 55, TG 110, glucose 92, HbA1c 5.4, ApoB 95
Wearable: steps 8200, sleep 7.1h, RHR 62, HRV 38ms, VO2 max 42
BP: 122/78, Waist: 34"
Family history: yes, Medications: listed, Weight: tracked
Missing: Lp(a), hs-CRP, insulin, ferritin, sleep regularity
```

---

## Side-by-Side: No Wearable vs. Wearable-Rich

### Coverage Score

|                    | No Wearable | With Wearable | Delta |
|--------------------|-------------|---------------|-------|
| **Overall**        | 49%         | 73%           | +24   |
| **Tier 1 (Core)**  | 65% (39/60) | 87% (52/60)   | +22   |
| **Tier 2 (Advanced)** | 9% (2/23) | 39% (9/23)   | +30   |
| **Metrics covered** | 7/20       | 14/20         | +7    |
| **Avg Percentile** | 55th        | 60th          | +5    |

### What the Wearable Fills In

These 5 metrics flip from gap to scored:

| Metric            | Tier | Weight | Value  | Standing | Percentile |
|-------------------|------|--------|--------|----------|------------|
| Daily Steps       | 1    | 4      | 8,200  | Good     | ~70th      |
| Resting Heart Rate| 1    | 4      | 62 bpm | Good     | ~70th      |
| Sleep*            | 1    | 5      | 7.1h   | (see note) | —       |
| VO2 Max           | 2    | 5      | 42     | Average  | ~50th      |
| HRV (7-day avg)   | 2    | 2      | 38 ms  | Good     | ~70th      |

*Sleep note: `sleep_duration_avg` satisfies `hasData` for the Sleep Regularity row, but the engine only scores `sleep_regularity_stddev` (which no wearable exports directly). Result: Sleep shows as "covered" with standing UNKNOWN and no percentile. It leaves the gaps list but doesn't contribute to avg percentile. This is a scoring gap — see Issues below.

### Top 3 Gaps Comparison

**No Wearable:**

| # | Gap              | Weight | Cost to Close                          |
|---|------------------|--------|----------------------------------------|
| 1 | Lp(a)           | 8      | $30 — once in your lifetime            |
| 2 | Sleep Regularity | 5      | Free with any wearable                 |
| 3 | VO2 Max          | 5      | Free with Garmin/Apple Watch (estimate) |

Message: "You're missing more than half the picture. 13 gaps to close."
Projected score: 49% → 71% (with top 3)

**With Wearable:**

| # | Gap                   | Weight | Cost to Close                |
|---|-----------------------|--------|------------------------------|
| 1 | Lp(a)                | 8      | $30 — once in your lifetime  |
| 2 | hs-CRP               | 3      | $20/year (add to lab order)  |
| 3 | Vitamin D + Ferritin  | 3      | $40-60 baseline lab add-on   |

Message: "Solid start — 6 gaps left to sharpen your score."
Projected score: 73% → 90% (with top 3)

The nature of the gaps shifts entirely: from "get a device" to "order specific labs."

### Gap Count Breakdown

| Category      | No Wearable | With Wearable |
|---------------|-------------|---------------|
| **Wearable gaps** | 5 (Sleep, Steps, RHR, VO2, HRV) | 0 |
| **Lab gaps**      | 6 (Lp(a), CRP, Liver, CBC, Thyroid, VitD/Ferritin) | 6 (same) |
| **Lifestyle gaps** | 2 (PHQ-9, Zone 2) | 2 (same) |
| **Total**         | 13 | 8 |

Wearable closes 5 gaps (all wearable-sourced metrics). Lab and lifestyle gaps are unchanged.

### Health Flags

**No Wearable:** 0 flags (only 4 assessed metrics, all Average or Good)
**With Wearable:** 0 flags (8 assessed metrics, all Average or Good)

More data means more chances to surface flags. This profile happens to be healthy, but a user with RHR 85 or VO2 28 would see flags appear that were previously invisible. The wearable makes the Health section actionable instead of empty.

### Average Percentile Composition

**No Wearable (4 scored metrics):**
- BP: ~50th, Lipid (ApoB): ~50th, Metabolic (HbA1c): ~50th, Waist: ~70th
- Average: **55th**

**With Wearable (8 scored metrics):**
- BP: ~50th, Lipid (ApoB): ~50th, Metabolic (HbA1c): ~50th, Waist: ~70th
- Steps: ~70th, RHR: ~70th, VO2: ~50th, HRV: ~70th
- Average: **60th**

The health ring goes from a thin picture (4 data points) to a real assessment (8 data points). The 5-point increase is because the wearable metrics for this profile trend Good.

---

## Results Page Section-by-Section

### 1. Score Rings

| Element | No Wearable | With Wearable |
|---------|-------------|---------------|
| Coverage ring | 49% (amber, `score-mid`) | 73% (amber, `score-mid`) |
| Health ring | 55th (amber) | 60th (amber/green boundary) |
| Context line | "You're missing more than half the picture. 13 gaps to close." | "Solid start — 6 gaps left to sharpen your score." |

The rings themselves don't change color tier dramatically (both amber), but the context line shifts from alarming to encouraging.

### 2. Your Next Moves

**No Wearable:** Top 3 are device-acquisition plays. Cards say "Free with any wearable" — the call to action is "buy/connect a device." BP tracker might render inline if user has a cuff.

**With Wearable:** Top 3 are lab-ordering plays. Cards say "$30 once" or "$20/year" — the call to action is "add this to your next blood draw." The page stops selling devices and starts selling precision.

The projection bar shifts from `49% → 71%` to `73% → 90%`. The latter is motivating ("3 tests from near-complete") vs. the former which feels like a long road.

### 3. Fold Line + Remaining Gaps

**No Wearable:** 10 remaining gaps after top 3. Heavy. Feels overwhelming.
**With Wearable:** 5 remaining gaps after top 3. Manageable. All are specific labs or lifestyle questionnaires.

### 4. Health Flags

Same for this profile (none), but structurally: with wearable data, you have 8 assessed metrics that could trigger flags vs. 4. The Health section becomes a real watchlist instead of an empty placeholder.

### 5. Tier Bars (Core / Advanced)

| Tier | No Wearable | With Wearable |
|------|-------------|---------------|
| Core | 65% | 87% |
| Advanced | 9% | 39% |

The Core bar jumps to near-complete. Advanced goes from almost empty to meaningful. This is the most visually dramatic change on the page.

### 6. Metric Tables (Core Tests / Advanced Tests)

**No Wearable Core:** 7 of 10 covered. Missing divider shows "3 not yet tracked" (Sleep, Steps, RHR).
**With Wearable Core:** 9 of 10 covered. Only "1 not yet tracked" (Lp(a)). Almost all rows have standings and percentiles.

**No Wearable Advanced:** 1 of 10 covered (Weight Trends). 9 grayed out.
**With Wearable Advanced:** 3 of 10 covered (VO2, HRV, Weight). Still mostly gaps but with real scored data showing.

### 7. Start Tracking Today

Unchanged — depends on equipment selections (BP cuff, scale, tape measure), not wearable data. But items may get merged into gap cards via the `mergedTrackingDevices` logic, shrinking this section.

### 8. Evidence Carousel

Relevance scoring changes. With wearable data:
- Steps, VO2 Max, Sleep insights score as `relevance: 1` (covered) instead of `relevance: 2` (gap)
- Lp(a), ApoB remain high-relevance
- The carousel reorders to emphasize what's covered + what's still missing

### 9. Discovery Form

Unchanged.

---

## Recommendations for Results Page Adaptations

### R-W1. "Wearable connected" badge or indicator
When wearable data is present, show a small indicator near the score ring or in the tier bars: "Garmin connected" or "5 wearable metrics imported." This acknowledges the user's effort and signals that the data is flowing.

### R-W2. Sleep Regularity scoring fix
The current engine treats `sleep_duration_avg` as satisfying `hasData` for the Sleep Regularity row, but only scores `sleep_regularity_stddev` (which no wearable exports). Two options:
- **Option A:** Score sleep duration as a fallback when regularity isn't available. Different metric, but still valuable.
- **Option B:** Split into two rows: "Sleep Duration" (wearable-sourced) and "Sleep Regularity" (computed from raw timestamps). Duration is a Tier 1 win; regularity is a future enhancement.

Option B is better — it honestly represents what you have.

### R-W3. Shift the CTA based on coverage tier
- <50% coverage: "Connect a wearable" as primary CTA (current behavior)
- 50-80% coverage: "Complete your labs" as primary CTA
- >80% coverage: "Keep it fresh" / "Act on your flags"

The results page should sense which *category* of gaps dominates and frame the moves section accordingly.

### R-W4. Health flags section should render even when empty
With wearable data providing 8+ assessed metrics, the Health section is meaningfully populated. Currently it only renders when flags exist. Consider showing "All clear — 8 metrics assessed, no flags" when everything is Good/Optimal. This is the payoff for having wearable data.

### R-W5. Projected score bar hits differently at 73% → 90%
The `49% → 71%` projection requires 3 device purchases. The `73% → 90%` projection requires 3 lab add-ons ($50-90 total). The latter is much more actionable. Consider adding a cost estimate to the projection: "These 3 tests cost ~$70 and get you to 90%."

### R-W6. Remaining gaps collapse is less necessary
With only 5 remaining (vs. 10), the collapsed remaining-gaps section might not need to be collapsed. Consider auto-expanding when <=5 remaining.

---

## Issues Found Outside Scope

### 1. Sleep coverage accounting bug
`sleepHas` is true when only `sleep_duration_avg` is present, but the row only scores `sleep_regularity_stddev`. Result: Sleep Regularity shows as "covered" with no percentile and no standing. This inflates the coverage score by 5 weight points (~6%) without actually providing a scored assessment. This affects both wearable and no-wearable paths but is much more visible when wearable data is present (user sees 7.1h imported but no sleep score).

**Impact:** Coverage score is 73% but would be 67% if sleep duration alone didn't count. This is the single biggest scoring accuracy issue for wearable users.

### 2. VO2 Max has no NHANES key
`assess()` for VO2 passes `null` as the NHANES key, falling back to cutoff tables. Same for HRV, steps, and sleep_regularity. These metrics could benefit from NHANES continuous scoring if the data is available in the NHANES dataset.

### 3. Weight Trends is a binary metric
`weight_lbs` marks Weight Trends as "has data" with standing=GOOD but no percentile. It doesn't actually score weight — just notes that you have it. Consider: BMI scoring (with height), or weight-trend scoring over time (aligned with the metric name).

### 4. Freshness decay timing for wearable metrics
Wearable metrics have 0.5-1 month freshness windows (RHR, sleep, HRV: fresh 2 weeks, stale 1 month). A single wearable import gets stale in 2 weeks. Without recurring import or live connection, wearable coverage degrades rapidly. The results page should surface this: "Your Garmin data is 3 weeks old — reimport for a fresh picture."
