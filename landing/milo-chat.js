/**
 * Milo Demo Chat Widget — standalone JS
 *
 * Usage:
 *   <link rel="stylesheet" href="milo-chat.css">
 *   <script src="milo-chat.js"></script>
 *
 * Requires: Inter + Anybody + JetBrains Mono fonts loaded on the page.
 * Config: set window.MILO_CHAT_API before loading to override the API URL.
 */

(function () {
  'use strict';

  const API_URL = window.MILO_CHAT_API || 'https://api.mybaseline.health/demo-chat';
  const SUMMARY_URL = window.MILO_SUMMARY_API || 'https://api.mybaseline.health/demo-summary';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ——— Inject HTML ———
  const widgetHTML = `
<button id="milo-fab" aria-label="Chat with Milo">
  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
</button>
<div id="milo-panel">
  <div id="milo-header">
    <div>
      <div class="milo-title">Milo</div>
      <div class="milo-label">demo</div>
    </div>
    <button id="milo-close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div id="milo-messages">
    <div class="milo-msg system">this is a demo. your data isn't saved.</div>
    <div class="milo-typing" id="milo-typing"><span></span><span></span><span></span></div>
  </div>
  <div id="milo-input-wrap">
    <button id="milo-mic" aria-label="Voice input" style="display:none;">
      <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
    </button>
    <input type="text" id="milo-input" placeholder="Tap the mic or type here..." autocomplete="off" enterkeyhint="send">
    <button id="milo-send" disabled>
      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>`;

  // Insert widget at end of body
  const container = document.createElement('div');
  container.innerHTML = widgetHTML;
  while (container.firstChild) {
    document.body.appendChild(container.firstChild);
  }

  // ——— Elements ———
  const fab = document.getElementById('milo-fab');
  const panel = document.getElementById('milo-panel');
  const closeBtn = document.getElementById('milo-close');
  const input = document.getElementById('milo-input');
  const sendBtn = document.getElementById('milo-send');
  const messagesEl = document.getElementById('milo-messages');
  const typingEl = document.getElementById('milo-typing');
  const micBtn = document.getElementById('milo-mic');

  let messages = [];
  let isOpen = false;
  let isSending = false;
  let greeted = false;
  let summarized = false;
  let recognition = null;
  let isRecording = false;

  // ——— Speech Recognition ———
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition && micBtn) {
    micBtn.style.display = 'flex';
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Cross-platform approach: one utterance per session.
    // Tap mic → speak → browser detects pause → final result → auto-send.
    // Works identically on Android, iOS, and desktop.

    recognition.onresult = function (e) {
      var transcript = e.results[0][0].transcript.trim();
      if (transcript) {
        input.value = transcript;
        sendBtn.disabled = false;
      }
    };

    recognition.onend = function () {
      isRecording = false;
      micBtn.classList.remove('recording');
      // Auto-send whatever landed in the input
      if (input.value.trim()) {
        setTimeout(send, 300);
      }
    };

    recognition.onerror = function (e) {
      isRecording = false;
      micBtn.classList.remove('recording');
      if (e.error === 'not-allowed') {
        input.placeholder = 'Tap the mic on your keyboard to dictate...';
        micBtn.style.display = 'none';
      }
    };

    micBtn.addEventListener('click', function () {
      if (isRecording) {
        recognition.stop();
      } else {
        isRecording = true;
        micBtn.classList.add('recording');
        input.value = '';
        try {
          recognition.start();
        } catch (e) {
          isRecording = false;
          micBtn.classList.remove('recording');
        }
      }
    });
  }

  // ——— Prevent page scroll when touching chat panel ———
  // Lenis and other smooth-scroll libraries intercept touch events.
  // Stop them from reaching the page when the user is scrolling inside the chat.
  panel.addEventListener('touchmove', function (e) {
    e.stopPropagation();
  }, { passive: true });

  panel.addEventListener('wheel', function (e) {
    e.stopPropagation();
  }, { passive: true });

  // Also tell Lenis to ignore this element (if Lenis is loaded)
  panel.setAttribute('data-lenis-prevent', '');
  messagesEl.setAttribute('data-lenis-prevent', '');

  // ——— Panel open/close ———
  fab.addEventListener('click', function () {
    isOpen = true;
    panel.classList.add('open');
    fab.style.display = 'none';
    input.focus();
    // Disable page scroll (Lenis or native) while chat is open
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
    if (window._blTrack) window._blTrack('chat_open');
    if (!greeted) {
      greeted = true;
      sendToMilo(null);
    }
  });

  closeBtn.addEventListener('click', function () {
    isOpen = false;
    panel.classList.remove('open');
    fab.style.display = 'flex';
    // Re-enable page scroll
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    extractSummary();
  });

  // ——— Input handling ———
  input.addEventListener('input', function () {
    sendBtn.disabled = !input.value.trim() || isSending;
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && !isSending) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', send);

  function send() {
    var text = input.value.trim();
    if (!text || isSending) return;
    input.value = '';
    sendBtn.disabled = true;
    // After first message, swap to standard placeholder
    input.placeholder = 'Ask Milo anything about your health...';
    addMessage('user', text);
    sendToMilo(text);
  }

  // ——— Message formatting ———
  function formatChat(text) {
    var esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var blocks = esc.split(/\n\n+/);
    return blocks.map(function (block) {
      var lines = block.split('\n');
      var isList = lines.every(function (l) { return /^\s*(\d+[\.\)]\s|[-*]\s)/.test(l) || !l.trim(); });
      if (isList && lines.filter(function (l) { return l.trim(); }).length > 1) {
        var items = lines.filter(function (l) { return l.trim(); }).map(function (l) {
          return '<li>' + l.replace(/^\s*(\d+[\.\)]|[-*])\s*/, '') + '</li>';
        }).join('');
        var isOrdered = /^\s*\d/.test(lines.find(function (l) { return l.trim(); }) || '');
        return isOrdered ? '<ol>' + items + '</ol>' : '<ul>' + items + '</ul>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
  }

  // ——— Add message to UI ———
  function addMessage(role, content) {
    var div = document.createElement('div');
    div.className = 'milo-msg ' + role;

    if (role === 'assistant') {
      var isMulti = /\[multi\]/i.test(content);
      var cleanContent = content.replace(/\[multi\]\s*/gi, '');

      var lines = cleanContent.split('\n');
      var options = [];
      var textLines = [];
      for (var i = 0; i < lines.length; i++) {
        var match = lines[i].match(/^\s*(\d+)[\.\)]\s+(.+)/);
        if (match) {
          options.push(match[2].trim());
        } else {
          textLines.push(lines[i]);
        }
      }

      var textContent = textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (textContent) div.innerHTML = formatChat(textContent);
      messagesEl.appendChild(div);

      if (options.length > 0) {
        var choicesDiv = document.createElement('div');
        choicesDiv.className = 'milo-choices';

        if (isMulti) {
          var selected = new Set();
          options.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.className = 'milo-choice';
            btn.textContent = opt;
            btn.addEventListener('click', function () {
              if (selected.has(opt)) {
                selected.delete(opt);
                btn.classList.remove('selected');
              } else {
                selected.add(opt);
                btn.classList.add('selected');
              }
              submitBtn.style.display = selected.size > 0 ? 'block' : 'none';
            });
            choicesDiv.appendChild(btn);
          });
          var submitBtn = document.createElement('button');
          submitBtn.className = 'milo-choices-submit';
          submitBtn.textContent = 'Done';
          submitBtn.addEventListener('click', function () {
            var answer = Array.from(selected).join(', ');
            messagesEl.querySelectorAll('.milo-choices').forEach(function (c) { c.remove(); });
            messagesEl.querySelectorAll('.milo-choices-submit').forEach(function (c) { c.remove(); });
            addMessage('user', answer);
            sendToMilo(answer);
          });
          choicesDiv.appendChild(submitBtn);
        } else {
          options.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.className = 'milo-choice';
            btn.textContent = opt;
            btn.addEventListener('click', function () {
              messagesEl.querySelectorAll('.milo-choices').forEach(function (c) { c.remove(); });
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
    // Keep typing indicator at the very bottom
    if (typingEl && typingEl.parentNode === messagesEl) {
      messagesEl.appendChild(typingEl);
    }
    // Scroll to bottom with a frame delay to ensure DOM has rendered
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ——— API call ———
  async function sendToMilo(userText) {
    isSending = true;
    sendBtn.disabled = true;

    if (userText) {
      messages.push({ role: 'user', content: userText });
      if (window._blTrack) window._blTrack('chat_msg', { turn: messages.filter(function (m) { return m.role === 'user'; }).length });
    }

    var apiMessages = messages.length === 0
      ? [{ role: 'user', content: 'Hi' }]
      : messages;

    typingEl.classList.add('visible');
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    try {
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      typingEl.classList.remove('visible');

      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        addMessage('system', err.error || 'something went wrong');
        isSending = false;
        return;
      }

      var data = await res.json();
      if (data.reply) {
        messages.push({ role: 'assistant', content: data.reply });
        addMessage('assistant', data.reply);
      }
    } catch (e) {
      typingEl.classList.remove('visible');
      addMessage('system', 'connection error. try again.');
    }

    isSending = false;
    sendBtn.disabled = !input.value.trim();
  }

  // ——— Summary extraction ———
  async function extractSummary() {
    if (summarized || messages.length < 3) return;
    summarized = true;

    try {
      var res = await fetch(SUMMARY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages }),
      });
      if (!res.ok) return;
      var data = await res.json();
      if (data.summary) {
        var contextField = document.getElementById('demo-context');
        if (contextField) contextField.value = JSON.stringify(data.summary);
      }
    } catch (e) { /* silent fail */ }
  }

  // Extract when form fields get focus
  document.querySelectorAll('#coach-form input').forEach(function (field) {
    field.addEventListener('focus', extractSummary, { once: true });
  });
})();
