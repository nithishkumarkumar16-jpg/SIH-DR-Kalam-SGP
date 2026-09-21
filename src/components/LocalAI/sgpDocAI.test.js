jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
}));

import { createWorker } from "tesseract.js";
import { extractMarksheetFields, reconcileMarksheetPasses, getPdfWorkerSrc, getLocalTesseractOptions, MAX_PDF_PAGES, runOCR } from "./sgpDocAI";

describe("extractMarksheetFields", () => {
  test("rejects boilerplate candidate labels and keeps the real student name", () => {
    const text = `
      CLASS X
      NAME OF THE CANDIDATE U
      SAMPLE STUDENT
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBe("Sample Student");
    expect(result.name).not.toMatch(/^of\s+the\s+cand/i);
    expect(result.marksScored).toBe("465");
    expect(result.maxMarks).toBe("500");
    expect(result.percentage).toBe("93.00%");
  });

  test("strips the duplicated OCR prefix from a broken candidate label and rejects fragment names", () => {
    const text = `
      12TH MARKSHEET
      OF THE CANDIOATE Hr Ir Om
      TOTAL MARKS OBTAINED 540 / 600
    `;

    const result = extractMarksheetFields(text, "ms12");

    expect(result.name).toBeNull();
    expect(result.name === null || !String(result.name).includes("Hr")).toBe(true);
    expect(result.marksScored).toBe("540");
    expect(result.maxMarks).toBe("600");
    expect(result.percentage).toBe("90.00%");
  });

  test("accepts a valid candidate name when it appears after the label and normalizes uppercase OCR", () => {
    const text = `
      NAME OF THE CANDIDATE:
      DEMO CANDIDATE
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBe("Demo Candidate");
    expect(result.name).not.toMatch(/^[A-Z\s]+$/);
  });

  test("returns null when the candidate name is genuinely missing", () => {
    const text = `
      CLASS X
      NAME OF THE CANDIDATE
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBeNull();
  });

  test("parses the known marks totals from the regression samples", () => {
    const first = extractMarksheetFields("TOTAL MARKS OBTAINED 465 / 500", "ms10");
    const second = extractMarksheetFields("TOTAL MARKS OBTAINED 540 / 600", "ms12");

    expect(first.marksScored).toBe("465");
    expect(first.maxMarks).toBe("500");
    expect(first.percentage).toBe("93.00%");

    expect(second.marksScored).toBe("540");
    expect(second.maxMarks).toBe("600");
    expect(second.percentage).toBe("90.00%");
  });
});

describe("pdf security & worker configuration", () => {
  test("enforces strict maximum PDF limit of 3 pages", () => {
    expect(MAX_PDF_PAGES).toBe(3);
  });

  test("uses a browser-accessible worker URL in the public app assets", () => {
    const workerSrc = getPdfWorkerSrc();

    expect(workerSrc).toContain("/pdfjs/pdf.worker.min.mjs");
    expect(workerSrc).not.toContain("/pdfs-dist/build/pdf.worker.min.mjs");
  });

  test("pins all Tesseract runtime assets to this application", () => {
    const options = getLocalTesseractOptions();

    expect(options.workerPath).toContain("/tesseract/worker.min.js");
    expect(options.corePath).toContain("/tesseract");
    expect(options.langPath).toContain("/tessdata");
    expect(options.gzip).toBe(false);
    expect(options.cacheMethod).toBe("none");
    expect(JSON.stringify(options)).not.toMatch(/cdn|https?:/i);
  });

  test("runOCR initializes Tesseract with getLocalTesseractOptions for offline execution", async () => {
    const mockWorker = {
      recognize: jest.fn(),
      terminate: jest.fn().mockResolvedValue(),
    };
    createWorker.mockResolvedValueOnce(mockWorker);

    try {
      await runOCR({ type: "image/png" });
    } catch (e) {
      // Ignore image decode errors in test environment
    }

    expect(createWorker).toHaveBeenCalledWith(
      "eng",
      1,
      expect.objectContaining({
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract",
        langPath: "/tessdata",
        gzip: false,
        cacheMethod: "none",
        workerBlobURL: false,
      })
    );
  });
});

describe("reconcileMarksheetPasses", () => {
  test("selects higher confidence candidate name from binarized pass when standard pass has low confidence or null", () => {
    const pass1 = {
      name: null,
      marksScored: "499",
      maxMarks: null,
      percentage: null,
      grade: null,
      year: "2024",
      school: "SAMPLE MATRIC HR SEC SCHOOL",
      fieldConfidence: { name: 0, marks: 0.90, school: 0.85 },
    };

    const pass2 = {
      name: "Sample Student",
      marksScored: "499",
      maxMarks: null,
      percentage: null,
      grade: null,
      year: "2024",
      school: "SAMPLE MATRIC HR SEC SCHOOL",
      fieldConfidence: { name: 0.95, marks: 0.90, school: 0.90 },
    };

    const reconciled = reconcileMarksheetPasses(pass1, pass2);
    expect(reconciled.name).toBe("Sample Student");
    expect(reconciled.marksScored).toBe("499");
    expect(reconciled.fieldConfidence.name).toBe(0.95);
  });

  test("preserves pass1 fields if pass2 has no additional or better candidates", () => {
    const pass1 = {
      name: "Sample Student",
      marksScored: "499",
      maxMarks: null,
      percentage: null,
      grade: null,
      year: "2024",
      school: "SAMPLE MATRIC HR SEC SCHOOL",
      fieldConfidence: { name: 0.95, marks: 0.90, school: 0.90 },
    };

    const pass2 = {
      name: null,
      marksScored: null,
      fieldConfidence: { name: 0, marks: 0 },
    };

    const reconciled = reconcileMarksheetPasses(pass1, pass2);
    expect(reconciled.name).toBe("Sample Student");
    expect(reconciled.marksScored).toBe("499");
    expect(reconciled.fieldConfidence.name).toBe(0.95);
  });

  test("reconciles fatherName, motherName, rollNumber, and structuredFields across passes", () => {
    const pass1 = {
      name: "Sample Student",
      dob: "15-08-2004",
      registerNumber: "1234567",
      rollNumber: "1234567",
      fieldConfidence: { name: 0.90 },
      structuredFields: {
        name: { field: "name", confidence: 90, status: "high" },
      },
    };

    const pass2 = {
      name: "Sample Student",
      fatherName: "Sample Father",
      motherName: "Sample Mother",
      fieldConfidence: { name: 0.92 },
      structuredFields: {
        fatherName: { field: "fatherName", confidence: 88, status: "medium" },
        motherName: { field: "motherName", confidence: 88, status: "medium" },
      },
    };

    const reconciled = reconcileMarksheetPasses(pass1, pass2);
    expect(reconciled.name).toBe("Sample Student");
    expect(reconciled.fatherName).toBe("Sample Father");
    expect(reconciled.motherName).toBe("Sample Mother");
    expect(reconciled.dob).toBe("15-08-2004");
    expect(reconciled.rollNumber).toBe("1234567");
    expect(reconciled.structuredFields.fatherName).toBeDefined();
    expect(reconciled.structuredFields.motherName).toBeDefined();
  });
});

