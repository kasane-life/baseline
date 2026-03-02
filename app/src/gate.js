// gate.js — Email gate for beta access
// Full-screen overlay before app loads. Stores email in localStorage, sends to Formspree.

const STORAGE_KEY = 'baseline-beta-email';
const FORMSPREE_URL = 'https://formspree.io/f/mjgezrdp';

export function getBetaEmail() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function isGateRequired() {
  // Dev bypass: skip on localhost or ?gate=off
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return false;
  if (new URLSearchParams(location.search).get('gate') === 'off') return false;
  return !getBetaEmail();
}

export function showGate() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.innerHTML = `
      <div class="feedback-card">
        <div class="gate-logo">baseline<span style="color:var(--red, #c83c3c)">.</span></div>
        <p class="gate-subtitle">Private beta — enter your email to continue.</p>
        <form class="gate-form" autocomplete="on">
          <input type="email" class="gate-email-input" placeholder="you@example.com" required autocomplete="email" autofocus>
          <button type="submit" class="gate-submit">Continue</button>
        </form>
        <p class="gate-privacy">No spam. Just so we know who's testing.</p>
      </div>`;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('.gate-form');
    const input = overlay.querySelector('.gate-email-input');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;

      const btn = form.querySelector('.gate-submit');
      btn.disabled = true;
      btn.textContent = 'Loading...';

      localStorage.setItem(STORAGE_KEY, email);

      // Send to Formspree (fire-and-forget)
      try {
        fetch(FORMSPREE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ _subject: '[Baseline Beta] New user', email, timestamp: new Date().toISOString() }),
        }).catch(() => {});
      } catch { /* offline is fine */ }

      overlay.remove();
      resolve(email);
    });
  });
}
