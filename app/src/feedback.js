// feedback.js — Error boundary, breadcrumb trail, feedback flow (error + proactive)
import { createLogger } from './logger.js';
const log = createLogger('feedback');

// ── Breadcrumb trail (last 20 user actions) ──
const MAX_CRUMBS = 20;
const _breadcrumbs = [];

export function addBreadcrumb(action, detail = '') {
  _breadcrumbs.push({
    t: new Date().toISOString().slice(11, 23),
    action,
    detail: String(detail).slice(0, 120),
  });
  if (_breadcrumbs.length > MAX_CRUMBS) _breadcrumbs.shift();
}

export function getBreadcrumbs() {
  return [..._breadcrumbs];
}

// ── Auto-track common user actions ──
export function initBreadcrumbTracking() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.intake-tab');
    if (btn) addBreadcrumb('tab', btn.dataset.tab);

    const toggle = e.target.closest('.toggle-btn, .opt-btn');
    if (toggle) addBreadcrumb('toggle', toggle.dataset.value || toggle.textContent.trim());

    const device = e.target.closest('.device-card');
    if (device) addBreadcrumb('device', device.dataset.device);

    const stepperBtn = e.target.closest('.stepper-step');
    if (stepperBtn) {
      addBreadcrumb('step', 'step:' + stepperBtn.dataset.step);
    }

    const phq9Radio = e.target.closest('.phq9-radio');
    if (phq9Radio) addBreadcrumb('phq9', `q${phq9Radio.dataset.question}=${phq9Radio.dataset.value}`);

    if (e.target.closest('.nav-next, .score-cta')) addBreadcrumb('nav', 'next/score');
    if (e.target.closest('.phase2-back')) addBreadcrumb('nav', 'back');
    if (e.target.closest('.phase2-skip')) addBreadcrumb('nav', 'skip');
  });

  const origToggle = window.toggleFullVoice;
  if (origToggle) {
    window.toggleFullVoice = function() {
      addBreadcrumb('voice', 'toggle');
      return origToggle.apply(this, arguments);
    };
  }

  const origPhase2 = window.showPhase2;
  if (origPhase2) {
    window.showPhase2 = function() {
      addBreadcrumb('nav', 'phase2');
      return origPhase2.apply(this, arguments);
    };
  }
}

// ── Error boundary ──
let _errorOverlayShown = false;

export function initErrorBoundary() {
  window.addEventListener('error', (e) => {
    log.error('uncaught error', { message: e.message, filename: e.filename, line: e.lineno, col: e.colno });
    addBreadcrumb('ERROR', `${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`);
    showFeedbackOverlay({
      mode: 'error',
      errorMessage: e.message,
      errorFile: e.filename,
      errorLine: e.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason);
    log.error('unhandled promise rejection', { message: msg });
    addBreadcrumb('ERROR', msg);
    showFeedbackOverlay({
      mode: 'error',
      errorMessage: msg,
    });
  });
}

// ── Persistent feedback button ──
export function initFeedbackButton() {
  const fab = document.createElement('button');
  fab.className = 'feedback-fab';
  fab.setAttribute('aria-label', 'Send feedback');
  fab.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  fab.addEventListener('click', () => {
    addBreadcrumb('feedback', 'opened');
    showFeedbackOverlay({ mode: 'proactive' });
  });
  document.body.appendChild(fab);
}

// ── Unified feedback overlay ──
let _feedbackOverlayActive = false;

function showFeedbackOverlay({ mode, errorMessage, errorFile, errorLine } = {}) {
  if (_feedbackOverlayActive) return;
  _feedbackOverlayActive = true;
  if (mode === 'error') _errorOverlayShown = true;

  const isError = mode === 'error';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSpeech = !!SpeechRecognition;

  const overlay = document.createElement('div');
  overlay.className = 'feedback-overlay';
  overlay.innerHTML = `
    <div class="feedback-card">
      ${isError
        ? `<div class="feedback-icon">!</div>
           <h3 class="feedback-title">Something went wrong</h3>
           <p class="feedback-message">We hit a snag. Your data is safe — it's stored locally in your browser.</p>`
        : `<div class="feedback-icon feedback-icon-chat">
             <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
           </div>
           <h3 class="feedback-title">Send us feedback</h3>
           <p class="feedback-message">Bugs, ideas, confusion — we want to hear it all. This helps us build something better.</p>`
      }
      ${isError ? `
        <div class="feedback-actions" id="feedback-error-actions">
          <button class="feedback-btn feedback-btn-primary" id="feedback-report-btn">Help us fix it</button>
          <button class="feedback-btn feedback-btn-secondary" id="feedback-restart-btn">Start over</button>
          <button class="feedback-btn feedback-btn-dismiss" id="feedback-dismiss-btn">Dismiss</button>
        </div>
      ` : ''}
      <div class="feedback-form-wrap" id="feedback-form-wrap" style="${isError ? 'display:none;' : ''}">
        <p class="feedback-form-hint">${isError ? 'What were you doing when this happened?' : 'Type or tap the mic to tell us what\'s on your mind.'}</p>
        <div class="feedback-input-wrap">
          <textarea class="feedback-textarea" id="feedback-textarea" placeholder="${isError ? 'e.g. I was dictating my health data and clicked submit...' : 'e.g. The voice mode didn\'t pick up my blood pressure...'}"></textarea>
          ${hasSpeech ? `<button class="feedback-mic-btn" id="feedback-mic-btn" title="Dictate feedback">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>` : ''}
        </div>
        <div class="feedback-form-footer">
          <button class="feedback-btn feedback-btn-primary" id="feedback-send-btn">Send</button>
          ${!isError ? '<button class="feedback-btn feedback-btn-dismiss" id="feedback-dismiss-btn">Cancel</button>' : ''}
        </div>
        <p class="feedback-sent" id="feedback-sent" style="display:none;">Sent — thank you!</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on overlay background click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFeedback(overlay);
  });

  // Error-specific: "Help us fix it" reveals form
  if (isError) {
    document.getElementById('feedback-report-btn').addEventListener('click', () => {
      document.getElementById('feedback-error-actions').style.display = 'none';
      document.getElementById('feedback-form-wrap').style.display = 'block';
      document.getElementById('feedback-textarea').focus();
    });

    document.getElementById('feedback-restart-btn').addEventListener('click', () => {
      closeFeedback(overlay);
      if (window.startOver) window.startOver();
      else window.location.reload();
    });
  }

  // Dismiss / Cancel
  const dismissBtn = document.getElementById('feedback-dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => closeFeedback(overlay));
  }

  // Send
  document.getElementById('feedback-send-btn').addEventListener('click', () => {
    sendFeedbackReport(
      document.getElementById('feedback-textarea').value,
      errorMessage, errorFile, errorLine,
      isError ? 'bug' : 'feedback'
    ).then(() => {
      setTimeout(() => closeFeedback(overlay), 1500);
    });
  });

  // Voice dictation for feedback textarea
  if (hasSpeech) {
    let feedbackRecognition = null;
    const micBtn = document.getElementById('feedback-mic-btn');
    const textarea = document.getElementById('feedback-textarea');

    micBtn.addEventListener('click', () => {
      if (feedbackRecognition) {
        feedbackRecognition.stop();
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalText = textarea.value;
      if (finalText && !finalText.endsWith(' ')) finalText += ' ';

      recognition.onstart = () => {
        micBtn.classList.add('recording');
        feedbackRecognition = recognition;
      };

      recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim = t;
        }
        textarea.value = finalText + interim;
        textarea.scrollTop = textarea.scrollHeight;
      };

      recognition.onend = () => {
        micBtn.classList.remove('recording');
        feedbackRecognition = null;
      };

      recognition.onerror = () => {
        micBtn.classList.remove('recording');
        feedbackRecognition = null;
      };

      recognition.start();
    });
  }

  // Auto-focus textarea for proactive mode
  if (!isError) {
    requestAnimationFrame(() => document.getElementById('feedback-textarea')?.focus());
  }
}

