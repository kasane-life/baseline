// intake.js — Voice flow: recognition, checklist, nudges, Haiku bounce
// Uses parseVoiceIntake from voice.js as single source of truth

import { parseVoiceIntake } from '../voice.js';
import { parseLabResults } from './lab-parser.js';
import { FIELD_TO_INPUT } from './lab-parser.js';
import { addParsedLabValues } from './form.js';
import { createLogger } from './logger.js';
const log = createLogger('intake');

const WORKER_URL = 'https://baseline-api.deal-e-andrew.workers.dev';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── State ──
let activeRecognition = null;
let activeTarget = null;
let fullVoiceRecognition = null;
let fullVoiceTranscript = '';
let currentNudgeCheck = null;
let currentNudgeState = null;

// Monotonic — once checked, stays checked for this session
export const checklistLocked = new Set();

// Items that need AI confirmation before going green
// (prevents false positives from regex on short interim fragments)
const AI_CONFIRMED_ITEMS = new Set(['age', 'sex', 'height', 'weight', 'history']);

// Nudge definitions in checklist order
const NUDGE_SEQUENCE = [
  { check: 'age',    text: '<strong>Age?</strong> — "I\'m 35"' },
  { check: 'sex',    text: '<strong>Sex?</strong> — "male" or "female"' },
  { check: 'height', text: '<strong>Height?</strong> — "5\'10" or "five ten"' },
  { check: 'weight', text: '<strong>Weight?</strong> — "195 lbs" or "I weigh 195"' },
  { check: 'labs',   text: '<strong>Do you have lab results?</strong> — "yes" or "no labs"' },
  { check: 'bp',     text: '<strong>Blood pressure?</strong> — "110 over 70" or "BP 120/80"' },
  { check: 'waist',  text: '<strong>Waist?</strong> — measurement at the navel in inches' },
  { check: 'history', text: '<strong>Family history?</strong> — "father had a heart attack" or "no family history"' },
];

const FOLLOWUP_NUDGES = {
  history: '<strong>Take your time</strong> — heart disease, diabetes, cancer in your family?',
  labs: '<strong>Great</strong> — you can upload your lab results in the next step',
};

export function hasSpeechSupport() { return !!SpeechRecognition; }

// ── Simple voice input for paste areas (lab paste, meds) ──
export function toggleVoice(textareaId, btn) {
  if (!SpeechRecognition) {
    document.getElementById(textareaId).focus();
    return;
  }

  if (activeRecognition && activeTarget === textareaId) {
    activeRecognition.stop();
    return;
  }
  if (activeRecognition) {
    activeRecognition.stop();
  }

  const textarea = document.getElementById(textareaId);
  const hint = document.getElementById(textareaId === 'lab-paste' ? 'lab-voice-hint' : 'meds-voice-hint');
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = textarea.value;
  if (finalTranscript && !finalTranscript.endsWith('\n') && !finalTranscript.endsWith(' ')) {
    finalTranscript += ' ';
  }

  recognition.onstart = () => {
    btn.classList.add('recording');
    hint.classList.add('visible');
    activeRecognition = recognition;
    activeTarget = textareaId;
  };

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim = transcript;
      }
    }
    textarea.value = finalTranscript + (interim ? interim : '');
    textarea.scrollTop = textarea.scrollHeight;
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    hint.classList.remove('visible');
    activeRecognition = null;
    activeTarget = null;
    // Auto-parse if lab paste area
    if (textareaId === 'lab-paste' && textarea.value.trim()) {
      // Import parseLabText dynamically to avoid circular
      import('./lab-import.js').then(m => m.parseLabText());
    }
  };

  recognition.onerror = (e) => {
    btn.classList.remove('recording');
    hint.classList.remove('visible');
    activeRecognition = null;
    activeTarget = null;
    if (e.error !== 'aborted' && e.error !== 'no-speech') {
      log.warn('speech recognition error', { error: e.error });
    }
  };

  recognition.start();
}

