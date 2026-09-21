/**
 * sgpThreeFeatures.test.js - Correctness Audit & Regression Tests for 3 SGP Features
 *
 * Feature 1: Parent-Income Flow
 * Feature 2: BC/MBC Quota Rules (scheme-specific, tri-state)
 * Feature 3: First Graduate Flag (tri-state: true | false | null)
 */

import { verifyNames, buildCrossDocumentMatrix } from "../utils/verificationEngine";
import { evaluateScholarship } from "./eligibilityEngine";
import { extractCommunityCertificateData } from "../utils/fieldParsers";
import { buildUnifiedProfile, createProfileFromForm } from "../adapters/profileAdapter";
import { scholarships } from "../knowledge/scholarships";

// --- Shared test schemes ---

const bcGovtScheme = {
  id: "tn-post-matric-bc-mbc",
  name: "Tamil Nadu Post-Matric Scholarship for BC / MBC / DNC Students",
  category: "BC",
  quota: "govt-only",
  requiresGovtQuota: true,
  course: "All",
  gender: "All",
  incomeLimit: 250000,
};

const bcOpenScheme = {
  id: "open-bc-scholarship",
  name: "Open BC Higher Education Scheme",
  category: "BC",
  quota: "",
  course: "All",
  gender: "All",
  incomeLimit: 250000,
};

const scScheme = {
  id: "tn-post-matric-sc-st",
  name: "Tamil Nadu Post-Matric Scholarship for SC / ST Students",
  category: "SC",
  course: "All",
  gender: "All",
  incomeLimit: 250000,
};

const fgScheme = scholarships.find(s => s.id === "tn-first-graduate") || {
  id: "tn-first-graduate",
  name: "Tamil Nadu First Graduate Tuition Fee Concession",
  category: "All",
  course: "Engineering",
  gender: "All",
  requiresFirstGraduate: true,
};

const regularScheme = {
  id: "regular-merit-scholarship",
  name: "Regular Merit Higher Education Scholarship",
  category: "All",
  course: "All",
  gender: "All",
  requiresFirstGraduate: false,
};

// --- Feature 1: Parent-Income Flow ---

