// main.js — Entry point: imports, init sequence, window.* bindings

import { loadNhanes } from '../nhanes.js';
import { scoreTimeSeriesProfile } from '../score.js';
import { initStorage, loadFullProfile, saveDemographics, addImportWithObservations, saveManualObservations, clearAll } from '../storage.js';
import { exportAll, importAll } from '../db.js';
import { createLogger } from './logger.js';

import { initToggleButtons, toggleDevice, showStep, buildProfile, populateForm, switchIntakeTab, addParsedLabValues, clearPendingImports, getPendingImports, resetState } from './form.js';
import { initLabDrop, handleLabFileInput, parseLabText, togglePasteLabs, toggleManualLabs } from './lab-import.js';
import { renderResults } from './render.js';
import { toggleFullVoice, toggleVoice, submitVoiceIntake, hasSpeechSupport, hideSpeechUI, resetVoiceState, checklistLocked, applyExtraction, expandTranscript } from './intake.js';
import { initMedSearch, removeMedTag, resetMeds } from './meds.js';
import { initPhq9, getPhq9Score, resetPhq9 } from './phq9.js';
import { initErrorBoundary, initBreadcrumbTracking, initFeatureFlags, initVoiceFallback, initFeedbackButton, addBreadcrumb } from './feedback.js';
import { isPasskeySupported, isPlatformAuthenticatorAvailable, isAuthenticated, registerPasskey, loginWithPasskey, getIdentityStatus } from './identity.js';
import { syncOnLogin } from './sync.js';

const log = createLogger('main');

// ── Error boundary first — catches all subsequent init errors ──
initErrorBoundary();
initFeatureFlags();

// ── Init ──
log.info('baseline app starting');
await loadNhanes();
const persisted = await initStorage();
initToggleButtons();
initLabDrop();
initMedSearch();
initPhq9();
await checkReturnVisit();
initIdentityUI();
if (!persisted) {
  log.warn('storage not persistent — show export reminder after scoring');
}

// Hide voice tab if Speech API isn't available or ?voice=off
// Note: mobile devices with speech support (iOS Safari) get voice by default
if (!hasSpeechSupport() || window._forceFormMode) {
  if (!hasSpeechSupport()) hideSpeechUI();
  switchIntakeTab('form');
  addBreadcrumb('init', `form-mode: speech=${hasSpeechSupport()}, flag=${!!window._forceFormMode}`);
}

// ── Theme toggle ──
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const update = () => {
    const current = document.documentElement.getAttribute('data-theme')
      || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    btn.textContent = current === 'light' ? '\u2600' : '\u263E';
    btn.setAttribute('aria-label', current === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };
  update();
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
      || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    update();
  });
}
initThemeToggle();

log.info('baseline app ready');

// ── Service worker — DISABLED during active development ──
// Uncomment to re-enable for production PWA:
// if ('serviceWorker' in navigator && !import.meta.env.DEV) {
//   navigator.serviceWorker.register('/baseline/app/sw.js').then(
//     (reg) => log.info('sw registered', { scope: reg.scope }),
//     (err) => log.warn('sw registration failed', { error: err.message })
//   );
//   navigator.serviceWorker.addEventListener('message', (event) => {
//     if (event.data?.type === 'SW_UPDATED') {
//       const toast = document.createElement('div');
//       toast.className = 'sw-toast';
//       toast.innerHTML = 'Updated version available. <button onclick="location.reload()">Refresh</button>';
//       document.body.appendChild(toast);
//       requestAnimationFrame(() => toast.classList.add('show'));
//     }
//   });
// }
// Unregister any existing SW to clear stale caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

// ── Phase navigation ──
function showPhase2() {
  document.getElementById('phase1').style.display = 'none';
  const phase2 = document.getElementById('phase2');
  phase2.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Re-init lab drop zone in case it moved DOM
  initLabDrop();
  // Reset carousel to step 0
  _currentEnrichStep = 0;
  phase2.querySelectorAll('.stepper-step').forEach((s, i) => {
    s.classList.remove('active', 'touched');
    if (i === 0) s.classList.add('active');
  });
  phase2.querySelectorAll('.enrich-slide').forEach((s, i) => {
    s.classList.remove('active');
    if (i === 0) s.classList.add('active');
  });
  const skipWrap = phase2.querySelector('.phase2-skip-wrap');
  if (skipWrap) { skipWrap.classList.remove('revealed'); skipWrap.style.display = ''; }
  const reveal = document.getElementById('score-reveal');
  if (reveal) reveal.classList.remove('active');
  const continueBtn = document.getElementById('stepper-continue');
  if (continueBtn) continueBtn.classList.remove('has-data');
  log.info('navigated to phase 2');
}

