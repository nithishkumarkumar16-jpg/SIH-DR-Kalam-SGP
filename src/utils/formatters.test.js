import { formatINR, formatCount, formatPercent, formatDateSafe } from "./formatters";

describe("SGP Safe Formatters (SIH26239)", () => {
  describe("formatINR", () => {
    test("formats valid positive numbers to Indian Rupee notation", () => {
      expect(formatINR(782000)).toBe("₹7,82,000");
      expect(formatINR(50000)).toBe("₹50,000");
      expect(formatINR(100)).toBe("₹100");
      expect(formatINR("648000")).toBe("₹6,48,000");
    });

    test("preserves valid zero as '₹0', not 'Not available'", () => {
      expect(formatINR(0)).toBe("₹0");
      expect(formatINR("0")).toBe("₹0");
    });

    test("shows 'Not available' for missing, null, empty or boolean values", () => {
      expect(formatINR(undefined)).toBe("Not available");
      expect(formatINR(null)).toBe("Not available");
      expect(formatINR("")).toBe("Not available");
      expect(formatINR(false)).toBe("Not available");
      expect(formatINR(true)).toBe("Not available");
    });

    test("shows 'Not available' for non-finite values (NaN, Infinity)", () => {
      expect(formatINR(NaN)).toBe("Not available");
      expect(formatINR(Infinity)).toBe("Not available");
      expect(formatINR(-Infinity)).toBe("Not available");
      expect(formatINR("abc")).toBe("Not available");
    });

    test("supports custom fallback when provided", () => {
      expect(formatINR(undefined, "—")).toBe("—");
      expect(formatINR(null, "N/A")).toBe("N/A");
    });
  });

  describe("formatCount", () => {
    test("formats positive integers", () => {
      expect(formatCount(1500)).toBe("1,500");
      expect(formatCount(42)).toBe("42");
    });

    test("preserves valid zero as '0', not 'Not available'", () => {
      expect(formatCount(0)).toBe("0");
      expect(formatCount("0")).toBe("0");
    });

    test("shows 'Not available' for missing, null, or invalid counts", () => {
      expect(formatCount(undefined)).toBe("Not available");
      expect(formatCount(null)).toBe("Not available");
      expect(formatCount("")).toBe("Not available");
      expect(formatCount(NaN)).toBe("Not available");
    });
  });

  describe("formatPercent", () => {
    test("formats valid percentages", () => {
      expect(formatPercent(85)).toBe("85%");
      expect(formatPercent(100)).toBe("100%");
      expect(formatPercent(0)).toBe("0%");
      expect(formatPercent("0")).toBe("0%");
    });

    test("shows 'N/A' for zero-denominator or missing percentages", () => {
      expect(formatPercent("N/A")).toBe("N/A");
      expect(formatPercent(null)).toBe("N/A");
      expect(formatPercent(undefined)).toBe("N/A");
      expect(formatPercent(NaN)).toBe("N/A");
    });
  });

  describe("formatDateSafe", () => {
    test("formats valid date strings without throwing", () => {
      const formatted = formatDateSafe("2026-09-20T08:00:00Z");
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });

    test("returns 'Not available' for invalid or missing dates", () => {
      expect(formatDateSafe(null)).toBe("Not available");
      expect(formatDateSafe(undefined)).toBe("Not available");
      expect(formatDateSafe("invalid-date-string")).toBe("Not available");
    });
  });
});
