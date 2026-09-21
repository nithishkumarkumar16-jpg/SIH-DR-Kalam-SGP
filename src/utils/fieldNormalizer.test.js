import {
  stripHonorifics,
  normalizeName,
  tokenSort,
  formatTitleName,
  parseIndianDate,
  normalizeDateToISO,
  formatDateDisplay,
  normalizeIncome,
  formatIncomeDisplay,
  normalizeCommunity,
  normalizeReligion,
} from "./fieldNormalizer";

describe("fieldNormalizer", () => {
  describe("Name Normalization & Honorifics", () => {
    test("strips standard Indian honorifics and salutations", () => {
      expect(stripHonorifics("Thiru SAMPLE STUDENT")).toBe("SAMPLE STUDENT");
      expect(stripHonorifics("Tmt. DEMO CANDIDATE")).toBe("DEMO CANDIDATE");
      expect(stripHonorifics("Selvi TEST APPLICANT")).toBe("TEST APPLICANT");
      expect(stripHonorifics("Mr. DEMO USER")).toBe("DEMO USER");
      expect(stripHonorifics("Shri SAMPLE PARENT")).toBe("SAMPLE PARENT");
      expect(stripHonorifics("S/O Thiru SAMPLE FATHER")).toBe("SAMPLE FATHER");
    });

    test("normalizes whitespace and cleans characters in names", () => {
      expect(normalizeName("  SAMPLE   STUDENT  ")).toBe("SAMPLE STUDENT");
      expect(normalizeName("Dr. DEMO CANDIDATE")).toBe("DEMO CANDIDATE");
    });

    test("tokenSort sorts tokens for word-order invariant match", () => {
      expect(tokenSort("SAMPLE STUDENT")).toBe("sample student");
      expect(tokenSort("STUDENT SAMPLE")).toBe("sample student");
      expect(tokenSort("M SAMPLE STUDENT")).toBe("m sample student");
    });

    test("formatTitleName converts uppercase to Title Case while keeping initials uppercase", () => {
      expect(formatTitleName("SAMPLE STUDENT M")).toBe("Sample Student M");
      expect(formatTitleName("DEMO CANDIDATE")).toBe("Demo Candidate");
    });
  });

  describe("Date Normalization", () => {
    test("parses Indian DD-MM-YYYY, DD/MM/YYYY, and DD.MM.YYYY formats", () => {
      const d1 = parseIndianDate("15-08-2004");
      expect(d1).not.toBeNull();
      expect(d1.getDate()).toBe(15);
      expect(d1.getMonth()).toBe(7); // 0-indexed August
      expect(d1.getFullYear()).toBe(2004);

      const d2 = parseIndianDate("26/01/2005");
      expect(d2.getDate()).toBe(26);
      expect(d2.getMonth()).toBe(0);

      const d3 = parseIndianDate("10.12.2003");
      expect(d3.getDate()).toBe(10);
      expect(d3.getMonth()).toBe(11);
    });

    test("normalizes dates to ISO YYYY-MM-DD standard", () => {
      expect(normalizeDateToISO("05/04/2004")).toBe("2004-04-05");
      expect(normalizeDateToISO("2004-04-05")).toBe("2004-04-05");
      expect(normalizeDateToISO("invalid-date")).toBeNull();
    });

    test("formats dates for display as DD-MM-YYYY", () => {
      expect(formatDateDisplay("2004-04-05")).toBe("05-04-2004");
    });
  });

  describe("Income Normalization", () => {
    test("normalizes various Indian Rupee strings to numeric integer", () => {
      expect(normalizeIncome("₹2,50,000")).toBe(250000);
      expect(normalizeIncome("Rs. 250000/-")).toBe(250000);
      expect(normalizeIncome("1,80,000.00")).toBe(180000);
      expect(normalizeIncome("250000")).toBe(250000);
      expect(normalizeIncome(250000)).toBe(250000);
      // Browser OCR Fault-Tolerance Layer tests
      expect(normalizeIncome("R. 180000")).toBe(180000);
      expect(normalizeIncome("Rs. 2,5O,OOO/-")).toBe(250000); // OCR O/o confused with 0
      expect(normalizeIncome("INR 1,50,000")).toBe(150000);
      expect(normalizeIncome("Rupees 72000")).toBe(72000);
      expect(normalizeIncome("₹ 95,000/-")).toBe(95000);
    });

    test("returns null for invalid or negative income strings", () => {
      expect(normalizeIncome("-5000")).toBeNull();
      expect(normalizeIncome("invalid")).toBeNull();
      expect(normalizeIncome(null)).toBeNull();
    });

    test("formats income into ₹ Indian locale format", () => {
      expect(formatIncomeDisplay(250000)).toBe("₹2,50,000");
    });
  });

  describe("Community & Religion Normalization", () => {
    test("canonicalizes community names to standard categories", () => {
      expect(normalizeCommunity("Scheduled Caste")).toBe("SC");
      expect(normalizeCommunity("Scheduled Tribe")).toBe("ST");
      expect(normalizeCommunity("Most Backward Class (MBC)")).toBe("MBC");
      expect(normalizeCommunity("Backward Class")).toBe("BC");
      expect(normalizeCommunity("Denotified Community (DNC)")).toBe("DNC");
      expect(normalizeCommunity("General")).toBe("General");
      expect(normalizeCommunity("Open Category")).toBe("General");
    });

    test("normalizes religion strings", () => {
      expect(normalizeReligion("Hinduism")).toBe("Hindu");
      expect(normalizeReligion("Islam")).toBe("Muslim");
      expect(normalizeReligion("Christianity")).toBe("Christian");
    });
  });
});