function goBackToPhase1() {
  document.getElementById('phase2').style.display = 'none';
  document.getElementById('phase1').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  log.info('navigated back to phase 1');
}

// Voice submit → Phase 2 (replaces gap bridge)
function onVoiceSubmitComplete() {
  showPhase2();
}

// ── Compute & render results ──
async function computeResults() {
  const formProfile = buildProfile();

  await saveDemographics(formProfile.demographics);

  const pending = getPendingImports();
  for (const imp of pending) {
    await addImportWithObservations(imp.meta, imp.observations);
  }
  clearPendingImports();

  const manualFields = {};
  const manualMetrics = [
    ['systolic', formProfile.systolic], ['diastolic', formProfile.diastolic],
    ['waist_circumference', formProfile.waist_circumference],
    ['weight_lbs', formProfile.weight_lbs],
    ['resting_hr', formProfile.resting_hr], ['vo2_max', formProfile.vo2_max],
    ['hrv_rmssd_avg', formProfile.hrv_rmssd_avg],
    ['daily_steps_avg', formProfile.daily_steps_avg],
    ['sleep_duration_avg', formProfile.sleep_duration_avg],
    ['sleep_regularity_stddev', formProfile.sleep_regularity_stddev],
    ['zone2_min_per_week', formProfile.zone2_min_per_week],
    ['ldl_c', formProfile.ldl_c], ['hdl_c', formProfile.hdl_c],
    ['triglycerides', formProfile.triglycerides], ['apob', formProfile.apob],
    ['fasting_glucose', formProfile.fasting_glucose], ['fasting_insulin', formProfile.fasting_insulin],
    ['hba1c', formProfile.hba1c], ['lpa', formProfile.lpa], ['hscrp', formProfile.hscrp],
    ['alt', formProfile.alt], ['ggt', formProfile.ggt], ['tsh', formProfile.tsh],
    ['vitamin_d', formProfile.vitamin_d], ['ferritin', formProfile.ferritin],
    ['hemoglobin', formProfile.hemoglobin], ['wbc', formProfile.wbc], ['platelets', formProfile.platelets],
  ];
  for (const [key, val] of manualMetrics) {
    if (val != null) manualFields[key] = val;
  }
  if (formProfile.has_family_history != null) manualFields.has_family_history = formProfile.has_family_history;
  if (formProfile.has_medication_list != null) manualFields.has_medication_list = formProfile.has_medication_list;
  if (formProfile.phq9_score != null) manualFields.phq9_score = formProfile.phq9_score;

  if (Object.keys(manualFields).length > 0) {
    await saveManualObservations(manualFields);
  }

  const tsProfile = await loadFullProfile();
  const output = scoreTimeSeriesProfile(tsProfile);
  renderResults(output, formProfile);
  log.info('results computed', { score: output.coverageScore });
}

// ── Return visit ──
async function checkReturnVisit() {
  const profile = await loadFullProfile();
  const hasData = profile && Object.keys(profile.observations).length > 0;
  if (hasData) {
    const metricCount = Object.keys(profile.observations).length;
    // Find most recent update date from profile meta or observations
    let lastVisit = profile.meta?.updated_at;
    if (lastVisit) {
      const d = new Date(lastVisit);
      const month = d.toLocaleString('en-US', { month: 'short' });
      const day = d.getDate();
      lastVisit = `${month} ${day}`;
    }
    // Quick coverage calc
    const output = scoreTimeSeriesProfile(profile);
    const coverage = output?.coverageScore != null ? `${Math.round(output.coverageScore)}% coverage` : `${metricCount} metrics`;

    const banner = document.getElementById('return-banner');
    const parts = ['Welcome back.'];
    if (lastVisit) parts.push(`Last visit: ${lastVisit} &mdash;`);
    parts.push(`<strong>${coverage}</strong> saved.`);
    banner.querySelector('span').innerHTML = parts.join(' ');
    banner.classList.add('active');
  }
}

// ── Identity UI ──
async function initIdentityUI() {
  const banner = document.getElementById('passkey-banner');
  if (!banner) return;

  if (!isPasskeySupported()) {
    banner.style.display = 'none';
    return;
  }

  const platformAvailable = await isPlatformAuthenticatorAvailable();
  if (!platformAvailable) {
    banner.style.display = 'none';
    return;
  }

  updateIdentityUI();
}