function closeFeedback(overlay) {
  overlay.remove();
  _feedbackOverlayActive = false;
  _errorOverlayShown = false;
}

async function sendFeedbackReport(userMessage, errorMessage, filename, line, type = 'bug') {
  const report = {
    type,
    error: errorMessage || null,
    file: filename ? filename.split('/').pop() : null,
    line: line || null,
    userMessage: userMessage || '',
    breadcrumbs: getBreadcrumbs(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
  };

  const sendBtn = document.getElementById('feedback-send-btn');
  const sentMsg = document.getElementById('feedback-sent');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  try {
    const subject = type === 'bug'
      ? `[Baseline Bug] ${(errorMessage || 'unknown').slice(0, 60)}`
      : `[Baseline Feedback] ${(userMessage || '').slice(0, 60)}`;

    await fetch('https://formspree.io/f/mjgezrdp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        message: userMessage || '(no description)',
        error_detail: JSON.stringify(report, null, 2),
      }),
    });
    sendBtn.style.display = 'none';
    sentMsg.style.display = 'block';
    document.getElementById('feedback-textarea').disabled = true;
    log.info('feedback report sent', { type });
  } catch (err) {
    sendBtn.textContent = 'Failed — try again';
    sendBtn.disabled = false;
    log.error('feedback send failed', { error: err.message });
  }
}

// ── Feature flags via URL params ──
export function initFeatureFlags() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('voice') === 'off') {
    addBreadcrumb('flag', 'voice=off');
    window._forceFormMode = true;
  }

  if (params.get('debug') === 'true') {
    addBreadcrumb('flag', 'debug=true');
    window._debugMode = true;
    const indicator = document.createElement('div');
    indicator.className = 'debug-indicator';
    indicator.textContent = 'DEBUG';
    document.body.appendChild(indicator);
  }
}

// ── Voice fallback prompt ──
export function initVoiceFallback() {
  let voiceFallbackTimer = null;

  const observer = new MutationObserver(() => {
    const activeEl = document.getElementById('voice-active');
    if (activeEl && activeEl.classList.contains('show')) {
      if (!voiceFallbackTimer) {
        voiceFallbackTimer = setTimeout(() => {
          const checked = document.querySelectorAll('.voice-checklist-item.checked, .voice-checklist-item.pending');
          if (checked.length === 0) {
            showVoiceFallbackHint();
          }
        }, 15000);
      }
    } else {
      clearTimeout(voiceFallbackTimer);
      voiceFallbackTimer = null;
      hideVoiceFallbackHint();
    }
  });

  const activeEl = document.getElementById('voice-active');
  if (activeEl) {
    observer.observe(activeEl, { attributes: true, attributeFilter: ['class'] });
  }
}

function showVoiceFallbackHint() {
  if (document.getElementById('voice-fallback-hint')) return;
  const hint = document.createElement('div');
  hint.id = 'voice-fallback-hint';
  hint.className = 'voice-fallback-hint';
  hint.innerHTML = `Not picking up your voice? <button onclick="switchIntakeTab('form')">Switch to typing</button>`;
  const activeEl = document.getElementById('voice-active');
  if (activeEl) activeEl.appendChild(hint);
}

function hideVoiceFallbackHint() {
  const hint = document.getElementById('voice-fallback-hint');
  if (hint) hint.remove();
}
