// bp-tracker.js — 7-day blood pressure tracking protocol
// Post-score action module: user enters daily BP readings, app averages and re-scores

import { addObservations, saveImport, generateImportId } from '../db.js';
import { createLogger } from './logger.js';
const log = createLogger('bp-tracker');

const PROTOCOL_DAYS = 7;
const STORAGE_KEY = 'baseline_bp_protocol';

// ── State ──

function loadProtocol() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProtocol(protocol) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(protocol));
}

export function startProtocol() {
  const protocol = {
    started: new Date().toISOString().slice(0, 10),
    readings: [],
    completed: false,
    import_id: null,
  };
  saveProtocol(protocol);
  log.info('BP protocol started');
  return protocol;
}

export function addReading(systolic, diastolic) {
  const protocol = loadProtocol();
  if (!protocol || protocol.completed) return null;

  const today = new Date().toISOString().slice(0, 10);
  const existing = protocol.readings.find(r => r.date === today);
  if (existing) {
    existing.systolic = systolic;
    existing.diastolic = diastolic;
  } else {
    protocol.readings.push({ date: today, systolic, diastolic });
  }

  saveProtocol(protocol);
  log.info('BP reading added', { day: protocol.readings.length, systolic, diastolic });
  return protocol;
}

export function getProtocol() {
  return loadProtocol();
}

export function getAverage(protocol) {
  if (!protocol || protocol.readings.length === 0) return null;
  const n = protocol.readings.length;
  const avgSys = Math.round(protocol.readings.reduce((s, r) => s + r.systolic, 0) / n);
  const avgDia = Math.round(protocol.readings.reduce((s, r) => s + r.diastolic, 0) / n);
  return { systolic: avgSys, diastolic: avgDia, count: n };
}

export async function completeProtocol() {
  const protocol = loadProtocol();
  if (!protocol || protocol.readings.length === 0) return null;

  const avg = getAverage(protocol);
  const importId = generateImportId();

  await addObservations([
    { metric: 'systolic', value: avg.systolic, date: new Date().toISOString().slice(0, 10), source: 'bp_protocol', import_id: importId },
    { metric: 'diastolic', value: avg.diastolic, date: new Date().toISOString().slice(0, 10), source: 'bp_protocol', import_id: importId },
  ]);

  await saveImport({
    id: importId,
    source_type: 'bp_protocol',
    imported_at: new Date().toISOString(),
    metrics_extracted: ['systolic', 'diastolic'],
    protocol_readings: protocol.readings.length,
    protocol_average: avg,
  });

  protocol.completed = true;
  protocol.import_id = importId;
  saveProtocol(protocol);

  log.info('BP protocol completed', avg);
  return avg;
}

export function dismissProtocol() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Rendering ──

export function renderBpTracker(container, devices) {
  let protocol = loadProtocol();
  const hasCuff = (devices || []).includes('bp_cuff');

  if (protocol?.completed) {
    const avg = getAverage(protocol);
    container.innerHTML = buildCompletedHtml(avg, protocol);
    wireCompletedHandlers(container);
    return;
  }

  if (!protocol) {
    container.innerHTML = buildPromptHtml(hasCuff);
    wirePromptHandlers(container);
    return;
  }

  container.innerHTML = buildActiveHtml(protocol);
  wireActiveHandlers(container);
}

function buildPromptHtml(hasCuff) {
  const title = hasCuff
    ? 'Track blood pressure for 7 days'
    : 'Get a BP cuff (~$40, Omron) — then track for 7 days';
  const desc = hasCuff
    ? 'A single reading is a snapshot. Seven days gives you a real average — the number that actually predicts outcomes.'
    : 'A home cuff pays for itself in data. Seven days of readings gives you a real average — the number that actually predicts outcomes.';
  const btnText = hasCuff ? 'Start protocol' : 'I have a cuff — start protocol';
  return `
    <div class="bp-tracker bp-prompt">
      <div class="bp-tracker-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <div class="bp-tracker-body">
        <div class="bp-tracker-title">${title}</div>
        <div class="bp-tracker-desc">${desc}</div>
      </div>
      <button class="bp-tracker-start" id="bp-start-btn">${btnText}</button>
    </div>
  `;
}

