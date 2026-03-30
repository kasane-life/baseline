/**
 * Milo Demo Chat Widget — standalone JS
 *
 * Usage:
 *   <link rel="stylesheet" href="milo-chat.css">
 *   <script src="milo-chat.js"></script>
 *
 * Single action button: mic when empty, send when there's text.
 * Config: set window.MILO_CHAT_API before loading to override the API URL.
 */

(function () {
  'use strict';

  var API_URL = window.MILO_CHAT_API || 'https://api.mybaseline.health/demo-chat';
  var SUMMARY_URL = window.MILO_SUMMARY_API || 'https://api.mybaseline.health/demo-summary';

  // ——— Inject HTML ———
  var widgetHTML =
    '<button id="milo-fab" aria-label="Chat with Milo">' +
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' +
    '</button>' +
    '<div id="milo-panel">' +
      '<div id="milo-header">' +
        '<div><div class="milo-title">Milo</div><div class="milo-label">demo</div></div>' +
        '<button id="milo-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div id="milo-messages">' +
        '<div class="milo-msg system">this is a demo. your data isn\'t saved.</div>' +
        '<div class="milo-typing" id="milo-typing"><span></span><span></span><span></span></div>' +
      '</div>' +
      '<div id="milo-input-wrap">' +
        '<input type="text" id="milo-input" placeholder="Tap the mic or type here..." autocomplete="off" enterkeyhint="send">' +
        '<button id="milo-action" aria-label="Voice input">' +
          '<svg id="milo-icon-mic" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>' +
          '<svg id="milo-icon-send" viewBox="0 0 24 24" style="display:none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  var c = document.createElement('div');
  c.innerHTML = widgetHTML;
  while (c.firstChild) document.body.appendChild(c.firstChild);

  // ——— Elements ———
  var fab = document.getElementById('milo-fab');
  var panel = document.getElementById('milo-panel');
  var closeBtn = document.getElementById('milo-close');
  var input = document.getElementById('milo-input');
  var actionBtn = document.getElementById('milo-action');
  var iconMic = document.getElementById('milo-icon-mic');
  var iconSend = document.getElementById('milo-icon-send');
  var messagesEl = document.getElementById('milo-messages');
  var typingEl = document.getElementById('milo-typing');

  var messages = [];
  var isOpen = false;
  var isSending = false;
  var greeted = false;
  var summarized = false;
  var recognition = null;
  var isRecording = false;

  // ——— Action button: shows mic or send based on state ———
  function updateAction() {
    var hasText = input.value.trim().length > 0;
    if (hasText && !isRecording) {
      iconMic.style.display = 'none';
      iconSend.style.display = 'block';
      actionBtn.classList.remove('recording');
    } else {
      iconMic.style.display = 'block';
      iconSend.style.display = 'none';
      actionBtn.classList.toggle('recording', isRecording);
    }
  }

  // ——— Speech Recognition ———
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (e) {
      var t = e.results[0][0].transcript.trim();
      if (t) input.value = t;
    };

    recognition.onend = function () {
      isRecording = false;
      input.classList.remove('recording');
      if (input.value.trim()) {
        input.classList.add('reviewing');
        input.placeholder = 'Press enter to send, or tap mic for more...';
        input.focus();
      } else {
        input.placeholder = 'Tap the mic or type here...';
      }
      updateAction();
    };

    recognition.onerror = function () {
      isRecording = false;
      input.classList.remove('recording');
      input.placeholder = 'Tap the mic or type here...';
      updateAction();
    };
  }

  // ——— Single action button click ———
  actionBtn.addEventListener('click', function () {
    var hasText = input.value.trim().length > 0;

    if (hasText && !isRecording) {
      // Has text: send it
      send();
    } else if (isRecording) {
      // Recording: stop, let onend handle state
      recognition.stop();
    } else if (recognition) {
      // No text, not recording: start recording
      isRecording = true;
      input.classList.add('recording');
      input.classList.remove('reviewing');
      input.value = '';
      input.placeholder = 'Listening... tap when done';
      updateAction();
      try { recognition.start(); } catch (e) {
        isRecording = false;
        input.classList.remove('recording');
        input.placeholder = 'Tap the mic or type here...';
        updateAction();
      }
    }
  });

  // ——— Scroll isolation ———
  panel.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
  panel.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
  panel.setAttribute('data-lenis-prevent', '');
  messagesEl.setAttribute('data-lenis-prevent', '');

  // ——— Panel open/close ———
  fab.addEventListener('click', function () {
    isOpen = true;
    panel.classList.add('open');
    fab.style.display = 'none';
    input.focus();
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
    if (window._blTrack) window._blTrack('chat_open');
    if (!greeted) { greeted = true; sendToMilo(null); }
  });

  closeBtn.addEventListener('click', function () {
    isOpen = false;
    panel.classList.remove('open');
    fab.style.display = 'flex';
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    extractSummary();
  });

  // ——— Input events ———
  input.addEventListener('input', updateAction);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && !isSending) {
      e.preventDefault();
      send();
    }
  });

  // ——— Send ———
  function send() {
    var text = input.value.trim();
    if (!text || isSending) return;
    input.classList.remove('reviewing');
    input.value = '';
    input.placeholder = 'Ask Milo anything about your health...';
    addMessage('user', text);
    updateAction();
    sendToMilo(text);
  }

  // ——— Format chat text ———
  function formatChat(text) {
    var esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.split(/\n\n+/).map(function (block) {
      var lines = block.split('\n');
      var isList = lines.every(function (l) { return /^\s*(\d+[\.\)]\s|[-*]\s)/.test(l) || !l.trim(); });
      if (isList && lines.filter(function (l) { return l.trim(); }).length > 1) {
        var items = lines.filter(function (l) { return l.trim(); }).map(function (l) {
          return '<li>' + l.replace(/^\s*(\d+[\.\)]|[-*])\s*/, '') + '</li>';
        }).join('');
        return /^\s*\d/.test(lines.find(function (l) { return l.trim(); }) || '')
          ? '<ol>' + items + '</ol>' : '<ul>' + items + '</ul>';
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
      var clean = content.replace(/\[multi\]\s*/gi, '');
      var lines = clean.split('\n');
      var options = [], textLines = [];

      for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^\s*(\d+)[\.\)]\s+(.+)/);
        if (m) options.push(m[2].trim());
        else textLines.push(lines[i]);
      }

      var txt = textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (txt) div.innerHTML = formatChat(txt);
      messagesEl.appendChild(div);

      if (options.length > 0) {
        var cd = document.createElement('div');
        cd.className = 'milo-choices';

        if (isMulti) {
          var sel = new Set();
          options.forEach(function (opt) {
            var b = document.createElement('button');
            b.className = 'milo-choice'; b.textContent = opt;
            b.addEventListener('click', function () {
              if (sel.has(opt)) { sel.delete(opt); b.classList.remove('selected'); }
              else { sel.add(opt); b.classList.add('selected'); }
              sb.style.display = sel.size > 0 ? 'block' : 'none';
            });
            cd.appendChild(b);
          });
          var sb = document.createElement('button');
          sb.className = 'milo-choices-submit'; sb.textContent = 'Done';
          sb.addEventListener('click', function () {
            messagesEl.querySelectorAll('.milo-choices,.milo-choices-submit').forEach(function (x) { x.remove(); });
            var a = Array.from(sel).join(', ');
            addMessage('user', a); sendToMilo(a);
          });
          cd.appendChild(sb);
        } else {
          options.forEach(function (opt) {
            var b = document.createElement('button');
            b.className = 'milo-choice'; b.textContent = opt;
            b.addEventListener('click', function () {
              messagesEl.querySelectorAll('.milo-choices').forEach(function (x) { x.remove(); });
              addMessage('user', opt); sendToMilo(opt);
            });
            cd.appendChild(b);
          });
        }
        messagesEl.appendChild(cd);
      }
    } else {
      div.textContent = content;
      messagesEl.appendChild(div);
    }

    if (typingEl && typingEl.parentNode === messagesEl) messagesEl.appendChild(typingEl);
    requestAnimationFrame(function () { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  // ——— API call ———
  async function sendToMilo(userText) {
    isSending = true;
    if (userText) {
      messages.push({ role: 'user', content: userText });
      if (window._blTrack) window._blTrack('chat_msg', { turn: messages.filter(function (m) { return m.role === 'user'; }).length });
    }

    var apiMessages = messages.length === 0 ? [{ role: 'user', content: 'Hi' }] : messages;

    typingEl.classList.add('visible');
    requestAnimationFrame(function () { messagesEl.scrollTop = messagesEl.scrollHeight; });

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
        isSending = false; return;
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
    updateAction();
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
        var f = document.getElementById('demo-context');
        if (f) f.value = JSON.stringify(data.summary);
      }
    } catch (e) {}
  }

  document.querySelectorAll('#coach-form input').forEach(function (field) {
    field.addEventListener('focus', extractSummary, { once: true });
  });
})();
