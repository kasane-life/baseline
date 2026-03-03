// lab-import.js — Drag-drop, PDF extraction, file handling

import { parseLabResults, detectPanelType, FIELD_LABELS, FIELD_TO_INPUT } from './lab-parser.js';
import { addParsedLabValues, addPendingImport, getParsedLabValues, getPendingImports } from './form.js';
import { createLogger } from './logger.js';
const log = createLogger('lab-import');

export function initLabDrop() {
  const zone = document.getElementById('lab-drop');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleLabFiles(e.dataTransfer.files);
  });
}

export function handleLabFileInput(e) {
  handleLabFiles(e.target.files);
}

export async function handleLabFiles(fileList) {
  const listEl = document.getElementById('lab-file-list');
  const summaryEl = document.getElementById('lab-import-summary');

  for (const file of fileList) {
    const fileItem = document.createElement('div');
    fileItem.className = 'lab-file-item';
    fileItem.innerHTML = `<span class="file-name">${file.name}</span><span class="file-status">processing...</span>`;
    listEl.appendChild(fileItem);

    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPDFText(file);
      } else {
        text = await file.text();
      }

      const results = parseLabResults(text);
      const count = Object.keys(results).length;

      if (count > 0) {
        let drawDate = null;
        const dateMatch = text.match(/(?:collected|collection|drawn|date|specimen)\s*(?:date)?[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
        if (dateMatch) {
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
          drawDate = `${year}-${month}-${day}`;
        }

        const observations = [];
        for (const [field, value] of Object.entries(results)) {
          observations.push({ metric: field, value, date: drawDate, source: 'lab_pdf', unit: null });
        }

        addPendingImport({
          meta: { source_type: 'lab_pdf', filename: file.name, draw_date: drawDate, fasting: null },
          observations,
        });

        addParsedLabValues(results);

        fileItem.innerHTML = `<span class="file-name">${file.name}</span>
          <span class="file-status success">${count} biomarkers</span>
          ${drawDate ? `<span class="file-date">${drawDate}</span>` : ''}`;

        log.info('imported lab file', { file: file.name, count, drawDate });
      } else {
        const panel = detectPanelType(text);
        if (panel) {
          fileItem.innerHTML = `<span class="file-name">${file.name}</span>
            <span class="file-status warn">looks like a ${panel.label}</span>
            <span class="file-hint">${panel.hint}</span>`;
        } else {
          fileItem.innerHTML = `<span class="file-name">${file.name}</span>
            <span class="file-status warn">no biomarkers found</span>`;
        }
        log.warn('no biomarkers in file', { file: file.name, detectedPanel: panel?.type });
      }
    } catch (err) {
      log.error('error processing lab file', { file: file.name, error: err.message });
      fileItem.innerHTML = `<span class="file-name">${file.name}</span>
        <span class="file-status error">error: ${err.message}</span>`;
    }
  }

  const parsedLabValues = getParsedLabValues();
  const totalMetrics = Object.keys(parsedLabValues).length;
  const totalFiles = getPendingImports().length;
  if (totalMetrics > 0) {
    summaryEl.innerHTML = `<span class="count">${totalMetrics} biomarkers</span> extracted from ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`;
    summaryEl.classList.add('active');

    for (const [field, value] of Object.entries(parsedLabValues)) {
      const inputId = FIELD_TO_INPUT[field];
      if (inputId) {
        const el = document.getElementById(inputId);
        if (el) el.value = value;
      }
    }
  }
}

// ── PDF text extraction (pdf.js from CDN) ──
let pdfjsLib = null;
async function loadPDFJS() {
  if (pdfjsLib) return;
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  pdfjsLib = pdfjs;
}

async function extractPDFText(file) {
  await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ── Paste-to-parse ──
export function parseLabText() {
  const text = document.getElementById('lab-paste').value;
  if (!text.trim()) return;

  const results = parseLabResults(text);
  addParsedLabValues(results);
  const count = Object.keys(results).length;

  // Try to auto-extract draw date
  const dateEl = document.getElementById('f-lab-date');
  if (dateEl && !dateEl.value) {
    const dateMatch = text.match(/(?:collected|collection|drawn|date|specimen)\s*(?:date)?[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
      dateEl.value = `${year}-${month}`;
    }
  }

  const summaryEl = document.getElementById('parse-summary');
  const valuesEl = document.getElementById('parsed-values');
  const containerEl = document.getElementById('parse-results');

  if (count === 0) {
    const panel = detectPanelType(text);
    if (panel) {
      summaryEl.innerHTML = `This looks like a <strong>${panel.label}</strong>. ${panel.hint}`;
    } else {
      summaryEl.innerHTML = 'No biomarkers found. Try pasting more text, or use the manual fields below.';
    }
    summaryEl.style.background = 'var(--red-dim)';
    summaryEl.style.borderColor = 'rgba(200, 60, 60, 0.2)';
    valuesEl.innerHTML = '';
    containerEl.classList.add('active');
    return;
  }

  summaryEl.innerHTML = `<span class="count">${count} biomarker${count > 1 ? 's' : ''}</span> extracted from your text`;
  summaryEl.style.background = '';
  summaryEl.style.borderColor = '';

  let chips = '';
  for (const [field, value] of Object.entries(results)) {
    const label = FIELD_LABELS[field] || field;
    chips += `<div class="parsed-chip"><span class="name">${label}</span><span class="val">${value}</span></div>`;
  }
  valuesEl.innerHTML = chips;
  containerEl.classList.add('active');

  // Auto-fill manual fields
  for (const [field, value] of Object.entries(results)) {
    const inputId = FIELD_TO_INPUT[field];
    if (inputId) {
      const el = document.getElementById(inputId);
      if (el) el.value = value;
    }
  }
}

export function togglePasteLabs() {
  const el = document.getElementById('paste-labs');
  el.classList.toggle('open');
  const btn = document.getElementById('paste-toggle');
  if (el.classList.contains('open')) {
    btn.textContent = 'Hide paste area \u2191';
  } else {
    btn.textContent = 'Paste lab text \u2193';
  }
}

export function showRetainedLabSummary() {
  const labIds = ['f-ldl','f-hdl','f-trig','f-glucose','f-hba1c','f-insulin','f-lpa','f-hscrp','f-alt','f-ggt','f-hemoglobin','f-wbc','f-platelets','f-tsh','f-vitd','f-ferritin','f-apob'];
  let count = 0;
  for (const id of labIds) {
    if (document.getElementById(id)?.value) count++;
  }
  if (count === 0) return;
  const summaryEl = document.getElementById('lab-import-summary');
  if (!summaryEl || summaryEl.textContent.trim()) return; // don't overwrite fresh import summary
  summaryEl.innerHTML = `<span class="count">\u2713 ${count} biomarker${count !== 1 ? 's' : ''}</span> from previous session`;
  summaryEl.classList.add('active');
}

export function toggleManualLabs() {
  const el = document.getElementById('manual-labs');
  el.classList.toggle('open');
  const btn = el.previousElementSibling;
  if (el.classList.contains('open')) {
    btn.textContent = 'Hide individual fields \u2191';
  } else {
    btn.textContent = 'Show individual fields \u2193';
  }
}
