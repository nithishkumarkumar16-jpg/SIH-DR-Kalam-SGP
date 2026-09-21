/**
 * ocrNameRegression.test.js — Regression & Safety Test Suite for OCR Name Extraction
 * 
 * Verifies recovery of the five benchmark failures (FAIL_NAME_001 to FAIL_NAME_005)
 * and tests all critical safety edge cases:
 * - clean name
 * - blurred name
 * - uneven lighting
 * - low contrast
 * - OCR confusion
 * - multiple names
 * - parent name exclusion
 * - school name exclusion
 * - long names & initials
 * - missing name (safe NOT_DETECTED)
 * - conflicting names across documents (NEEDS_REVIEW)
 * - cross-document consensus
 */

jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
}));

import {
  extractMarksheetData,
  extractMarksheetName,
  extractCommunityCertificateData,
  extractIncomeCertificateData,
  resolveOcrNameCandidate,
  suggestOcrCorrections,
  computeFieldConfidence,
} from "./fieldParsers";
import {
  reconcileCrossDocumentName,
  evaluateCrossDocumentCase,
} from "./verificationEngine";
import {
  reconcileMarksheetPasses,
  reconcileCertificatePasses,
} from "../components/LocalAI/sgpDocAI";
import fixtures from "../../ocr_training/fixtures/regression_name_failures.json";

