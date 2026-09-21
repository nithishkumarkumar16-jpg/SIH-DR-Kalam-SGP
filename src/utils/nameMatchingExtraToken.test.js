/**
 * nameMatchingExtraToken.test.js — Regression suite for OCR Name Matching and Extra-Token Detection
 * 
 * Verifies that:
 * 1. Unexpected additional tokens (e.g. "Arun K Extra" vs "Arun K") NEVER receive 98% match
 *    and are strictly capped at <= 68% with status "NEEDS_REVIEW".
 * 2. Legitimate Indian multi-token names (e.g. "Arun Kumar Raj", "Balasubramaniam Sivasankaranarayanan")
 *    and valid patronymic initial expansions maintain full 100% / Likely match status.
 * 3. Extraction parsers detect structural name anomalies and cap confidence at <= 65% with uncertain: true.
 */

import { compareNames } from "./verificationEngine";
import { detectAnomalousExtraToken, resolveOcrNameCandidate, extractMarksheetData } from "./fieldParsers";

describe("Name Matching & Extra Token Safeguards", () => {
  describe("Rule A: Exact Normalized Name", () => {
    test("exact normalized name receives 100% / EXACT_MATCH", () => {
      const res = compareNames("Arun K", "Arun K", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });
  });

  describe("Rule B: OCR Punctuation and Spacing Variations", () => {
    test("handles trailing dot on initials without penalty", () => {
      const res = compareNames("Arun K.", "Arun K", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });

    test("handles multiple consecutive whitespace characters", () => {
      const res = compareNames("Arun   K", "Arun K", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });
  });

  describe("Rule C: Initials With and Without Dot", () => {
    test("leading initial with dot matches initial without dot", () => {
      const res = compareNames("A. Arun", "A Arun", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });

    test("trailing initial with dot matches initial without dot", () => {
      const res = compareNames("K. Arun", "K Arun", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });
  });

  describe("Rule D: Genuine Three-Token Names", () => {
    test("genuine 3-token name gets 100% / EXACT_MATCH", () => {
      const res = compareNames("Arun Kumar Raj", "Arun Kumar Raj", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });
  });

  describe("Rule E: Genuine Four-Token Names", () => {
    test("genuine 4-token name with initial gets 100% / EXACT_MATCH", () => {
      const res = compareNames("Arun Kumar Raj S", "Arun Kumar Raj S", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(1.0);
    });
  });

  describe("Rule F: Token Permutations (Surname first vs last)", () => {
    test("reordered name tokens receive 98% / EXACT_MATCH", () => {
      const res = compareNames("Raj Arun Kumar", "Arun Kumar Raj", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(0.98);
    });

    test("initial permutation receives 98% / EXACT_MATCH", () => {
      const res = compareNames("K Arun", "Arun K", true);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(0.98);
    });
  });

  describe("Rule G: Pure Single Initial Omission / Addition", () => {
    test("single initial addition (lenient) gets EXACT_MATCH", () => {
      const res = compareNames("Arun Kumar", "Arun Kumar K", false);
      expect(res.status).toBe("EXACT_MATCH");
      expect(res.score).toBe(0.95);
    });

    test("single initial addition (strict) gets LIKELY_MATCH", () => {
      const res = compareNames("Arun Kumar", "Arun Kumar K", true);
      expect(res.status).toBe("LIKELY_MATCH");
      expect(res.score).toBe(0.92);
    });
  });

  describe("Rule H: Legitimate Patronymic Initial Expansion", () => {
    test("expands single initial to full father name with LIKELY_MATCH", () => {
      const res = compareNames("Balasubramaniam S", "Balasubramaniam Sivasankaranarayanan", true);
      expect(res.status).toBe("LIKELY_MATCH");
      expect(res.score).toBe(0.90);
      expect(res.explanation).toContain("patronymic");
    });

    test("expands leading initial to full name in reverse order", () => {
      const res = compareNames("S Balasubramaniam", "Sivasankaranarayanan Balasubramaniam", true);
      expect(res.status).toBe("LIKELY_MATCH");
      expect(res.score).toBe(0.90);
    });
  });

  describe("Rule I: Unexpected Extra Token Safeguards (THE CORE BUG)", () => {
    test("'Arun K Extra' vs 'Arun K' must NEVER receive 98% match and must flag NEEDS_REVIEW", () => {
      const res = compareNames("Arun K Extra", "Arun K", true);
      expect(res.score).toBeLessThanOrEqual(0.68);
      expect(res.score).toBe(0.65);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.explanation).toContain("Extra");
      expect(res.explanation).toContain("Manual review required");
    });

    test("reverse comparison 'Arun K' vs 'Arun K Extra' flags extra token", () => {
      const res = compareNames("Arun K", "Arun K Extra", false);
      expect(res.score).toBeLessThanOrEqual(0.68);
      expect(res.score).toBe(0.65);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.explanation).toContain("Extra");
    });

    test("extra parent name token 'Arun K Ramesh' vs 'Arun K' flags extra token", () => {
      const res = compareNames("Arun K Ramesh", "Arun K", true);
      expect(res.score).toBeLessThanOrEqual(0.68);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.explanation).toContain("Ramesh");
    });

    test("extra school token 'Arun K School' vs 'Arun K' flags extra token", () => {
      const res = compareNames("Arun K School", "Arun K", true);
      expect(res.score).toBeLessThanOrEqual(0.68);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.explanation).toContain("School");
    });

    test("extra OCR status noise token 'Arun K Pass' vs 'Arun K' flags extra token", () => {
      const res = compareNames("Arun K Pass", "Arun K", true);
      expect(res.score).toBeLessThanOrEqual(0.68);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.explanation).toContain("Pass");
    });
  });

  describe("Rule J: Minor Typos and Significant Mismatches", () => {
    test("single character typo gets fuzzy match", () => {
      const res = compareNames("DEMO CANDIDATE", "DEMO CANDDATE", false);
      expect(res.status === "LIKELY_MATCH" || res.status === "MINOR_DIFFERENCE").toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.85);
    });

    test("completely different names get MISMATCH", () => {
      const res = compareNames("SAMPLE STUDENT", "TEST APPLICANT", true);
      expect(res.status).toBe("MISMATCH");
      expect(res.score).toBeLessThan(0.5);
    });

    test("empty name returns MISSING", () => {
      const res = compareNames("", "SAMPLE STUDENT", true);
      expect(res.status).toBe("MISSING");
      expect(res.score).toBe(0);
    });
  });

  describe("detectAnomalousExtraToken Parser Detection", () => {
    test("detects structural anomaly [Word] [Initial] [SurplusWord]", () => {
      const anomaly = detectAnomalousExtraToken("ARUN K EXTRA");
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.extraToken).toBe("EXTRA");
      expect(anomaly.reason).toContain("Structural anomaly");
    });

    test("detects non-name noise keywords like SCHOOL, EXAM, COPY", () => {
      const anomaly = detectAnomalousExtraToken("ARUN K SCHOOL");
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.extraToken).toBe("SCHOOL");
    });

    test("does not flag legitimate 3-part names", () => {
      const a1 = detectAnomalousExtraToken("ARUN KUMAR RAJ");
      expect(a1.hasAnomaly).toBe(false);

      const a2 = detectAnomalousExtraToken("BALASUBRAMANIAM SIVASANKARANARAYANAN");
      expect(a2.hasAnomaly).toBe(false);

      const a3 = detectAnomalousExtraToken("ARUN K");
      expect(a3.hasAnomaly).toBe(false);
    });
  });

  describe("Extraction Integration with Anomalous Name", () => {
    test("resolveOcrNameCandidate caps confidence at <= 65% when anomalous extra token is present", () => {
      const res = resolveOcrNameCandidate("ARUN K EXTRA", 0.98);
      expect(res.value).toBe("Arun K Extra");
      expect(res.confidence).toBeLessThanOrEqual(0.65);
      expect(res.status).toBe("NEEDS_REVIEW");
      expect(res.uncertain).toBe(true);
    });

    test("extractMarksheetData produces structured name with capped confidence and uncertain flag", () => {
      const mockOcrText = `TAMIL NADU STATE BOARD HIGHER SECONDARY EXAMINATION
NAME OF CANDIDATE: ARUN K EXTRA
ROLL NO: 1234567
TOTAL MARKS: 450/500
PERCENTAGE: 90.00%
YEAR OF PASSING: 2023`;

      const data = extractMarksheetData(mockOcrText);
      expect(data.candidateName).toBe("Arun K Extra");
      expect(data.structuredFields.name.confidence).toBeLessThanOrEqual(65);
      expect(data.structuredFields.name.uncertain).toBe(true);
      expect(data.structuredFields.name.status).toBe("low");
    });
  });
});
