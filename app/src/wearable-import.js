// wearable-import.js — Drag-drop wearable file import (Garmin CSV, Apple Health XML, Oura JSON)

import { createLogger } from './logger.js';
const log = createLogger('wearable-import');

export function initWearableDrop() {
  const zone = document.getElementById('wearable-drop');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleWearableFiles(e.dataTransfer.files);
  });
}

export function handleWearableFileInput(e) {
  handleWearableFiles(e.target.files);
}

export async function handleWearableFiles(fileList) {
  const summaryEl = document.getElementById('wearable-import-summary');

  for (const file of fileList) {
    try {
      const text = await file.text();
      const result = detectAndParse(text, file.name);

      if (!result) {
        summaryEl.textContent = `Unrecognized format: ${file.name}`;
        summaryEl.className = 'parse-summary active';
        log.warn('unrecognized wearable format', { file: file.name });
        continue;
      }

      populateFields(result.metrics);
      showSummary(summaryEl, result);
      // Set brand-level device fallback for device-aware costToClose
      const brandMap = { 'Garmin': 'garmin', 'Apple Health': 'apple', 'Oura': 'oura' };
      const detectedBrand = brandMap[result.source];
      if (detectedBrand && !window.__selectedDevice) {
        window.__selectedDevice = { brand: detectedBrand, model: null };
      }
      log.info('imported wearable file', { file: file.name, source: result.source, days: result.days });
    } catch (err) {
      log.error('error processing wearable file', { file: file.name, error: err.message });
      summaryEl.textContent = `Error reading ${file.name}: ${err.message}`;
      summaryEl.className = 'parse-summary active';
    }
  }
}

export function detectAndParse(text, filename) {
  // Oura JSON — has "sleep" array
  if (text.trimStart().startsWith('{')) {
    try {
      const data = JSON.parse(text);
      if (data.sleep && Array.isArray(data.sleep)) {
        return parseOuraJSON(data);
      }
    } catch { /* not valid JSON, fall through */ }
  }

  // Apple Health XML — contains HealthData
  if (text.includes('<HealthData') || (text.trimStart().startsWith('<?xml') && text.includes('HealthData'))) {
    return parseAppleHealthXML(text);
  }

  // Garmin CSV — has typical Garmin headers
  const firstLine = text.split('\n')[0] || '';
  if (firstLine.includes('Total Steps') || firstLine.includes('Sleep Hours') || firstLine.includes('Resting Heart Rate')) {
    return parseGarminCSV(text);
  }

  return null;
}

// ── Garmin CSV ──

function parseGarminCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map(h => h.trim());
  const colIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const iSteps = colIndex('Total Steps');
  const iSleep = colIndex('Sleep Hours');
  const iRHR = colIndex('Resting Heart Rate');

  const steps = [], sleepHrs = [], rhrs = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (iSteps >= 0 && cols[iSteps]) { const v = Number(cols[iSteps]); if (!isNaN(v) && v > 0) steps.push(v); }
    if (iSleep >= 0 && cols[iSleep]) { const v = Number(cols[iSleep]); if (!isNaN(v) && v > 0) sleepHrs.push(v); }
    if (iRHR >= 0 && cols[iRHR])   { const v = Number(cols[iRHR]);   if (!isNaN(v) && v > 0) rhrs.push(v); }
  }

  const days = Math.max(steps.length, sleepHrs.length, rhrs.length);
  const metrics = {};
  if (steps.length)    metrics.daily_steps_avg    = Math.round(avg(steps));
  if (sleepHrs.length) metrics.sleep_duration_avg = round1(avg(sleepHrs));
  if (rhrs.length)     metrics.resting_hr         = Math.round(avg(rhrs));

  return { source: 'Garmin', days, metrics };
}

// ── Apple Health XML ──

