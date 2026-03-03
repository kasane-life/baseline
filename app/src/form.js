// form.js — Form step navigation, profile building, form population

import { getSelectedMeds, addMedByName } from './meds.js';
import { getPhq9Score } from './phq9.js';
import { createLogger } from './logger.js';
const log = createLogger('form');

// ── State ──
export const TOTAL_STEPS = 2;
let _currentStep = 0;
let _parsedLabValues = {};
let _pendingImports = [];
let _selectedDevices = [];

export function getCurrentStep() { return _currentStep; }
export function getParsedLabValues() { return _parsedLabValues; }
export function getPendingImports() { return _pendingImports; }
export function getSelectedDevices() { return _selectedDevices; }

export function resetState() {
  _parsedLabValues = {};
  _pendingImports = [];
  _currentStep = 0;
  _selectedDevices = [];
}

export function addParsedLabValues(values) {
  Object.assign(_parsedLabValues, values);
}

export function addPendingImport(imp) {
  _pendingImports.push(imp);
}

export function clearPendingImports() {
  _pendingImports = [];
}

export function initProgressBar() {
  // No longer needed — 2-phase flow doesn't use progress pips
}

export function initToggleButtons() {
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });

  document.querySelectorAll('.option-group .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.option-group');
      group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

export function toggleDevice(el) {
  const device = el.dataset.device;
  if (device === 'none') {
    document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    _selectedDevices = ['none'];
  } else {
    const noneCard = document.querySelector('.device-card[data-device="none"]');
    if (noneCard) noneCard.classList.remove('selected');
    _selectedDevices = _selectedDevices.filter(d => d !== 'none');

    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
      if (!_selectedDevices.includes(device)) _selectedDevices.push(device);
    } else {
      _selectedDevices = _selectedDevices.filter(d => d !== device);
    }
  }
}

export function nextStep() {
  if (_currentStep < TOTAL_STEPS - 1) {
    showStep(_currentStep + 1);
  }
}

export function prevStep() {
  if (_currentStep > 0) {
    showStep(_currentStep - 1);
  }
}

export function showStep(n) {
  // Legacy step navigation — now a no-op in 2-phase flow
  // Kept as export for any remaining callers
  _currentStep = n;
}

export function val(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const v = parseFloat(el.value);
  return isNaN(v) ? null : v;
}

export function toggleVal(field) {
  const group = document.querySelector(`.toggle-group[data-field="${field}"]`);
  if (!group) return null;
  const selected = group.querySelector('.toggle-btn.selected');
  if (!selected) return null;
  return selected.dataset.value;
}

export function buildProfile() {
  const age = val('f-age') || 35;
  const sexEl = document.querySelector('#f-sex .opt-btn.selected');
  const sex = sexEl ? sexEl.dataset.value : 'M';

  const heightFt = val('f-height-ft');
  const heightIn = val('f-height-in');
  const weightLbs = val('f-weight');
  let bmi = null;
  if (heightFt != null && weightLbs != null) {
    const totalInches = (heightFt * 12) + (heightIn || 0);
    bmi = (weightLbs / (totalInches * totalInches)) * 703;
  }

  const fhAnswer = toggleVal('family-history');
  const meds = getSelectedMeds();
  const phq9Score = getPhq9Score();
  const fastingAnswer = toggleVal('fasting');
  const labDateEl = document.getElementById('f-lab-date');
  const labDate = labDateEl?.value || null;

  const pv = (inputId, parsedField) => val(inputId) ?? _parsedLabValues[parsedField] ?? null;

  return {
    demographics: {
      age, sex, ethnicity: 'white',
      height_ft: heightFt,
      height_in: heightIn,
      medications: meds.length > 0 ? meds : null,
      devices: _selectedDevices.length > 0 ? [..._selectedDevices] : null,
    },
    lab_draw_date: labDate,
    fasting: fastingAnswer === 'yes' ? true : (fastingAnswer === 'no' ? false : null),
    systolic: val('f-sbp'),
    diastolic: val('f-dbp'),
    ldl_c: pv('f-ldl', 'ldl_c'),
    hdl_c: pv('f-hdl', 'hdl_c'),
    total_cholesterol: _parsedLabValues.total_cholesterol ?? null,
    triglycerides: pv('f-trig', 'triglycerides'),
    apob: pv('f-apob', 'apob'),
    fasting_glucose: pv('f-glucose', 'fasting_glucose'),
    hba1c: pv('f-hba1c', 'hba1c'),
    fasting_insulin: pv('f-insulin', 'fasting_insulin'),
    has_family_history: fhAnswer === 'yes' ? true : (fhAnswer === 'no' ? false : null),
    sleep_regularity_stddev: val('f-sleep-reg'),
    sleep_duration_avg: val('f-sleep-hours'),
    daily_steps_avg: val('f-steps'),
    resting_hr: val('f-rhr'),
    waist_circumference: val('f-waist'),
    has_medication_list: meds.length > 0 ? true : null,
    _medication_text: meds.length > 0 ? meds.join(', ') : null,
    lpa: pv('f-lpa', 'lpa'),
    hscrp: pv('f-hscrp', 'hscrp'),
    alt: pv('f-alt', 'alt'),
    ast: _parsedLabValues.ast ?? null,
    ggt: pv('f-ggt', 'ggt'),
    tsh: pv('f-tsh', 'tsh'),
    vitamin_d: pv('f-vitd', 'vitamin_d'),
    ferritin: pv('f-ferritin', 'ferritin'),
    hemoglobin: pv('f-hemoglobin', 'hemoglobin'),
    wbc: pv('f-wbc', 'wbc'),
    platelets: pv('f-platelets', 'platelets'),
    vo2_max: val('f-vo2'),
    hrv_rmssd_avg: val('f-hrv'),
    weight_lbs: weightLbs,
    phq9_score: phq9Score,
    zone2_min_per_week: val('f-zone2'),
    has_supplement_list: null,
    _bmi: bmi,
    _devices: _selectedDevices.length > 0 ? _selectedDevices : null,
  };
}

