import {
  compareNames,
  compareDOB,
  compareIncome,
  compareCommunity,
  evaluateIncomeFreshness,
  buildCrossDocumentMatrix,
  levenshteinDistance,
} from "./verificationEngine";

describe("verificationEngine", () => {
  describe("Name Comparison", () => {
    test("identifies exact name matches", () => {
      const res = compareNames("SAMPLE STUDENT", "SAMPLE STUDENT", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });

    test("identifies token-order variations (Surname first vs last)", () => {
      const res = compareNames("STUDENT SAMPLE", "SAMPLE STUDENT", true);
      expect(res.status).toBe("EXACT_MATCH");
    });

    test("strips honorifics and matches clean name", () => {
      const res = compareNames("Thiru SAMPLE STUDENT", "SAMPLE STUDENT", true);
      expect(res.status).toBe("EXACT_MATCH");
    });

    test("handles initial variations appropriately (lenient vs strict)", () => {
      const lenient = compareNames("DEMO CANDIDATE", "DEMO CANDIDATE K", false);
      expect(lenient.status).toBe("EXACT_MATCH");

      const strict = compareNames("DEMO CANDIDATE", "DEMO CANDIDATE K", true);
      expect(strict.status).toBe("LIKELY_MATCH");
    });

    test("detects minor typos / spelling variations", () => {
      const res = compareNames("DEMO CANDIDATE", "DEMO CANDDATE", false);
      expect(res.status === "LIKELY_MATCH" || res.status === "MINOR_DIFFERENCE").toBe(true);
    });

    test("flags clear name mismatches as MISMATCH", () => {
      const res = compareNames("SAMPLE STUDENT", "TEST APPLICANT", true);
      expect(res.status).toBe("MISMATCH");
    });

    test("handles missing names gracefully", () => {
      const res = compareNames("", "SAMPLE STUDENT", true);
      expect(res.status).toBe("MISSING");
    });
  });

  describe("Date of Birth Comparison", () => {
    test("matches dates across different formatting styles", () => {
      const res = compareDOB("15/08/2004", "15-08-2004");
      expect(res.status).toBe("MATCH");
    });

    test("flags different dates as MISMATCH", () => {
      const res = compareDOB("15/08/2004", "16/08/2004");
      expect(res.status).toBe("MISMATCH");
    });

    test("handles missing date gracefully", () => {
      const res = compareDOB("", "15/08/2004");
      expect(res.status).toBe("MISSING");
    });
  });

  describe("Income Cross-Check & Freshness", () => {
    test("matches identical income values without date", () => {
      const res = compareIncome("₹2,50,000", "250000");
      expect(res.status).toBe("MATCH");
      expect(res.numCert).toBe(250000);
      expect(res.numStudent).toBe(250000);
    });

    test("flags income amount mismatches", () => {
      const res = compareIncome("₹2,50,000", "300000");
      expect(res.status).toBe("MISMATCH");
    });

    test("flags expired income certificates (>12 months)", () => {
      const res = compareIncome("₹2,00,000", "200000", "01-01-2020");
      expect(res.freshness.status).toBe("expired");
    });
  });

  describe("Community Cross-Check", () => {
    test("matches equivalent community categories", () => {
      const res = compareCommunity("Scheduled Caste (SC)", "SC");
      expect(res.status).toBe("MATCH");
    });

    test("flags community category mismatches", () => {
      const res = compareCommunity("SC", "BC");
      expect(res.status).toBe("MISMATCH");
    });
  });

  describe("Full Cross-Document Matrix & Consistency Score", () => {
    test("builds full matrix including Income Certificate name and computes consistency score", () => {
      const matrix = buildCrossDocumentMatrix({
        aadharName: "SAMPLE STUDENT",
        aadharDob: "15-08-2004",
        bankHolder: "SAMPLE STUDENT",
        bankAccType: "Single",
        tenthData: { name: "Sample Student", dob: "15-08-2004" },
        twelfthData: { name: "Sample Student", dob: null },
        communityData: { name: "Sample Student", dob: "15-08-2004", communityCategory: "SC" },
        incomeData: { name: "Sample Student", dob: null, incomeNumber: 200000 },
        studentIncome: "200000",
        studentCategory: "SC",
      });

      // Confirm income name was included in the comparison sources
      const hasIncomeName = matrix.nameSources.some(src => src.doc === "Income Certificate");
      expect(hasIncomeName).toBe(true);

      expect(matrix.hasNameMismatch).toBe(false);
      expect(matrix.hasDobMismatch).toBe(false);
      expect(matrix.nameConsistencyStatus).toBe("green");
      expect(matrix.consistencyPercentage).toBeGreaterThanOrEqual(90);
      expect(matrix.overallReadiness).toContain("High Consistency");
    });

    test("detects when a name mismatch exists in the matrix", () => {
      const matrix = buildCrossDocumentMatrix({
        aadharName: "SAMPLE STUDENT",
        aadharDob: "15-08-2004",
        bankHolder: "TEST APPLICANT",
        bankAccType: "Single",
        tenthData: { name: "Sample Student" },
        studentIncome: "200000",
      });

      expect(matrix.hasNameMismatch).toBe(true);
      expect(matrix.nameConsistencyStatus).toBe("red");
      expect(matrix.overallReadiness).toContain("Issues Found");
    });
  });
});