function updateIdentityUI() {
  const banner = document.getElementById('passkey-banner');
  if (!banner) return;

  if (isAuthenticated()) {
    banner.classList.remove('active');
  } else {
    banner.classList.add('active');
  }
}

window.handlePasskeyAction = async function() {
  const btn = document.getElementById('passkey-action-btn') || document.getElementById('identity-sidebar-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Setting up...'; }

  try {
    if (isAuthenticated()) {
      await registerPasskey();
    } else {
      try {
        await loginWithPasskey();
      } catch {
        await registerPasskey();
      }
    }
    updateIdentityUI();
    addBreadcrumb('identity', 'passkey auth success');
    // Sync profile after successful auth
    syncOnLogin().catch(err => log.warn('sync after auth failed', { error: err.message }));
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      addBreadcrumb('identity', 'passkey cancelled by user');
    } else {
      log.warn('passkey error', { error: err.message });
      addBreadcrumb('identity', `passkey error: ${err.message}`);
    }
  } finally {
    if (btn) { btn.disabled = false; }
    updateIdentityUI();
  }
};

// Expose for console testing — wrapped to prevent unhandled rejections
window.__baseline_identity = {
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
  isAuthenticated,
  getIdentityStatus,
  registerPasskey: () => registerPasskey().catch(err => {
    if (err.name !== 'NotAllowedError') log.warn('registerPasskey failed', { error: err.message });
    return { error: err.message };
  }),
  loginWithPasskey: () => loginWithPasskey().catch(err => {
    if (err.name !== 'NotAllowedError') log.warn('loginWithPasskey failed', { error: err.message });
    return { error: err.message };
  }),
};

// ── Enrich carousel navigation ──
let _currentEnrichStep = 0;
const ENRICH_STEP_COUNT = 4;

function goToEnrichStep(n) {
  if (n < 0 || n >= ENRICH_STEP_COUNT) return;
  const slides = document.querySelectorAll('.enrich-slide');
  const steps = document.querySelectorAll('.stepper-step');
  const prev = _currentEnrichStep;

  // Mark the step we're leaving as touched (user visited it)
  if (prev !== n && steps[prev]) {
    steps[prev].classList.add('touched');
    _updateEnrichProgress();
  }

  // Deactivate current, activate target
  slides[prev]?.classList.remove('active');
  steps[prev]?.classList.remove('active');
  slides[n]?.classList.add('active');
  steps[n]?.classList.add('active');

  _currentEnrichStep = n;
  _updateContinueButton(n);
}

function _updateEnrichProgress() {
  const touchedCount = document.querySelectorAll('.stepper-step.touched').length;
  const skipWrap = document.querySelector('.phase2-skip-wrap');

  // Show skip link once any step is touched
  if (skipWrap && touchedCount > 0 && !skipWrap.classList.contains('revealed')) {
    skipWrap.classList.add('revealed');
  }

  // When all steps touched — show score reveal, hide everything else
  if (touchedCount >= ENRICH_STEP_COUNT) {
    if (skipWrap) skipWrap.style.display = 'none';
    const reveal = document.getElementById('score-reveal');
    if (reveal && !reveal.classList.contains('active')) {
      // Hide all slides
      document.querySelectorAll('.enrich-slide').forEach(s => s.classList.remove('active'));
      reveal.classList.add('active');
    }
  }
}

function advanceEnrichStep() {
  const steps = document.querySelectorAll('.stepper-step');
  const current = steps[_currentEnrichStep];
  if (current) current.classList.add('touched');

  _updateEnrichProgress();

  // If on last step, don't advance further
  if (_currentEnrichStep >= ENRICH_STEP_COUNT - 1) return;

  goToEnrichStep(_currentEnrichStep + 1);
}

// ── Continue button progressive disclosure ──
function _slideHasData(slideIndex) {
  switch (slideIndex) {
    case 0: { // Labs — any parsed results, uploaded files, or manual field values
      if (document.getElementById('lab-import-summary')?.textContent?.trim()) return true;
      if (document.getElementById('lab-file-list')?.children?.length > 0) return true;
      if (document.getElementById('parse-summary')?.textContent?.trim()) return true;
      const manualIds = ['f-apob','f-ldl','f-hdl','f-trig','f-glucose','f-hba1c','f-insulin','f-lpa','f-hscrp','f-alt','f-ggt','f-hemoglobin','f-wbc','f-platelets','f-tsh','f-vitd','f-ferritin'];
      for (const id of manualIds) { if (document.getElementById(id)?.value) return true; }
      const paste = document.getElementById('lab-paste');
      if (paste?.value?.trim()) return true;
      return false;
    }
    case 1: // Equipment — any device card selected
      return !!document.querySelector('.device-card.selected');
    case 2: // Meds — any med tags added
      return document.getElementById('med-tags')?.children?.length > 0;
    case 3: { // PHQ-9 — direct input or any radio selected
      if (document.getElementById('phq9-direct-input')?.value) return true;
      return !!document.querySelector('.phq9-radio.selected');
    }
    default: return false;
  }
}