// ── Health signal gate ──
function hasHealthSignal(text) {
  // If we already have confirmed items, user is clearly doing health intake
  if (checklistLocked.size > 0) return true;

  const lower = text.toLowerCase().trim();
  return /\b(male|female|man|woman|guy|mail|blood\s*pressure|bp|waist|waste|lab|labs|blood\s*work|medication|meds|supplement|vitamin|family\s*history|cardiac|heart|ldl|hdl|apob|a1c|cholesterol|glucose|insulin|creatine|aspirin|finasteride|pounds|lbs|weigh|feet|foot|inches|years?\s*old|yo)\b/.test(lower)
    || /\b\d{2,3}\s*(over|\/)\s*\d{2,3}\b/.test(lower)
    || /\b[4-7][\s']\d{1,2}\b/.test(lower)
    || /\b[4-7]\d{1,2}\b/.test(lower)
    || /(?:i'm|i am|age|aged)\s+\d{2}\b/.test(lower)
    || /^\d{2}$/.test(lower);
}

// ── Revalidate locked items ──
function revalidateChecklist(haikuEx, regexCheck) {
  const revalidatable = {
    history: {
      haikuSaysNo: haikuEx.has_family_history === false || haikuEx.has_family_history == null,
      regexSaysNo: regexCheck.familyHistory == null || regexCheck.familyHistory === false,
    },
  };

  for (const [id, checks] of Object.entries(revalidatable)) {
    if (!checklistLocked.has(id)) continue;
    if (!AI_CONFIRMED_ITEMS.has(id)) continue;
    if (checks.haikuSaysNo && checks.regexSaysNo) {
      checklistLocked.delete(id);
      const item = document.querySelector(`.voice-checklist-item[data-check="${id}"]`);
      if (item) {
        item.classList.remove('checked', 'pending', 'declined');
      }
      log.info('reverted checklist item', { id });
    }
  }
}

// ── Submit gate — single authority on button disabled state ──
function updateSubmitGate() {
  const btn = document.getElementById('voice-submit-btn');
  if (!btn) return;
  const hasPending = document.querySelectorAll('.voice-checklist-item.pending').length > 0;
  btn.disabled = hasPending;
}

// ── Checklist updates ──
export function updateVoiceChecklist(extracted, source = 'live') {
  const check = (id, condition) => {
    if (checklistLocked.has(id)) return;
    const item = document.querySelector(`.voice-checklist-item[data-check="${id}"]`);
    if (!item || !condition) return;

    if (AI_CONFIRMED_ITEMS.has(id) && source === 'live') {
      if (!item.classList.contains('pending')) {
        item.classList.add('pending');
      }
      return;
    }

    item.classList.remove('pending');
    item.classList.add('checked');
    checklistLocked.add(id);
  };

  check('age', !!extracted.age);
  check('sex', !!extracted.sex);
  check('height', !!extracted.heightFt);
  check('weight', !!extracted.weight);

  if (!checklistLocked.has('labs')) {
    const labItem = document.querySelector('.voice-checklist-item[data-check="labs"]');
    const hint = document.getElementById('lab-count-hint');
    if (labItem && (extracted.noLabs || extracted.hasLabs)) {
      labItem.classList.remove('pending');
      if (extracted.noLabs) {
        labItem.classList.add('declined');
        if (hint) hint.textContent = 'none';
      } else {
        labItem.classList.add('checked');
        if (hint) hint.textContent = 'upload next';
      }
      checklistLocked.add('labs');
    }
  }
  // BP: check if provided, or mark as declined
  if (!checklistLocked.has('bp')) {
    const bpItem = document.querySelector('.voice-checklist-item[data-check="bp"]');
    if (bpItem && extracted.noBp) {
      bpItem.classList.remove('pending');
      bpItem.classList.add('declined');
      checklistLocked.add('bp');
    }
  }
  check('bp', !!extracted.systolic);
  check('waist', !!extracted.waist);
  check('history', extracted.familyHistory != null);

  // Auto-collapse transcript when 4+ items captured
  if (checklistLocked.size >= 4) {
    collapseTranscript();
  }

  updateSubmitGate();
}

let transcriptCollapsed = false;

function collapseTranscript() {
  if (transcriptCollapsed) return;
  const activeEl = document.getElementById('voice-active');
  if (!activeEl) return;

  transcriptCollapsed = true;
  activeEl.classList.add('transcript-collapsed');

  // Insert summary after the textarea
  const textarea = document.getElementById('voice-full-transcript');
  if (textarea && !document.getElementById('transcript-summary')) {
    const summary = document.createElement('div');
    summary.id = 'transcript-summary';
    summary.className = 'transcript-summary';
    summary.innerHTML = `<span>${checklistLocked.size} items captured</span><button onclick="expandTranscript()">Show transcript</button>`;
    textarea.parentNode.insertBefore(summary, textarea.nextSibling);
  }
}

export function expandTranscript() {
  const activeEl = document.getElementById('voice-active');
  if (activeEl) activeEl.classList.remove('transcript-collapsed');
  const summary = document.getElementById('transcript-summary');
  if (summary) summary.remove();
  transcriptCollapsed = false;
}

// ── Voice guide nudges ──
function updateVoiceGuide(ex, source = 'live') {
  const guide = document.getElementById('voice-guide');
  const nudgesEl = document.getElementById('guide-nudges');
  if (!guide) return;

  // Find the next unchecked item — skip items that are already pending (waiting for AI)
  const nextNudge = NUDGE_SEQUENCE.find(n => {
    if (checklistLocked.has(n.check)) return false;
    const item = document.querySelector(`.voice-checklist-item[data-check="${n.check}"]`);
    if (item && item.classList.contains('pending')) return false;
    return true;
  }) || NUDGE_SEQUENCE.find(n => !checklistLocked.has(n.check));
  const nextCheck = nextNudge ? nextNudge.check : '_done';

  let isPending = false;
  if (nextNudge) {
    const item = document.querySelector(`.voice-checklist-item[data-check="${nextCheck}"]`);
    isPending = item && item.classList.contains('pending');
  }

  const newState = isPending ? 'pending' : 'prompt';

  if (nextCheck === currentNudgeCheck && newState === currentNudgeState) return;
  currentNudgeCheck = nextCheck;
  currentNudgeState = newState;

  if (!nextNudge && nudgesEl) {
    nudgesEl.innerHTML = '<div class="guide-nudge" style="color:var(--green);">All covered — submit when ready, or keep talking to add more</div>';
  } else if (isPending && FOLLOWUP_NUDGES[nextCheck] && nudgesEl) {
    nudgesEl.innerHTML = '<div class="guide-section-label" style="padding-right:14px;color:#d4a24c;">Heard you</div>' +
      `<div class="guide-nudge">${FOLLOWUP_NUDGES[nextCheck]}</div>`;
  } else if (nextNudge && nudgesEl) {
    nudgesEl.innerHTML = '<div class="guide-section-label" style="padding-right:14px;">Try adding</div>' +
      `<div class="guide-nudge">${nextNudge.text}</div>`;
  }
}

// ── Apply extraction to form fields ──
export function applyExtraction(data) {
  if (data.age) document.getElementById('f-age').value = data.age;
  if (data.sex) {
    const btn = document.querySelector(`#f-sex .opt-btn[data-value="${data.sex}"]`);
    if (btn) {
      document.querySelectorAll('#f-sex .opt-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
  }
  if (data.height_feet || data.heightFt) document.getElementById('f-height-ft').value = data.height_feet || data.heightFt;
  if ((data.height_inches != null) || (data.heightIn != null)) document.getElementById('f-height-in').value = data.height_inches ?? data.heightIn;
  if (data.weight_lbs || data.weight) document.getElementById('f-weight').value = data.weight_lbs || data.weight;
  if (data.systolic) document.getElementById('f-sbp').value = data.systolic;
  if (data.diastolic) document.getElementById('f-dbp').value = data.diastolic;
  if (data.waist_inches || data.waist) document.getElementById('f-waist').value = data.waist_inches || data.waist;

  const labs = data.labs || {};
  for (const [field, value] of Object.entries(labs)) {
    if (value == null) continue;
    const inputId = FIELD_TO_INPUT[field];
    if (inputId) document.getElementById(inputId).value = value;
    addParsedLabValues({ [field]: value });
  }

  const famHistory = data.has_family_history ?? data.familyHistory;
  if (famHistory != null) {
    const val = famHistory ? 'yes' : 'no';
    const group = document.querySelector('.toggle-group[data-field="family-history"]');
    if (group) {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
      const btn = group.querySelector(`.toggle-btn[data-value="${val}"]`);
      if (btn) btn.classList.add('selected');
    }
  }

  // Meds are now handled by typeahead search in Step 1, not voice
}

// ── Full voice intake flow ──
export function toggleFullVoice() {
  if (!SpeechRecognition) return;

  const idleEl = document.getElementById('voice-idle');
  const activeEl = document.getElementById('voice-active');
  const ring = document.getElementById('voice-ring');
  const status = document.getElementById('voice-full-status');
  const textarea = document.getElementById('voice-full-transcript');

  if (fullVoiceRecognition) {
    fullVoiceRecognition.stop();
    return;
  }

  // Transition: idle → active
  if (idleEl) idleEl.style.display = 'none';
  if (activeEl) activeEl.classList.add('show');

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  fullVoiceTranscript = textarea.value;
  let haikuBounceTimer = null;
  let haikuBounceInFlight = false;

  function bounceToHaiku(text) {
    log.debug('haiku bounce', { inFlight: haikuBounceInFlight, text: text.slice(0, 60) });
    if (!text.trim() || haikuBounceInFlight) return;
    if (!hasHealthSignal(text)) { log.debug('skipped — no health signal'); return; }
    haikuBounceInFlight = true;

    const haikuStatus = document.getElementById('guide-haiku-status');
    if (haikuStatus) {
      haikuStatus.textContent = 'processing what you said...';
      haikuStatus.classList.add('verifying');
    }

    fetch(`${WORKER_URL}/parse-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(result => {
      log.info('haiku response', { extracted: result.extracted });
      const ex = result.extracted;
      const regexCheck = parseVoiceIntake(text);

      // Trust AI extraction for checklist items — regex is a bonus signal, not a gate.
      // For numeric values (age, height, weight, BP), AI is authoritative.
      // For family history, still cross-check: regex false positives are common.
      const mapped = {
        age: ex.age || undefined,
        sex: ex.sex || undefined,
        heightFt: ex.height_feet || undefined,
        weight: ex.weight_lbs || undefined,
        labs: (ex.labs && Object.keys(ex.labs).length > 0) ? ex.labs : undefined,
        noLabs: ex.has_labs === false ? true : undefined,
        hasLabs: ex.has_labs === true ? true : undefined,
        systolic: ex.systolic || undefined,
        noBp: ex.has_bp === false ? true : undefined,
        waist: ex.waist_inches && ex.waist_inches >= 20 && ex.waist_inches <= 60 ? ex.waist_inches : undefined,
        hasMedications: ex.has_medications === true ? true : undefined,
        familyHistory: ex.has_family_history != null
          ? (regexCheck.familyHistory != null ? regexCheck.familyHistory : ex.has_family_history)
          : undefined,
      };

      revalidateChecklist(ex, regexCheck);
      updateVoiceChecklist(mapped, 'ai');
      updateVoiceGuide(mapped, 'ai');

      if (haikuStatus) {
        haikuStatus.textContent = 'got it';
        haikuStatus.classList.remove('verifying');
        setTimeout(() => { if (haikuStatus.textContent === 'got it') haikuStatus.textContent = ''; }, 2000);
      }
    })
    .catch((err) => {
      log.error('haiku error', { error: String(err) });
      if (haikuStatus) { haikuStatus.textContent = ''; haikuStatus.classList.remove('verifying'); }
    })
    .finally(() => { haikuBounceInFlight = false; });
  }

  recognition.onstart = () => {
    ring.classList.add('recording');
    status.textContent = 'Listening...';
    status.classList.add('active');
    fullVoiceRecognition = recognition;
    updateSubmitGate();
    updateVoiceGuide({});
  };

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        fullVoiceTranscript += t;
      } else {
        interim = t;
      }
    }
    textarea.value = fullVoiceTranscript + (interim ? interim : '');
    textarea.scrollTop = textarea.scrollHeight;

    // Context-aware yes/no
    let latestWords = (interim || '').trim().toLowerCase();
    if (!latestWords) {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) latestWords = e.results[i][0].transcript.trim().toLowerCase();
      }
    }
    const isYes = /^(yes|yeah|yep|yup|i do|i have|sure|definitely|correct)$/i.test(latestWords);
    const isNo = /^(no|nope|nah|none|i don't|i do not|not really|negative)$/i.test(latestWords);

    if ((isYes || isNo) && currentNudgeCheck && !checklistLocked.has(currentNudgeCheck)) {
      const contextMap = {
        labs:    isYes ? { hasLabs: true } : { noLabs: true },
        bp:      isYes ? {} : { noBp: true },
        history: isYes ? { familyHistory: true } : { familyHistory: false },
      };
      if (contextMap[currentNudgeCheck]) {
        updateVoiceChecklist(contextMap[currentNudgeCheck], 'live');
        updateVoiceGuide(contextMap[currentNudgeCheck], 'live');
      }
    }

    // Live checklist update
    const currentText = fullVoiceTranscript + interim;
    const hasSignal = currentText.trim() && hasHealthSignal(currentText);
    if (hasSignal) {
      const liveExtracted = parseVoiceIntake(currentText);
      updateVoiceChecklist(liveExtracted);
      updateVoiceGuide(liveExtracted);

      clearTimeout(haikuBounceTimer);
      haikuBounceTimer = setTimeout(() => bounceToHaiku(currentText), 2500);
    }
  };

  recognition.onend = () => {
    ring.classList.remove('recording');
    status.classList.remove('active');
    fullVoiceRecognition = null;
    clearTimeout(haikuBounceTimer);

    if (textarea.value.trim()) {
      const finalExtracted = parseVoiceIntake(textarea.value);
      updateVoiceChecklist(finalExtracted, 'ai');
      // Don't auto-submit — gate handles button state.
      // If no pending items, button is enabled and user can tap.
      // If haiku bounce is in-flight, button stays disabled until it resolves.
      if (!document.querySelectorAll('.voice-checklist-item.pending').length) {
        status.textContent = 'Ready — tap Next to continue';
      } else {
        status.textContent = 'Finishing up...';
      }
    } else {
      status.textContent = 'Tap to start';
      const idleEl = document.getElementById('voice-idle');
      const activeEl = document.getElementById('voice-active');
      if (activeEl) activeEl.classList.remove('show');
      if (idleEl) idleEl.style.display = '';
    }
  };

  recognition.onerror = (e) => {
    ring.classList.remove('recording');
    status.classList.remove('active');
    fullVoiceRecognition = null;
    if (e.error !== 'aborted' && e.error !== 'no-speech') {
      status.textContent = 'Tap to try again';
    }
  };

  recognition.start();
}

// ── Submit voice intake ──
export async function submitVoiceIntake() {
  const text = document.getElementById('voice-full-transcript').value;
  if (!text.trim()) return;

  const btn = document.getElementById('voice-submit-btn');
  const statusEl = document.getElementById('voice-full-status');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  statusEl.textContent = 'Sending to AI for extraction...';
  statusEl.classList.add('active');

  if (fullVoiceRecognition) fullVoiceRecognition.stop();

  let extracted;
  try {
    const resp = await fetch(`${WORKER_URL}/parse-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });
    if (!resp.ok) throw new Error(`Worker returned ${resp.status}`);
    const result = await resp.json();
    extracted = result.extracted;
    statusEl.textContent = `Extracted in ${(result.duration_ms / 1000).toFixed(1)}s`;
    log.info('voice submit: worker extraction', { extracted });
  } catch (err) {
    log.warn('worker unavailable, falling back to regex', { error: err.message });
    extracted = parseVoiceIntake(text);
    statusEl.textContent = 'Extracted locally (offline mode)';
  }

  applyExtraction(extracted);

  updateVoiceChecklist({
    age: extracted.age,
    sex: extracted.sex,
    heightFt: extracted.height_feet,
    weight: extracted.weight_lbs,
    labs: extracted.labs,
    noLabs: extracted.has_labs === false,
    hasLabs: extracted.has_labs === true || extracted.hasLabs === true,
    systolic: extracted.systolic,
    noBp: extracted.has_bp === false || extracted.noBp,
    waist: extracted.waist_inches,
    hasMedications: extracted.has_medications,
    familyHistory: extracted.has_family_history,
  }, 'ai');

  btn.textContent = 'Done';
  statusEl.classList.remove('active');

  // Navigate to Phase 2 (shared Import & Enrich screen)
  if (window.showPhase2) {
    window.showPhase2();
  }
}

export function resetVoiceState() {
  currentNudgeCheck = null;
  currentNudgeState = null;
  fullVoiceTranscript = '';
  checklistLocked.clear();
  transcriptCollapsed = false;
  const summary = document.getElementById('transcript-summary');
  if (summary) summary.remove();
  const activeEl = document.getElementById('voice-active');
  if (activeEl) activeEl.classList.remove('transcript-collapsed');
}

export function hideSpeechUI() {
  document.querySelectorAll('.mic-btn').forEach(b => b.style.display = 'none');
  const voiceTab = document.querySelector('.intake-tab[data-tab="voice"]');
  if (voiceTab) voiceTab.style.display = 'none';
}