export function populateForm(p) {
  function setVal(id, v) {
    if (v != null) document.getElementById(id).value = v;
  }

  setVal('f-age', p.demographics?.age);
  if (p.demographics?.sex) {
    document.querySelectorAll('#f-sex .opt-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === p.demographics.sex);
    });
  }
  // G1: Restore height
  setVal('f-height-ft', p.demographics?.height_ft);
  setVal('f-height-in', p.demographics?.height_in);

  setVal('f-weight', p.weight_lbs);
  setVal('f-apob', p.apob);
  setVal('f-ldl', p.ldl_c);
  setVal('f-hdl', p.hdl_c);
  setVal('f-trig', p.triglycerides);
  setVal('f-glucose', p.fasting_glucose);
  setVal('f-hba1c', p.hba1c);
  setVal('f-insulin', p.fasting_insulin);
  setVal('f-lpa', p.lpa);
  setVal('f-hscrp', p.hscrp);
  setVal('f-alt', p.alt);
  setVal('f-ggt', p.ggt);
  setVal('f-hemoglobin', p.hemoglobin);
  setVal('f-wbc', p.wbc);
  setVal('f-platelets', p.platelets);
  setVal('f-tsh', p.tsh);
  setVal('f-vitd', p.vitamin_d);
  setVal('f-ferritin', p.ferritin);
  setVal('f-sbp', p.systolic);
  setVal('f-dbp', p.diastolic);
  setVal('f-rhr', p.resting_hr);
  setVal('f-vo2', p.vo2_max);
  setVal('f-hrv', p.hrv_rmssd_avg);
  setVal('f-waist', p.waist_circumference);
  setVal('f-steps', p.daily_steps_avg);
  setVal('f-zone2', p.zone2_min_per_week);
  setVal('f-sleep-hours', p.sleep_duration_avg);
  setVal('f-sleep-reg', p.sleep_regularity_stddev);

  function setToggle(field, val) {
    if (val == null) return;
    const group = document.querySelector(`.toggle-group[data-field="${field}"]`);
    if (!group) return;
    const target = val === true ? 'yes' : (val === false ? 'no' : 'skip');
    group.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === target);
    });
  }

  setToggle('family-history', p.has_family_history);
  // PHQ-9: populate direct entry input if score exists
  if (p.phq9_score != null) {
    const phq9Input = document.getElementById('phq9-direct-input');
    if (phq9Input) phq9Input.value = p.phq9_score;
    // Trigger the phq9 module to pick up the value
    import('./phq9.js').then(m => m.setPhq9Score(p.phq9_score));
  }
  setToggle('fasting', p.fasting);

  if (p.lab_draw_date) {
    document.getElementById('f-lab-date').value = p.lab_draw_date;
  }

  // G3: Restore device card selections
  if (p.demographics?.devices) {
    _selectedDevices = [];
    document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
    for (const device of p.demographics.devices) {
      const card = document.querySelector(`.device-card[data-device="${device}"]`);
      if (card) {
        card.classList.add('selected');
        _selectedDevices.push(device);
      }
    }
  }

  // G2: Restore medication tags
  if (p.demographics?.medications) {
    for (const name of p.demographics.medications) {
      addMedByName(name);
    }
  }
}