function _updateContinueButton(slideIndex) {
  if (slideIndex === undefined) slideIndex = _currentEnrichStep;
  const btn = document.getElementById('stepper-continue');
  if (!btn) return;
  btn.classList.toggle('has-data', _slideHasData(slideIndex));
}

function _initContinueWatchers() {
  // Slide 0 (Labs): watch manual inputs, paste area, file uploads
  const labInputs = document.querySelectorAll('#manual-labs input, #lab-paste');
  labInputs.forEach(el => el.addEventListener('input', () => _updateContinueButton(0)));
  // Watch for lab import summary changes via MutationObserver
  const labSummary = document.getElementById('lab-import-summary');
  if (labSummary) {
    new MutationObserver(() => _updateContinueButton(0)).observe(labSummary, { childList: true, characterData: true, subtree: true });
  }
  const parseSummary = document.getElementById('parse-summary');
  if (parseSummary) {
    new MutationObserver(() => _updateContinueButton(0)).observe(parseSummary, { childList: true, characterData: true, subtree: true });
  }
  const labFileList = document.getElementById('lab-file-list');
  if (labFileList) {
    new MutationObserver(() => _updateContinueButton(0)).observe(labFileList, { childList: true });
  }

  // Slide 1 (Equipment): watch device cards for clicks
  document.querySelectorAll('.device-card').forEach(card => {
    card.addEventListener('click', () => setTimeout(() => _updateContinueButton(1), 0));
  });

  // Slide 2 (Meds): watch med-tags for additions/removals
  const medTags = document.getElementById('med-tags');
  if (medTags) {
    new MutationObserver(() => _updateContinueButton(2)).observe(medTags, { childList: true });
  }

  // Slide 3 (PHQ-9): watch direct input and radio clicks
  const phq9Input = document.getElementById('phq9-direct-input');
  if (phq9Input) phq9Input.addEventListener('input', () => _updateContinueButton(3));
  document.querySelectorAll('.phq9-radio').forEach(r => {
    r.addEventListener('click', () => _updateContinueButton(3));
  });
}

_initContinueWatchers();

// ── Window bindings for HTML onclick handlers ──
window.toggleFullVoice = toggleFullVoice;
window.toggleVoice = toggleVoice;
window.toggleDevice = toggleDevice;
window.switchIntakeTab = switchIntakeTab;
window.expandForm = () => switchIntakeTab('form');
window.showFormMode = () => switchIntakeTab('form');
window.submitVoiceIntake = submitVoiceIntake;
window.computeResults = computeResults;
window.parseLabText = parseLabText;
window.togglePasteLabs = togglePasteLabs;
window.toggleManualLabs = toggleManualLabs;
window.handleLabFileInput = handleLabFileInput;
window.expandTranscript = expandTranscript;
window.removeMedTag = removeMedTag;
window.showPhase2 = showPhase2;
window.goBackToPhase1 = goBackToPhase1;
window.advanceEnrichStep = advanceEnrichStep;

// ── Feedback tracking (after window bindings are set) ──
initBreadcrumbTracking();
initVoiceFallback();
initFeedbackButton();
addBreadcrumb('init', 'app ready');

window.loadSavedProfile = async function() {
  const tsProfile = await loadFullProfile();
  if (!tsProfile || Object.keys(tsProfile.observations).length === 0) return;
  document.getElementById('return-banner').classList.remove('active');
  // Flatten observations → most recent value per metric
  const flat = { demographics: tsProfile.demographics };
  for (const [metric, obs] of Object.entries(tsProfile.observations)) {
    if (obs.length > 0) flat[metric] = obs[0].value;
  }
  populateForm(flat);
  // Hydrate device card selections if stored
  if (flat._devices) {
    for (const device of flat._devices) {
      const card = document.querySelector(`.device-card[data-device="${device}"]`);
      if (card) toggleDevice(card);
    }
  }
  log.info('loaded saved profile', { metrics: Object.keys(tsProfile.observations).length });
};

window.clearSaved = async function() {
  await clearAll();
  sessionStorage.clear();
  resetState();
  document.getElementById('return-banner').classList.remove('active');
  log.info('cleared saved profile');
};

