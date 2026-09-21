import {
  detectDocumentType,
  detectDocumentTitle,
  validateDocumentSlot,
  detectState,
  detectIssuingAuthority,
} from "./documentClassifier";

describe("documentClassifier", () => {
  describe("detectDocumentType", () => {
    test("correctly identifies 10th SSLC Marksheet with multi-signal markers", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        DEPARTMENT OF GOVERNMENT EXAMINATIONS
        SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)
        NAME OF THE CANDIDATE: SAMPLE STUDENT
        STATEMENT OF MARKS - MARCH 2022
        TAMIL: 92, ENGLISH: 88, MATHEMATICS: 95, SCIENCE: 94, SOCIAL SCIENCE: 96
        TOTAL MARKS OBTAINED: 465 / 500
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("ms10");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
      expect(res.issuingState).toBe("Tamil Nadu");
    });

    test("correctly identifies 12th HSC Marksheet with multi-signal markers", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        STATE BOARD OF SCHOOL EXAMINATIONS
        HIGHER SECONDARY (CLASS XII) CERTIFICATE (HSC)
        NAME OF CANDIDATE: DEMO CANDIDATE
        MARCH 2024
        PHYSICS: 95, CHEMISTRY: 92, BIOLOGY: 94, MATHEMATICS: 98
        TOTAL MARKS OBTAINED: 540 / 600
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("ms12");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
    });

    test("correctly identifies Community Certificate with state and issuing authority", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        REVENUE DEPARTMENT - TALUK OFFICE AMBATUR
        COMMUNITY CERTIFICATE
        This is to certify that Selvan SAMPLE STUDENT son of Thiru SAMPLE FATHER
        residing at Chennai District belongs to Scheduled Caste (SC) community.
        Certificate No: TN-1234567890
        Issued by: Tahsildar, Ambattur Taluk
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("community");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
      expect(res.issuingState).toBe("Tamil Nadu");
      expect(res.issuingAuthority).toContain("Tahsildar");
    });

    test("correctly identifies Gujarat Income Certificate with Talati Cum Mantri authority", () => {
      const text = `
        Government of Gujarat
        Revenue Department
        INCOME CERTIFICATE
        This is to certify that the total annual family income of Shri DEMO PARENT
        father of DEMO CANDIDATE residing at Jamnagar is Rs. 92,000/- per annum.
        Certificate No: GJ/2025/12345
        Talati cum Mantri Gram Panchayat
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("income");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
      expect(res.issuingState).toBe("Gujarat");
      expect(res.issuingAuthority).toBe("Talati Cum Mantri");
    });

    test("returns unknown for insufficient or unrelated text", () => {
      const text = "Random receipt with groceries and shopping items total 500.";
      const res = detectDocumentType(text);
      expect(res.type).toBe("unknown");
      expect(res.isConfident).toBe(false);
      expect(res.issuingState).toBeNull();
      expect(res.issuingAuthority).toBeNull();
    });
  });

  describe("detectState", () => {
    test("detects various Indian states accurately", () => {
      expect(detectState("Government of Gujarat Revenue Department").state).toBe("Gujarat");
      expect(detectState("Govt of Tamil Nadu Department of Examinations").state).toBe("Tamil Nadu");
      expect(detectState("Government of Kerala Village Office").state).toBe("Kerala");
      expect(detectState("Government of Karnataka Revenue Dept").state).toBe("Karnataka");
      expect(detectState("Government of Maharashtra Tahsildar").state).toBe("Maharashtra");
      expect(detectState("Central Board of Secondary Education Delhi").state).toBe("Delhi");
    });

    test("returns null when no state markers are present", () => {
      expect(detectState("Generic Private Coaching Certificate of Completion").state).toBeNull();
    });
  });

  describe("detectIssuingAuthority", () => {
    test("detects various official authorities across states", () => {
      expect(detectIssuingAuthority("Zonal Deputy Tahsildar Salem South").issuingAuthority).toBe("Zonal Deputy Tahsildar");
      expect(detectIssuingAuthority("Talati cum Mantri Gram Panchayat").issuingAuthority).toBe("Talati Cum Mantri");
      expect(detectIssuingAuthority("Village Officer Kochi").issuingAuthority).toBe("Village Officer");
      expect(detectIssuingAuthority("District Magistrate Office").issuingAuthority).toBe("District Collector / Magistrate");
    });

    test("returns null when no known authority keywords match", () => {
      expect(detectIssuingAuthority("Simple text note without authority signatures").issuingAuthority).toBeNull();
    });
  });

  describe("validateDocumentSlot", () => {
    test("returns valid when detected type matches slot", () => {
      const detection = { type: "ms10", confidence: 90 };
      const slotRes = validateDocumentSlot("ms10", detection);
      expect(slotRes.status).toBe("valid");
      expect(slotRes.badgeColor).toBe("green");
    });

    test("returns mismatch when wrong document is uploaded in slot", () => {
      const detection = { type: "ms10", confidence: 90 };
      const slotRes = validateDocumentSlot("community", detection);
      expect(slotRes.status).toBe("mismatch");
      expect(slotRes.badgeColor).toBe("red");
      expect(slotRes.message).toContain("Wrong document type detected");
    });

    test("returns unconfident when confidence is low or document is unknown", () => {
      const detection = { type: "unknown", confidence: 30 };
      const slotRes = validateDocumentSlot("income", detection);
      expect(slotRes.status).toBe("unconfident");
      expect(slotRes.badgeColor).toBe("yellow");
    });
  });

  describe("detectDocumentTitle", () => {
    test("detects 10th SSLC marksheet title with high confidence", () => {
      const text = "SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)\nGOVERNMENT OF TAMIL NADU";
      const res = detectDocumentTitle(text);
      expect(res.documentType).toBe("ms10");
      expect(res.documentTitle).toContain("Secondary School Leaving Certificate");
      expect(res.confidence).toBeGreaterThanOrEqual(90);
      expect(res.isIdentified).toBe(true);
    });

    test("detects 12th HSC marksheet title with high confidence", () => {
      const text = "HIGHER SECONDARY COURSE CERTIFICATE (HSC)\nSTATEMENT OF MARKS";
      const res = detectDocumentTitle(text);
      expect(res.documentType).toBe("ms12");
      expect(res.documentTitle).toContain("Higher Secondary Mark Sheet");
      expect(res.confidence).toBeGreaterThanOrEqual(90);
      expect(res.isIdentified).toBe(true);
    });

    test("detects Community Certificate title", () => {
      const text = "COMMUNITY CERTIFICATE\nREVENUE DEPARTMENT";
      const res = detectDocumentTitle(text);
      expect(res.documentType).toBe("community");
      expect(res.documentTitle).toBe("Community Certificate");
      expect(res.confidence).toBeGreaterThanOrEqual(90);
    });

    test("detects Income Certificate title", () => {
      const text = "INCOME CERTIFICATE\nTALUK OFFICE";
      const res = detectDocumentTitle(text);
      expect(res.documentType).toBe("income");
      expect(res.documentTitle).toBe("Income Certificate");
      expect(res.confidence).toBeGreaterThanOrEqual(90);
    });

    test("detects Transfer and Bonafide Certificates", () => {
      const tc = detectDocumentTitle("TRANSFER CERTIFICATE\nSCHOOL EDUCATION");
      expect(tc.documentTitle).toBe("Transfer Certificate");

      const bona = detectDocumentTitle("BONAFIDE CERTIFICATE\nCOLLEGE OF ENGINEERING");
      expect(bona.documentTitle).toBe("Bonafide Certificate");
    });

    test("handles OCR noise in document headers (e.g. SEC0NDARY SCH00L LEAV1NG CERT1F1CATE)", () => {
      const noisyText = "SEC0NDARY SCH00L LEAV1NG CERT1F1CATE\nTAMIL NADU";
      const res = detectDocumentTitle(noisyText);
      expect(res.documentType).toBe("ms10");
      expect(res.documentTitle).toContain("Secondary School Leaving Certificate");
      expect(res.confidence).toBeGreaterThanOrEqual(80);
    });

    test("returns uncertain status for partial anchors", () => {
      const partialText = "This receipt mentions annual income of the family.";
      const res = detectDocumentTitle(partialText);
      expect(res.documentTitle).toBe("Possible Income Certificate");
      expect(res.confidence).toBe(61);
      expect(res.isIdentified).toBe(false);
    });
  });
});
