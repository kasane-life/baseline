/**
 * METRIC_INTERVENTIONS — research-backed context for every scored metric.
 *
 * Key convention: matches CUTOFF_TABLES keys in score.js where they exist,
 * otherwise matches METRIC_TO_CATEGORY values. Mapping for render.js:
 *
 *   Result name              → Intervention key
 *   ─────────────────────────────────────────────
 *   Blood Pressure           → bp_systolic
 *   Lipid Panel + ApoB       → apob (primary), ldl_c, hdl_c, triglycerides
 *   Metabolic Panel           → hba1c (primary), fasting_glucose
 *   Lp(a)                    → lpa
 *   Resting Heart Rate       → rhr
 *   Waist Circumference      → waist
 *   Sleep Duration            → sleep_duration
 *   Sleep Regularity          → sleep_regularity
 *   Daily Steps               → daily_steps
 *   VO2 Max                  → vo2_max
 *   HRV (7-day avg)          → hrv_rmssd
 *   hs-CRP                   → hscrp
 *   Vitamin D + Ferritin     → vitamin_d
 *   Weight Trends             → weight_trends
 *   Zone 2 Cardio            → zone2
 *
 * For composite panels (Lipid, Metabolic), look up sub-metric keys
 * (ldl_c, hdl_c, triglycerides, fasting_glucose) for per-marker detail.
 */