describe("SGP Feature 1: Parent-Income Flow", () => {
  test("T1-1: incomeApplicant=parent, student & parent names differ -> NEEDS_REVIEW, parentNameUsed=true", () => {
    const profile = {
      incomeApplicant: "parent",
      studentName: "ARUN KUMAR",
      parentName: "KUMARASAMY M",
      incomeCertificateName: "KUMARASAMY M",
    };
    const res = verifyNames(profile, {});
    expect(res.studentNameMatch).toBe("SKIPPED");
    expect(res.parentNameUsed).toBe(true);
    expect(res.requiresReview).toBe(true);
    expect(res.status).toBe("NEEDS_REVIEW");
    expect(res.parentIncomeConsistent).toBe(true);
  });

  test("T1-2: incomeApplicant=parent, names match -> consistent, parentNameUsed=true", () => {
    const profile = {
      incomeApplicant: "parent",
      studentName: "ARUN KUMAR",
      parentName: "ARUN KUMAR",
      incomeCertificateName: "ARUN KUMAR",
    };
    const res = verifyNames(profile, { status: "OK" });
    expect(res.studentNameMatch).toBe("SKIPPED");
    expect(res.parentNameUsed).toBe(true);
    expect(res.status).toBe("OK");
    expect(res.parentIncomeConsistent).toBe(true);
  });

  test("T1-3: incomeApplicant=student, names differ -> student comparison checked, parentNameUsed=false", () => {
    const profile = {
      incomeApplicant: "student",
      studentName: "ARUN KUMAR",
      parentName: "KUMARASAMY M",
    };
    const res = verifyNames(profile, { status: "FAIL" });
    expect(res.studentNameMatch).toBe("CHECKED");
    expect(res.parentNameUsed).toBe(false);
    expect(res.status).toBe("FAIL");
  });

  test("T1-4: Student override after selecting parent -> standard student name comparison restored", () => {
    let profile = { incomeApplicant: "parent", studentName: "SIVA R", parentName: "RAMAN K" };
    let res = verifyNames(profile, {});
    expect(res.parentNameUsed).toBe(true);
    expect(res.studentNameMatch).toBe("SKIPPED");

    profile = { ...profile, incomeApplicant: "student" };
    res = verifyNames(profile, { status: "FAIL" });
    expect(res.parentNameUsed).toBe(false);
    expect(res.studentNameMatch).toBe("CHECKED");
    expect(res.status).toBe("FAIL");
  });

  test("T1-5: applicantName in engine result is always the STUDENT — parent name goes to incomeProviderName", () => {
    const sampleScheme = {
      id: "test-scheme",
      name: "General Test Scholarship",
      category: "All",
      course: "All",
      gender: "All",
      incomeLimit: 500000,
    };
    const parentProfile = {
      name: "ARUN KUMAR",
      studentName: "ARUN KUMAR",
      parentName: "RAMASAMY K",
      incomeApplicant: "parent",
      income: 180000,
      course: "Engineering",
      community: "BC",
      level: "ug",
    };
    const result = evaluateScholarship(sampleScheme, parentProfile);
    // CORRECTED: applicantName must be the STUDENT, not the parent
    expect(result.applicantName).toBe("ARUN KUMAR");
    // Parent name tracked separately
    expect(result.incomeProviderName).toBe("RAMASAMY K");
    expect(result.incomeApplicant).toBe("parent");
  });

  test("Cross-Document Matrix: Parent mode prevents false-positive hard red mismatch", () => {
    const matrixStudent = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "ARUN KUMAR",
      bankAccType: "Single",
      incomeData: { name: "RAMASAMY K", income: 150000 },
      studentIncome: "150000",
      incomeApplicant: "student",
    });
    expect(matrixStudent.hasNameMismatch).toBe(true);
    expect(matrixStudent.nameConsistencyStatus).toBe("red");

    const matrixParent = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "ARUN KUMAR",
      bankAccType: "Single",
      incomeData: { name: "RAMASAMY K", income: 150000 },
      studentIncome: "150000",
      incomeApplicant: "parent",
    });
    expect(matrixParent.hasNameMismatch).toBe(false);
    expect(matrixParent.nameConsistencyStatus).toBe("yellow");
    expect(matrixParent.overallReadiness).not.toContain("Issues Found");
  });
});

// --- Feature 2: BC/MBC Quota Rules ---

