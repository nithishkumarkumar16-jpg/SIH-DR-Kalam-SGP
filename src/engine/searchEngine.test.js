/**
 * searchEngine.test.js — Unit tests for Search Engine & Slot Extractor
 * Ported from Project B for SGP-MAIN Jest environment
 */

import { extractSlots, tokenizeClean, findMatchingQA } from "./searchEngine.js";

describe("Search Engine & Slot Extractor", () => {

  test("Extracts category slots correctly", () => {
    const slots1 = extractSlots("I am an MBC student looking for college aid");
    expect(slots1.category).toBe("MBC");
    expect(slots1.community).toBe("mbc");

    const slots2 = extractSlots("SC post matric scholarship details");
    expect(slots2.category).toBe("SC");
    expect(slots2.community).toBe("sc");

    const slots3 = extractSlots("Need assistance for backward class candidate");
    expect(slots3.category).toBe("BC");

    const slots4 = extractSlots("Minority community student guidelines");
    expect(slots4.category).toBe("Minority");
  });

  test("Extracts State and District slots cleanly", () => {
    const slots = extractSlots("I live in Salem district of Tamil Nadu studying B.E.");
    expect(slots.state).toBe("Tamil Nadu");
    expect(slots.district).toBe("Salem");
    expect(slots.course).toBe("Engineering");
  });

  test("Extracts other states and aliases", () => {
    const slotsUP = extractSlots("Scholarship for UP student in Lucknow");
    expect(slotsUP.state).toBe("Uttar Pradesh");

    const slotsMaha = extractSlots("Maharashtra OBC student engineering waiver");
    expect(slotsMaha.state).toBe("Maharashtra");
  });

  test("Extracts gender from queries", () => {
    const slotsGirl = extractSlots("pudhumaipenn scheme for girl students");
    expect(slotsGirl.gender).toBe("Girls");

    const slotsBoy = extractSlots("assistance for male college student in diploma");
    expect(slotsBoy.gender).toBe("Boys");
  });

  test("Extracts income with Indian commas, filler words, and lakh units", () => {
    expect(extractSlots("family income 1.5 lakh in salem").income).toBe(150000);
    expect(extractSlots("household income is 250000").income).toBe(250000);
    expect(extractSlots("my income is 2 lakh").income).toBe(200000);
    expect(extractSlots("income is 1 lakh").income).toBe(100000);
    expect(extractSlots("250000").income).toBe(250000);
    expect(extractSlots("₹250000").income).toBe(250000);

    // Indian comma formatting
    expect(extractSlots("₹1,50,000").income).toBe(150000);
    expect(extractSlots("₹2,50,000").income).toBe(250000);
    expect(extractSlots("₹5,00,000").income).toBe(500000);
    expect(extractSlots("1,50,000").income).toBe(150000);
    expect(extractSlots("2,50,000").income).toBe(250000);
    expect(extractSlots("My family income is ₹1,50,000 per year.").income).toBe(150000);
    expect(extractSlots("My family's annual income is ₹1,50,000.").income).toBe(150000);

    // Natural conversational updates & filler words
    expect(extractSlots("My income is actually ₹5 lakh").income).toBe(500000);
    expect(extractSlots("My family income is now ₹5 lakh").income).toBe(500000);
    expect(extractSlots("My income is currently 3 lakh").income).toBe(300000);
    expect(extractSlots("My annual income is about ₹2 lakh").income).toBe(200000);
    expect(extractSlots("Actually my income is ₹4 lakh").income).toBe(400000);
  });

  test("Tokenizer strips stopwords properly", () => {
    const tokens = tokenizeClean("What is the official procedure for applying on the UMIS portal?");
    expect(tokens).not.toContain("what");
    expect(tokens).not.toContain("is");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("for");
    expect(tokens).toContain("official");
    expect(tokens).toContain("procedure");
    expect(tokens).toContain("umis");
  });

  test("Direct and high priority Q&A matching", () => {
    const mockQAs = [
      { id: 1, question: "what is umis", answer: "UMIS is the University Management Information System." },
      { id: 2, question: "what is first graduate scholarship eligibility", answer: "First graduate scholarship waives tuition fees." }
    ];

    const match1 = findMatchingQA("what is umis", mockQAs);
    expect(match1).not.toBeNull();
    expect(match1.qa.id).toBe(1);

    const match2 = findMatchingQA("first graduate eligibility criteria", mockQAs);
    expect(match2).not.toBeNull();
    expect(match2.qa.id).toBe(2);
  });
});
