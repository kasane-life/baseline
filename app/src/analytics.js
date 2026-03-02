// analytics.js — Lightweight event tracking via worker KV
// Fire-and-forget. Queues locally if offline, flushes on next visit.

const TRACK_URL = 'https://baseline-api.deal-e-andrew.workers.dev/track';
const QUEUE_KEY = 'baseline-analytics-queue';

let _sessionId = null;

function getSessionId() {
  if (!_sessionId) {
    _sessionId = sessionStorage.getItem('baseline-sid');
    if (!_sessionId) {
      _sessionId = crypto.randomUUID().slice(0, 8);
      sessionStorage.setItem('baseline-sid', _sessionId);
    }
  }
  return _sessionId;
}

function getEmail() {
  return localStorage.getItem('baseline-beta-email') || null;
}

function buildPayload(event, data = {}) {
  return {
    event,
    ...data,
    email: getEmail(),
    sid: getSessionId(),
    ts: new Date().toISOString(),
    screen: `${window.innerWidth}x${window.innerHeight}`,
  };
}

function send(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain' });
      if (navigator.sendBeacon(TRACK_URL, blob)) return true;
    }
  } catch { /* fall through */ }
  try {
    fetch(TRACK_URL, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    return true;
  } catch { return false; }
}

export function track(event, data = {}) {
  const payload = buildPayload(event, data);
  if (!send(payload)) {
    // Queue for later
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      q.push(payload);
      if (q.length > 100) q.splice(0, q.length - 100); // cap queue
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch { /* storage full */ }
  }
}

export function flushQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (q.length === 0) return;
    for (const payload of q) send(payload);
    localStorage.removeItem(QUEUE_KEY);
  } catch { /* ignore */ }
}

// Flush any queued events on load
flushQueue();