describe("SGP Feature 2: BC/MBC Quota Rules", () => {
  test("T2-1: BC community, quotaType=government, scholarship.quota=govt-only -> isEligible=true", () => {
    const profile = {
      name: "SURESH K",
      category: "BC",
      community: "BC",
      income: 150000,
      quotaType: "government",
      course: "Engineering",
      level: "ug",
    };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
    expect(res.passedCriteria).toContain("Government Quota confirmed");
  });

  test("T2-2: BC community, quotaType=management, scholarship.quota=govt-only -> isEligible=false (NOT MATCHED)", () => {
    const profile = {
      name: "SURESH K",
      category: "BC",
      community: "BC",
      income: 150000,
      quotaType: "management",
      course: "Engineering",
      level: "ug",
    };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NOT MATCHED");
    expect(res.failedCriteria).toContain("Requires Government Quota admission for BC/MBC category");
  });

  test("T2-3: BC community, quotaType=management, scholarship.quota='' (open) -> isEligible=true", () => {
    const profile = {
      name: "SURESH K",
      category: "BC",
      community: "BC",
      income: 150000,
      quotaType: "management",
      course: "Engineering",
      level: "ug",
    };
    const res = evaluateScholarship(bcOpenScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("T2-4: Non-BC community (SC/ST) -> standard category logic applies, unaffected by quota rule", () => {
    const profile = {
      name: "VIKRAM P",
      category: "SC",
      community: "SC",
      income: 120000,
      quotaType: "management",
      course: "Engineering",
      level: "ug",
    };
    const res = evaluateScholarship(scScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("T2-5: OCR text contains Quota: Management -> parses quotaType=management", () => {
    const ocrSample = `
      GOVERNMENT OF TAMIL NADU
      COMMUNITY CERTIFICATE
      Certificate No: TN-12345678
      Name: ARUN KUMAR
      Community: Backward Class (BC)
      Quota: Management
      Date of Issue: 12/05/2024
    `;
    const extracted = extractCommunityCertificateData(ocrSample);
    expect(extracted.quotaType).toBe("management");
  });

  test("T2-6: Certificate without quota line -> defaults to unknown (not government)", () => {
    // CORRECTED: community cert establishes category, NOT admission quota
    const ocrSample = `
      GOVERNMENT OF TAMIL NADU
      COMMUNITY CERTIFICATE
      Certificate No: TN-98765432
      Name: PRIYA M
      Community: Most Backward Class (MBC)
      Date of Issue: 20/06/2024
    `;
    const extracted = extractCommunityCertificateData(ocrSample);
    expect(extracted.quotaType).toBe("unknown");
  });

  test("Live knowledge base: tn-post-matric-bc-mbc scheme is tagged with quota=govt-only", () => {
    const scheme = scholarships.find(s => s.id === "tn-post-matric-bc-mbc");
    expect(scheme).toBeDefined();
    expect(scheme.quota).toBe("govt-only");
    expect(scheme.requiresGovtQuota).toBe(true);
  });
});

// --- Feature 3: First Graduate Flag ---

describe("SGP Feature 3: First Graduate Flag", () => {
  test("T3-1: firstGraduate=true, scholarship.requiresFirstGraduate=true -> isEligible=true", () => {
    const profile = {
      name: "DEEPAK R",
      category: "General",
      community: "General",
      state: "Tamil Nadu",
      course: "Engineering",
      level: "ug",
      firstGraduate: true,
    };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
    expect(res.passedCriteria).toContain("First graduate in family confirmed");
  });

  test("T3-2: firstGraduate=false, scholarship.requiresFirstGraduate=true -> isEligible=false", () => {
    const profile = {
      name: "DEEPAK R",
      category: "General",
      community: "General",
      state: "Tamil Nadu",
      course: "Engineering",
      level: "ug",
      firstGraduate: false,
    };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NOT MATCHED");
    expect(res.failedCriteria).toContain("Restricted to first-generation graduates");
  });

  test("T3-3: firstGraduate=true, scholarship.requiresFirstGraduate=false -> isEligible=true (unaffected)", () => {
    const profile = {
      name: "DEEPAK R",
      category: "General",
      community: "General",
      state: "Tamil Nadu",
      course: "Engineering",
      level: "ug",
      firstGraduate: true,
    };
    const res = evaluateScholarship(regularScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("T3-4: firstGraduate=false, scholarship.requiresFirstGraduate=false -> isEligible=true (unaffected)", () => {
    const profile = {
      name: "DEEPAK R",
      category: "General",
      community: "General",
      state: "Tamil Nadu",
      course: "Engineering",
      level: "ug",
      firstGraduate: false,
    };
    const res = evaluateScholarship(regularScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });
});

// --- Profile Adapter ---

describe("Profile Adapter Default Factory & Unified Profile", () => {
  test("createProfileFromForm provides safe offline defaults", () => {
    const profile = createProfileFromForm({ name: "TEST STUDENT", income: "100000" });
    expect(profile.incomeApplicant).toBe("student");
    // CORRECTED: quotaType must default to "unknown", not "government"
    expect(profile.quotaType).toBe("unknown");
    // CORRECTED: firstGraduate must default to null (unanswered), not false
    expect(profile.firstGraduate).toBeNull();
  });

  test("buildUnifiedProfile preserves custom values for all 3 features", () => {
    const unified = buildUnifiedProfile({
      name: "STUDENT S",
      parentName: "PARENT P",
      incomeApplicant: "parent",
      quotaType: "management",
      firstGraduate: true,
      category: "BC",
      income: 180000,
    });
    expect(unified.incomeApplicant).toBe("parent");
    expect(unified.quotaType).toBe("management");
    expect(unified.firstGraduate).toBe(true);
    expect(unified.parentName).toBe("PARENT P");
    expect(unified.studentName).toBe("STUDENT S");
  });

  test("buildUnifiedProfile: null firstGraduate is preserved as null (not coerced to false)", () => {
    const unified = buildUnifiedProfile({ name: "STUDENT X", firstGraduate: null });
    expect(unified.firstGraduate).toBeNull();
  });

  test("buildUnifiedProfile: missing quotaType defaults to unknown", () => {
    const unified = buildUnifiedProfile({ name: "STUDENT X", category: "BC" });
    expect(unified.quotaType).toBe("unknown");
  });
});

// --- 25-test Correctness Audit Regression Matrix ---

describe("Correctness Audit: Parent Income Regression Tests", () => {
  test("R-P1: Parent income + parent name different from student -> no student-name mismatch", () => {
    const matrix = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "ARUN KUMAR",
      bankAccType: "Single",
      incomeData: { name: "RAMASAMY K", income: 100000 },
      studentIncome: "100000",
      incomeApplicant: "parent",
    });
    expect(matrix.hasNameMismatch).toBe(false);
    expect(matrix.nameConsistencyStatus).not.toBe("red");
  });

  test("R-P2: Parent income + parent name same as student -> no mismatch", () => {
    const matrix = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "ARUN KUMAR",
      bankAccType: "Single",
      incomeData: { name: "ARUN KUMAR", income: 100000 },
      studentIncome: "100000",
      incomeApplicant: "parent",
    });
    expect(matrix.hasNameMismatch).toBe(false);
  });

  test("R-P3: Parent income + student 10th/12th names differ -> student mismatch still detected", () => {
    // Even in parent income mode, student-document mismatches must be caught
    const matrix = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "COMPLETELY WRONG NAME",
      bankAccType: "Single",
      incomeData: { name: "RAMASAMY K", income: 100000 },
      studentIncome: "100000",
      incomeApplicant: "parent",
    });
    // Bank vs Aadhaar mismatch among student docs must still be flagged
    expect(matrix.hasNameMismatch).toBe(true);
  });

  test("R-P4: Student income + certificate name differs -> normal student mismatch flagged", () => {
    const matrix = buildCrossDocumentMatrix({
      aadharName: "ARUN KUMAR",
      bankHolder: "ARUN KUMAR",
      bankAccType: "Single",
      incomeData: { name: "COMPLETELY DIFFERENT", income: 100000 },
      studentIncome: "100000",
      incomeApplicant: "student",
    });
    expect(matrix.hasNameMismatch).toBe(true);
    expect(matrix.nameConsistencyStatus).toBe("red");
  });

  test("R-P5: Parent income amount used for income eligibility", () => {
    const scheme = { id: "s1", name: "S1", category: "All", course: "All", gender: "All", incomeLimit: 250000 };
    const profile = {
      studentName: "ARUN KUMAR",
      parentName: "RAMASAMY K",
      incomeApplicant: "parent",
      income: 200000,
      category: "BC",
    };
    const res = evaluateScholarship(scheme, profile);
    expect(res.isEligible).toBe(true);
  });

  test("R-P6: Student remains scholarship applicant when parent provides income", () => {
    const scheme = { id: "s1", name: "S1", category: "All", course: "All", gender: "All", incomeLimit: 500000 };
    const profile = {
      studentName: "STUDENT NAME",
      parentName: "PARENT NAME",
      incomeApplicant: "parent",
      income: 100000,
    };
    const res = evaluateScholarship(scheme, profile);
    expect(res.applicantName).toBe("STUDENT NAME");
    expect(res.incomeApplicant).toBe("parent");
  });

  test("R-P7: Parent name never substituted for student name in applicantName", () => {
    const scheme = { id: "s1", name: "S1", category: "All", course: "All", gender: "All", incomeLimit: 500000 };
    const profile = {
      studentName: "KAVYA R",
      parentName: "RAJAN M",
      incomeApplicant: "parent",
      income: 150000,
    };
    const result = evaluateScholarship(scheme, profile);
    expect(result.applicantName).toBe("KAVYA R");
    expect(result.applicantName).not.toBe("RAJAN M");
    expect(result.incomeProviderName).toBe("RAJAN M");
  });
});

describe("Correctness Audit: Quota Regression Tests", () => {
  test("R-Q8: BC + government quota + govt-quota-required scheme -> eligible evaluation continues", () => {
    const profile = { category: "BC", community: "BC", income: 150000, quotaType: "government" };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
    expect(res.passedCriteria).toContain("Government Quota confirmed");
  });

  test("R-Q9: BC + management quota + govt-quota-required scheme -> NOT_MATCHED", () => {
    const profile = { category: "BC", community: "BC", income: 150000, quotaType: "management" };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NOT MATCHED");
  });

  test("R-Q10: BC + unknown quota + govt-quota-required scheme -> NEEDS MORE INFORMATION", () => {
    const profile = { category: "BC", community: "BC", income: 150000, quotaType: "unknown" };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NEEDS MORE INFORMATION");
    expect(res.missingRequirements.some(r => r.toLowerCase().includes("quota"))).toBe(true);
  });

  test("R-Q10b: BC + no quotaType at all -> NEEDS MORE INFORMATION, not silently government", () => {
    const profile = { category: "BC", community: "BC", income: 150000 };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NEEDS MORE INFORMATION");
  });

  test("R-Q11: BC + management quota + scheme with no quota restriction -> quota does not exclude", () => {
    const profile = { category: "BC", community: "BC", income: 150000, quotaType: "management" };
    const res = evaluateScholarship(bcOpenScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("R-Q12: SC/ST + BC/MBC quota rule -> category mismatch, quota not a factor", () => {
    const profile = { category: "SC", community: "SC", income: 120000, quotaType: "management" };
    const res = evaluateScholarship(scScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("R-Q13: Community certificate without quota line -> quotaType=unknown, not government", () => {
    const ocrSample = `
      GOVERNMENT OF TAMIL NADU
      COMMUNITY CERTIFICATE
      Name: MEENA S
      Community: Backward Class (BC)
      Certificate No: TN-55556666
      Date of Issue: 05/03/2025
    `;
    const extracted = extractCommunityCertificateData(ocrSample);
    expect(extracted.quotaType).toBe("unknown");
    expect(extracted.communityCategory).toBeTruthy();
  });
});

describe("Correctness Audit: First Graduate Regression Tests", () => {
  test("R-FG14: firstGraduate=true + requiresFirstGraduate=true -> eligible evaluation continues", () => {
    const profile = { category: "General", state: "Tamil Nadu", course: "Engineering", firstGraduate: true };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
    expect(res.passedCriteria).toContain("First graduate in family confirmed");
  });

  test("R-FG15: firstGraduate=false + requiresFirstGraduate=true -> NOT_MATCHED", () => {
    const profile = { category: "General", state: "Tamil Nadu", course: "Engineering", firstGraduate: false };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NOT MATCHED");
    expect(res.failedCriteria).toContain("Restricted to first-generation graduates");
  });

  test("R-FG16: firstGraduate=null + requiresFirstGraduate=true -> NEEDS MORE INFORMATION", () => {
    const profile = { category: "General", state: "Tamil Nadu", course: "Engineering", firstGraduate: null };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NEEDS MORE INFORMATION");
    expect(res.missingRequirements.some(r => r.toLowerCase().includes("first graduate"))).toBe(true);
  });

  test("R-FG16b: firstGraduate=undefined + requiresFirstGraduate=true -> NEEDS MORE INFORMATION", () => {
    const profile = { category: "General", state: "Tamil Nadu", course: "Engineering" };
    const res = evaluateScholarship(fgScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NEEDS MORE INFORMATION");
  });

  test("R-FG17: firstGraduate=true + scheme does NOT require first graduate -> unaffected (eligible)", () => {
    const profile = { category: "General", course: "Engineering", firstGraduate: true };
    const res = evaluateScholarship(regularScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("R-FG18: firstGraduate=false + scheme does NOT require first graduate -> unaffected (eligible)", () => {
    const profile = { category: "General", course: "Engineering", firstGraduate: false };
    const res = evaluateScholarship(regularScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });
});

describe("Correctness Audit: Combined Scenario Tests", () => {
  test("R-C19: MBC + Government Quota + Engineering + income within limit + First Graduate Yes -> scheme matches", () => {
    const profile = {
      category: "MBC",
      community: "MBC",
      income: 150000,
      quotaType: "government",
      course: "Engineering",
      state: "Tamil Nadu",
      firstGraduate: true,
    };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
    expect(res.passedCriteria).toContain("Government Quota confirmed");
  });

  test("R-C20: MBC + Management Quota + govt-quota-required professional scheme -> NOT_MATCHED", () => {
    const profile = {
      category: "MBC",
      community: "MBC",
      income: 150000,
      quotaType: "management",
      course: "Engineering",
      state: "Tamil Nadu",
    };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("NOT MATCHED");
  });

  test("R-C21: MBC + Management Quota + scheme with no quota restriction -> not globally rejected", () => {
    const openScheme = {
      id: "open-test",
      name: "Open Higher Education",
      category: "BC",
      course: "All",
      gender: "All",
      incomeLimit: 250000,
    };
    const profile = {
      category: "BC",
      community: "BC",
      income: 150000,
      quotaType: "management",
      course: "Engineering",
    };
    const res = evaluateScholarship(openScheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("CONFIRMED MATCH");
  });

  test("R-C22: Parent income + MBC + Government Quota + First Graduate -> parent income used, student remains applicant", () => {
    const scheme = {
      id: "s-combined",
      name: "Combined Test Scheme",
      category: "BC",
      course: "All",
      gender: "All",
      incomeLimit: 300000,
      requiresGovtQuota: true,
    };
    const profile = {
      studentName: "MURUGAN K",
      parentName: "KANDHASAMY R",
      incomeApplicant: "parent",
      income: 200000,
      category: "MBC",
      community: "MBC",
      quotaType: "government",
      firstGraduate: true,
      state: "Tamil Nadu",
    };
    const res = evaluateScholarship(scheme, profile);
    expect(res.isEligible).toBe(true);
    expect(res.applicantName).toBe("MURUGAN K");
    expect(res.incomeProviderName).toBe("KANDHASAMY R");
    expect(res.incomeApplicant).toBe("parent");
  });

  test("R-C23: Parent income name mismatch must NOT become a student name mismatch", () => {
    const matrix = buildCrossDocumentMatrix({
      aadharName: "PRIYA S",
      bankHolder: "PRIYA S",
      bankAccType: "Single",
      incomeData: { name: "SENTHIL R", income: 180000 },
      studentIncome: "180000",
      incomeApplicant: "parent",
    });
    const incomePair = matrix.namePairs.find(
      p => p.a.doc === "Income Certificate" || p.b.doc === "Income Certificate"
    );
    expect(incomePair && incomePair.status).not.toBe("MISMATCH");
    expect(matrix.hasNameMismatch).toBe(false);
  });

  test("R-C24: Student document name mismatch still detected in parent income mode", () => {
    const matrix = buildCrossDocumentMatrix({
      aadharName: "PRIYA S",
      bankHolder: "COMPLETELY DIFFERENT PERSON",
      bankAccType: "Single",
      incomeData: { name: "SENTHIL R", income: 180000 },
      studentIncome: "180000",
      incomeApplicant: "parent",
    });
    expect(matrix.hasNameMismatch).toBe(true);
  });

  test("R-C25: Unknown quota must never silently become Government Quota", () => {
    const profile = {
      category: "BC",
      community: "BC",
      income: 150000,
      quotaType: "unknown",
    };
    const res = evaluateScholarship(bcGovtScheme, profile);
    expect(res.status).not.toBe("CONFIRMED MATCH");
    expect(res.status).toBe("NEEDS MORE INFORMATION");
    expect(res.quotaType).toBe("unknown");
  });
});
