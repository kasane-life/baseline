// discovery.js — "What should we build next?" form for results page
// Stores responses locally in IndexedDB, sends to Formspree for collection

import { track } from './analytics.js';

const DISCOVERY_OPTIONS = [
  { id: 'garmin', label: 'Auto-import wearable data', description: 'Sync steps, sleep, heart rate directly from your watch' },
  { id: 'trends', label: 'Track changes over time', description: 'See how your numbers move between lab draws' },
  { id: 'family', label: 'Family / household profiles', description: 'Score your partner or kids alongside yours' },
  { id: 'action-plans', label: 'Personalized action plans', description: 'Step-by-step protocols based on your gaps' },
];

const FORMSPREE_URL = 'https://formspree.io/f/mjgezrdp';

export function renderDiscoveryForm(container) {
  if (!container) return;

  // Don't show if already submitted this session
  if (sessionStorage.getItem('baseline-discovery-submitted')) {
    container.innerHTML = '';
    return;
  }

  let html = `<div class="discovery-form">
    <h3 class="discovery-title">What would be most useful next?</h3>
    <p class="discovery-subtitle">Pick any that resonate — or tell us what's missing.</p>
    <div class="discovery-options">`;

  DISCOVERY_OPTIONS.forEach(opt => {
    html += `<label class="discovery-option" data-id="${opt.id}">
      <input type="checkbox" value="${opt.id}">
      <div class="discovery-option-content">
        <span class="discovery-option-label">${opt.label}</span>
        <span class="discovery-option-desc">${opt.description}</span>
      </div>
    </label>`;
  });

  html += `</div>
    <div class="discovery-freetext">
      <textarea class="discovery-textarea" placeholder="Something else? Tell us what you'd want..." rows="2"></textarea>
    </div>
    <button class="discovery-submit" disabled>Send</button>
    <p class="discovery-thanks" style="display:none;">Thanks — this shapes what we build.</p>
  </div>`;

  container.innerHTML = html;

  // Enable submit when something is selected or typed
  const form = container.querySelector('.discovery-form');
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  const textarea = form.querySelector('.discovery-textarea');
  const submitBtn = form.querySelector('.discovery-submit');

  function updateSubmitState() {
    const hasSelection = [...checkboxes].some(cb => cb.checked);
    const hasText = textarea.value.trim().length > 0;
    submitBtn.disabled = !(hasSelection || hasText);
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.discovery-option').classList.toggle('selected', cb.checked);
      updateSubmitState();
    });
  });

  textarea.addEventListener('input', updateSubmitState);

  submitBtn.addEventListener('click', async () => {
    const selected = [...checkboxes].filter(cb => cb.checked).map(cb => cb.value);
    const freetext = textarea.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const payload = {
      selected,
      freetext: freetext || null,
      timestamp: new Date().toISOString(),
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Store locally
    try {
      const existing = JSON.parse(localStorage.getItem('baseline-discovery') || '[]');
      existing.push(payload);
      localStorage.setItem('baseline-discovery', JSON.stringify(existing));
    } catch (_) { /* localStorage full or unavailable */ }

    // Send to Formspree
    try {
      await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: '[Baseline Discovery] Feature vote',
          selected: selected.join(', ') || '(none)',
          freetext: freetext || '(none)',
          timestamp: payload.timestamp,
        }),
      });
    } catch (_) { /* Offline or blocked — local copy is the backup */ }

    track('discovery_submitted', { selected });

    // Show thanks
    form.querySelector('.discovery-options').style.display = 'none';
    form.querySelector('.discovery-freetext').style.display = 'none';
    submitBtn.style.display = 'none';
    form.querySelector('.discovery-thanks').style.display = 'block';
    sessionStorage.setItem('baseline-discovery-submitted', '1');
  });
}
