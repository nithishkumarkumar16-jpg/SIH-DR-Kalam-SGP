/**
 * eligibilityEngine.test.js — Unit and Regression tests for Eligibility Engine
 * Ported from Project B for SGP-MAIN Jest environment with strict Anti-Hallucination tests.
 */

import { evaluateScholarship, evaluateAllScholarships, getEligibleScholarships } from "./eligibilityEngine.js";
import { scholarships as allScholarships } from "../knowledge/scholarships.js";

describe("Eligibility Engine", () => {
  const mockScholarship = {
    id: "test-sch-1",
    name: "Tamil Nadu BC Engineering Assistance",
    category: "BC",
    state: "Tamil Nadu",
    district: "All",
    course: "Engineering",
    gender: "All",
    incomeLimit: 250000,
    amount: "₹25,000 / year",
    documents: ["Aadhaar", "Income Certificate"],
    overview: "Test scheme",
    eligibilityText: "Income under ₹2.5L",
    lastDate: "December 31, 2026",
    faq: []
  };

  test("Ideal student qualifies with high match score", () => {
    const profile = {
      category: "BC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Engineering",
      gender: "Boys",
      income: 150000
    };
    const result = evaluateScholarship(mockScholarship, profile);
    expect(result.isEligible).toBe(true);
    expect(result.status).toBe("CONFIRMED MATCH");
    expect(result.matchScore).toBeGreaterThanOrEqual(70);
  });

  test("Income strictly exceeding ceiling is rejected", () => {
    const profile = {
      category: "BC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Engineering",
      gender: "Boys",
      income: 300000 // Exceeds 250000
    };
    const result = evaluateScholarship(mockScholarship, profile);
    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NOT MATCHED");
    expect(result.failedCriteria.some(c => c.toLowerCase().includes("income"))).toBe(true);
  });

  test("Category mismatch is rejected", () => {
    const profile = {
      category: "SC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Engineering",
      gender: "Boys",
      income: 150000
    };
    const result = evaluateScholarship(mockScholarship, profile);
    expect(result.isEligible).toBe(false);
    expect(result.failedCriteria.some(c => c.includes("BC"))).toBe(true);
  });

  test("Girls-only scheme gatekeeper", () => {
    const girlsScholarship = {
      ...mockScholarship,
      id: "test-pragati",
      name: "Pragati Girls Scheme",
      gender: "Girls"
    };

    const boyProfile = {
      category: "BC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Engineering",
      gender: "Boys",
      income: 150000
    };
    expect(evaluateScholarship(girlsScholarship, boyProfile).isEligible).toBe(false);

    const girlProfile = {
      ...boyProfile,
      gender: "Girls"
    };
    expect(evaluateScholarship(girlsScholarship, girlProfile).isEligible).toBe(true);
  });

  test("District-specific scheme gatekeeper", () => {
    const salemScholarship = {
      ...mockScholarship,
      id: "test-salem",
      name: "Salem Agricultural Laborers Scheme",
      district: "Salem"
    };

    const salemStudent = {
      category: "BC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Engineering",
      gender: "Boys",
      income: 120000
    };
    expect(evaluateScholarship(salemScholarship, salemStudent).isEligible).toBe(true);

    const maduraiStudent = {
      ...salemStudent,
      district: "Madurai"
    };
    expect(evaluateScholarship(salemScholarship, maduraiStudent).isEligible).toBe(false);
  });

  test("Course mismatch gatekeeper", () => {
    const profile = {
      category: "BC",
      state: "Tamil Nadu",
      district: "Salem",
      course: "Arts", // Engineering required
      income: 150000
    };
    expect(evaluateScholarship(mockScholarship, profile).isEligible).toBe(false);
  });

  // ── STRICT ANTI-HALLUCINATION REGRESSION TESTS ─────────────────────────────

  test("Regression 1: MBC + Engineering + income only does NOT hallucinate specialized schemes", () => {
    const profile = {
      category: "MBC",
      course: "Engineering",
      income: 150000,
      state: "Tamil Nadu"
    };

    const eligible = getEligibleScholarships(allScholarships, profile);
    const eligibleIds = eligible.map(r => r.scholarship.id);

    // tn-post-matric-bc-mbc requires Government Quota.
    // When quotaType is not provided (unknown), it must NOT silently pass as "government".
    // Correct status: NEEDS MORE INFORMATION (not CONFIRMED MATCH).
    const allResults = evaluateAllScholarships(allScholarships, profile);
    const postMatric = allResults.find(r => r.scholarship.id === "tn-post-matric-bc-mbc");
    expect(postMatric).toBeDefined();
    expect(postMatric.status).toBe("NEEDS MORE INFORMATION");
    // Must NOT appear in getEligibleScholarships (which only returns CONFIRMED or POTENTIAL)
    expect(eligibleIds).not.toContain("tn-post-matric-bc-mbc");

    // Must NOT match schemes requiring unprovided attributes
    expect(eligibleIds).not.toContain("nsp-aicte-saksham"); // disability not provided
    expect(eligibleIds).not.toContain("tn-govt-school-7-5-quota"); // govt school not provided
    expect(eligibleIds).not.toContain("tn-salem-farmers"); // agri-laborer not provided
    expect(eligibleIds).not.toContain("tn-pudhumaipenn"); // gender/govt school not provided
    expect(eligibleIds).not.toContain("tn-tamil-pudhalvan"); // gender/govt school not provided
  });

  test("Regression 2: MBC + female + government school matches Pudhumaipenn and rejects Pudhalvan", () => {
    const profile = {
      category: "MBC",
      gender: "Girls",
      govtSchool: true,
      state: "Tamil Nadu",
      income: 150000
    };

    const pudhumaipenn = allScholarships.find(s => s.id === "tn-pudhumaipenn");
    const pudhalvan = allScholarships.find(s => s.id === "tn-tamil-pudhalvan");

    const pudhumaipennResult = evaluateScholarship(pudhumaipenn, profile);
    expect(pudhumaipennResult.isEligible).toBe(true);
    expect(pudhumaipennResult.status).toBe("CONFIRMED MATCH");

    const pudhalvanResult = evaluateScholarship(pudhalvan, profile);
    expect(pudhalvanResult.isEligible).toBe(false);
    expect(pudhalvanResult.status).toBe("NOT MATCHED");
  });

  test("Regression 3: MBC + male + government school matches Tamil Pudhalvan and rejects Pudhumaipenn", () => {
    const profile = {
      category: "MBC",
      gender: "Boys",
      govtSchool: true,
      state: "Tamil Nadu",
      income: 150000
    };

    const pudhalvan = allScholarships.find(s => s.id === "tn-tamil-pudhalvan");
    const pudhumaipenn = allScholarships.find(s => s.id === "tn-pudhumaipenn");

    const pudhalvanResult = evaluateScholarship(pudhalvan, profile);
    expect(pudhalvanResult.isEligible).toBe(true);
    expect(pudhalvanResult.status).toBe("CONFIRMED MATCH");

    const pudhumaipennResult = evaluateScholarship(pudhumaipenn, profile);
    expect(pudhumaipennResult.isEligible).toBe(false);
    expect(pudhumaipennResult.status).toBe("NOT MATCHED");
  });

  // ── AICTE SAKSHAM & DISABILITY REGRESSION TESTS ─────────────────────────────

  test("Saksham Case 1: Engineering + 40% disability (missing income) returns POTENTIAL MATCH", () => {
    const profile = {
      course: "Engineering",
      disabled: true,
      disabilityPercent: 40
    };

    const saksham = allScholarships.find(s => s.id === "nsp-aicte-saksham");
    const result = evaluateScholarship(saksham, profile);

    expect(result.status).toBe("POTENTIAL MATCH");
    expect(result.missingRequirements.some(r => r.toLowerCase().includes("income"))).toBe(true);
  });

  test("Saksham Case 2: Engineering + 39% disability is rejected as under-benchmark", () => {
    const profile = {
      course: "Engineering",
      disabled: false,
      disabilityPercent: 39
    };

    const saksham = allScholarships.find(s => s.id === "nsp-aicte-saksham");
    const result = evaluateScholarship(saksham, profile);

    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NOT MATCHED");
    expect(result.failedCriteria.some(f => f.toLowerCase().includes("40%") || f.toLowerCase().includes("benchmark"))).toBe(true);
  });

  test("Saksham Case 3: Engineering + disability unspecified returns NEEDS MORE INFORMATION", () => {
    const profile = {
      course: "Engineering",
      income: 150000
    };

    const saksham = allScholarships.find(s => s.id === "nsp-aicte-saksham");
    const result = evaluateScholarship(saksham, profile);

    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NEEDS MORE INFORMATION");
    expect(result.missingRequirements.some(r => r.toLowerCase().includes("disability"))).toBe(true);
  });

  test("Saksham Case 4: Engineering + disability 40% + required additional criteria confirms Saksham", () => {
    const profile = {
      course: "Engineering",
      disabled: true,
      disabilityPercent: 40,
      income: 150000
    };

    const saksham = allScholarships.find(s => s.id === "nsp-aicte-saksham");
    const result = evaluateScholarship(saksham, profile);

    expect(result.isEligible).toBe(true);
    expect(result.status).toBe("CONFIRMED MATCH");
  });

  test("Saksham Case 5: Non-Engineering (Arts) + 40% disability rejects Saksham but matches TN Differently Abled", () => {
    const profile = {
      course: "Arts",
      disabled: true,
      disabilityPercent: 40,
      state: "Tamil Nadu"
    };

    const saksham = allScholarships.find(s => s.id === "nsp-aicte-saksham");
    const sakshamResult = evaluateScholarship(saksham, profile);
    expect(sakshamResult.isEligible).toBe(false);
    expect(sakshamResult.status).toBe("NOT MATCHED");
    expect(sakshamResult.failedCriteria.some(f => f.toLowerCase().includes("course") || f.toLowerCase().includes("engineering"))).toBe(true);

    const tnDiffAbled = allScholarships.find(s => s.id === "tn-differently-abled");
    const diffResult = evaluateScholarship(tnDiffAbled, profile);
    expect(diffResult.isEligible).toBe(true);
    expect(diffResult.status).toBe("CONFIRMED MATCH");
  });

  test("Regression 6: Salem + no agricultural-labourer information returns NEEDS MORE INFORMATION for Salem Farmers", () => {
    const profile = {
      district: "Salem",
      income: 120000,
      state: "Tamil Nadu"
    };

    const salemFarmers = allScholarships.find(s => s.id === "tn-salem-farmers");
    const result = evaluateScholarship(salemFarmers, profile);

    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NEEDS MORE INFORMATION");
    expect(result.missingRequirements.some(r => r.toLowerCase().includes("agricultural"))).toBe(true);
  });

  test("Regression 7: Armed-forces scheme without armed-forces information returns NEEDS MORE INFORMATION", () => {
    const profile = {
      course: "Engineering",
      income: 150000
    };

    const armedForcesScheme = {
      id: "test-pmss",
      name: "Prime Minister's Scholarship Scheme for Wards of Armed Forces (PMSS)",
      requiresArmedForces: true,
      course: "Engineering"
    };

    const result = evaluateScholarship(armedForcesScheme, profile);
    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NEEDS MORE INFORMATION");
    expect(result.missingRequirements.some(r => r.toLowerCase().includes("armed"))).toBe(true);
  });

  test("Regression 8: 7.5% quota without government-school information returns NEEDS MORE INFORMATION", () => {
    const profile = {
      course: "Engineering",
      state: "Tamil Nadu"
    };

    const quotaScheme = allScholarships.find(s => s.id === "tn-govt-school-7-5-quota");
    const result = evaluateScholarship(quotaScheme, profile);

    expect(result.isEligible).toBe(false);
    expect(result.status).toBe("NEEDS MORE INFORMATION");
    expect(result.missingRequirements.some(r => r.toLowerCase().includes("government school"))).toBe(true);
  });
});
