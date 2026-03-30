// ═══════════ BASELINE SHARED JS ═══════════
// Lenis, scroll progress, GSAP reveals, analytics, Milo chat widget

// ——— Mobile detection ———
const isMobile = window.innerWidth < 768;

// ——— Lenis smooth scroll ———
window.lenis = new Lenis({ wheelMultiplier: 0.8 });
const lenis = window.lenis;
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
gsap.registerPlugin(ScrollTrigger);

// ——— Scroll reveals with GSAP ———
function initRevealAnimations() {
  document.querySelectorAll('.reveal').forEach(el => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1, ease: 'expo.out',
      delay: parseFloat(el.classList.contains('stagger-1') ? 0.1 : el.classList.contains('stagger-2') ? 0.22 : el.classList.contains('stagger-3') ? 0.34 : el.classList.contains('stagger-4') ? 0.46 : 0),
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });
  document.querySelectorAll('.reveal-left').forEach(el => {
    gsap.from(el, {
      x: -60, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });
  document.querySelectorAll('.reveal-right').forEach(el => {
    gsap.from(el, {
      x: 60, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });
  document.querySelectorAll('.reveal-scale').forEach(el => {
    gsap.from(el, {
      scale: 0.92, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });
}

// ——— Unique section header entrances ———
function initEntranceAnimations() {
  // CLIP-UP
  document.querySelectorAll('.entrance-clip-up').forEach(el => {
    const html = el.innerHTML;
    const lines = html.split(/<br\s*\/?>/i);
    if (lines.length > 1) {
      el.innerHTML = lines.map(line => `<span class="clip-line block" style="overflow:hidden;"><span class="clip-inner block">${line.trim()}</span></span>`).join('');
      el.querySelectorAll('.clip-inner').forEach((inner, i) => {
        gsap.from(inner, {
          yPercent: 110, duration: 1.2, ease: 'expo.out',
          delay: i * 0.12,
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
        });
      });
    } else if (el.children.length > 1) {
      Array.from(el.children).forEach((child, i) => {
        child.style.overflow = 'hidden';
        gsap.from(child, {
          yPercent: 110, duration: 1.2, ease: 'expo.out',
          delay: i * 0.12,
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
        });
      });
    } else {
      el.style.overflow = 'hidden';
      gsap.from(el, {
        yPercent: 110, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
      });
    }
  });

  // SNAP
  document.querySelectorAll('.entrance-snap').forEach(el => {
    gsap.from(el, {
      scale: 1.08, opacity: 0, duration: 0.4, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' }
    });
  });

  // SPLIT
  document.querySelectorAll('.entrance-split').forEach(el => {
    const html = el.innerHTML;
    const lines = html.split('<br>');
    if (lines.length >= 2) {
      el.innerHTML = lines.map((line, i) => `<span class="split-line block" style="overflow:hidden;"><span class="split-inner block">${line}</span></span>`).join('');
      const inners = el.querySelectorAll('.split-inner');
      inners.forEach((inner, i) => {
        gsap.from(inner, {
          x: i % 2 === 0 ? -120 : 120, opacity: 0,
          duration: 1, ease: 'expo.out',
          delay: i * 0.1,
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
        });
      });
    }
  });

  // SLIDE-RIGHT
  document.querySelectorAll('.entrance-slide-right').forEach(el => {
    gsap.from(el, {
      x: -100, opacity: 0, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });

  // Word-by-word entrance
  document.querySelectorAll('.entrance-words').forEach(el => {
    const nodes = el.childNodes;
    let html = '';
    nodes.forEach(node => {
      if (node.nodeType === 3) {
        const words = node.textContent.split(/(\s+)/);
        words.forEach(w => {
          if (w.trim()) {
            html += `<span class="ew-word" style="display:inline-block; opacity:0;">${w}</span>`;
          } else {
            html += w;
          }
        });
      } else {
        const inner = node.textContent.split(/(\s+)/);
        const cls = node.className || '';
        inner.forEach(w => {
          if (w.trim()) {
            html += `<span class="ew-word ${cls}" style="display:inline-block; opacity:0;">${w}</span>`;
          } else {
            html += w;
          }
        });
      }
    });
    el.innerHTML = html;

    const words = el.querySelectorAll('.ew-word');
    gsap.to(words, {
      opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
    gsap.set(words, { y: 8 });
  });
}

// ——— Ghost text fill on scroll ———
function initGhostTextFill() {
  document.querySelectorAll('.font-ghost, .font-ghost-light, .font-ghost-dark').forEach(el => {
    gsap.to(el, {
      '--fill': '100%',
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: true }
    });
  });
}

// ——— Parallax ———
function initParallax() {
  document.querySelectorAll('.parallax').forEach(el => {
    const speed = parseFloat(el.dataset.speed) || 0.03;
    gsap.to(el, {
      yPercent: speed * -100,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
}

// ——— Stacked words ———
function initStackedWords() {
  document.querySelectorAll('.stack-word').forEach((el, i) => {
    gsap.from(el, {
      x: 80, opacity: 0, duration: 1.2, ease: 'expo.out',
      delay: i * 0.1,
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' }
    });
  });
}

// ——— Scroll progress bar ———
function initScrollProgress() {
  const progressEl = document.getElementById('scroll-progress');
  if (progressEl) {
    gsap.to(progressEl, {
      width: '100%',
      ease: 'none',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: true }
    });
  }
}

// ——— Stat counter ———
function initStatCounters() {
  document.querySelectorAll('.stat-count').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = target === 33 ? '%' : '';
    ScrollTrigger.create({
      trigger: el, start: 'top 80%',
      onEnter: () => {
        if (el.dataset.counted) return;
        el.dataset.counted = 'true';
        let obj = { val: 0 };
        gsap.to(obj, {
          val: target, duration: 1.2, ease: 'expo.out',
          onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; }
        });
      }
    });
  });
}

// ——— Step cards ———
function initStepCards() {
  document.querySelectorAll('.step-emerge').forEach((card, i) => {
    gsap.from(card, {
      y: 100, scale: 0.8, opacity: 0, duration: 1, ease: 'expo.out',
      delay: i * 0.12,
      scrollTrigger: { trigger: card.parentElement, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });
}

// ——— Connector blur+fade ———
function initConnectorFade() {
  document.querySelectorAll('.connector-section').forEach(conn => {
    gsap.to(conn, {
      filter: 'blur(8px)',
      opacity: 0.3,
      ease: 'none',
      scrollTrigger: { trigger: conn, start: 'center center', end: 'bottom top', scrub: true }
    });
  });
}

// ——— Rotated strip cards ———
function initRotatedStrips() {
  document.querySelectorAll('.rotated-strip').forEach((strip, i) => {
    gsap.from(strip, {
      rotation: gsap.utils.random(-25, 25),
      y: 80,
      opacity: 0,
      duration: 1.2,
      ease: 'back.out(1.7)',
      delay: i * 0.1,
      scrollTrigger: { trigger: strip.parentElement, start: 'top 80%', toggleActions: 'play none none reverse' }
    });
  });
}

// ——— Footer reveal ———
function initFooterReveal() {
  const footer = document.getElementById('site-footer');
  const spacer = document.getElementById('footer-spacer');
  if (footer && spacer) {
    const setSpacerHeight = () => { spacer.style.height = footer.offsetHeight + 'px'; };
    setSpacerHeight();
    window.addEventListener('resize', setSpacerHeight);

    // Find the last main section before footer
    const ctaSection = document.getElementById('get-started');
    if (ctaSection) {
      ScrollTrigger.create({
        trigger: ctaSection,
        start: 'bottom 90%',
        onEnter: () => { footer.style.visibility = 'visible'; },
        onLeaveBack: () => { footer.style.visibility = 'hidden'; },
      });
    }
  }
}

// ——— Form submission ———
function initFormSubmission() {
  const form = document.getElementById('coach-form');
  const success = document.getElementById('success');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'SENDING...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.style.display = 'none';
        if (success) success.classList.remove('hidden');
        if (window._blTrack) window._blTrack('signup');
      } else {
        btn.disabled = false;
        btn.textContent = "I'M IN";
      }
    } catch {
      btn.disabled = false;
      btn.textContent = "I'M IN";
    }
  });
}

// ——— Founder photos ———
function initFounderPhotos() {
  document.querySelectorAll('.founder-photo').forEach(photo => {
    gsap.from(photo, {
      scale: 0.7, y: 80, opacity: 0, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: photo, start: 'top 90%', toggleActions: 'play none none reverse' }
    });
  });
}

// ——— Initialize all shared animations ———
function initSharedAnimations() {
  initRevealAnimations();
  initEntranceAnimations();
  initGhostTextFill();
  initParallax();
  initStackedWords();
  initScrollProgress();
  initStatCounters();
  initStepCards();
  initConnectorFade();
  initRotatedStrips();
  initFooterReveal();
  initFormSubmission();
  initFounderPhotos();
}

// ——— Analytics ———
(function() {
  const T = 'https://api.mybaseline.health/t';
  const sid = Math.random().toString(36).slice(2, 10);
  let vid;
  try {
    vid = localStorage.getItem('bl_vid');
    if (!vid) { vid = crypto.randomUUID().slice(0, 12); localStorage.setItem('bl_vid', vid); }
  } catch { vid = 'unknown'; }
  let maxScroll = 0;
  let scrollSent = {};
  const isNew = !localStorage.getItem('bl_seen');
  try { localStorage.setItem('bl_seen', '1'); } catch {}

  function track(event, data) {
    try {
      const payload = JSON.stringify({ event, sid, vid, ts: Date.now(), url: location.pathname, ...data });
      if (navigator.sendBeacon) { navigator.sendBeacon(T, payload); }
      else { fetch(T, { method: 'POST', body: payload, keepalive: true }); }
    } catch {}
  }

  track('pageview', { ref: document.referrer || null, new_visitor: isNew });

  window.addEventListener('scroll', () => {
    const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (pct > maxScroll) maxScroll = pct;
    [25, 50, 75, 100].forEach(m => {
      if (maxScroll >= m && !scrollSent[m]) {
        scrollSent[m] = true;
        track('scroll', { depth: m });
      }
    });
  }, { passive: true });

  window._blTrack = track;
})();

// ——— Milo Demo Chat ———
(function() {
  const API_URL = 'https://api.mybaseline.health/demo-chat';
  const fab = document.getElementById('milo-fab');
  const panel = document.getElementById('milo-panel');
  const closeBtn = document.getElementById('milo-close');
  const input = document.getElementById('milo-input');
  const sendBtn = document.getElementById('milo-send');
  const messagesEl = document.getElementById('milo-messages');
  const typingEl = document.getElementById('milo-typing');

  if (!fab || !panel) return; // widget not on page

  const SUMMARY_URL = 'https://api.mybaseline.health/demo-summary';
  const micBtn = document.getElementById('milo-mic');
  let messages = [];
  let isOpen = false;
  let isSending = false;
  let greeted = false;
  let summarized = false;
  let recognition = null;
  let isRecording = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && micBtn) {
    micBtn.style.display = 'flex';
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      input.value = transcript;
      sendBtn.disabled = !transcript.trim();
      if (e.results[e.results.length - 1].isFinal && transcript.trim()) {
        send();
      }
    };
    recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); };
    recognition.onerror = () => { isRecording = false; micBtn.classList.remove('recording'); };

    micBtn.addEventListener('click', () => {
      if (isRecording) { recognition.stop(); }
      else { isRecording = true; micBtn.classList.add('recording'); input.value = ''; recognition.start(); }
    });
  }

  fab.addEventListener('click', () => {
    isOpen = true;
    panel.classList.add('open');
    fab.style.display = 'none';
    input.focus();
    if (window._blTrack) window._blTrack('chat_open');
    if (!greeted) { greeted = true; sendToMilo(null); }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
    fab.style.display = 'flex';
    extractSummary();
  });

  input.addEventListener('input', () => { sendBtn.disabled = !input.value.trim() || isSending; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && !isSending) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  function send() {
    const text = input.value.trim();
    if (!text || isSending) return;
    input.value = '';
    sendBtn.disabled = true;
    addMessage('user', text);
    sendToMilo(text);
  }

  function formatChat(text) {
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const blocks = esc.split(/\n\n+/);
    return blocks.map(block => {
      const lines = block.split('\n');
      const isList = lines.every(l => /^\s*(\d+[\.\)]\s|[-*]\s)/.test(l) || !l.trim());
      if (isList && lines.filter(l => l.trim()).length > 1) {
        const items = lines.filter(l => l.trim()).map(l =>
          '<li>' + l.replace(/^\s*(\d+[\.\)]|[-*])\s*/, '') + '</li>'
        ).join('');
        const isOrdered = /^\s*\d/.test(lines.find(l => l.trim()) || '');
        return isOrdered ? '<ol>' + items + '</ol>' : '<ul>' + items + '</ul>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
  }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `milo-msg ${role}`;
    if (role === 'assistant') {
      const isMulti = /\[multi\]/i.test(content);
      const cleanContent = content.replace(/\[multi\]\s*/gi, '');
      const lines = cleanContent.split('\n');
      const options = [];
      const textLines = [];
      for (const line of lines) {
        const match = line.match(/^\s*(\d+)[\.\)]\s+(.+)/);
        if (match) { options.push(match[2].trim()); }
        else { textLines.push(line); }
      }
      const textContent = textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (textContent) div.innerHTML = formatChat(textContent);
      messagesEl.appendChild(div);

      if (options.length > 0) {
        const choicesDiv = document.createElement('div');
        choicesDiv.className = 'milo-choices';
        if (isMulti) {
          const selected = new Set();
          options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'milo-choice';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
              if (selected.has(opt)) { selected.delete(opt); btn.classList.remove('selected'); }
              else { selected.add(opt); btn.classList.add('selected'); }
              submitBtn.style.display = selected.size > 0 ? 'block' : 'none';
            });
            choicesDiv.appendChild(btn);
          });
          const submitBtn = document.createElement('button');
          submitBtn.className = 'milo-choices-submit';
          submitBtn.textContent = 'Done';
          submitBtn.addEventListener('click', () => {
            const answer = Array.from(selected).join(', ');
            messagesEl.querySelectorAll('.milo-choices').forEach(c => c.remove());
            messagesEl.querySelectorAll('.milo-choices-submit').forEach(c => c.remove());
            addMessage('user', answer);
            sendToMilo(answer);
          });
          choicesDiv.appendChild(submitBtn);
        } else {
          options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'milo-choice';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
              messagesEl.querySelectorAll('.milo-choices').forEach(c => c.remove());
              addMessage('user', opt);
              sendToMilo(opt);
            });
            choicesDiv.appendChild(btn);
          });
        }
        messagesEl.appendChild(choicesDiv);
      }
    } else {
      div.textContent = content;
      messagesEl.appendChild(div);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendToMilo(userText) {
    isSending = true;
    sendBtn.disabled = true;
    if (userText) {
      messages.push({ role: 'user', content: userText });
      if (window._blTrack) window._blTrack('chat_msg', { turn: messages.filter(m => m.role === 'user').length });
    }
    const apiMessages = messages.length === 0 ? [{ role: 'user', content: 'Hi' }] : messages;
    typingEl.classList.add('visible');
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });
      typingEl.classList.remove('visible');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMessage('system', err.error || 'something went wrong');
        isSending = false;
        return;
      }
      const data = await res.json();
      if (data.reply) {
        messages.push({ role: 'assistant', content: data.reply });
        addMessage('assistant', data.reply);
      }
    } catch {
      typingEl.classList.remove('visible');
      addMessage('system', 'connection error. try again.');
    }
    isSending = false;
    sendBtn.disabled = !input.value.trim();
  }

  async function extractSummary() {
    if (summarized || messages.length < 3) return;
    summarized = true;
    try {
      const res = await fetch(SUMMARY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.summary) {
        const contextField = document.getElementById('demo-context');
        if (contextField) contextField.value = JSON.stringify(data.summary);
      }
    } catch {}
  }

  document.querySelectorAll('#coach-form input').forEach(field => {
    field.addEventListener('focus', extractSummary, { once: true });
  });
})();
