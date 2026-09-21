#!/usr/bin/env node
/*
 * Offline Tesseract baseline for the synthetic held-out test split.
 * It loads only the repository's local eng.traineddata and installed
 * tesseract.js package; it makes no HTTP request and does not alter production.
 */
const fs = require("fs");
const path = require("path");
const { createWorker } = require("tesseract.js");

const ROOT = path.resolve(__dirname, "..", "..");
const TRAINING = path.join(ROOT, "ocr_training");
const TEST_MANIFEST = path.join(TRAINING, "annotations", "test.jsonl");
const OUTPUT = path.join(TRAINING, "evaluation", "baseline_results.jsonl");

const LABELS = {
  studentName: ["STUDENT NAME", "APPLICANT NAME", "NAME OF THE CANDIDATE"],
  dateOfBirth: ["DATE OF BIRTH"],
  annualIncome: ["ANNUAL INCOME"],
  community: ["COMMUNITY"],
  certificateNumber: ["CERTIFICATE NUMBER"],
  registrationNumber: ["REGISTRATION NUMBER", "REGISTER NUMBER"],
  schoolName: ["SCHOOL NAME"],
  board: ["BOARD"],
  percentage: ["PERCENTAGE"],
};

function readManifest(file) {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function normal(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean);
}
function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return rows[a.length][b.length];
}
function extractAfterLabel(text, labels) {
  const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const label of labels) {
      // OCR frequently removes the space in labels (e.g. DATEOFBIRTH), so
      // label separators are optional without accepting unrelated values.
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
      // Require a delimiter for an inline value so the certificate title
      // "COMMUNITY CERTIFICATE" is never mistaken for the COMMUNITY field.
      const match = line.match(new RegExp(`${escaped}\\s*:\\s*(.+)$`, "i"));
      if (match && match[1] && !/^[:.-]*$/.test(match[1])) return match[1].trim();
      if (new RegExp(`^${escaped}\\s*[:.-]?$`, "i").test(line)) return lines[index + 1] || null;
    }
  }
  return null;
}
function extractFields(text) {
  const extracted = {};
  for (const [field, labels] of Object.entries(LABELS)) extracted[field] = extractAfterLabel(text, labels);
  return extracted;
}
function expectedFor(record, benchmarkField) {
  if (benchmarkField === "studentName") return record.ground_truth_name;
  return record.fields[benchmarkField] || null;
}
function score(records) {
  const fields = Object.keys(LABELS);
  const fieldTotals = Object.fromEntries(fields.map(field => [field, { correct: 0, total: 0 }]));
  let nameExact = 0, nameNormalized = 0, nameTotal = 0, charEdits = 0, charTotal = 0, wordEdits = 0, wordTotal = 0;
  for (const record of records) {
    for (const field of fields) {
      const expected = expectedFor(record, field);
      if (!expected) continue;
      fieldTotals[field].total += 1;
      if (normal(record.extracted[field]) === normal(expected)) fieldTotals[field].correct += 1;
    }
    const expected = record.ground_truth_name || "";
    const actual = record.extracted.studentName || "";
    nameTotal += 1;
    if (actual.trim().toUpperCase() === expected.trim().toUpperCase()) nameExact += 1;
    if (normal(actual) === normal(expected)) nameNormalized += 1;
    charEdits += distance(actual.toUpperCase(), expected.toUpperCase()); charTotal += Math.max(expected.length, 1);
    wordEdits += distance(words(actual), words(expected)); wordTotal += Math.max(words(expected).length, 1);
  }
  const rate = part => part.total ? Number((100 * part.correct / part.total).toFixed(2)) : null;
  const results = Object.fromEntries(Object.entries(fieldTotals).map(([field, part]) => [field, rate(part)]));
  const allCorrect = Object.values(fieldTotals).reduce((sum, part) => sum + part.correct, 0);
  const allTotal = Object.values(fieldTotals).reduce((sum, part) => sum + part.total, 0);
  return { records: records.length, nameExactAccuracy: Number((100 * nameExact / Math.max(nameTotal, 1)).toFixed(2)), nameNormalizedAccuracy: Number((100 * nameNormalized / Math.max(nameTotal, 1)).toFixed(2)), characterErrorRate: Number((100 * charEdits / Math.max(charTotal, 1)).toFixed(2)), wordErrorRate: Number((100 * wordEdits / Math.max(wordTotal, 1)).toFixed(2)), fieldAccuracy: results, overallFieldAccuracy: Number((100 * allCorrect / Math.max(allTotal, 1)).toFixed(2)) };
}

async function main() {
  const manifest = readManifest(TEST_MANIFEST);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  const worker = await createWorker("eng", 1, { langPath: path.join(ROOT, "public", "tessdata"), gzip: false, cacheMethod: "none", logger: () => {} });
  const output = fs.createWriteStream(OUTPUT, { encoding: "utf8" });
  try {
    for (let index = 0; index < manifest.length; index += 1) {
      const record = manifest[index];
      const { data } = await worker.recognize(path.join(TRAINING, record.image_path));
      const extracted = extractFields(data.text || "");
      const nameRaw = extracted.studentName;
      const hasAmbiguousName = /[0-9]/.test(nameRaw || "");
      const result = { ...record, raw_ocr: data.text || "", ocr_confidence: data.confidence ?? null, extracted, nameCandidate: { raw: nameRaw, normalized: normal(nameRaw), suggested: null, confidence: data.confidence ?? null, status: !nameRaw ? "NOT_DETECTED" : hasAmbiguousName || (data.confidence ?? 0) < 75 ? "NEEDS_REVIEW" : "HIGH_CONFIDENCE", reason: hasAmbiguousName ? "OCR character ambiguity" : null, source: "local_tesseract_baseline" } };
      output.write(`${JSON.stringify(result)}\n`);
      process.stdout.write(`OCR ${index + 1}/${manifest.length}\r`);
    }
  } finally { output.end(); await worker.terminate(); }
  console.log(`\n${JSON.stringify(score(readManifest(OUTPUT)), null, 2)}`);
}
if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { readManifest, score };
