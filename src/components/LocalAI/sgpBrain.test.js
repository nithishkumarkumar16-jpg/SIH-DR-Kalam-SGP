/**
 * sgpBrain.test.js — Comprehensive Regression & Integration Test Suite for SGP Brain
 * Tests askSGPBrain() contract, intent detection, slot extraction, Q&A, and eligibility reasoning.
 */

import { askSGPBrain } from "./sgpBrain.js";

describe("SGP Local AI Brain (askSGPBrain)", () => {

  // 1. Contract & Input Safety
  test("Safely handles null, undefined, empty, or whitespace inputs", async () => {
    const res1 = await askSGPBrain(null);
    expect(res1).toHaveProperty("intent");
    expect(res1).toHaveProperty("slots");
    expect(typeof res1.response).toBe("string");
    expect(res1.response.length).toBeGreaterThan(0);

    const res2 = await askSGPBrain("");
    expect(res2.intent).toBe("unknown");
    expect(res2.response.length).toBeGreaterThan(0);

    const res3 = await askSGPBrain("    ");
    expect(res3.intent).toBe("unknown");
    expect(res3.response.length).toBeGreaterThan(0);
  });

  // 2. Quick Question Buttons
  test("Handles Quick Question: 'I AM STUDENT'", async () => {
    const res = await askSGPBrain("I AM STUDENT");
    expect(res.intent).toBe("i_am_student");
    expect(res.response).toContain("Welcome Student");
    expect(res.response).toContain("Eligibility");
  });

  test("Handles Quick Question: 'How to Apply?'", async () => {
    const res = await askSGPBrain("How to Apply?");
    expect(["apply_general", "apply", "portal_nsp", "qa_match"]).toContain(res.intent);
    expect(res.response.length).toBeGreaterThan(50);
    expect(res.response).not.toContain("Maharashtra");
    expect(res.response).not.toContain("SC");
  });

  test("Handles Quick Question: 'Check Eligibility'", async () => {
    const res = await askSGPBrain("Check Eligibility");
    expect(res.intent).toBe("eligibility");
    expect(res.response).toContain("Eligibility");
  });

  test("Handles Quick Question: 'Documents Needed'", async () => {
    const res = await askSGPBrain("Documents Needed");
    expect(res.intent).toBe("documents");
    expect(res.response).toContain("Aadhaar Card");
    expect(res.response).toContain("Income Certificate");
  });

  test("Handles Quick Question: 'Bank Not Linked'", async () => {
    const res = await askSGPBrain("Bank Not Linked");
    expect(["bank_link", "dbt_activate"]).toContain(res.intent);
    expect(res.response).toContain("NPCI");
  });

  test("Handles Quick Question: 'Aadhaar Mismatch'", async () => {
    const res = await askSGPBrain("Aadhaar Mismatch");
    expect(res.intent).toBe("aadhaar_mismatch");
    expect(res.response).toContain("myaadhaar.uidai.gov.in");
  });

  test("Handles Quick Question: 'Why Rejected?'", async () => {
    const res = await askSGPBrain("Why Rejected?");
    expect(res.intent).toBe("rejection");
    expect(res.response).toContain("Rejection");
  });

  test("Handles Quick Question: 'Scheme Closing Date'", async () => {
    const res = await askSGPBrain("Scheme Closing Date");
    expect(res.intent).toBe("deadline");
    expect(res.response).toContain("Deadlines");
  });

  // 3. Eligibility & Profile Queries
  test("Evaluates eligibility for MBC student with income in Salem", async () => {
    const query = "I am an MBC student in Salem studying Engineering with income ₹1,50,000";
    const res = await askSGPBrain(query);
    expect(res.intent).toBe("eligibility");
    expect(res.slots.category).toBe("MBC");
    expect(res.slots.district).toBe("Salem");
    expect(res.slots.course).toBe("Engineering");
    expect(res.slots.income).toBe(150000);
    expect(res.response).toContain("Potentially eligible based on the information provided");
    expect(res.response).toContain("Tamil Nadu Post-Matric Scholarship for BC / MBC");
    // Strict Anti-Hallucination: Must NOT recommend schemes with missing required attributes
    expect(res.response).not.toContain("Saksham");
    expect(res.response).not.toContain("Agricultural Laborers Children Special Educational Grant");
    expect(res.response).not.toContain("7.5% Government School Quota");
    expect(res.response).not.toContain("Pudhumaipenn");
    expect(res.response).not.toContain("Tamil Pudhalvan");
  });

  test("Evaluates eligibility for SC student", async () => {
    const query = "What scholarships are available for SC students with income under 2 lakh?";
    const res = await askSGPBrain(query);
    expect(res.intent).toBe("eligibility");
    expect(res.slots.category).toBe("SC");
    expect(res.response).toContain("SC");
  });

  test("Handles conversational income updates and filler words", async () => {
    const query = "My family income is actually ₹1,50,000 and I am BC engineering student";
    const res = await askSGPBrain(query);
    expect(res.slots.income).toBe(150000);
    expect(res.slots.category).toBe("BC");
    expect(res.intent).toBe("eligibility");
  });

  test("Handles course and level questions (Diploma, UG, School)", async () => {
    const res1 = await askSGPBrain("scholarships for diploma students");
    expect(res1.slots.course).toBe("Diploma");
    expect(res1.response.length).toBeGreaterThan(50);

    const res2 = await askSGPBrain("scholarship for high school 10th class");
    expect(res2.slots.course).toBe("School");
    expect(res2.response.length).toBeGreaterThan(50);
  });

  // 4. DBT & Banking Questions
  test("Answers DBT activation queries", async () => {
    const res = await askSGPBrain("How to activate DBT in bank?");
    expect(["dbt_activate", "bank_link"]).toContain(res.intent);
    expect(res.response).toContain("NPCI");
    expect(res.response).toContain("npci.org.in");
  });

  test("Answers DBT difference queries", async () => {
    const res = await askSGPBrain("difference between linked and seeded");
    expect(res.intent).toBe("dbt_difference");
    expect(res.response).toContain("Linked");
    expect(res.response).toContain("Seeded");
    expect(res.response).toContain("DBT Enabled");
  });

  // 5. Official Q&A Queries
  test("Matches verified Q&A: 'What is UMIS?'", async () => {
    const res = await askSGPBrain("what is umis");
    expect(["full_form", "qa_match"]).toContain(res.intent);
    expect(res.response).toContain("University Management Information System");
  });

  test("Matches verified Q&A: 'Is Aadhaar mandatory?'", async () => {
    const res = await askSGPBrain("is aadhaar mandatory for scholarship");
    expect(["qa_match", "documents", "aadhaar_mismatch"]).toContain(res.intent);
    expect(res.response.toLowerCase()).toContain("aadhaar");
  });

  test("Matches verified Q&A for state schemes: 'Pudhumaipenn'", async () => {
    const res = await askSGPBrain("tell me about pudhumaipenn scheme");
    expect(["qa_match", "eligibility"]).toContain(res.intent);
    expect(res.response.toLowerCase()).toContain("pudhumaipenn");
  });

  // 6. Benefits & Amounts
  test("Answers scholarship amount queries", async () => {
    const res = await askSGPBrain("how much scholarship money will I get?");
    expect(res.intent).toBe("amount");
    expect(res.response).toContain("Grant Amounts");
  });

  // 7. Renewal
  test("Answers renewal queries", async () => {
    const res = await askSGPBrain("how to renew scholarship for second year");
    expect(res.intent).toBe("renewal");
    expect(res.response).toContain("Renewal");
    expect(res.response).toContain("75% attendance");
  });

  // 8. Unknown & Off-Topic
  test("Gracefully handles out of topic queries", async () => {
    const res = await askSGPBrain("who won the cricket world cup?");
    expect(res.intent).toBe("off_topic");
    expect(res.response).toContain("scholarship");
  });

  test("Gracefully handles unknown queries", async () => {
    const res = await askSGPBrain("quantum entanglement in superconductors");
    expect(res.response).toContain("help");
  });

  // 9. Specific Quality & Anti-Hallucination Regression Tests
  describe("Quality Fixes & Anti-Hallucination Regressions", () => {
    test("'NSP' returns concise full form", async () => {
      const res = await askSGPBrain("NSP");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("National Scholarship Portal");
    });

    test("'NSp full form' returns National Scholarship Portal", async () => {
      const res = await askSGPBrain("NSp full form");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("National Scholarship Portal");
    });

    test("'full form of NSP' returns National Scholarship Portal", async () => {
      const res = await askSGPBrain("full form of NSP");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("National Scholarship Portal");
    });

    test("'UMIS full form' returns University Management Information System", async () => {
      const res = await askSGPBrain("UMIS full form");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("University Management Information System");
    });

    test("'full form of UMIS' returns University Management Information System", async () => {
      const res = await askSGPBrain("full form of UMIS");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("University Management Information System");
    });

    test("'full of UMIS and NSP' returns BOTH full forms", async () => {
      const res = await askSGPBrain("full of UMIS and NSP");
      expect(res.intent).toBe("full_form");
      expect(res.response).toContain("University Management Information System");
      expect(res.response).toContain("National Scholarship Portal");
    });

    test("'what is your name' directly answers identity", async () => {
      const res = await askSGPBrain("what is your name");
      expect(res.intent).toBe("bot_identity");
      expect(res.response).toContain("SGP Virtual Assistant");
    });

    test("'how to apply' gives general guidance with ZERO hallucinated profile", async () => {
      const res = await askSGPBrain("how to apply");
      expect(res.intent).toBe("apply_general");
      expect(res.response).toContain("General Step-by-Step Scholarship Application Guide");
      // Anti-hallucination checks:
      expect(res.response).not.toContain("Maharashtra");
      expect(res.response).not.toContain("SC");
      expect(res.response).not.toContain("Engineering");
    });

    test("'how do I apply for a scholarship' gives general guidance with ZERO hallucinated profile", async () => {
      const res = await askSGPBrain("how do I apply for a scholarship");
      expect(res.intent).toBe("apply_general");
      expect(res.response).toContain("General Step-by-Step Scholarship Application Guide");
      expect(res.response).not.toContain("Maharashtra");
      expect(res.response).not.toContain("SC");
      expect(res.response).not.toContain("Engineering");
    });

    test("'umis how to apply' detects entity UMIS and provides UMIS application guidance", async () => {
      const res = await askSGPBrain("umis how to apply");
      expect(res.intent).toBe("apply_umis");
      expect(res.response).toContain("How to Apply via UMIS");
      expect(res.response).toContain("college");
      expect(res.response).not.toContain("Maharashtra");
    });

    test("Eligibility safety: 'MBC student from Salem studying Engineering with income ₹1,50,000' does NOT hallucinate special schemes", async () => {
      const res = await askSGPBrain("MBC student from Salem studying Engineering with income ₹1,50,000");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("Potentially eligible based on the information provided");
      expect(res.response).not.toContain("You qualify");
      expect(res.response).not.toContain("Saksham");
      expect(res.response).not.toContain("Agricultural Laborers Children Special Educational Grant");
      expect(res.response).not.toContain("7.5% Government School Quota");
      expect(res.response).not.toContain("Pudhumaipenn");
      expect(res.response).not.toContain("Tamil Pudhalvan");
      expect(res.response).toContain("To check additional schemes accurately, I need:");
      expect(res.response).toContain("Gender");
      expect(res.response).toContain("Government/private school background");
      expect(res.response).toContain("Disability status");
      expect(res.response).toContain("Parent occupation");
    });

    test("Eligibility safety: 'MBC female student from government school studying Engineering with income ₹1,50,000' confirms Pudhumaipenn", async () => {
      const res = await askSGPBrain("MBC female student from government school studying Engineering with income ₹1,50,000");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("Pudhumaipenn");
      expect(res.response).not.toContain("Tamil Pudhalvan");
    });

    test("Eligibility safety: 'MBC male student from government school studying Engineering with income ₹1,50,000' confirms Tamil Pudhalvan", async () => {
      const res = await askSGPBrain("MBC male student from government school studying Engineering with income ₹1,50,000");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("Tamil Pudhalvan");
      expect(res.response).not.toContain("Pudhumaipenn");
    });
  });

  // 11. All 6 User Test Rounds
  test("Executes all 6 rounds and outputs responses", async () => {
    const fs = require("fs");
    const rounds = [
      {
        name: "Round 1 — Identity & basic terms",
        questions: [
          "What is your name?",
          "What can you do?",
          "What is NSP?",
          "NSP full form",
          "What is UMIS?",
          "UMIS full form",
          "Full form of NSP and UMIS",
          "What is DBT?",
          "What is NPCI?",
          "What is Aadhaar seeding?"
        ]
      },
      {
        name: "Round 2 — Application guidance",
        questions: [
          "How to apply for scholarship?",
          "How to apply through NSP?",
          "How to apply through UMIS?",
          "How to apply for post matric scholarship?",
          "Where should I apply for Tamil Nadu scholarship?",
          "What documents are required to apply?",
          "What should I do before applying?"
        ]
      },
      {
        name: "Round 3 — Anti-hallucination eligibility",
        questions: [
          "I am an MBC student from Salem studying Engineering with income ₹1,50,000",
          "I am an MBC female student from Salem studying Engineering with income ₹1,50,000",
          "I am an MBC male student from Salem studying Engineering with income ₹1,50,000",
          "I am an Engineering student with income ₹1,50,000",
          "I am an Engineering student with 40% disability",
          "I am from Salem and my parent is a registered agricultural labourer",
          "I am eligible for 7.5% government school quota",
          "I am a student but I don't know my scholarship eligibility"
        ]
      },
      {
        name: "Round 4 — DBT / bank",
        questions: [
          "What is DBT?",
          "How do I enable DBT?",
          "How do I link Aadhaar with my bank account?",
          "How do I check NPCI mapping?",
          "My Aadhaar is linked to my bank. Is DBT enabled?",
          "My bank account is Aadhaar seeded. Can I receive scholarship?"
        ]
      },
      {
        name: "Round 5 — Documents & verification",
        questions: [
          "What documents do I need for scholarship?",
          "What income certificate is required?",
          "What community certificate is required?",
          "Why should my name match across documents?",
          "What happens if my Aadhaar name and marksheet name are different?",
          "My income certificate has an old date. What should I do?",
          "Can you verify whether my certificate is genuine?"
        ]
      },
      {
        name: "Round 6 — Difficult natural-language questions",
        questions: [
          "I don't know whether my bank is DBT enabled. What should I do?",
          "My name is different in Aadhaar and 10th marksheet. Can I apply?",
          "I am MBC but I don't know which scholarship is best for me.",
          "I am studying engineering in Tamil Nadu. Which scholarships can I apply for?",
          "I am from Salem. What scholarships are available?",
          "Can I get both NSP and Tamil Nadu scholarship?",
          "Which scholarship should I apply for first?"
        ]
      }
    ];

    let output = "";
    for (const round of rounds) {
      output += "==================================================\n";
      output += round.name + "\n";
      output += "==================================================\n\n";
      for (let idx = 0; idx < round.questions.length; idx++) {
        const q = round.questions[idx];
        const res = await askSGPBrain(q);
        expect(res.response).toBeTruthy();
        output += "### Q" + (idx + 1) + ": " + q + "\n";
        output += "**Intent**: " + res.intent + " | **Slots**: " + JSON.stringify(res.slots || {}) + "\n\n";
        output += "**Response**:\n" + res.response + "\n\n";
        output += "--------------------------------------------------\n\n";
      }
    }

    fs.writeFileSync("all_rounds_test_output.txt", output, "utf8");
    expect(fs.existsSync("all_rounds_test_output.txt")).toBe(true);
  });

  // 12. Section 17: 20-Question Final 10/10 Correctness & Safety Regression Suite
  describe("Section 17: 20-Question Final 10/10 Correctness & Safety Regression Suite", () => {

    test("Q1: 'I am eligible for 7.5% government school quota' -> dedicated intent, NEVER School or prematric", async () => {
      const res = await askSGPBrain("I am eligible for 7.5% government school quota");
      expect(res.intent).toBe("quota_7_5");
      expect(res.slots.course).not.toBe("School");
      expect(res.slots.level).not.toBe("prematric");
      expect(res.response).toContain("7.5% Quota");
      expect(res.response).toContain("Tamil Nadu");
    });

    test("Q2: 'What is 7.5% quota?' -> explains admission & fee concession", async () => {
      const res = await askSGPBrain("What is 7.5% quota?");
      expect(res.intent).toBe("quota_7_5");
      expect(res.response).toContain("7.5% Quota");
      expect(res.response).toContain("Government schools");
      expect(res.response).toContain("100% Fee Exemption");
    });

    test("Q3: 'Am I eligible for 7.5% government school quota?' -> asks only for required missing info", async () => {
      const res = await askSGPBrain("Am I eligible for 7.5% government school quota?");
      expect(res.intent).toBe("quota_7_5");
      expect(res.response).toContain("Class 6 to Class 12 in Tamil Nadu Government schools");
      // Does not assume gender or unstated marks
      expect(res.slots.gender).toBeUndefined();
    });

    test("Q4: 'I am an Engineering student with 40% disability' -> maps Saksham as POTENTIAL MATCH / lists missing mandatory criteria", async () => {
      const res = await askSGPBrain("I am an Engineering student with 40% disability");
      expect(res.slots.course).toBe("Engineering");
      expect(res.slots.disabled).toBe(true);
      expect(res.slots.disabilityPercent).toBe(40);
      expect(res.response).toContain("AICTE Saksham");
      expect(res.response).toContain("POTENTIAL MATCH");
      expect(res.response).not.toContain("no confirmed schemes match yet");
      expect(res.response).not.toContain("no matching scheme found");
    });

    test("Q5: 'I am an Engineering student with 39% disability' -> identifies under-benchmark disability", async () => {
      const res = await askSGPBrain("I am an Engineering student with 39% disability");
      expect(res.slots.course).toBe("Engineering");
      expect(res.slots.disabilityPercent).toBe(39);
      expect(res.response).toContain("40%");
      expect(res.response).toContain("benchmark");
    });

    test("Q6: 'Can you verify whether my certificate is genuine?' -> strict capability boundary", async () => {
      const res = await askSGPBrain("Can you verify whether my certificate is genuine?");
      expect(res.intent).toBe("verify_cert");
      expect(res.response).toContain("cannot independently confirm that a government certificate is genuine");
      expect(res.response).toContain("document consistency and readiness check");
      expect(res.response).toContain("Official verification resource");
      expect(res.response).not.toContain("SGP verified your certificate");
    });

    test("Q7: 'My Aadhaar is linked to my bank. Is DBT enabled?' -> careful non-absolute wording", async () => {
      const res = await askSGPBrain("My Aadhaar is linked to my bank. Is DBT enabled?");
      expect(res.intent).toBe("dbt_difference");
      expect(res.response).toContain("Aadhaar being linked to your bank account does not by itself confirm that DBT is active");
      expect(res.response).toContain("seeded/mapped for DBT");
      expect(res.response).not.toContain("Your DBT is active");
      expect(res.response).not.toContain("CANNOT be disbursed");
    });

    test("Q8: 'My bank account is Aadhaar seeded. Can I receive scholarship?' -> positive step but not guarantee", async () => {
      const res = await askSGPBrain("My bank account is Aadhaar seeded. Can I receive scholarship?");
      expect(res.intent).toBe("dbt_difference");
      expect(res.response).toContain("That is a positive step, but Aadhaar seeding alone does not guarantee scholarship payment");
      expect(res.response).toContain("approved");
      expect(res.response).not.toContain("definitely be credited");
    });

    test("Q9: 'What documents do I need for scholarship?' -> Commonly Required Documents with disclaimer", async () => {
      const res = await askSGPBrain("What documents do I need for scholarship?");
      expect(res.intent).toBe("documents");
      expect(res.response).toContain("Commonly Required Scholarship Documents");
      expect(res.response).toContain("Exact documents vary by scholarship scheme and application route");
      expect(res.response).toContain("Common Documents");
      expect(res.response).toContain("Additional Documents");
      expect(res.response).not.toContain("Mandatory Documents for All Schemes");
    });

    test("Q10: 'What income certificate is required?' -> scheme-dependent wording without absolute claims", async () => {
      const res = await askSGPBrain("What income certificate is required?");
      expect(res.intent).toBe("income_cert");
      expect(res.response).toContain("Requirements vary by scheme and issuing authority");
      expect(res.response).toContain("An outdated or invalid income certificate may cause an application to be rejected");
      expect(res.response).not.toContain("instant portal rejection");
    });

    test("Q11: 'Why should my name match across documents?' -> SGP matching model and guidance", async () => {
      const res = await askSGPBrain("Why should my name match across documents?");
      expect(res.intent).toBe("aadhaar_mismatch");
      expect(res.response).toContain("Consistent identity details reduce verification problems. SGP can compare names and other fields and classify differences such as exact, minor, or significant mismatch.");
    });

    test("Q12: 'My Aadhaar name and marksheet name are different. Can I apply?' -> non-absolute guidance", async () => {
      const res = await askSGPBrain("My Aadhaar name and marksheet name are different. Can I apply?");
      expect(res.intent).toBe("aadhaar_mismatch");
      expect(res.response).toContain("You may still be able to apply, but the mismatch could cause verification issues. First identify whether it is a minor formatting/spelling difference or a significant difference.");
      expect(res.response).not.toContain("you cannot apply");
    });

    test("Q13: 'I am MBC but I don't know which scholarship is best for me.' -> progressive flow asks income and course first", async () => {
      const res = await askSGPBrain("I am MBC but I don't know which scholarship is best for me.");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("I can help shortlist the right scholarships.");
      expect(res.response).toContain("Your annual family income");
      expect(res.response).toContain("Your course/degree");
      // Does not assume gender or engineering
      expect(res.slots.gender).toBeUndefined();
      expect(res.slots.course).toBeUndefined();
    });

    test("Q14: 'I am studying engineering in Tamil Nadu. Which scholarships can I apply for?' -> asks community and income first", async () => {
      const res = await askSGPBrain("I am studying engineering in Tamil Nadu. Which scholarships can I apply for?");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("I can shortlist scholarships for you. First tell me:");
      expect(res.response).toContain("Community/category");
      expect(res.response).toContain("Annual family income");
      // Does not assume gender or category
      expect(res.slots.gender).toBeUndefined();
      expect(res.slots.category).toBeUndefined();
    });

    test("Q15: 'I am from Salem. What scholarships are available?' -> asks community, income, and course first", async () => {
      const res = await askSGPBrain("I am from Salem. What scholarships are available?");
      expect(res.intent).toBe("eligibility");
      expect(res.response).toContain("I can help find scholarships available to students in Salem.");
      expect(res.response).toContain("Community/category");
      expect(res.response).toContain("Annual family income");
      expect(res.response).toContain("Course/degree");
      // Does not assume MBC or Engineering
      expect(res.slots.category).toBeUndefined();
      expect(res.slots.course).toBeUndefined();
    });

    test("Q16: 'Can I get both NSP and Tamil Nadu scholarship?' -> balanced concurrent benefit policy", async () => {
      const res = await askSGPBrain("Can I get both NSP and Tamil Nadu scholarship?");
      expect(res.intent).toBe("dual_scholarship");
      expect(res.response).toContain("It depends on the specific NSP and Tamil Nadu schemes.");
      expect(res.response).toContain("Some scholarships may not permit simultaneous benefits, while some benefits may be compatible.");
      expect(res.response).toContain("Before accepting two benefits, confirm the current official scheme guidelines.");
      expect(res.response).not.toContain("you cannot draw two");
    });

    test("Q17: 'How to apply' -> general guide labeled Typical process", async () => {
      const res = await askSGPBrain("How to apply");
      expect(res.intent).toBe("apply_general");
      expect(res.response).toContain("Typical process");
      expect(res.response).toContain("Exact steps, documents, and verification requirements vary by scheme");
    });

    test("Q18: 'How to apply through NSP?' -> routes to NSP guide with official portal", async () => {
      const res = await askSGPBrain("How to apply through NSP?");
      expect(res.intent).toBe("apply_nsp");
      expect(res.response).toContain("National Scholarship Portal (NSP) — Typical Process");
      expect(res.response).toContain("scholarships.gov.in");
    });

    test("Q19: 'How to apply through UMIS?' -> routes to UMIS guide with official portal", async () => {
      const res = await askSGPBrain("How to apply through UMIS?");
      expect(res.intent).toBe("apply_umis");
      expect(res.response).toContain("UMIS (University Management Information System) — Typical Process");
      expect(res.response).toContain("umis.tn.gov.in");
    });

    test("Q20: 'What is your name?' -> concise identity as SGP Virtual Assistant", async () => {
      const res = await askSGPBrain("What is your name?");
      expect(res.intent).toBe("bot_identity");
      expect(res.response).toContain("SGP Virtual Assistant");
    });
  });

  // 13. Scholarship Purpose & Benefits Regression Suite
  describe("Scholarship Purpose & Benefits Regression Suite", () => {
    const purposeQueries = [
      "Why do scholarships matter?",
      "Why should I take a scholarship?",
      "Is applying for a scholarship useful?",
      "What is the benefit of getting a scholarship?",
      "Do I really need to apply for a scholarship?",
      "Why should students get scholarships?",
      "Why apply for a scholarship?",
      "Why are scholarships important?",
      "Are scholarships useful?",
      "Are scholarships worth applying for?",
      "What benefits do scholarships provide?",
      "How does a scholarship help students?",
      "Why do students need scholarships?",
      "Why should students apply?",
      "Why get a scholarship?",
      "why i need to apply scholarship",
      "what are the benefits of scholarships?",
      "Why should I apply?"
    ];

    purposeQueries.forEach(q => {
      test(`'${q}' -> scholarship_purpose with anti-hallucination check`, async () => {
        const res = await askSGPBrain(q);
        expect(res.intent).toBe("scholarship_purpose");
        expect(res.response).toContain("Why Should I Apply for a Scholarship?");
        expect(res.response).toContain("reduce the financial burden of education");
        expect(res.response).not.toMatch(/\b(?:Salem|agricultural|smallholder|MBC|SC|ST|BC|Engineering)\b/i);
      });
    });

    test("Application questions MUST NOT become scholarship_purpose", async () => {
      const q1 = await askSGPBrain("How do I apply for NSP?");
      expect(q1.intent).not.toBe("scholarship_purpose");
      expect(q1.intent).toBe("apply_nsp");

      const q2 = await askSGPBrain("How to apply for UMIS?");
      expect(q2.intent).not.toBe("scholarship_purpose");
      expect(q2.intent).toBe("apply_umis");

      const q3 = await askSGPBrain("Where can I apply for scholarship?");
      expect(q3.intent).not.toBe("scholarship_purpose");
      expect(q3.intent).toBe("apply_general");
    });
  });
});
