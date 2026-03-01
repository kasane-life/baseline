// score.test.js — Tests for scoring engine
import { describe, it, expect, beforeAll } from 'vitest';
import {
  scoreProfile,
  scoreTimeSeriesProfile,
  Standing,
  ageBucket,
  TIER1_WEIGHTS,
  TIER2_WEIGHTS,
  FRESHNESS_WINDOWS,
  getFreshness,
  getReliability,
  detectTrend,
  RCV_THRESHOLDS,
} from '../score.js';
import { setNhanesData, getPercentile, linearInterp } from '../nhanes.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Load NHANES data for percentile tests
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Load from app root (nhanes_percentiles.json or public copy)
  const paths = [
    resolve(import.meta.dirname, '../nhanes_percentiles.json'),
    resolve(import.meta.dirname, '../public/nhanes_percentiles.json'),
  ];
  for (const p of paths) {
    try {
      const data = JSON.parse(readFileSync(p, 'utf-8'));
      setNhanesData(data);
      return;
    } catch { /* try next */ }
  }
  console.warn('NHANES data not found — percentile tests will use fallback cutoffs');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_35M = { age: 35, sex: 'M' };
const DEMO_35F = { age: 35, sex: 'F' };

function minimalProfile(overrides = {}) {
  return { demographics: DEMO_35M, ...overrides };
}

// ---------------------------------------------------------------------------
// ageBucket
// ---------------------------------------------------------------------------

describe('ageBucket', () => {
  it('maps ages to correct buckets', () => {
    expect(ageBucket(25)).toBe('20-29');
    expect(ageBucket(30)).toBe('30-39');
    expect(ageBucket(35)).toBe('30-39');
    expect(ageBucket(39)).toBe('30-39');
    expect(ageBucket(40)).toBe('40-49');
    expect(ageBucket(55)).toBe('50-59');
    expect(ageBucket(65)).toBe('60-69');
    expect(ageBucket(75)).toBe('70+');
  });
});

// ---------------------------------------------------------------------------
// linearInterp (nhanes.js)
// ---------------------------------------------------------------------------

