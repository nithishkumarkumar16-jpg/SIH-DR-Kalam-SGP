/**
 * ocrSyntheticPipeline.test.js — SGP Advanced OCR Pipeline Synthetic Benchmark Test Suite
 * 
 * Benchmarks the 10 real-world document extraction scenarios:
 * 1. Clean 10th marksheet
 * 2. Noisy 10th marksheet
 * 3. Clean 12th marksheet
 * 4. Blurred community certificate
 * 5. Low-resolution income certificate
 * 6. Skewed certificate
 * 7. Rotated document
 * 8. Poor contrast document
 * 9. OCR-confusing name
 * 10. OCR-confusing certificate number
 */

import {
  extractMarksheetData,
  extractCommunityCertificateData,
  extractIncomeCertificateData,
  suggestOcrCorrections,
  validateCalendarDate,
  normalizeInstitutionName,
  compareInstitutions,
  maskSensitiveIdentifier,
  computeFieldConfidence,
} from "./fieldParsers";
import {
  detectDocumentType,
  detectDocumentTitle,
  validateDocumentSlot,
} from "./documentClassifier";
import {
  evaluateQualityGate,
  detectImageOrientationAndSkew,
} from "./imageQuality";
import {
  rotateCanvas,
  deskewCanvas,
  selectPreprocessingProfile,
  cleanupCanvas,
} from "./imagePreprocessing";

beforeAll(() => {
  if (typeof HTMLCanvasElement !== "undefined") {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ width: 100, height: 100, data: new Uint8ClampedArray(40000) })),
      putImageData: jest.fn(),
      drawImage: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
    }));
  }
});

