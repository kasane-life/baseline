// Device capability database for wearable integration
// Last updated: 2026-03-01
// Sources: DC Rainmaker reviews, official spec pages, Garmin/Apple/Oura/Fitbit/Polar/Whoop/Samsung docs

export const BRANDS = [
  { id: 'apple', name: 'Apple Watch', icon: '⌚' },
  { id: 'garmin', name: 'Garmin', icon: '🏃' },
  { id: 'oura', name: 'Oura', icon: '💍' },
  { id: 'fitbit', name: 'Fitbit', icon: '⌚' },
  { id: 'polar', name: 'Polar', icon: '⌚' },
  { id: 'whoop', name: 'Whoop', icon: '💪' },
  { id: 'samsung', name: 'Samsung', icon: '⌚' },
];

export const DEVICES = [
  // ─── Apple Watch ───────────────────────────────────────────────
  // HRV type: SDNN (HeartRateVariabilitySDNN in HealthKit)
  // Export: Shortcuts bridge or full XML export from Health app
  // Sleep stages: watchOS 9+ required (Series 4+ all support it)
  // SpO2: requires hardware sensor, introduced Series 6. Not on SE models.
  {
    brand: 'apple',
    model: 'Series 4',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 5',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 6',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 7',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 8',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 9',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Series 10',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'SE (1st gen)',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'SE (2nd gen)',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Ultra',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },
  {
    brand: 'apple',
    model: 'Ultra 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'sdnn',
    exportMethods: ['shortcuts', 'xml'],
  },

  // ─── Garmin ────────────────────────────────────────────────────
  // HRV type: RMSSD (nightly HRV Status feature)
  // Export: CSV bulk export from Garmin Connect, Partner API (requires approval)
  // HRV Status not available on: FR55, Venu 2/2 Plus, Venu Sq 2, Lily 2 (original)
  // SpO2 not available on: FR55
  {
    brand: 'garmin',
    model: 'Forerunner 55',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: false, vo2max: true, spo2: false },
    hrvType: null,
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Forerunner 165',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Forerunner 255',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Forerunner 265',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Forerunner 955',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Forerunner 965',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Venu 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: false, vo2max: true, spo2: true },
    hrvType: null,
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Venu 2 Plus',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: false, vo2max: true, spo2: true },
    hrvType: null,
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Venu 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Venu 3S',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Venu Sq 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: false, vo2max: true, spo2: true },
    hrvType: null,
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Fenix 7',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Fenix 7S',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Fenix 7X',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Fenix 8',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Enduro 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Enduro 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Vivoactive 5',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Lily 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: false, vo2max: true, spo2: true },
    hrvType: null,
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Lily 2 Active',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Instinct 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Instinct 2S',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Instinct 2X',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'garmin',
    model: 'Instinct 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },

  // ─── Oura ──────────────────────────────────────────────────────
  // HRV type: RMSSD (nightly 5-min segments averaged)
  // VO2 max: Cardio Capacity via 6-min walking test, added May 2024
  {
    brand: 'oura',
    model: 'Ring Gen 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'oura',
    model: 'Ring 4',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },

  // ─── Fitbit / Google ───────────────────────────────────────────
  // HRV type: RMSSD (nightly via Health Metrics dashboard)
  // VO2 max: "Cardio Fitness Score" across lineup
  {
    brand: 'fitbit',
    model: 'Charge 5',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Charge 6',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Sense',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Sense 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Versa 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Versa 4',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Inspire 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Pixel Watch',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Pixel Watch 2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'fitbit',
    model: 'Pixel Watch 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },

  // ─── Polar ─────────────────────────────────────────────────────
  // HRV type: RMSSD (Nightly Recharge ANS component, Orthostatic Test)
  // SpO2: only on models with Polar Elixir biosensing (V3, Grit X2 Pro, Ignite 3)
  {
    brand: 'polar',
    model: 'Vantage V2',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Vantage V3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Grit X Pro',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Grit X2 Pro',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Ignite 3',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Pacer',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },
  {
    brand: 'polar',
    model: 'Pacer Pro',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: false },
    hrvType: 'rmssd',
    exportMethods: ['json', 'api'],
  },

  // ─── Whoop ─────────────────────────────────────────────────────
  // HRV type: RMSSD (core recovery metric)
  // Steps: added Oct 2024 via software update, available on 4.0+
  // VO2 max: available on 4.0+, expanded in 5.0 Healthspan features
  {
    brand: 'whoop',
    model: '4.0',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },
  {
    brand: 'whoop',
    model: '5.0',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv', 'api'],
  },

  // ─── Samsung ───────────────────────────────────────────────────
  // HRV type: RMSSD (confirmed by PLOS One peer-reviewed study)
  // VO2 max: available Watch 4+ via One UI 4.1+, requires outdoor GPS run
  // Export: Samsung Health CSV export; limited API access via Health Connect
  {
    brand: 'samsung',
    model: 'Galaxy Watch 4',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 4 Classic',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 5',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 5 Pro',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 6',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 6 Classic',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch 7',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch Ultra',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
  {
    brand: 'samsung',
    model: 'Galaxy Watch FE',
    capabilities: { steps: true, sleep_duration: true, sleep_stages: true, resting_hr: true, hrv: true, vo2max: true, spo2: true },
    hrvType: 'rmssd',
    exportMethods: ['csv'],
  },
];

// Helper: get capabilities for a specific model, or brand-level best-case if no model
export function getDeviceCapabilities(brand, model) {
  if (model) {
    return DEVICES.find(d => d.brand === brand && d.model === model)?.capabilities || null;
  }
  // Brand-level fallback: union of capabilities (what's possible with some model)
  const brandDevices = DEVICES.filter(d => d.brand === brand);
  if (brandDevices.length === 0) return null;
  const caps = {};
  for (const key of Object.keys(brandDevices[0].capabilities)) {
    caps[key] = brandDevices.some(d => d.capabilities[key]);
  }
  return caps;
}

// Helper: get all models for a brand
export function getModelsByBrand(brandId) {
  return DEVICES.filter(d => d.brand === brandId);
}

// Helper: which of our scored metrics can this device NOT provide?
// Maps capability flags to score.js metric keys
export function getDeviceGaps(brand, model) {
  const caps = getDeviceCapabilities(brand, model);
  if (!caps) return [];
  const gaps = [];
  if (!caps.steps) gaps.push('daily_steps_avg');
  if (!caps.sleep_duration) gaps.push('sleep_duration_avg');
  if (!caps.sleep_stages) gaps.push('sleep_regularity_stddev');
  if (!caps.resting_hr) gaps.push('resting_hr');
  if (!caps.hrv) gaps.push('hrv_rmssd_avg');
  if (!caps.vo2max) gaps.push('vo2_max');
  return gaps;
}

// Helper: get the HRV type for a device (needed for scoring accuracy)
export function getHrvType(brand, model) {
  return DEVICES.find(d => d.brand === brand && d.model === model)?.hrvType || null;
}

// Helper: get export methods for a device
export function getExportMethods(brand, model) {
  return DEVICES.find(d => d.brand === brand && d.model === model)?.exportMethods || [];
}