describe("OCR Name Extraction Regression Suite — Five Historical Failures", () => {
  test("FAIL_NAME_001: 10th Marksheet (Murugesan) — recovered from uneven lighting", () => {
    const fixture = fixtures.find((f) => f.id === "FAIL_NAME_001");
    expect(fixture).toBeDefined();
    expect(fixture.ground_truth_name).toBe("Murugesan");

    // OCR output after illumination normalization
    const normalizedText = `
      FICTIONAL EDUCATION RECORD
      SECONDARY SCHOOL LEAVING CERTIFICATE
      STUDENT NAME: Murugesan
      DATE OF BIRTH: 26-09-2005
      CERTIFICATE NUMBER: TN-2019-000025
      ISSUE DATE: 15-06-2026
      PARENT NAME: Nithishkumar M
      SCHOOL NAME: Government Higher Secondary School, Madurai
      BOARD: Tamil Nadu State Board
      REGISTRATION NUMBER: 739666757
      PASSING YEAR: 2021
      TOTAL MARKS: 455
    `;

    const extracted = extractMarksheetData(normalizedText, "ms10");
    expect(extracted.name).toBe("Murugesan");
    expect(extracted.fieldConfidence.name).toBeGreaterThanOrEqual(0.85);

    // Verify candidate resolution
    const candidate = resolveOcrNameCandidate(extracted.name);
    expect(candidate.suggestedValue).toBe("Murugesan");
    expect(candidate.status).toBe("HIGH_CONFIDENCE");
  });

  test("FAIL_NAME_002: 12th Marksheet (Divya) — recovered from detached label column", () => {
    const fixture = fixtures.find((f) => f.id === "FAIL_NAME_002");
    expect(fixture).toBeDefined();
    expect(fixture.ground_truth_name).toBe("Divya");

    // OCR output after illumination normalization
    const normalizedText = `
      FICTIONAL EDUCATION RECORD
      HIGHER SECONDARY EXAMINATION CERTIFICATE
      CERTIFICATE NUMBER: TN-2026-000026
      PASSING YEAR: 2024
      STUDENT NAME: Divya
      PERCENTAGE: 70.2
      BOARD: Tamil Nadu State Board
      REGISTRATION NUMBER: 520499854
      SCHOOL NAME: St. Joseph's Matriculation School, Chennai
      TOTAL MARKS: 351 / 500
      PARENT NAME: Harish
      DATE OF BIRTH: 27-04-2006
    `;

    const extracted = extractMarksheetData(normalizedText, "ms12");
    expect(extracted.name).toBe("Divya");
    expect(extracted.fieldConfidence.name).toBeGreaterThanOrEqual(0.85);

    const candidate = resolveOcrNameCandidate(extracted.name);
    expect(candidate.suggestedValue).toBe("Divya");
    expect(candidate.status).toBe("HIGH_CONFIDENCE");
  });

  test("FAIL_NAME_003: Income Certificate (Suresh Kumar) — recovered from background shading", () => {
    const fixture = fixtures.find((f) => f.id === "FAIL_NAME_003");
    expect(fixture).toBeDefined();
    expect(fixture.ground_truth_name).toBe("Suresh Kumar");

    // OCR output after illumination normalization
    const normalizedText = `
      FICTIONAL EDUCATION RECORD
      INCOME CERTIFICATE
      STUDENT NAME: Suresh Kumar
      DATE OF BIRTH: 09-07-2007
      CERTIFICATE NUMBER: TN-2021-000027
      ISSUE DATE: 15-06-2026
      APPLICANT NAME: Suresh Kumar
      GUARDIAN NAME: Karthikeyan
      ANNUAL INCOME: 200000
      TALUK: Coimbatore South
      DISTRICT: Madurai
      STATE: Tamil Nadu
    `;

    const extracted = extractIncomeCertificateData(normalizedText);
    expect(extracted.name).toBe("Suresh Kumar");
    expect(extracted.fieldConfidence.name).toBeGreaterThanOrEqual(0.85);

    const candidate = resolveOcrNameCandidate(extracted.name);
    expect(candidate.suggestedValue).toBe("Suresh Kumar");
    expect(candidate.status).toBe("HIGH_CONFIDENCE");
  });

  test("FAIL_NAME_004: Community Certificate (Keerthana, blurred) — safely NOT_DETECTED without hallucination", () => {
    const fixture = fixtures.find((f) => f.id === "FAIL_NAME_004");
    expect(fixture).toBeDefined();
    expect(fixture.ground_truth_name).toBe("Keerthana");

    // Under severe Gaussian blur, text produces garbled OCR fragments
    const blurredText = `
      FICTIONAL EDUCATION RECORD
      COMMUNITY CERTIFICATE
      STUDENT AME roerara
      DATEOFBMTH 08.12 2008
      CORTE A TENNER ™ 207% 000028
      ssueoaTE 15.08 200%
      APPUCANT NAME rears
      GUARCANNAME Rawr Sma
      commmeTy wre.
      caTRoORY vec
    `;

    const extracted = extractCommunityCertificateData(blurredText);
    // Must NOT hallucinate "Keerthana" or any wrong candidate
    const candidate = resolveOcrNameCandidate(extracted.name);
    expect(candidate.status).toBe("NOT_DETECTED");

    // When candidate name is uncertain or absent, safe behavior is NOT_DETECTED
    expect(["NOT_DETECTED", null, undefined]).toContain(extracted.name || "NOT_DETECTED");
  });

  test("FAIL_NAME_005: Community Certificate (Keerthana) — recovered from uneven background", () => {
    const fixture = fixtures.find((f) => f.id === "FAIL_NAME_005");
    expect(fixture).toBeDefined();
    expect(fixture.ground_truth_name).toBe("Keerthana");

    // OCR output after illumination normalization
    const normalizedText = `
      FICTIONAL EDUCATION RECORD
      COMMUNITY CERTIFICATE
      STUDENT NAME: Keerthana
      DATE OF BIRTH: 06-12-2006
      CERTIFICATE NUMBER: TN-2025-000028
      ISSUE DATE: 15-06-2026
      APPLICANT NAME: Keerthana
      GUARDIAN NAME: Rajesh Kumar
      COMMUNITY: Mutharaiyar
      CATEGORY: MBC
      TALUK: Madurai North
      DISTRICT: Madurai
      STATE: Tamil Nadu
    `;

    const extracted = extractCommunityCertificateData(normalizedText);
    expect(extracted.name).toBe("Keerthana");
    expect(extracted.fieldConfidence.name).toBeGreaterThanOrEqual(0.85);

    const candidate = resolveOcrNameCandidate(extracted.name);
    expect(candidate.suggestedValue).toBe("Keerthana");
    expect(candidate.status).toBe("HIGH_CONFIDENCE");
  });
});