window.startOver = function() {
  document.getElementById('results').classList.remove('active');
  document.getElementById('questionnaire').style.display = 'block';
  document.getElementById('phase1').style.display = 'block';
  document.getElementById('phase2').style.display = 'none';
  document.getElementById('voice-hero').style.display = '';
  document.getElementById('intake-tabs').style.display = '';
  switchIntakeTab('voice');
  document.getElementById('voice-idle').style.display = '';
  document.getElementById('voice-active').classList.remove('show');
  document.getElementById('voice-full-transcript').value = '';
  document.getElementById('voice-submit-btn').disabled = true;
  document.querySelectorAll('.voice-checklist-item').forEach(i => { i.classList.remove('checked', 'pending', 'declined'); });
  resetVoiceState();
  const guide = document.getElementById('voice-guide');
  if (guide) { const n = guide.querySelector('#guide-nudges'); if (n) n.innerHTML = ''; }
};

window.clearAndRestart = async function() {
  await clearAll();
  sessionStorage.clear();
  resetState();
  resetPhq9();
  document.getElementById('return-banner').classList.remove('active');
  document.getElementById('results').classList.remove('active');
  document.getElementById('questionnaire').style.display = 'block';
  document.getElementById('phase1').style.display = 'block';
  document.getElementById('phase2').style.display = 'none';
  // Reset all form inputs
  document.querySelectorAll('.field-input').forEach(i => i.value = '');
  document.querySelectorAll('.opt-btn, .toggle-btn').forEach(b => b.classList.remove('selected'));
  // Clear lab state
  document.getElementById('lab-paste').value = '';
  document.getElementById('parse-results').classList.remove('active');
  document.getElementById('lab-file-list').innerHTML = '';
  const labSummary = document.getElementById('lab-import-summary');
  if (labSummary) labSummary.textContent = '';
  const parseSummary = document.getElementById('parse-summary');
  if (parseSummary) parseSummary.textContent = '';
  document.querySelectorAll('.manual-fields').forEach(f => f.classList.remove('open'));
  // Clear device selections
  document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
  // Clear meds module state + DOM
  resetMeds();
  const medSearch = document.getElementById('med-search');
  if (medSearch) medSearch.value = '';
  // Reset voice state
  document.getElementById('voice-hero').style.display = '';
  document.getElementById('intake-tabs').style.display = '';
  document.getElementById('voice-idle').style.display = '';
  document.getElementById('voice-active').classList.remove('show');
  document.getElementById('voice-full-transcript').value = '';
  document.getElementById('voice-submit-btn').disabled = true;
  document.querySelectorAll('.voice-checklist-item').forEach(i => { i.classList.remove('checked', 'pending', 'declined'); });
  resetVoiceState();
  const guideEl = document.getElementById('voice-guide');
  if (guideEl) { const n = guideEl.querySelector('#guide-nudges'); if (n) n.innerHTML = ''; }
  switchIntakeTab('voice');
  // Clear PHQ-9 questionnaire state
  document.querySelectorAll('.phq9-radio').forEach(r => r.classList.remove('selected'));
  const phq9Input = document.getElementById('phq9-direct-input');
  if (phq9Input) phq9Input.value = '';
  const phq9Display = document.getElementById('phq9-score-display');
  if (phq9Display) { phq9Display.classList.remove('active'); phq9Display.innerHTML = ''; }
  // Reset carousel stepper + slides
  _currentEnrichStep = 0;
  document.querySelectorAll('.stepper-step').forEach((s, i) => {
    s.classList.remove('active', 'touched');
    if (i === 0) s.classList.add('active');
  });
  document.querySelectorAll('.stepper-status').forEach(s => s.textContent = '');
  document.querySelectorAll('.enrich-slide').forEach((s, i) => {
    s.classList.remove('active');
    if (i === 0) s.classList.add('active');
  });
  const skipEl = document.querySelector('.phase2-skip-wrap');
  if (skipEl) { skipEl.classList.remove('revealed'); skipEl.style.display = ''; }
  const revealEl = document.getElementById('score-reveal');
  if (revealEl) revealEl.classList.remove('active');
  const contBtn = document.getElementById('stepper-continue');
  if (contBtn) contBtn.classList.remove('has-data');
  log.info('cleared all data and restarted');
};

window.exportProfile = async function() {
  const data = await exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baseline-profile-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importProfile = async function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAll(data);
      window.location.reload();
    } catch (err) {
      alert('Failed to import profile: ' + err.message);
    }
  };
  input.click();
};