// ── Draft auto-save (sessionStorage) ──
const DRAFT_KEY = 'baseline-draft';
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

const DRAFT_FIELD_IDS = [
  'f-age', 'f-height-ft', 'f-height-in', 'f-weight', 'f-waist',
  'f-sbp', 'f-dbp',
  'f-ldl', 'f-hdl', 'f-trig', 'f-glucose', 'f-hba1c', 'f-insulin',
  'f-lpa', 'f-hscrp', 'f-alt', 'f-ggt', 'f-hemoglobin', 'f-wbc',
  'f-platelets', 'f-tsh', 'f-vitd', 'f-ferritin', 'f-apob',
  'f-rhr', 'f-vo2', 'f-hrv', 'f-steps', 'f-zone2', 'f-sleep-hours', 'f-sleep-reg',
  'f-lab-date', 'phq9-direct-input',
];

let _saveTimer = null;

export function saveDraft() {
  const fields = {};
  for (const id of DRAFT_FIELD_IDS) {
    const el = document.getElementById(id);
    if (el && el.value) fields[id] = el.value;
  }

  const sexEl = document.querySelector('#f-sex .opt-btn.selected');
  const sex = sexEl ? sexEl.dataset.value : null;

  const toggles = {};
  document.querySelectorAll('.toggle-group[data-field]').forEach(group => {
    const sel = group.querySelector('.toggle-btn.selected');
    if (sel) toggles[group.dataset.field] = sel.dataset.value;
  });

  const devices = [];
  document.querySelectorAll('.device-card.selected').forEach(c => {
    if (c.dataset.device) devices.push(c.dataset.device);
  });

  const meds = getSelectedMeds();

  const phase2Visible = document.getElementById('phase2')?.style.display === 'block';
  const phase = phase2Visible ? 2 : 1;
  let enrichStep = 0;
  document.querySelectorAll('.stepper-step').forEach((s, i) => {
    if (s.classList.contains('active')) enrichStep = i;
  });

  const draft = { fields, sex, toggles, devices, meds, phase, enrichStep, timestamp: Date.now() };
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch { /* quota exceeded — ignore */ }
}

export function restoreDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (Date.now() - draft.timestamp > DRAFT_MAX_AGE_MS) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function applyDraft(draft) {
  for (const [id, value] of Object.entries(draft.fields || {})) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  if (draft.sex) {
    document.querySelectorAll('#f-sex .opt-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === draft.sex);
    });
  }

  for (const [field, value] of Object.entries(draft.toggles || {})) {
    const group = document.querySelector(`.toggle-group[data-field="${field}"]`);
    if (!group) continue;
    group.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === value);
    });
  }

  if (draft.devices?.length) {
    document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
    _selectedDevices = [];
    for (const device of draft.devices) {
      const card = document.querySelector(`.device-card[data-device="${device}"]`);
      if (card) {
        card.classList.add('selected');
        _selectedDevices.push(device);
      }
    }
  }

  if (draft.meds?.length) {
    for (const name of draft.meds) addMedByName(name);
  }

  if (draft.fields?.['phq9-direct-input']) {
    import('./phq9.js').then(m => {
      const score = parseInt(draft.fields['phq9-direct-input'], 10);
      if (!isNaN(score)) m.setPhq9Score(score);
    });
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function initDraftAutoSave() {
  const q = document.getElementById('questionnaire');
  if (!q) return;

  const debouncedSave = () => {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveDraft, 500);
  };

  q.addEventListener('input', debouncedSave);
  q.addEventListener('change', debouncedSave);
  q.addEventListener('click', (e) => {
    if (e.target.closest('.opt-btn, .toggle-btn, .device-card')) {
      debouncedSave();
    }
  });
}

export function switchIntakeTab(tab) {
  document.querySelectorAll('.intake-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.intake-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  if (tab === 'voice') {
    document.getElementById('intake-split').style.display = '';
    document.getElementById('form-mode').classList.remove('open');
  } else {
    document.getElementById('intake-split').style.display = 'none';
    document.getElementById('form-mode').classList.add('open');
  }
}