function buildActiveHtml(protocol) {
  const today = new Date().toISOString().slice(0, 10);
  const todayDone = protocol.readings.some(r => r.date === today);
  const dayNum = protocol.readings.length + (todayDone ? 0 : 1);
  const avg = getAverage(protocol);

  let daysHtml = '';
  for (let i = 0; i < PROTOCOL_DAYS; i++) {
    const reading = protocol.readings[i];
    if (reading) {
      daysHtml += `<div class="bp-day bp-day-done"><span class="bp-day-num">${i + 1}</span><span class="bp-day-val">${reading.systolic}/${reading.diastolic}</span></div>`;
    } else if (i === protocol.readings.length && !todayDone) {
      daysHtml += `<div class="bp-day bp-day-today"><span class="bp-day-num">${i + 1}</span><span class="bp-day-val">today</span></div>`;
    } else {
      daysHtml += `<div class="bp-day bp-day-future"><span class="bp-day-num">${i + 1}</span></div>`;
    }
  }

  const avgHtml = avg ? `<div class="bp-running-avg">Running avg: <strong>${avg.systolic}/${avg.diastolic}</strong></div>` : '';

  const canComplete = protocol.readings.length >= 3;
  const inputHtml = todayDone ? `
    <div class="bp-today-done">Today's reading recorded</div>
  ` : `
    <div class="bp-input-row">
      <input type="number" class="bp-input" id="bp-sys-input" placeholder="120" min="70" max="220">
      <span class="bp-slash">/</span>
      <input type="number" class="bp-input" id="bp-dia-input" placeholder="80" min="40" max="140">
      <button class="bp-log-btn" id="bp-log-btn">Log</button>
    </div>
  `;

  return `
    <div class="bp-tracker bp-active">
      <div class="bp-tracker-header">
        <div class="bp-tracker-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div class="bp-tracker-title">BP Protocol — Day ${Math.min(dayNum, PROTOCOL_DAYS)} of ${PROTOCOL_DAYS}</div>
      </div>
      <div class="bp-days">${daysHtml}</div>
      ${avgHtml}
      ${inputHtml}
      ${canComplete ? `<button class="bp-complete-btn" id="bp-complete-btn">Score with ${protocol.readings.length}-day average</button>` : ''}
    </div>
  `;
}

function buildCompletedHtml(avg, protocol) {
  return `
    <div class="bp-tracker bp-completed">
      <div class="bp-tracker-header">
        <div class="bp-tracker-icon bp-icon-done">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="bp-tracker-title">BP Protocol Complete</div>
      </div>
      <div class="bp-result">
        <div class="bp-result-avg">${avg.systolic}<span class="bp-slash">/</span>${avg.diastolic}</div>
        <div class="bp-result-label">${protocol.readings.length}-day average</div>
      </div>
      <div class="bp-result-actions">
        <button class="bp-restart-btn" id="bp-restart-btn">Start new protocol</button>
      </div>
    </div>
  `;
}

// ── Event wiring ──

function wirePromptHandlers(container) {
  container.querySelector('#bp-start-btn')?.addEventListener('click', () => {
    startProtocol();
    renderBpTracker(container);
  });
}

function wireActiveHandlers(container) {
  const logBtn = container.querySelector('#bp-log-btn');
  if (logBtn) {
    logBtn.addEventListener('click', () => {
      const sys = parseInt(container.querySelector('#bp-sys-input').value);
      const dia = parseInt(container.querySelector('#bp-dia-input').value);
      if (!sys || !dia || sys < 70 || sys > 220 || dia < 40 || dia > 140) return;
      addReading(sys, dia);
      renderBpTracker(container);
    });

    // Enter key submits
    [container.querySelector('#bp-sys-input'), container.querySelector('#bp-dia-input')].forEach(input => {
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') logBtn.click();
      });
    });
  }

  container.querySelector('#bp-complete-btn')?.addEventListener('click', async () => {
    await completeProtocol();
    renderBpTracker(container);
    // Trigger re-score
    if (window.computeResults) window.computeResults();
  });
}

function wireCompletedHandlers(container) {
  container.querySelector('#bp-restart-btn')?.addEventListener('click', () => {
    startProtocol();
    renderBpTracker(container);
  });
}
