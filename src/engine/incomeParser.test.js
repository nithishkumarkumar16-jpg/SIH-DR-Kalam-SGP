/**
 * incomeParser.test.js — Exhaustive unit tests for Indian income formatting & extraction
 * Ported from Project B for SGP-MAIN Jest environment
 */

import { extractIncome } from "./searchEngine.js";

describe("Income Parser", () => {
  test("Parses Indian comma separated numbers", () => {
    expect(extractIncome("₹1,50,000")).toBe(150000);
    expect(extractIncome("1,50,000")).toBe(150000);
    expect(extractIncome("₹2,50,000")).toBe(250000);
    expect(extractIncome("2,50,000")).toBe(250000);
    expect(extractIncome("₹5,00,000")).toBe(500000);
    expect(extractIncome("5,00,000")).toBe(500000);
    expect(extractIncome("10,00,000")).toBe(1000000);
  });

  test("Parses natural sentences with Indian currency and units", () => {
    expect(extractIncome("My family income is ₹1,50,000 per year.")).toBe(150000);
    expect(extractIncome("My family's annual income is ₹1,50,000.")).toBe(150000);
    expect(extractIncome("household income is ₹2,50,000")).toBe(250000);
    expect(extractIncome("annual income around 1.5 lakh")).toBe(150000);
    expect(extractIncome("earns 2.5 lpa")).toBe(250000);
  });

  test("Handles conversational updates and filler words", () => {
    expect(extractIncome("My income is actually ₹5 lakh")).toBe(500000);
    expect(extractIncome("My family income is now ₹5 lakh")).toBe(500000);
    expect(extractIncome("My income is currently 3 lakh")).toBe(300000);
    expect(extractIncome("My annual income is about ₹2 lakh")).toBe(200000);
    expect(extractIncome("Actually my income is ₹4 lakh")).toBe(400000);
    expect(extractIncome("Income is under 2.5 lakh")).toBe(250000);
  });

  test("Handles standalone numbers", () => {
    expect(extractIncome("250000")).toBe(250000);
    expect(extractIncome("₹250000")).toBe(250000);
    expect(extractIncome("150000")).toBe(150000);
    expect(extractIncome("100000")).toBe(100000);
  });

  test("Returns undefined for non-income queries", () => {
    expect(extractIncome("what is umis portal")).toBeUndefined();
    expect(extractIncome("how to apply for scholarship")).toBeUndefined();
    expect(extractIncome("engineering scholarship in salem")).toBeUndefined();
  });
});