function parseAppleHealthXML(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  const records = doc.querySelectorAll('Record');

  const buckets = {
    rhr: [],   // RestingHeartRate
    steps: {}, // steps by date (sum per day, then average)
    sleep: {}, // sleep analysis — total asleep time per date
    hrv: [],   // HeartRateVariabilitySDNN
    vo2: [],   // VO2Max
  };

  for (const rec of records) {
    const type = rec.getAttribute('type');
    const val = parseFloat(rec.getAttribute('value'));
    const start = rec.getAttribute('startDate') || '';
    const date = start.slice(0, 10); // YYYY-MM-DD

    if (type === 'HKQuantityTypeIdentifierRestingHeartRate' && !isNaN(val)) {
      buckets.rhr.push(val);
    } else if (type === 'HKQuantityTypeIdentifierStepCount' && !isNaN(val)) {
      buckets.steps[date] = (buckets.steps[date] || 0) + val;
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      // Count asleep stages (Core, Deep, REM, Unspecified — exclude InBed and Awake)
      const sleepVal = rec.getAttribute('value') || '';
      if (sleepVal.includes('Asleep')) {
        const startMs = new Date(start).getTime();
        const endMs = new Date(rec.getAttribute('endDate')).getTime();
        const hours = (endMs - startMs) / (1000 * 60 * 60);
        if (hours > 0 && hours < 24) {
          buckets.sleep[date] = (buckets.sleep[date] || 0) + hours;
        }
      }
    } else if (type === 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' && !isNaN(val)) {
      buckets.hrv.push(val);
    } else if (type === 'HKQuantityTypeIdentifierVO2Max' && !isNaN(val)) {
      buckets.vo2.push(val);
    }
  }

  const stepDays = Object.values(buckets.steps);
  const sleepDays = Object.values(buckets.sleep);

  const metrics = {};
  if (buckets.rhr.length) metrics.resting_hr         = Math.round(avg(buckets.rhr));
  if (stepDays.length)    metrics.daily_steps_avg    = Math.round(avg(stepDays));
  if (sleepDays.length)   metrics.sleep_duration_avg = round1(avg(sleepDays));
  if (buckets.hrv.length) metrics.hrv_rmssd_avg      = Math.round(avg(buckets.hrv));
  if (buckets.vo2.length) metrics.vo2_max            = round1(avg(buckets.vo2));

  const allDates = new Set([
    ...Object.keys(buckets.steps),
    ...Object.keys(buckets.sleep),
  ]);
  const days = Math.max(allDates.size, buckets.rhr.length, 1);

  return { source: 'Apple Health', days, metrics };
}

// ── Oura JSON ──

function parseOuraJSON(data) {
  const sleepArr = data.sleep || [];
  const activityArr = data.activity || [];

  const sleepHrs = [], rhrs = [], hrvs = [], steps = [];

  for (const s of sleepArr) {
    if (s.total) sleepHrs.push(s.total / 3600); // seconds → hours
    if (s.hr_average) rhrs.push(s.hr_average);
    if (s.rmssd) hrvs.push(s.rmssd);
  }

  for (const a of activityArr) {
    if (a.steps) steps.push(a.steps);
  }

  const days = Math.max(sleepArr.length, activityArr.length);
  const metrics = {};
  if (sleepHrs.length) metrics.sleep_duration_avg = round1(avg(sleepHrs));
  if (rhrs.length)     metrics.resting_hr         = Math.round(avg(rhrs));
  if (hrvs.length)     metrics.hrv_rmssd_avg      = Math.round(avg(hrvs));
  if (steps.length)    metrics.daily_steps_avg    = Math.round(avg(steps));
  // Apple Shortcut bridge puts vo2_max at top level
  if (data.vo2_max != null) metrics.vo2_max        = round1(Number(data.vo2_max));

  const source = data.source === 'apple_health_shortcut' ? 'Apple Health' : 'Oura';
  return { source, days, metrics };
}

// ── Populate form fields ──

const METRIC_TO_INPUT = {
  sleep_duration_avg: 'f-sleep-hours',
  resting_hr:         'f-rhr',
  daily_steps_avg:    'f-steps',
  vo2_max:            'f-vo2',
  hrv_rmssd_avg:      'f-hrv',
};

export function populateFields(metrics) {
  for (const [key, value] of Object.entries(metrics)) {
    const inputId = METRIC_TO_INPUT[key];
    if (inputId) {
      const el = document.getElementById(inputId);
      if (el) el.value = value;
    }
  }
}

// ── Summary display ──

const METRIC_LABELS = {
  daily_steps_avg:    'avg steps',
  sleep_duration_avg: 'avg sleep',
  resting_hr:         'avg RHR',
  vo2_max:            'VO2 max',
  hrv_rmssd_avg:      'avg HRV',
};

function showSummary(el, result) {
  const parts = [];
  for (const [key, value] of Object.entries(result.metrics)) {
    const label = METRIC_LABELS[key] || key;
    let display = value;
    if (key === 'daily_steps_avg') display = value.toLocaleString();
    if (key === 'sleep_duration_avg') display = value + 'h';
    if (key === 'resting_hr') display = value + ' bpm';
    if (key === 'vo2_max') display = value + ' mL/kg/min';
    if (key === 'hrv_rmssd_avg') display = value + ' ms';
    parts.push(`${display} ${label}`);
  }

  el.innerHTML = `<span class="count">Imported ${result.days} days</span> of ${result.source} data: ${parts.join(', ')}`;
  el.className = 'parse-summary active';
}

// ── Helpers ──

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function round1(n) { return Math.round(n * 10) / 10; }