describe("SGP Advanced OCR Engine — 10 Synthetic Scenarios Benchmark", () => {
  // Scenario 1: Clean 10th Marksheet
  test("Scenario 1: Clean 10th Marksheet — extracts all critical fields with high confidence", () => {
    const text = `
      GOVERNMENT OF TAMIL NADU
      DEPARTMENT OF GOVERNMENT EXAMINATIONS
      SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)
      NAME OF THE CANDIDATE: KAVITHA M
      FATHER'S NAME: MURUGAN S
      MOTHER'S NAME: LAKSHMI M
      DATE OF BIRTH: 24/05/2005
      PERMANENT REGISTER NUMBER: 7654321
      NAME OF THE SCHOOL: GOVT HIGHER SECONDARY SCHOOL SALEM
      SESSION: MARCH 2021
      TOTAL MARKS : 455 / 500
      PASS
    `;

    const titleInfo = detectDocumentTitle(text);
    const docType = detectDocumentType(text);
    const fields = extractMarksheetData(text, "ms10");

    expect(titleInfo.documentType).toBe("ms10");
    expect(titleInfo.confidence).toBeGreaterThanOrEqual(90);
    expect(docType.type).toBe("ms10");
    expect(fields.name).toBe("Kavitha M");
    expect(fields.dob).toBe("24-05-2005");
    expect(fields.school).toContain("GOVT HIGHER SECONDARY SCHOOL SALEM");
    expect(fields.board).toContain("Tamil Nadu");
    expect(fields.registerNumber).toBe("7654321");
    expect(fields.year).toBe("2021");
    expect(fields.marksScored).toBe("455");
    expect(fields.maxMarks).toBe("500");
    expect(fields.percentage).toBe("91.00%");
    expect(fields.grade).toBe("Pass");
    expect(fields.structuredFields.name.status).toBe("high");
  });

  // Scenario 2: Noisy 10th Marksheet
  test("Scenario 2: Noisy 10th Marksheet — title normalization and noise resilience", () => {
    const text = `
      SEC0NDARY SCH00L LEAV1NG CERT1F1CATE
      DEPARTMENT OF EXAMINATIONS || // __
      NAME OF THE CANDIDATE: DINESH KUMAR
      DATE OF BIRTH: 10/08/2004
      PERMANENT REGISTER NO: 9912345
      TOTAL MARKS: 380 / 500
      GOVT HIGH SCHOOL CHENNAI
    `;

    const titleInfo = detectDocumentTitle(text);
    const fields = extractMarksheetData(text, "ms10");

    expect(titleInfo.documentType).toBe("ms10");
    expect(fields.name).toBe("Dinesh Kumar");
    expect(fields.marksScored).toBe("380");
    expect(fields.registerNumber).toBe("9912345");
  });

  // Scenario 3: Clean 12th Marksheet
  test("Scenario 3: Clean 12th Marksheet — critical fields and electives percentage", () => {
    const text = `
      GOVERNMENT OF TAMIL NADU
      HIGHER SECONDARY COURSE CERTIFICATE (HSC)
      NAME OF THE CANDIDATE: PRAVEEN RAJ P
      DATE OF BIRTH: 18/02/2004
      PERMANENT REGISTER NUMBER: 8812345
      NAME OF THE SCHOOL: ST JOSEPH HIGHER SECONDARY SCHOOL TRICHY
      SESSION: MARCH 2022
      TOTAL MARKS : 540 / 600
      PASS
    `;

    const titleInfo = detectDocumentTitle(text);
    const fields = extractMarksheetData(text, "ms12");

    expect(titleInfo.documentType).toBe("ms12");
    expect(fields.name).toBe("Praveen Raj P");
    expect(fields.marksScored).toBe("540");
    expect(fields.maxMarks).toBe("600");
    expect(fields.percentage).toBe("90.00%");
    expect(fields.grade).toBe("Pass");
    expect(fields.registerNumber).toBe("8812345");
  });

  // Scenario 4: Blurred Community Certificate
  test("Scenario 4: Blurred Community Certificate — triggers quality gate warning / blur detection", () => {
    const blurredQuality = {
      qualityLevel: "poor",
      sharpnessScore: 22,
      laplacianVariance: 18,
      resolutionScore: 80,
      avgBrightness: 180,
      contrastScore: 70,
    };

    const gate = evaluateQualityGate(blurredQuality);
    expect(gate.rejectionReasons).toContain("blurry");
    expect(selectPreprocessingProfile(blurredQuality)).toBe("sharpened");

    const text = `
      COMMUNITY CERTIFICATE
      This is to certify that Selvan PRAVEEN son of Thiru PERUMAL
      belongs to Most Backward Class (MBC) community.
      Certificate No: TN-123456789
      Date: 12/06/2021
    `;
    const fields = extractCommunityCertificateData(text);
    expect(fields.name).toBe("Praveen");
    expect(fields.communityCategory).toBe("MBC");
  });

  // Scenario 5: Low-Resolution Income Certificate
  test("Scenario 5: Low-Resolution Income Certificate — flags low resolution and normalized income", () => {
    const lowResQuality = {
      qualityLevel: "poor",
      resolutionScore: 28,
      width: 320,
      sharpnessScore: 65,
      avgBrightness: 170,
      contrastScore: 60,
    };

    const gate = evaluateQualityGate(lowResQuality);
    expect(gate.rejectionReasons).toContain("low resolution");

    const text = `
      INCOME CERTIFICATE
      Certified that the annual income of Thiru SELVAM father of KAVITHA
      residing at Salem is Rs. 1,50,000/- per annum.
      Certificate No: INC/2023/55443
      Date: 15/04/2023
    `;
    const fields = extractIncomeCertificateData(text);
    expect(fields.name).toBe("Kavitha");
    expect(fields.incomeNumber).toBe(150000);
    expect(fields.income).toContain("1,50,000");
  });

  // Scenario 6: Skewed Certificate
  test("Scenario 6: Skewed Certificate — detects small skew angle and applies deskew transform", () => {
    const mockCanvas = document.createElement("canvas");
    mockCanvas.width = 600;
    mockCanvas.height = 800;

    const deskewed = deskewCanvas(mockCanvas, 2.5);
    expect(deskewed).toBeDefined();
    expect(deskewed.width).toBe(600);
    expect(deskewed.height).toBe(800);

    cleanupCanvas(deskewed);
    cleanupCanvas(mockCanvas);
  });

  // Scenario 7: Rotated Document
  test("Scenario 7: Rotated Document — 90 degree rotation correctly transposes dimensions", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 700;

    const rotated = rotateCanvas(canvas, 90);
    expect(rotated.width).toBe(700);
    expect(rotated.height).toBe(400);

    cleanupCanvas(rotated);
    cleanupCanvas(canvas);
  });

  // Scenario 8: Poor Contrast Document
  test("Scenario 8: Poor Contrast Document — triggers contrast profile and quality rejection", () => {
    const darkLowContrast = {
      qualityLevel: "poor",
      contrastScore: 12,
      contrastStdDev: 8,
      avgBrightness: 25,
      resolutionScore: 40,
    };

    const gate = evaluateQualityGate(darkLowContrast);
    expect(gate.isAcceptable).toBe(false);
    expect(gate.status).toBe("REJECT");
    expect(gate.rejectionReasons).toContain("too dark");
    expect(gate.rejectionReasons).toContain("low contrast / blank page");
    expect(selectPreprocessingProfile(darkLowContrast)).toBe("contrast");
  });

  // Scenario 9: OCR-Confusing Name
  test("Scenario 9: OCR-Confusing Name — provides non-destructive suggestions without altering raw value", () => {
    const confusion = suggestOcrCorrections("N1TH1SH KUM4R", "name");
    expect(confusion.rawValue).toBe("N1TH1SH KUM4R");
    expect(confusion.uncertain).toBe(true);
    expect(confusion.possibleCorrections).toContain("NITHISH KUMAR");

    // Masking check
    const masked = maskSensitiveIdentifier("1234 5678 9012", "aadhaar");
    expect(masked).toBe("XXXX-XXXX-9012");
  });

  // Scenario 10: OCR-Confusing Certificate Number
  test("Scenario 10: OCR-Confusing Certificate Number — identifies ambiguous O/0 and I/1", () => {
    const certCorrection = suggestOcrCorrections("ABO1238", "id");
    expect(certCorrection.rawValue).toBe("ABO1238");
    expect(certCorrection.uncertain).toBe(true);
    expect(certCorrection.possibleCorrections).toContain("AB01238");

    const regCorrection = suggestOcrCorrections("TN-l234", "id");
    expect(regCorrection.possibleCorrections).toContain("TN-1234");
  });
});
