// voice.test.js — Tests for voice parser
// Run: node voice.test.js

import { parseVoiceIntake } from './voice.js';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── Demographics ──

test('age: "I\'m 35"', () => {
  assertEquals(parseVoiceIntake("I'm 35 male").age, 35);
});

test('age: bare "35" at start', () => {
  assertEquals(parseVoiceIntake("35 male 510 195").age, 35);
});

test('age: "h35" garble (leading non-digit)', () => {
  assertEquals(parseVoiceIntake("h35 male 510 195").age, 35);
});

test('age: "age is 35"', () => {
  assertEquals(parseVoiceIntake("age is 35 male").age, 35);
});

test('sex: "male"', () => {
  assertEquals(parseVoiceIntake("35 male").sex, 'M');
});

test('sex: "female"', () => {
  assertEquals(parseVoiceIntake("28 female").sex, 'F');
});

test('height: "5\'10"', () => {
  const r = parseVoiceIntake("5'10 195 lbs");
  assertEquals(r.heightFt, 5);
  assertEquals(r.heightIn, 10);
});

test('height: "510" shorthand', () => {
  const r = parseVoiceIntake("35 male 510 195");
  assertEquals(r.heightFt, 5);
  assertEquals(r.heightIn, 10);
});

test('weight: "195 lbs"', () => {
  assertEquals(parseVoiceIntake("195 lbs").weight, 195);
});

test('weight: "weigh 195"', () => {
  assertEquals(parseVoiceIntake("I weigh 195").weight, 195);
});

// ── Vitals ──

test('BP: "110 over 70"', () => {
  const r = parseVoiceIntake("blood pressure 110 over 70");
  assertEquals(r.systolic, 110);
  assertEquals(r.diastolic, 70);
});

test('BP: "blood pressure 110 70" (no over)', () => {
  const r = parseVoiceIntake("blood pressure 110 70");
  assertEquals(r.systolic, 110);
  assertEquals(r.diastolic, 70);
});

test('BP: "110/75"', () => {
  const r = parseVoiceIntake("bp is 110/75");
  assertEquals(r.systolic, 110);
  assertEquals(r.diastolic, 75);
});

// ── Waist (homophones) ──

test('waist: "waist is 36"', () => {
  assertEquals(parseVoiceIntake("waist is 36").waist, 36);
});

test('waist: "waste is 36" (speech garble)', () => {
  assertEquals(parseVoiceIntake("waste is 36").waist, 36);
});

test('waist: "weighs this 36" (speech garble)', () => {
  assertEquals(parseVoiceIntake("weighs this 36").waist, 36);
});

test('waist: "waste 36 dollars" (speech garble with waist keyword nearby)', () => {
  assertEquals(parseVoiceIntake("my waste 36 dollars").waist, 36);
});

test('waist: "waist" + bare number in transcript', () => {
  assertEquals(parseVoiceIntake("I'm 35 male 5'10 195 lbs waist is about 34").waist, 34);
});

// ── Medications ──

test('meds: "I take vitamin D and creatine"', () => {
  const r = parseVoiceIntake("I take vitamin D and creatine");
  assertEquals(r.hasMedications, true);
  assert(r.medicationText.length > 0, 'should have medication text');
});

test('meds: "taking vitamin D creatine and baby aspirin" (no I\'m)', () => {
  const r = parseVoiceIntake("taking vitamin D creatine and baby aspirin");
  assertEquals(r.hasMedications, true);
});

test('meds: "medications finasteride and minoxidil"', () => {
  const r = parseVoiceIntake("medications finasteride and minoxidil");
  assertEquals(r.hasMedications, true);
});

test('meds: bare supplement names without prefix', () => {
  const r = parseVoiceIntake("35 male vitamin D creatine baby aspirin");
  assertEquals(r.hasMedications, true);
});

test('meds: "no medications"', () => {
  const r = parseVoiceIntake("no medications");
  assertEquals(r.hasMedications, false);
});

test('meds: "don\'t take any"', () => {
  const r = parseVoiceIntake("I don't take any medications");
  assertEquals(r.hasMedications, false);
});

// ── Labs ──