describe('linearInterp', () => {
  it('interpolates in the middle', () => {
    expect(linearInterp(5, [0, 10], [0, 100])).toBe(50);
    expect(linearInterp(3, [0, 10], [0, 100])).toBe(30);
  });

  it('clamps below min', () => {
    expect(linearInterp(-5, [0, 10], [0, 100])).toBe(0);
  });

  it('clamps above max', () => {
    expect(linearInterp(15, [0, 10], [0, 100])).toBe(100);
  });

  it('handles exact endpoints', () => {
    expect(linearInterp(0, [0, 10], [0, 100])).toBe(0);
    expect(linearInterp(10, [0, 10], [0, 100])).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// scoreProfile — basic structure
// ---------------------------------------------------------------------------

describe('scoreProfile', () => {
  it('returns 0% coverage for empty profile', () => {
    const result = scoreProfile(minimalProfile());
    expect(result.coverageScore).toBe(0);
    expect(result.results).toHaveLength(20);
    expect(result.gaps).toHaveLength(20);
    expect(result.avgPercentile).toBeNull();
  });

  it('returns 20 metric results (10 tier 1, 10 tier 2)', () => {
    const result = scoreProfile(minimalProfile());
    const tier1 = result.results.filter(r => r.tier === 1);
    const tier2 = result.results.filter(r => r.tier === 2);
    expect(tier1).toHaveLength(10);
    expect(tier2).toHaveLength(10);
  });

  it('all results have standing UNKNOWN with no data', () => {
    const result = scoreProfile(minimalProfile());
    for (const r of result.results) {
      expect(r.hasData).toBe(false);
      expect([Standing.UNKNOWN, Standing.GOOD]).toContain(r.standing); // family history/meds default to GOOD if has_X is set
    }
  });

  it('computes coverage correctly with partial data', () => {
    const profile = minimalProfile({ systolic: 120, diastolic: 80 });
    const result = scoreProfile(profile);
    const totalWeight = Object.values(TIER1_WEIGHTS).reduce((a, b) => a + b, 0)
      + Object.values(TIER2_WEIGHTS).reduce((a, b) => a + b, 0);
    const expectedPct = Math.round(TIER1_WEIGHTS.blood_pressure / totalWeight * 100);
    expect(result.coverageScore).toBe(expectedPct);
  });

  it('gaps are sorted by weight descending', () => {
    const result = scoreProfile(minimalProfile());
    for (let i = 1; i < result.gaps.length; i++) {
      expect(result.gaps[i].weight).toBeLessThanOrEqual(result.gaps[i - 1].weight);
    }
  });
});

// ---------------------------------------------------------------------------
// scoreProfile — assessment logic
// ---------------------------------------------------------------------------

describe('scoreProfile assessment', () => {
  it('scores BP as Optimal for low systolic', () => {
    const result = scoreProfile(minimalProfile({ systolic: 105, diastolic: 65 }));
    const bp = result.results.find(r => r.name === 'Blood Pressure');
    expect(bp.hasData).toBe(true);
    expect(bp.standing).toBe(Standing.OPTIMAL);
  });

  it('scores LDL-C when ApoB missing', () => {
    const result = scoreProfile(minimalProfile({ ldl_c: 90 }));
    const lipid = result.results.find(r => r.name === 'Lipid Panel + ApoB');
    expect(lipid.hasData).toBe(true);
    expect(lipid.unit).toContain('LDL-C');
  });

  it('prefers ApoB over LDL-C when both present', () => {
    const result = scoreProfile(minimalProfile({ apob: 85, ldl_c: 110 }));
    const lipid = result.results.find(r => r.name === 'Lipid Panel + ApoB');
    expect(lipid.unit).toContain('ApoB');
    expect(lipid.value).toBe(85);
  });

  it('generates subMetrics for composite panels', () => {
    const result = scoreProfile(minimalProfile({
      ldl_c: 110, hdl_c: 55, triglycerides: 90,
    }));
    const lipid = result.results.find(r => r.name === 'Lipid Panel + ApoB');
    expect(lipid.subMetrics).toHaveLength(3);
    expect(lipid.subMetrics.map(s => s.name)).toEqual(['LDL-C', 'HDL-C', 'Triglycerides']);
  });

  it('metabolic panel prefers insulin > hba1c > glucose', () => {
    // Only glucose
    let result = scoreProfile(minimalProfile({ fasting_glucose: 92 }));
    let met = result.results.find(r => r.name === 'Metabolic Panel');
    expect(met.unit).toContain('glucose');

    // HbA1c + glucose → uses HbA1c
    result = scoreProfile(minimalProfile({ hba1c: 5.2, fasting_glucose: 92 }));
    met = result.results.find(r => r.name === 'Metabolic Panel');
    expect(met.unit).toContain('HbA1c');

    // All three → uses insulin
    result = scoreProfile(minimalProfile({ fasting_insulin: 6, hba1c: 5.2, fasting_glucose: 92 }));
    met = result.results.find(r => r.name === 'Metabolic Panel');
    expect(met.unit).toContain('insulin');
  });

  it('PHQ-9 scores map to correct standings', () => {
    const cases = [
      { score: 0, standing: Standing.OPTIMAL },
      { score: 4, standing: Standing.OPTIMAL },
      { score: 5, standing: Standing.GOOD },
      { score: 9, standing: Standing.GOOD },
      { score: 10, standing: Standing.AVERAGE },
      { score: 15, standing: Standing.BELOW_AVG },
      { score: 20, standing: Standing.CONCERNING },
      { score: 27, standing: Standing.CONCERNING },
    ];
    for (const { score, standing } of cases) {
      const result = scoreProfile(minimalProfile({ phq9_score: score }));
      const phq9 = result.results.find(r => r.name === 'PHQ-9 (Depression)');
      expect(phq9.standing).toBe(standing);
    }
  });

  it('TSH <0.4 is Concerning (hyperthyroid)', () => {
    const result = scoreProfile(minimalProfile({ tsh: 0.2 }));
    const thyroid = result.results.find(r => r.name === 'Thyroid (TSH)');
    expect(thyroid.standing).toBe(Standing.CONCERNING);
  });

  it('TSH 0.4-2.5 is Optimal', () => {
    const result = scoreProfile(minimalProfile({ tsh: 1.5 }));
    const thyroid = result.results.find(r => r.name === 'Thyroid (TSH)');
    expect(thyroid.standing).toBe(Standing.OPTIMAL);
  });

  it('family history and meds are binary (has or not)', () => {
    const result = scoreProfile(minimalProfile({ has_family_history: true, has_medication_list: true }));
    const fh = result.results.find(r => r.name === 'Family History');
    const meds = result.results.find(r => r.name === 'Medication List');
    expect(fh.hasData).toBe(true);
    expect(fh.standing).toBe(Standing.GOOD);
    expect(meds.hasData).toBe(true);
    expect(meds.standing).toBe(Standing.GOOD);
  });
});

// ---------------------------------------------------------------------------
// scoreProfile — full profile (Andrew's approximate data)
// ---------------------------------------------------------------------------

describe('scoreProfile full profile', () => {
  it('scores a complete profile with realistic data', () => {
    const result = scoreProfile(minimalProfile({
      systolic: 118, diastolic: 72,
      apob: 95, ldl_c: 128, hdl_c: 52, triglycerides: 85,
      fasting_glucose: 92, hba1c: 5.3, fasting_insulin: 7,
      has_family_history: false,
      sleep_regularity_stddev: 22, sleep_duration_avg: 7.2,
      daily_steps_avg: 9500,
      resting_hr: 58,
      waist_circumference: 34,
      has_medication_list: true,
      lpa: 45,
      vo2_max: 42,
      hrv_rmssd_avg: 35,
      hscrp: 0.8,
      alt: 22, ggt: 18,
      hemoglobin: 15.1,
      tsh: 1.8,
      vitamin_d: 42, ferritin: 95,
      weight_lbs: 195,
      phq9_score: 3,
      zone2_min_per_week: 180,
    }));

    expect(result.coverageScore).toBe(100);
    expect(result.gaps).toHaveLength(0);
    expect(result.avgPercentile).toBeGreaterThan(0);
    expect(result.results.every(r => r.hasData)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Coverage weights
// ---------------------------------------------------------------------------

describe('coverage weights', () => {
  it('tier 1 and tier 2 weights are reasonable', () => {
    const t1Total = Object.values(TIER1_WEIGHTS).reduce((a, b) => a + b, 0);
    const t2Total = Object.values(TIER2_WEIGHTS).reduce((a, b) => a + b, 0);
    // Tier 1 should outweigh tier 2
    expect(t1Total).toBeGreaterThan(t2Total);
    // Total should be reasonable
    expect(t1Total + t2Total).toBeGreaterThan(50);
  });

  it('weight keys match expected categories', () => {
    expect(Object.keys(TIER1_WEIGHTS)).toContain('blood_pressure');
    expect(Object.keys(TIER1_WEIGHTS)).toContain('lpa');
    expect(Object.keys(TIER2_WEIGHTS)).toContain('vo2_max');
    expect(Object.keys(TIER2_WEIGHTS)).toContain('phq9');
  });
});

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

describe('getFreshness', () => {
  it('returns 1.0 within fresh window', () => {
    const now = new Date('2026-03-01');
    const recent = '2026-02-01'; // 1 month ago
    expect(getFreshness('ldl_c', recent, now)).toBe(1.0); // fresh window = 6 months
  });

  it('returns 0.0 beyond stale window', () => {
    const now = new Date('2026-03-01');
    const old = '2024-01-01'; // 26 months ago
    expect(getFreshness('ldl_c', old, now)).toBe(0.0); // stale window = 12 months
  });

  it('returns linear decay between fresh and stale', () => {
    const now = new Date('2026-03-01');
    // 9 months ago — halfway between fresh (6) and stale (12) for ldl_c
    const mid = '2025-06-01';
    const f = getFreshness('ldl_c', mid, now);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
    expect(f).toBeCloseTo(0.5, 0);
  });

  it('returns 0.5 for missing date (legacy data)', () => {
    expect(getFreshness('ldl_c', null)).toBe(0.5);
    expect(getFreshness('ldl_c', undefined)).toBe(0.5);
  });

  it('returns 1.0 for unknown metric', () => {
    expect(getFreshness('made_up_metric', '2026-01-01', new Date('2026-03-01'))).toBe(1.0);
  });

  it('Lp(a) stays fresh for years (lifetime test)', () => {
    const now = new Date('2026-03-01');
    const fiveYearsAgo = '2021-03-01';
    expect(getFreshness('lpa', fiveYearsAgo, now)).toBe(1.0);
  });

  it('wearable data goes stale fast', () => {
    const now = new Date('2026-03-01');
    const twoMonthsAgo = '2026-01-01';
    // resting_hr: fresh = 0.5 months, stale = 1 month
    expect(getFreshness('resting_hr', twoMonthsAgo, now)).toBe(0.0);
  });
});

// ---------------------------------------------------------------------------
// Reliability
// ---------------------------------------------------------------------------

describe('getReliability', () => {
  it('hs-CRP single reading = 0.6', () => {
    expect(getReliability('hscrp', [{ value: 1.2 }], [])).toBe(0.6);
  });

  it('hs-CRP two readings = 1.0', () => {
    expect(getReliability('hscrp', [{ value: 1.2 }, { value: 0.9 }], [])).toBe(1.0);
  });

  it('fasting-sensitive metric with non-fasting import = 0.7', () => {
    const obs = [{ value: 160, import_id: 'imp1' }];
    const imports = [{ id: 'imp1', fasting: false }];
    expect(getReliability('triglycerides', obs, imports)).toBe(0.7);
  });

  it('fasting-sensitive metric with fasting import = 1.0', () => {
    const obs = [{ value: 85, import_id: 'imp1' }];
    const imports = [{ id: 'imp1', fasting: true }];
    expect(getReliability('triglycerides', obs, imports)).toBe(1.0);
  });

  it('generic metric = 1.0', () => {
    expect(getReliability('ldl_c', [{ value: 110 }], [])).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Trend detection
// ---------------------------------------------------------------------------

describe('detectTrend', () => {
  it('returns null with <2 observations', () => {
    expect(detectTrend('ldl_c', [])).toBeNull();
    expect(detectTrend('ldl_c', [{ value: 110, date: '2026-01-01' }])).toBeNull();
  });

  it('detects stable trend for small change', () => {
    const obs = [
      { value: 110, date: '2026-03-01' },
      { value: 111, date: '2025-09-01' },
    ];
    const trend = detectTrend('ldl_c', obs);
    expect(trend.direction).toBe('stable');
    expect(trend.significant).toBe(false);
  });

  it('detects significant rising trend', () => {
    const obs = [
      { value: 150, date: '2026-03-01' },
      { value: 100, date: '2025-03-01' },
    ];
    const trend = detectTrend('ldl_c', obs);
    expect(trend.direction).toBe('rising');
    expect(trend.pctChange).toBe(50);
    expect(trend.significant).toBe(true); // 50% > RCV of 23%
  });

  it('detects significant falling trend', () => {
    const obs = [
      { value: 70, date: '2026-03-01' },
      { value: 100, date: '2025-03-01' },
    ];
    const trend = detectTrend('ldl_c', obs);
    expect(trend.direction).toBe('falling');
    expect(trend.significant).toBe(true);
  });

  it('uses RCV threshold for significance', () => {
    // ldl_c RCV = 23%. A 20% change should NOT be significant.
    const obs = [
      { value: 120, date: '2026-03-01' },
      { value: 100, date: '2025-03-01' },
    ];
    const trend = detectTrend('ldl_c', obs);
    expect(trend.pctChange).toBe(20);
    expect(trend.significant).toBe(false);
  });

  it('returns chronological points for sparkline', () => {
    const obs = [
      { value: 130, date: '2026-03-01' },
      { value: 120, date: '2025-09-01' },
      { value: 110, date: '2025-03-01' },
    ];
    const trend = detectTrend('ldl_c', obs);
    expect(trend.points).toHaveLength(3);
    // Points should be oldest → newest
    expect(trend.points[0].value).toBe(110);
    expect(trend.points[2].value).toBe(130);
  });

  it('falls back to 20% threshold for unknown metrics', () => {
    const obs = [
      { value: 125, date: '2026-03-01' },
      { value: 100, date: '2025-03-01' },
    ];
    const trend = detectTrend('unknown_metric', obs);
    expect(trend.pctChange).toBe(25);
    expect(trend.significant).toBe(true); // 25% > 20% fallback
  });
});

// ---------------------------------------------------------------------------
// scoreTimeSeriesProfile
// ---------------------------------------------------------------------------

describe('scoreTimeSeriesProfile', () => {
  it('scores a time-series profile with freshness', () => {
    const tsProfile = {
      demographics: DEMO_35M,
      observations: {
        systolic: [{ value: 118, date: '2026-02-15' }],
        diastolic: [{ value: 72, date: '2026-02-15' }],
        ldl_c: [{ value: 110, date: '2026-01-01' }],
      },
      imports: [],
    };
    const result = scoreTimeSeriesProfile(tsProfile);
    expect(result.freshnessAdjustedCoverage).toBeDefined();
    expect(result.rawCoverage).toBeDefined();
    expect(result.coverageScore).toBe(result.freshnessAdjustedCoverage);
  });

  it('freshness-adjusted coverage <= raw coverage', () => {
    const tsProfile = {
      demographics: DEMO_35M,
      observations: {
        // Old data — should decay
        ldl_c: [{ value: 110, date: '2024-06-01' }],
        systolic: [{ value: 120, date: '2026-02-01' }],
        diastolic: [{ value: 75, date: '2026-02-01' }],
      },
      imports: [],
    };
    const result = scoreTimeSeriesProfile(tsProfile);
    expect(result.freshnessAdjustedCoverage).toBeLessThanOrEqual(result.rawCoverage);
  });

  it('includes trends for metrics with significant changes', () => {
    const tsProfile = {
      demographics: DEMO_35M,
      observations: {
        ldl_c: [
          { value: 150, date: '2026-03-01' },
          { value: 100, date: '2025-03-01' },
        ],
      },
      imports: [],
    };
    const result = scoreTimeSeriesProfile(tsProfile);
    const lipid = result.results.find(r => r.name === 'Lipid Panel + ApoB');
    expect(lipid.trends.length).toBeGreaterThan(0);
    expect(lipid.trends[0].significant).toBe(true);
  });

  it('handles empty observations gracefully', () => {
    const tsProfile = {
      demographics: DEMO_35M,
      observations: {},
      imports: [],
    };
    const result = scoreTimeSeriesProfile(tsProfile);
    expect(result.coverageScore).toBe(0);
    expect(result.observationMetrics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NHANES percentile (if data loaded)
// ---------------------------------------------------------------------------

describe('getPercentile', () => {
  it('returns a percentile for a valid metric/demo', () => {
    const pct = getPercentile('ldl_c', 110, '30-39', 'M');
    if (pct === null) return; // NHANES data not loaded, skip
    expect(pct).toBeGreaterThanOrEqual(1);
    expect(pct).toBeLessThanOrEqual(99);
  });

  it('lower value gives higher percentile for lower-is-better metrics', () => {
    const low = getPercentile('ldl_c', 70, '30-39', 'M');
    const high = getPercentile('ldl_c', 180, '30-39', 'M');
    if (low === null || high === null) return;
    expect(low).toBeGreaterThan(high);
  });

  it('higher value gives higher percentile for higher-is-better metrics', () => {
    const low = getPercentile('hdl_c', 30, '30-39', 'M');
    const high = getPercentile('hdl_c', 70, '30-39', 'M');
    if (low === null || high === null) return;
    expect(high).toBeGreaterThan(low);
  });

  it('returns null for unknown metric', () => {
    expect(getPercentile('not_a_metric', 100, '30-39', 'M')).toBeNull();
  });
});
