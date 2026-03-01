// voice.js — Voice parser: transcript → structured data
// Single source of truth for parseVoiceIntake — used by:
//   - src/intake.js (browser voice flow)
//   - voice.test.js (Node.js tests)

// Plausible blood-level ranges — filters out supplement doses, phone numbers, etc.
export const LAB_RANGE_GUARDS = {
  apob: [20, 300],
  ldl_c: [20, 400],
  hdl_c: [10, 150],
  triglycerides: [20, 1000],
  total_cholesterol: [50, 500],
  fasting_glucose: [30, 500],
  hba1c: [3, 15],
  fasting_insulin: [0.5, 100],
  lpa: [1, 500],
  hscrp: [0.01, 50],
  tsh: [0.01, 20],
  vitamin_d: [4, 150],    // ng/mL — not 5000 IU supplement dose
  ferritin: [1, 1000],
  alt: [3, 300],
  ast: [3, 300],
  ggt: [3, 500],
  hemoglobin: [5, 22],
  wbc: [1, 30],
  platelets: [50, 600],
  creatinine: [0.1, 15],
};

// ── Voice parser: transcript → structured data ──
export function parseVoiceIntake(text) {
  const result = {};
  const lower = text.toLowerCase();

  // ── Step 1: Extract medication zone to exclude from lab parsing ──
  const medsPatterns = [
    /(?:i\s+take|i'm\s+taking|i\s+am\s+taking|i'm\s+on|taking)\s+(.*?)(?=\.\s|my\s+(?:ldl|hdl|apo|a1c|blood|cholesterol|glucose|triglyceride|hemoglobin|creatinine)|blood\s*pressure|waist|weighs|family|$)/gi,
    /(?:medications?|supplements?|meds)\s*(?:are|include|:)?\s+(.*?)(?=\.\s|my\s|blood\s*pressure|waist|weighs|family|$)/gi,
  ];

  let medicationZones = [];
  for (const pat of medsPatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const medsText = m[1].trim();
      if (medsText.length > 2) {
        medicationZones.push({ start: m.index, end: m.index + m[0].length, text: medsText });
        result.medicationText = medsText;
        result.hasMedications = true;
      }
    }
  }

  // Fallback: detect known supplement/drug names even without a prefix
  if (!result.hasMedications) {
    const knownMeds = /\b(?:vitamin\s*[a-d]\d?|fish\s*oil|omega\s*3|creatine|aspirin|baby\s*aspirin|metformin|statins?|atorvastatin|rosuvastatin|lisinopril|losartan|amlodipine|finasteride|minoxidil|levothyroxine|synthroid|magnesium|zinc|iron|melatonin|ashwagandha|berberine|coq10|probiotics?|multivitamin|whey|protein)\b/gi;
    const medNameMatches = lower.match(knownMeds);
    if (medNameMatches && medNameMatches.length > 0) {
      result.hasMedications = true;
      result.medicationText = medNameMatches.join(', ');
    }
  }

  // Build text with medication zones masked out for lab parsing
  let labSafeText = text;
  medicationZones.sort((a, b) => b.start - a.start);
  for (const zone of medicationZones) {
    labSafeText = labSafeText.substring(0, zone.start) + ' '.repeat(zone.end - zone.start) + labSafeText.substring(zone.end);
  }

  // ── Step 2: Demographics ──
  // Age: "I'm 35" / "35 years old" / "age 35" / bare "35" near start
  const ageMatch = lower.match(/(?:i'm|i am|age|aged)\s+(?:is\s+)?(\d{2})\b/) ||
    lower.match(/\b(\d{2})\s*(?:years?\s*old|year\s*old|yo)\b/) ||
    lower.match(/^.?(\d{2})\b/);  // bare 2-digit at start (allow leading garble char)
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 18 && age <= 100) result.age = age;
  }

  // Sex: check female first to avoid false match ("female" contains "male")
  if (/\b(female|woman)\b/.test(lower)) result.sex = 'F';
  else if (/\b(male|man|guy)\b/.test(lower)) result.sex = 'M';

  // Height: "5 foot 10" / "5'10" / "5 feet 10" / "510" (three-digit shorthand)
  let htMatch = lower.match(/(\d)\s*(?:foot|feet|ft|')\s*(\d{1,2})/);
  if (!htMatch) {
    // Try 3-digit shorthand: "510" = 5'10, "511" = 5'11, "60" = 6'0
    htMatch = lower.match(/\b([4-7])(\d{1,2})\b/);
    if (htMatch) {
      const ft = parseInt(htMatch[1]);
      const inches = parseInt(htMatch[2]);
      // Only accept if it looks like height (inches 0-11) and not another number
      if (inches > 11 || ft < 4 || ft > 7) htMatch = null;
    }
  }
  if (htMatch) {
    const ft = parseInt(htMatch[1]);
    const inches = parseInt(htMatch[2]);
    if (ft >= 4 && ft <= 7 && inches >= 0 && inches <= 11) {
      result.heightFt = ft;
      result.heightIn = inches;
    }
  }

  // Weight: "195 pounds" / "weigh 195" / bare 3-digit number (100-350 range, heuristic)
  let wtMatch = lower.match(/(?:weigh|weight|weighing)\s+(\d{2,3})|(\d{2,3})\s*(?:pounds|lbs|lb)\b/);
  if (!wtMatch) {
    // Bare 3-digit number in plausible weight range, not already matched as height
    const bareNums = [...lower.matchAll(/\b(\d{3})\b/g)];
    for (const m of bareNums) {
      const n = parseInt(m[1]);
      // Skip if this number was already captured as height shorthand
      if (result.heightFt && m[0] === `${result.heightFt}${result.heightIn}`) continue;
      if (n >= 100 && n <= 350) {
        wtMatch = m;
        break;
      }
    }
  }
  if (wtMatch) {
    const w = parseInt(wtMatch[1] || wtMatch[2] || wtMatch[0]);
    if (w >= 60 && w <= 600) result.weight = w;
  }

  // ── Step 3: Vitals ──
  // Blood pressure: "110 over 75" / "110/75" / "blood pressure 110 75"
  const bpPatterns = [
    /(\d{2,3})\s*(?:over|\/|\\)\s*(\d{2,3})/,
    /(?:blood\s*pressure|bp)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\s+(\d{2,3})/,
    /(?:blood\s*pressure|bp)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\s*(?:over|\/|\\)\s*(\d{2,3})/,
  ];
  for (const pat of bpPatterns) {
    const bpMatch = lower.match(pat);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1]);
      const dia = parseInt(bpMatch[2]);
      if (sys >= 70 && sys <= 220 && dia >= 40 && dia <= 130 && sys > dia) {
        result.systolic = sys;
        result.diastolic = dia;
        break;
      }
    }
  }

  // Waist: "waist is 34" / "34 inch waist" / "weighs this 36" / "waste is 36"
  const waistMatch = lower.match(/(?:waist|waste|waiste|weighs?\s*(?:this|the|dis))\s*(?:is|of|at|measures?|about|around|like)?\s*(?:about|around|like)?\s*(\d{2,3}(?:\.\d)?)/)
    || lower.match(/(\d{2,3}(?:\.\d)?)\s*(?:inch(?:es)?)\s*(?:waist|waste|at\s*(?:the\s*)?navel)/)
    || lower.match(/\b(3[0-9]|4[0-9]|5[0-9])\s*(?:inches|inch)\b/)
    || (/\b(?:waist|waste)\b/.test(lower) && lower.match(/\b(3[0-9]|4[0-9]|5[0-9])\b/));
  if (waistMatch) {
    const w = parseFloat(waistMatch[1] || waistMatch[2]);
    if (w >= 20 && w <= 70) result.waist = w;
  }

  // ── Step 3b: Medications — handle negations
  const medsNeg = /\b(?:no\s+(?:medications?|meds|supplements?)|(?:don'?t|do\s*not)\s+take\s+(?:any|anything)|not\s+(?:on|taking)\s+(?:any|anything)|(?:medications?|meds)\s*[,:]?\s*(?:none|no|nothing|don'?t|I\s+don'?t))\b/.test(lower);
  if (medsNeg && !result.hasMedications) {
    result.hasMedications = false;
    result.medicationText = '';
  }

  // ── Step 3b2: Blood pressure — handle negation
  const bpNeg = /\b(?:no\s+(?:blood\s*pressure|bp)|(?:don'?t|do\s*not)\s+(?:have|know)\s+(?:my\s+)?(?:blood\s*pressure|bp)|(?:blood\s*pressure|bp)\s*[,:]?\s*(?:none|no|nothing|don'?t|skip|unknown))\b/.test(lower);
  if (bpNeg && !result.systolic) {
    result.noBp = true;
  }

  // ── Step 3c: Labs — handle negations and positive mentions
  const labsNeg = /\b(?:no\s+(?:labs?|blood\s*work|blood\s*tests?)|(?:don'?t|do\s*not)\s+have\s+(?:any\s+)?(?:labs?|blood\s*work)|haven'?t\s+(?:had|done|gotten)\s+(?:labs?|blood\s*work))\b/.test(lower);
  if (labsNeg) {
    result.noLabs = true;
  }

  const labsPos = /\b(?:(?:i\s+)?(?:do\s+)?have\s+(?:my\s+)?(?:labs?|lab\s*results?|blood\s*work|blood\s*tests?)|got\s+(?:my\s+)?(?:labs?|lab\s*results?|blood\s*work)|(?:labs?|lab\s*results?|blood\s*work)\s+(?:ready|available|done|back|here))\b/.test(lower);
  if (labsPos && !labsNeg) {
    result.hasLabs = true;
  }

  // ── Step 4: Family history ──
  // Must require "family" context — avoid misfiring on bare "heart", "disease", etc.
  const famNeg = /\b(?:no\s+family\s*history|family\s*history\s*[,:]?\s*(?:none|no|nothing|negative)|nothing\s+runs\s+in\s+(?:my|the)\s+family|no\s+history\s+of\s+(?:cardiac|heart|cancer|diabetes))\b/.test(lower);
  const famRelatives = /\b(?:dad|father|mom|mother|parent|brother|sister|uncle|aunt|grandfather|grandmother|grandpa|grandma)\b/.test(lower);
  // "family history of <condition>" — explicit phrase
  const famExplicit = /\bfamily\s*history\s+(?:of\s+)?(?:cardiac|heart|cancer|diabetes|stroke|disease|risk|issues?|problems?)\b/.test(lower);
  // Relative + medical event — "father had a heart attack", "mom diagnosed with diabetes"
  const famRelativeCondition = famRelatives && /\b(?:had\s+(?:a\s+)?(?:heart\s*attack|stroke|cancer|diabetes)|died\s+(?:of|from)|diagnosed\s+with|passed\s+(?:from|away))\b/.test(lower);

  if (famNeg) {
    result.familyHistory = false;
  } else if (famExplicit || famRelativeCondition) {
    result.familyHistory = true;
  }

  // ── Step 5: Lab values — parse from medication-masked text ──
  // Uses voice-specific regex patterns that handle verbal connectors ("LDL is 128")
  const labResults = _parseLabValues(labSafeText);
  const guardedLabs = {};
  for (const [field, value] of Object.entries(labResults)) {
    const range = LAB_RANGE_GUARDS[field];
    if (range && (value < range[0] || value > range[1])) continue;
    guardedLabs[field] = value;
  }
  if (Object.keys(guardedLabs).length > 0) {
    result.labs = guardedLabs;
  }

  return result;
}

// Voice-specific lab value extraction — handles natural speech patterns
// ("my LDL is 128", "A1C 5.4", "ApoB of 95")
// Distinct from parseLabResults in lab-parser.js which does line-based alias matching
// for structured text (pasted lab reports, PDFs)
function _parseLabValues(text) {
  const lower = text.toLowerCase();
  const results = {};

  const labPatterns = [
    { key: 'ldl_c', pattern: /\b(?:ldl|ldl.c)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\b/i },
    { key: 'hdl_c', pattern: /\b(?:hdl|hdl.c)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\b/i },
    { key: 'triglycerides', pattern: /\btriglycerides?\s*(?:is|was|of|at|are|:)?\s*(\d{2,4})\b/i },
    { key: 'apob', pattern: /\b(?:apob|apo\s*b|apolipoprotein\s*b)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\b/i },
    { key: 'fasting_glucose', pattern: /\b(?:glucose|fasting\s*glucose|blood\s*sugar)\s*(?:is|was|of|at|:)?\s*(\d{2,3})\b/i },
    { key: 'hba1c', pattern: /\b(?:a1c|hba1c|hemoglobin\s*a1c)\s*(?:is|was|of|at|:)?\s*(\d+\.?\d*)\b/i },
    { key: 'fasting_insulin', pattern: /\b(?:insulin|fasting\s*insulin)\s*(?:is|was|of|at|:)?\s*(\d+\.?\d*)\b/i },
    { key: 'hscrp', pattern: /\b(?:(?:hs.?)?crp|c.reactive)\s*(?:is|was|of|at|:)?\s*(\d+\.?\d*)\b/i },
    { key: 'vitamin_d', pattern: /\bvitamin\s*d\s*(?:level)?\s*(?:is|was|of|at|:)?\s*(\d{1,3})\b/i },
    { key: 'tsh', pattern: /\btsh\s*(?:is|was|of|at|:)?\s*(\d+\.?\d*)\b/i },
    { key: 'lpa', pattern: /\b(?:lp\s*\(?a\)?|lipoprotein\s*a)\s*(?:is|was|of|at|:)?\s*(\d{1,3})\b/i },
  ];

  for (const { key, pattern } of labPatterns) {
    const match = lower.match(pattern);
    if (match) {
      results[key] = parseFloat(match[1]);
    }
  }

  return results;
}