test('labs: "no labs"', () => {
  assertEquals(parseVoiceIntake("no labs").noLabs, true);
});

test('labs: "no blood work"', () => {
  assertEquals(parseVoiceIntake("no blood work").noLabs, true);
});

test('labs: "my LDL is 128"', () => {
  assertEquals(parseVoiceIntake("my LDL is 128").labs.ldl_c, 128);
});

test('labs: "A1C 5.4"', () => {
  assertEquals(parseVoiceIntake("my A1C is 5.4").labs.hba1c, 5.4);
});

test('labs: "do have lab results" (positive mention)', () => {
  assertEquals(parseVoiceIntake("do have lab results").hasLabs, true);
});

test('labs: "I have my blood work"', () => {
  assertEquals(parseVoiceIntake("I have my blood work").hasLabs, true);
});

test('labs: "got my labs back"', () => {
  assertEquals(parseVoiceIntake("got my labs back").hasLabs, true);
});

// ── Blood pressure negation ──

test('bp: "no blood pressure"', () => {
  assertEquals(parseVoiceIntake("no blood pressure").noBp, true);
});

test('bp: "don\'t have my blood pressure"', () => {
  assertEquals(parseVoiceIntake("don't have my blood pressure").noBp, true);
});

test('bp: "110 over 70" should NOT set noBp', () => {
  const r = parseVoiceIntake("blood pressure 110 over 70");
  assertEquals(r.systolic, 110);
  assertEquals(r.noBp, undefined);
});

// ── Family history ──

test('family: "family history of cardiac disease"', () => {
  assertEquals(parseVoiceIntake("family history of cardiac disease").familyHistory, true);
});

test('family: "family history of cardiac issues"', () => {
  assertEquals(parseVoiceIntake("family history of cardiac issues").familyHistory, true);
});

test('family: "father had a heart attack"', () => {
  assertEquals(parseVoiceIntake("father had a heart attack").familyHistory, true);
});

test('family: "no family history"', () => {
  assertEquals(parseVoiceIntake("no family history").familyHistory, false);
});

test('family: "lab history" should NOT trigger family history', () => {
  const r = parseVoiceIntake("no lab history blood pressure 110 over 70 heart rate is fine");
  assert(r.familyHistory == null, 'should not detect family history from "lab history" + "heart"');
});

// ── Full transcripts (real speech-to-text outputs) ──

test('full: transcript 1 (KV log)', () => {
  const r = parseVoiceIntake("35 male 510 195 no lab blood pressure 110 over 70 waist is 36 in medications finasteride and minoxidil dosages not quite sure thing creatine vitamin D and baby aspirin family history of cardiac risk for sure a heart attack I'm part of my uncle and then I forget the Tactical term but something for my grandfather");
  assertEquals(r.age, 35);
  assertEquals(r.sex, 'M');
  assertEquals(r.systolic, 110);
  assertEquals(r.waist, 36);
  assertEquals(r.hasMedications, true);
  assertEquals(r.familyHistory, true);
});

test('full: transcript 2 — "waste" garble', () => {
  const r = parseVoiceIntake("35 male 510 190 no lab results blood pressure 110 over 70 waste is 36 in medication taking finasteride and vitamin d for supplements family history of cardiac issues");
  assertEquals(r.age, 35);
  assertEquals(r.sex, 'M');
  assertEquals(r.systolic, 110);
  assertEquals(r.waist, 36);
  assertEquals(r.hasMedications, true);
  assertEquals(r.familyHistory, true);
});

test('full: transcript 3 — "weighs this" garble', () => {
  const r = parseVoiceIntake("35 male 510 195 no lab results blood pressure 110 over 70 weighs this 36 taking vitamin D creatine and baby aspirin and family history of cardiac disease as well");
  assertEquals(r.waist, 36);
  assertEquals(r.hasMedications, true);
  assertEquals(r.familyHistory, true);
});

// ── Run all tests ──
console.log(`\nRunning ${tests.length} voice parser tests...\n`);

for (const t of tests) {
  try {
    t.fn();
    passed++;
    console.log(`  ✓ ${t.name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${t.name}`);
    console.log(`    ${e.message}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total\n`);
process.exit(failed > 0 ? 1 : 0);