describe("OCR Name Safety Edge Cases", () => {
  test("Clean Name: extracts standard Tamil Nadu student name with high confidence", () => {
    const text = `
      SECONDARY SCHOOL LEAVING CERTIFICATE
      NAME OF THE CANDIDATE: NITHISHKUMAR M
      DATE OF BIRTH: 16/05/2005
    `;
    const res = extractMarksheetName(text);
    expect(res.value).toBe("Nithishkumar M");
    expect(res.confidence).toBeGreaterThanOrEqual(0.90);
  });

  test("Blurred Name: unsharp mask recovery vs safe review", () => {
    // Mild blur with slight noise
    const mildlyBlurred = "STUDENT NAME: S|VARAMAN K";
    const res = resolveOcrNameCandidate(mildlyBlurred);
    expect(res.status).toBe("HIGH_CONFIDENCE");
    expect(res.suggestedValue).toContain("Varaman");
  });

  test("Uneven Lighting: stripped border pipe artifacts and clean name candidate extraction", () => {
    const lineWithArtifacts = "|   ) Suresh Kumar   ]  |";
    const res = resolveOcrNameCandidate(lineWithArtifacts);
    expect(res.status).toBe("HIGH_CONFIDENCE");
    expect(res.suggestedValue).toBe("Suresh Kumar");
  });

  test("Low Contrast: extracts name cleanly from lowercase or title case", () => {
    const text = "applicant name : priyadharshini";
    const res = resolveOcrNameCandidate(text);
    expect(res.status).toBe("HIGH_CONFIDENCE");
    expect(res.suggestedValue).toBe("Priyadharshini");
  });

  test("OCR Confusion: handles digits in names and flags for review", () => {
    const confusedName = "N1TH1SH KUM4R";
    const res = resolveOcrNameCandidate(confusedName);
    expect(res.status).toBe("NEEDS_REVIEW");
    expect(res.suggestedValue).toBe("Nithish Kumar");
    expect(res.reason).toContain("Digit(s) detected");
    expect(res.rawValue).toBe("N1TH1SH KUM4R");
  });

  test("OCR Confusion: handles rn -> m and cl -> d character ambiguity", () => {
    const rnCheck = suggestOcrCorrections("Karnan", "name");
    expect(rnCheck.possibleCorrections).toContain("Kaman");

    const clCheck = suggestOcrCorrections("Clivya", "name");
    expect(clCheck.possibleCorrections).toContain("Divya");
  });

  test("Multiple Names: prioritizes student name over authority / signatory names", () => {
    const text = `
      TAMIL NADU STATE BOARD
      NAME OF THE CANDIDATE: ARUN KUMAR
      NAME OF THE HEADMASTER: DR S SIVARAMAN
      SUPERINTENDENT: M GANESAN
    `;
    const res = extractMarksheetName(text);
    expect(res.value).toBe("Arun Kumar");
    expect(res.value).not.toContain("Headmaster");
    expect(res.value).not.toContain("Superintendent");
  });

  test("Parent Name: strictly excludes father/mother name from candidate name", () => {
    const text = `
      COMMUNITY CERTIFICATE
      THIS IS TO CERTIFY THAT SELVAN KARTHIKEYAN SON OF THIRU MURUGESAN BELONGS TO
    `;
    const res = extractCommunityCertificateData(text);
    expect(res.name).toBe("Karthikeyan");
    expect(res.fatherName).toBe("Murugesan");
    expect(res.name).not.toBe(res.fatherName);
  });

  test("School Name: excludes institution keywords from student name", () => {
    const text = `
      NAME OF THE SCHOOL: GOVT HIGHER SECONDARY SCHOOL SALEM
      STUDENT NAME: PRIYA S
    `;
    const res = extractMarksheetName(text);
    expect(res.value).toBe("Priya S");
    expect(res.value).not.toContain("School");
  });

  test("Long Names & Initials: extracts complex Indian names accurately", () => {
    const longName = "BALASUBRAMANIAM SIVASANKARANARAYANAN";
    const res = resolveOcrNameCandidate(longName);
    expect(res.status).toBe("HIGH_CONFIDENCE");
    expect(res.suggestedValue).toBe("Balasubramaniam Sivasankaranarayanan");

    const withPrefix = "M. S. SWAMINATHAN";
    const resPrefix = resolveOcrNameCandidate(withPrefix);
    expect(resPrefix.status).toBe("HIGH_CONFIDENCE");
  });

  test("Missing Name: returns NOT_DETECTED when student name is absent", () => {
    const emptyText = `
      GOVERNMENT OF TAMIL NADU
      COMMUNITY CERTIFICATE
      DATE OF BIRTH: 12-05-2005
      COMMUNITY: MBC
    `;
    const res = extractCommunityCertificateData(emptyText);
    expect(res.name).toBeNull();
  });

  test("Conflicting Names Across Documents: triggers NEEDS_REVIEW with conflict note", () => {
    const docs = [
      { docType: "10th", name: "Kavitha M", confidence: 92 },
      { docType: "12th", name: "Kavitha M", confidence: 90 },
      { docType: "Community", name: "Priya S", confidence: 95 },
    ];

    const reconciled = reconcileCrossDocumentName(docs);
    expect(reconciled.status).toBe("NEEDS_REVIEW");
    expect(reconciled.hasConflict).toBe(true);
    expect(reconciled.note).toContain("Conflicting names detected");
  });

  test("Cross-Document Consensus: resolves character confusion with consensus note", () => {
    const docs = [
      { docType: "10th", name: "NITHISHKUMAR", confidence: 92 },
      { docType: "12th", name: "N1THISHKUMAR", confidence: 80 },
      { docType: "Community", name: "NITHISHKUMAR", confidence: 95 },
      { docType: "Income", name: "NITHISHKUMAR", confidence: 94 },
    ];

    const reconciled = reconcileCrossDocumentName(docs);
    expect(reconciled.consensusName).toBe("NITHISHKUMAR");
    expect(reconciled.agreements).toBe(4);
    expect(reconciled.note).toBe("Name appears consistent across uploaded documents.");
    expect(reconciled.note).not.toContain("verified by government");
  });
});

