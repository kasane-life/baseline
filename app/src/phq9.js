// phq9.js — PHQ-9 validated depression screening instrument
// Supports both direct score entry (0-27) and full 9-question questionnaire

import { createLogger } from './logger.js';
const log = createLogger('phq9');

const QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself',
];

const OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

export function severityLabel(score) {
  if (score == null) return null;
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Mild';
  if (score <= 14) return 'Moderate';
  if (score <= 19) return 'Moderately severe';
  return 'Severe';
}

// ── State ──
let _directScore = null;
let _questionnaireAnswers = new Array(9).fill(null);

export function getPhq9Score() {
  // Direct entry takes priority if set
  if (_directScore != null) return _directScore;

  // Check if questionnaire is complete
  if (_questionnaireAnswers.every(a => a != null)) {
    return _questionnaireAnswers.reduce((s, v) => s + v, 0);
  }

  return null;
}

export function setPhq9Score(n) {
  if (n != null && (n < 0 || n > 27)) return;
  _directScore = n;
  log.info('PHQ-9 direct score set', { score: n });
}

export function resetPhq9() {
  _directScore = null;
  _questionnaireAnswers = new Array(9).fill(null);
}

// ── Init: wire up expand/collapse, radios, direct entry ──
export function initPhq9() {
  const container = document.getElementById('phq9-section');
  if (!container) return;

  // Direct entry input
  const directInput = document.getElementById('phq9-direct-input');
  if (directInput) {
    directInput.addEventListener('input', () => {
      const v = parseInt(directInput.value);
      if (!isNaN(v) && v >= 0 && v <= 27) {
        setPhq9Score(v);
        updateScoreDisplay();
      } else if (directInput.value === '') {
        _directScore = null;
        updateScoreDisplay();
      }
    });
  }

  // Expand/collapse questionnaire
  const expandBtn = document.getElementById('phq9-expand-btn');
  const questionnaire = document.getElementById('phq9-questionnaire');
  if (expandBtn && questionnaire) {
    expandBtn.addEventListener('click', () => {
      const isOpen = questionnaire.classList.contains('open');
      questionnaire.classList.toggle('open');
      expandBtn.textContent = isOpen ? 'Take the 2-minute screening \u2192' : 'Close screening';
    });
  }

  // Wire radio buttons
  container.querySelectorAll('.phq9-radio').forEach(radio => {
    radio.addEventListener('click', () => {
      const qi = parseInt(radio.dataset.question);
      const val = parseInt(radio.dataset.value);
      _questionnaireAnswers[qi] = val;

      // Update visual state
      container.querySelectorAll(`.phq9-radio[data-question="${qi}"]`).forEach(r => {
        r.classList.toggle('selected', parseInt(r.dataset.value) === val);
      });

      // Clear direct entry if user is taking the questionnaire
      _directScore = null;
      const di = document.getElementById('phq9-direct-input');
      if (di) di.value = '';

      updateScoreDisplay();
      log.info('PHQ-9 question answered', { question: qi + 1, value: val });
    });
  });
}

function updateScoreDisplay() {
  const score = getPhq9Score();
  const display = document.getElementById('phq9-score-display');
  if (!display) return;

  if (score != null) {
    const label = severityLabel(score);
    display.innerHTML = `<span class="phq9-score-num">${score}</span><span class="phq9-score-label">${label}</span>`;
    display.classList.add('active');
  } else {
    const answered = _questionnaireAnswers.filter(a => a != null).length;
    if (answered > 0) {
      display.innerHTML = `<span class="phq9-score-label">${answered} of 9 answered</span>`;
      display.classList.add('active');
    } else {
      display.classList.remove('active');
    }
  }
}

// Export for HTML generation (used by index.html inline or render)
export { QUESTIONS, OPTIONS };