export const METRIC_INTERVENTIONS = {
  apob: {
    why: 'ApoB counts every atherogenic particle in your blood — it predicts heart attack risk better than LDL-C alone. Each 10 mg/dL reduction cuts cardiovascular events ~10%.',
    lever: 'Dietary: reduce saturated fat to <7% of calories, add 10g/day soluble fiber. If elevated despite diet, statins lower ApoB 30-50%.',
    onetime: false,
    source: 'Sniderman et al., Lancet Diabetes & Endocrinology 2019',
  },

  ldl_c: {
    why: 'LDL particles deliver cholesterol into artery walls, driving plaque buildup. Lifetime cumulative exposure matters — lower and earlier is better.',
    lever: 'Reduce saturated fat, add 2g/day plant sterols (+10% reduction). Statins lower LDL-C 30-50% if lifestyle alone is insufficient.',
    onetime: false,
    source: 'Ference et al., European Heart Journal 2017',
  },

  hdl_c: {
    why: 'HDL removes cholesterol from artery walls. Below 40 mg/dL in men (50 in women) independently doubles cardiovascular risk.',
    lever: 'Zone 2 cardio 150+ min/week (+5-10 mg/dL). Omega-3s 2-3g/day (+3-5 mg/dL). Moderate alcohol has effect but isn\'t recommended as intervention.',
    onetime: false,
    source: 'AHA/ACC Lipid Guidelines 2018',
  },

  triglycerides: {
    why: 'Triglycerides above 150 mg/dL signal metabolic dysfunction and amplify LDL particle count. Fasting values above 200 independently raise pancreatitis and CVD risk.',
    lever: 'Cut refined carbs and added sugar. Omega-3s (EPA/DHA 2-4g/day) lower triglycerides 20-30%. Zone 2 exercise helps clear them.',
    onetime: false,
    source: 'Miller et al., Circulation 2011',
  },

  hba1c: {
    why: 'HbA1c reflects 3-month average blood sugar. Each 1% above 5.0% raises cardiovascular mortality 20-30%, even in the "normal" range.',
    lever: 'Resistance training 3x/week improves insulin sensitivity within weeks. Reduce refined carbs, prioritize protein and fiber at every meal.',
    onetime: false,
    source: 'Selvin et al., Annals of Internal Medicine 2010',
  },

  fasting_glucose: {
    why: 'Fasting glucose above 100 mg/dL signals early insulin resistance — often a decade before diabetes diagnosis. Catching it early means you can reverse it with lifestyle.',
    lever: 'Post-meal walks (10-15 min) blunt glucose spikes 30%. Resistance training improves glucose disposal. Fasting insulin is an even earlier signal — ask your doctor to add it.',
    onetime: false,
    source: 'ADA Standards of Medical Care 2023',
  },

  bp_systolic: {
    why: 'Each 20 mmHg above 115 systolic doubles your risk of cardiovascular death. Blood pressure is the #1 modifiable risk factor for stroke.',
    lever: 'DASH diet (-11 mmHg), 150 min/week aerobic exercise (-5-8 mmHg), sodium <2300mg/day (-3-5 mmHg). Measure at home for 7 days — white coat effect is real.',
    onetime: false,
    source: 'Whelton et al., ACC/AHA Hypertension Guidelines 2017',
  },

  rhr: {
    why: 'Resting heart rate above 75 bpm is associated with doubled cardiovascular mortality vs below 60 bpm. It reflects autonomic fitness and cardiac efficiency.',
    lever: 'Zone 2 cardio 150+ min/week is the primary lever — expect 5-10 bpm reduction over 8-12 weeks. Sleep quality and stress management also lower RHR.',
    onetime: false,
    source: 'Zhang et al., CMAJ 2016',
  },

  waist: {
    why: 'Waist circumference measures visceral fat, which drives insulin resistance and inflammation. Above 40" (men) or 35" (women) is high risk regardless of BMI.',
    lever: 'Caloric deficit targeting 0.5-1 lb/week fat loss. Visceral fat responds to cardio and resistance training faster than subcutaneous fat.',
    onetime: false,
    source: 'Ross et al., Circulation 2020',
  },

  vo2_max: {
    why: 'Strongest modifiable predictor of all-cause mortality. Moving from the bottom 25% to average fitness cuts death risk by 70% — larger effect than quitting smoking.',
    lever: '150 min/week Zone 2 cardio (conversational pace, nose-breathing). Add 1-2 high-intensity interval sessions per week for faster VO2 gains.',
    onetime: false,
    source: 'Mandsager et al., JAMA Network Open 2018',
  },

  hrv_rmssd: {
    why: 'HRV reflects your autonomic nervous system\'s recovery capacity. Higher HRV tracks with lower inflammation, better stress resilience, and reduced cardiac risk.',
    lever: 'Consistent sleep schedule (same time ±30 min). Zone 2 cardio builds parasympathetic tone. Avoid alcohol before bed — it tanks HRV 20-30% overnight.',
    onetime: false,
    source: 'Shaffer & Ginsberg, Frontiers in Public Health 2017',
  },

  hscrp: {
    why: 'hs-CRP measures systemic inflammation. Above 2.0 mg/L doubles cardiovascular event risk even with normal cholesterol. Single readings are noisy — two tests 2 weeks apart are more reliable.',
    lever: 'Mediterranean diet lowers CRP 20-30%. Zone 2 exercise has anti-inflammatory effects. Statins lower CRP independent of their lipid effects.',
    onetime: false,
    source: 'Ridker et al., NEJM 2017 (CANTOS trial)',
  },

  vitamin_d: {
    why: '42% of US adults are Vitamin D deficient. Below 20 ng/mL is associated with increased fracture risk, impaired immunity, and higher all-cause mortality.',
    lever: 'Supplement D3 1000-2000 IU/day (most people). Retest in 3 months. Aim for 30-50 ng/mL. Take with fat for absorption.',
    onetime: false,
    source: 'Holick, NEJM 2007',
  },

  lpa: {
    why: '20% of people have elevated Lp(a), invisible on standard lipid panels. It\'s genetically determined — one test gives a lifetime answer. High Lp(a) triples cardiovascular risk.',
    lever: 'Order Lp(a) test ($15-30 add-on to any lipid panel). If elevated, no current drug lowers it meaningfully — but it changes your overall risk calculus and may warrant earlier statin therapy.',
    onetime: true,
    source: 'Tsimikas et al., JACC 2018',
  },

  sleep_duration: {
    why: 'Sleeping less than 6 hours raises all-cause mortality 12% and impairs insulin sensitivity, immune function, and cognitive performance. 7-8 hours is the minimum effective dose.',
    lever: 'Fixed wake time (even weekends). No screens 1 hour before bed. Room temperature 65-68°F. Caffeine cutoff 10+ hours before sleep.',
    onetime: false,
    source: 'Cappuccio et al., Sleep Medicine Reviews 2010',
  },

  sleep_regularity: {
    why: 'Irregular sleep timing (varying bedtime >60 min) predicts mortality better than short sleep duration. It disrupts circadian rhythm, impairing metabolic and immune function.',
    lever: 'Set a fixed bedtime and wake time within ±30 min, including weekends. Use an alarm for bedtime, not just waking. Your wearable can track this.',
    onetime: false,
    source: 'Lunsford-Avery et al., Scientific Reports 2018',
  },

  daily_steps: {
    why: 'Each additional 1,000 steps/day cuts all-cause mortality ~15%, up to about 10,000 steps. Benefits plateau above 10K but don\'t reverse.',
    lever: 'Walk after meals (10-15 min). Take calls while walking. Park far. Aim for 7,000+ steps/day as a starting target — your device tracks this automatically.',
    onetime: false,
    source: 'Paluch et al., Lancet Public Health 2022',
  },

  zone2: {
    why: 'Zone 2 cardio (conversational pace, 60-70% max HR) builds mitochondrial density and fat oxidation. 150-300 min/week drives the largest mortality reduction of any exercise dose.',
    lever: '150 min/week minimum — brisk walking, easy cycling, or light jogging where you can hold a conversation. Your HR wearable can confirm you\'re in Zone 2.',
    onetime: false,
    source: 'AHA Physical Activity Guidelines 2018; Iannetta et al., Sports Medicine 2020',
  },

  weight_trends: {
    why: 'Progressive weight drift — not absolute weight — is the signal. Gaining 5+ lbs/year correlates with worsening metabolic markers. Tracking catches drift before it compounds.',
    lever: 'Weekly weigh-ins (same time, same conditions). Track 7-day rolling average to smooth out water fluctuations. A smart scale removes friction.',
    onetime: false,
    source: 'Zheng et al., NEJM 2011',
  },
};

/**
 * Look up intervention data for a metric.
 * @param {string} metricKey — key matching CUTOFF_TABLES or METRIC_TO_CATEGORY in score.js
 * @returns {object|null} { why, lever, onetime, source } or null
 */
export function getIntervention(metricKey) {
  return METRIC_INTERVENTIONS[metricKey] || null;
}