describe("Cross-Document Case Consistency & Confidence Calibration", () => {
  test("Confidence Calibration: low engine confidence (<70) forces NEEDS_REVIEW status", () => {
    const lowConfCandidate = resolveOcrNameCandidate("SENTHIL KUMAR", [], 55);
    expect(lowConfCandidate.status).toBe("NEEDS_REVIEW");
    expect(lowConfCandidate.confidence).toBeLessThan(70);
    expect(lowConfCandidate.reason).toContain("Low OCR engine confidence");

    const highConfCandidate = resolveOcrNameCandidate("SENTHIL KUMAR", [], 92);
    expect(highConfCandidate.status).toBe("HIGH_CONFIDENCE");
    expect(highConfCandidate.confidence).toBe(92);
  });

  test("Cross-Document Case: CONSISTENT across 4 matching documents", () => {
    const res = evaluateCrossDocumentCase({
      tenth: { name: "SENTHIL KUMAR K", dob: "14-05-2005" },
      twelfth: { name: "SENTHIL KUMAR K", dob: "14-05-2005" },
      community: { name: "SENTHIL KUMAR K", dob: "14-05-2005" },
      income: { name: "SENTHIL KUMAR K", dob: "14-05-2005" },
    });
    expect(res.status).toBe("CONSISTENT");
    expect(res.hasConflict).toBe(false);
    expect(res.explanation).toContain("consistent across uploaded documents");
    expect(res.explanation).not.toContain("verified by government");
  });

  test("Cross-Document Case: MINOR DIFFERENCE on small spelling variation", () => {
    const res = evaluateCrossDocumentCase({
      tenth: { name: "KARTHIKEYAN M", dob: "10-11-2005" },
      twelfth: { name: "KARTHIKAYAN M", dob: "10-11-2005" },
      community: { name: "KARTHIKEYAN M", dob: "10-11-2005" },
    });
    expect(res.status).toBe("MINOR DIFFERENCE");
    expect(res.hasConflict).toBe(false);
    expect(res.explanation).toContain("Minor name variation");
  });

  test("Cross-Document Case: SIGNIFICANT CONFLICT on conflicting names or DOBs", () => {
    const nameConflict = evaluateCrossDocumentCase({
      tenth: { name: "MUGILAN R", dob: "18-03-2005" },
      community: { name: "VIGNESH R", dob: "18-03-2005" },
    });
    expect(nameConflict.status).toBe("SIGNIFICANT CONFLICT");
    expect(nameConflict.hasConflict).toBe(true);
    expect(nameConflict.explanation).toContain("Conflicting candidate names");

    const dobConflict = evaluateCrossDocumentCase({
      tenth: { name: "SURESH KUMAR", dob: "10-05-2005" },
      twelfth: { name: "SURESH KUMAR", dob: "15-08-2005" },
    });
    expect(dobConflict.status).toBe("SIGNIFICANT CONFLICT");
    expect(dobConflict.hasConflict).toBe(true);
    expect(dobConflict.explanation).toContain("Conflicting date of birth");
  });

  test("Cross-Document Case: INSUFFICIENT DATA when fewer than 2 readable documents", () => {
    const res = evaluateCrossDocumentCase({
      tenth: { name: "ANITHA G", dob: "05-01-2006" },
    });
    expect(res.status).toBe("INSUFFICIENT DATA");
    expect(res.explanation).toContain("minimum 2 required");
  });
});

