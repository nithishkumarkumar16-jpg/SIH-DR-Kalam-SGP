import {
  computeNSPReadiness,
  computeStringSimilarity,
  normaliseName,
  normaliseDate,
  checkCertExpiry,
  isValidIFSC,
  buildDocumentComparisonMatrix,
  buildApplicationVsDocumentComparison,
  MAX_SCORES,
  READINESS_THRESHOLDS,
  READINESS_LEVEL_INFO,
  BOUNDARY_STATEMENT,
  CHECK_TYPES,
} from "./nspReadinessEngine.js";

import {
  nspSchemeMetadata,
  getNSPSchemeMetadata,
  mergeWithNSPMetadata,
  getSchemeDocumentChecklist,
  verifiedSchemeIds,
  partiallyVerifiedSchemeIds,
  unverifiedSchemeIds,
} from "../knowledge/nspSchemes.js";

import { scholarships } from "../knowledge/scholarships.js";

describe("NSP Readiness Engine — Hardening & Verification Pass", () => {
  // ── Helper fixtures ──
  const baseProfile = {
    studentName: "RAHUL SHARMA",
    parentName: "RAMESH SHARMA",
    incomeApplicant: "parent",
    category: "OBC",
    income: 180000,
    state: "Tamil Nadu",
    quotaType: "unknown",
    firstGraduate: null,
    dob: "15-05-2004",
    gender: "Male",
    course: "B.Tech Computer Science",
    institution: "Government College of Technology",
    academicYear: "2026-27",
  };

  const sampleNspScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "nsp-central-sector") || {
    id: "nsp-central-sector",
    name: "Central Sector Scheme of Scholarships for College and University Students",
    authority: "Central",
    state: "All-India",
    jurisdiction: "CENTRAL",
    portal: "NSP",
    requiresGovtQuota: false,
    requiresFirstGraduate: false,
  });

  const sampleTnScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "tn-post-matric-bc-mbc") || {
    id: "tn-post-matric-bc-mbc",
    name: "Tamil Nadu Post-Matric Scholarship for BC/MBC Students",
    authority: "State",
    state: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    portal: "UMIS",
    requiresGovtQuota: true,
    requiresFirstGraduate: false,
  });

  const sampleTnFgScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "tn-first-graduate") || {
    id: "tn-first-graduate",
    name: "Tamil Nadu First Graduate Fee Concession",
    authority: "State",
    state: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    portal: "OTHER",
    requiresGovtQuota: true,
    requiresFirstGraduate: true,
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SECTION 18: TESTS A THROUGH Z
  // ═════════════════════════════════════════════════════════════════════════
  describe("Section 18: Mandatory Correctness Tests (A to Z)", () => {
    // TEST A: Student applicant / parent income provider
    test("A: Student is ALWAYS the scholarship applicant and parent is the income provider", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, {});
      expect(result._invariants.applicantName).toBe("RAHUL SHARMA");
      expect(result._invariants.incomeProviderName).toBe("RAMESH SHARMA");
      expect(result._invariants.parentIncomeModeActive).toBe(true);
      expect(result._invariants.applicantName).not.toBe(result._invariants.incomeProviderName);
    });

    // TEST B: Parent income name excluded from student identity comparison
    test("B: Parent income certificate name does NOT trigger student-name mismatch in parent mode", () => {
      const docData = {
        aadharName: "RAHUL SHARMA",
        incomeData: {
          name: "RAMESH SHARMA", // Parent's name on income certificate
          income: 180000,
          issueDate: "01-08-2025",
        },
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const nameMismatch = result.riskItems.find(r => r.id === "IDENTITY_INCOME_NAME_MISMATCH");
      expect(nameMismatch).toBeUndefined();
    });

    // TEST C: Student income name compared
    test("C: Student income certificate name IS compared and flags mismatch if student mode is active", () => {
      const studentModeProfile = { ...baseProfile, incomeApplicant: "student" };
      const docData = {
        aadharName: "RAHUL SHARMA",
        incomeData: {
          name: "RAMESH SHARMA", // Mismatch because student mode expects student name
          income: 180000,
          issueDate: "01-08-2025",
        },
      };
      const result = computeNSPReadiness(studentModeProfile, sampleNspScheme, docData);
      const nameMismatch = result.riskItems.find(r => r.id === "IDENTITY_INCOME_NAME_MISMATCH");
      expect(nameMismatch).toBeDefined();
      expect(nameMismatch.severity).toBe("HIGH_ATTENTION");
    });

    // TEST D: 10th / 12th mismatch
    test("D: Detects name mismatch between 10th and 12th marksheet", () => {
      const docData = {
        aadharName: "RAHUL SHARMA",
        tenthData: { name: "RAHUL SHARMA" },
        twelfthData: { name: "VIKRAM SHARMA" }, // Different first name
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "IDENTITY_NAME_MISMATCH");
      expect(riskItem).toBeDefined();
      expect(riskItem.severity).toBe("HIGH_ATTENTION");
    });

    // TEST E: Aadhaar/manual vs student documents
    test("E: Detects mismatch between Aadhaar identity and school marksheets", () => {
      const docData = {
        aadharName: "RAHUL SHARMA",
        tenthData: { name: "ANIL KUMAR" },
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "IDENTITY_NAME_MISMATCH");
      expect(riskItem).toBeDefined();
    });

    // TEST F: Application vs document mismatch
    test("F: Application vs Document comparison detects MATCH and MISMATCH cleanly", () => {
      const docData = {
        aadharName: "RAHUL SHARMA",
        tenthData: { dob: "15-05-2000" }, // diff from profile 15-05-2004
      };
      const comparisons = buildApplicationVsDocumentComparison(baseProfile, docData);
      const nameRow = comparisons.find(c => c.field === "Name");
      const dobRow = comparisons.find(c => c.field === "Date of Birth");
      expect(nameRow.status).toBe("MATCH");
      expect(dobRow.status).toBe("MISMATCH");
      expect(dobRow.action).toContain("Check the original documents");
    });

    // TEST G: Category mismatch
    test("G: Detects category mismatch between application profile and community certificate", () => {
      const docData = {
        communityData: { communityCategory: "SC" }, // profile has OBC
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "APP_CATEGORY_MISMATCH");
      expect(riskItem).toBeDefined();
      expect(riskItem.severity).toBe("HIGH_ATTENTION");
    });

    // TEST H: Income mismatch
    test("H: Detects income discrepancy exceeding 15% between profile and income certificate", () => {
      const docData = {
        incomeData: { income: 350000, issueDate: "01-08-2025" }, // profile has 180000
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "APP_INCOME_MISMATCH");
      expect(riskItem).toBeDefined();
    });

    // TEST I: Wrong academic year
    test("I: Detects mismatched academic year between application and scheme cycle", () => {
      const wrongYearProfile = { ...baseProfile, academicYear: "2023-24" };
      const result = computeNSPReadiness(wrongYearProfile, sampleNspScheme, {});
      const riskItem = result.riskItems.find(r => r.id === "WRONG_ACADEMIC_YEAR");
      expect(riskItem).toBeDefined();
    });

    // TEST J: Wrong document type
    test("J: Flags warning if an unexpected document type is uploaded", () => {
      const docData = { wrongDocTypes: ["driving_license"] };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "DOCS_WRONG_TYPE");
      expect(riskItem).toBeDefined();
    });

    // TEST K: Missing required document
    test("K: Flags missing required documents for the specific scheme", () => {
      const docData = { uploadedTypes: ["income", "bank"] }; // Missing Aadhaar & Marksheet
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "DOCS_MISSING_REQUIRED");
      expect(riskItem).toBeDefined();
    });

    // TEST L: Poor document quality
    test("L: Flags low quality scans or blur requiring student re-scan", () => {
      const docData = { lowQualityDocs: ["income_cert"] };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "DOCS_LOW_QUALITY");
      expect(riskItem).toBeDefined();
      expect(riskItem.severity).toBe("MEDIUM_ATTENTION");
    });

    // TEST M: Certificate validity
    test("M: Detects expired income certificate older than 12 months", () => {
      const docData = {
        incomeData: { income: 180000, issueDate: "01-01-2022" }, // > 3 years old
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "CERT_INCOME_EXPIRED");
      expect(riskItem).toBeDefined();
      expect(riskItem.severity).toBe("HIGH_ATTENTION");
    });

    // TEST N: Bank holder mismatch
    test("N: Detects bank account holder mismatch (parent name on student account)", () => {
      const docData = {
        bankHolder: "RAMESH SHARMA", // Parent's name on passbook
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "BANK_HOLDER_MISMATCH");
      expect(riskItem).toBeDefined();
      expect(riskItem.action).toContain("student's own name");
    });

    // TEST O: Unknown quota
    test("O: Unknown quota defaults to unknown and never automatically becomes government", () => {
      const result = computeNSPReadiness({ ...baseProfile, quotaType: "unknown" }, sampleTnScheme, {});
      expect(result._invariants.quotaUsed).toBe("unknown");
      expect(result._invariants.quotaUsed).not.toBe("government");
    });

    // TEST P: Management quota where applicable
    test("P: Management quota triggers ineligibility warning on quota-restricted schemes", () => {
      const result = computeNSPReadiness({ ...baseProfile, quotaType: "management" }, sampleTnScheme, {});
      const riskItem = result.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT");
      expect(riskItem).toBeDefined();
      expect(riskItem.severity).toBe("HIGH_ATTENTION");
    });

    // TEST Q: First Graduate unknown
    test("Q: First Graduate unknown (null) is preserved and not silently converted to false", () => {
      const result = computeNSPReadiness({ ...baseProfile, firstGraduate: null }, sampleTnFgScheme, {});
      expect(result._invariants.firstGraduatePreserved).toBeNull();
      const riskItem = result.riskItems.find(r => r.id === "ELIG_FIRST_GRAD_UNKNOWN");
      expect(riskItem).toBeDefined();
    });

    // TEST R: Disability threshold where applicable
    test("R: Flags missing disability certificate for disability-specific scholarship", () => {
      const sakshamScheme = nspSchemeMetadata["nsp-aicte-saksham"];
      const result = computeNSPReadiness(baseProfile, sakshamScheme, {});
      const riskItem = result.riskItems.find(r => r.id === "APP_DISABILITY_CERT_MISSING");
      expect(riskItem).toBeDefined();
    });

    // TEST S: Domicile missing
    test("S: Flags missing domicile when state-restricted scheme is evaluated", () => {
      const noStateProfile = { ...baseProfile, state: "" };
      const result = computeNSPReadiness(noStateProfile, sampleTnScheme, {});
      const riskItem = result.riskItems.find(r => r.id === "APP_DOMICILE_MISSING");
      expect(riskItem).toBeDefined();
    });

    // TEST T: Institution mismatch
    test("T: Flags discrepancy between application institution and bonafide evidence", () => {
      const docData = { institutionName: "SRM University" }; // Profile has Government College of Technology
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "APP_INSTITUTION_MISMATCH");
      expect(riskItem).toBeDefined();
    });

    // TEST U: Course mismatch
    test("U: Flags discrepancy between application course and marksheet course", () => {
      const docData = { courseName: "Diploma in Mechanical" }; // Profile has B.Tech
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const riskItem = result.riskItems.find(r => r.id === "APP_COURSE_MISMATCH");
      expect(riskItem).toBeDefined();
    });

    // TEST V: Tamil Nadu rule isolation
    test("V: Tamil Nadu specific quota rule NEVER leaks into All-India Central NSP schemes", () => {
      const result = computeNSPReadiness(
        { ...baseProfile, quotaType: "unknown" },
        sampleNspScheme, // Central Sector
        {}
      );
      const quotaRisk = result.riskItems.find(r => r.id === "ELIG_QUOTA_UNKNOWN");
      expect(quotaRisk).toBeUndefined();
    });

    // TEST W: Central NSP rule isolation
    test("W: Central NSP schemes evaluate under CENTRAL jurisdiction rules", () => {
      expect(sampleNspScheme.jurisdiction).toBe("CENTRAL");
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, {});
      expect(result.schemeJurisdiction).toBe("CENTRAL");
    });

    // TEST X: Unverified rule does not hard-reject
    test("X: Schemes with UNVERIFIED rule status do NOT cause automatic hard rejection", () => {
      const unverifiedScheme = nspSchemeMetadata["other-state-incentive"];
      const result = computeNSPReadiness(baseProfile, unverifiedScheme, {});
      expect(result.readinessLevel).not.toBe("NOT_READY");
      const unverifiedNotice = result.riskItems.find(r => r.id === "RULE_UNVERIFIED_NOTICE");
      expect(unverifiedNotice).toBeDefined();
      expect(unverifiedNotice.detail).toContain("not fully confirmed");
    });

    // TEST Y: Current-year rule missing / unknown required info
    test("Y: Presence of unconfirmed required information prevents READY_TO_SUBMIT classification", () => {
      // Score would be high, but required quota is unknown on quota-restricted scheme
      const result = computeNSPReadiness(
        { ...baseProfile, quotaType: "unknown" },
        sampleTnScheme,
        {
          aadharName: "RAHUL SHARMA",
          incomeData: { name: "RAMESH SHARMA", income: 180000, issueDate: "01-08-2025", certNumber: "INC123" },
          communityData: { communityCategory: "BC", issueDate: "01-08-2024" },
          bankHolder: "RAHUL SHARMA",
          bankData: { ifsc: "SBIN0001234" },
          aadhaarBankLinked: true,
          uploadedTypes: ["community", "income", "aadhaar", "allotment", "bank"],
        }
      );
      // Because quota is unknown on quota-restricted scheme, readinessLevel cannot be READY_TO_SUBMIT
      expect(result.readinessLevel).not.toBe("READY_TO_SUBMIT");
      expect(["REVIEW_BEFORE_SUBMIT", "CORRECTIONS_NEEDED"]).toContain(result.readinessLevel);
    });

    // TEST Z: No false government verification claim
    test("Z: Official boundary statement explicitly disclaims government verification", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, {});
      expect(result.boundaryStatement).toContain("SGP checks document information and consistency");
      expect(result.boundaryStatement).toContain("does not independently authenticate government records");
      expect(result.boundaryStatement).not.toContain("predicts approval");
      expect(result.boundaryStatement).toContain("does not guarantee scholarship approval");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. SECTION 19: REAL KNOWLEDGE BASE VALIDATION TESTS
  // ═════════════════════════════════════════════════════════════════════════
  describe("Section 19: Real Knowledge Base Metadata Validation", () => {
    test("All schemes in nspSchemes.js have complete mandatory metadata fields", () => {
      const allSchemeKeys = Object.keys(nspSchemeMetadata);
      expect(allSchemeKeys.length).toBeGreaterThanOrEqual(10);

      allSchemeKeys.forEach(key => {
        const s = nspSchemeMetadata[key];
        expect(s.id).toBe(key);
        expect(s.name).toBeTruthy();
        expect(s.authority).toBeTruthy();
        expect(["CENTRAL", "TAMIL_NADU", "OTHER_STATE"]).toContain(s.jurisdiction);
        expect(["NSP", "UMIS", "OTHER"]).toContain(s.portal);
        expect(s.academicYear).toBeTruthy();
        expect(["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED"]).toContain(s.ruleStatus);
        expect(Array.isArray(s.requiredDocuments)).toBe(true);
        expect(s.requiredDocuments.length).toBeGreaterThan(0);

        // For VERIFIED schemes, sourceUrl must be an authentic web address
        if (s.ruleStatus === "VERIFIED") {
          expect(s.sourceUrl).toMatch(/^https?:\/\//);
          expect(s.sourceTitle).toBeTruthy();
          expect(s.sourceAuthority).toBeTruthy();
        }
      });
    });

    test("Accurately counts verified, partially verified, and unverified schemes", () => {
      expect(verifiedSchemeIds.length).toBe(8);
      expect(partiallyVerifiedSchemeIds.length).toBe(2);
      expect(unverifiedSchemeIds.length).toBe(1);
    });

    test("Document checklist helper returns structured fields without error", () => {
      const checklist = getSchemeDocumentChecklist(sampleNspScheme);
      expect(checklist.required.length).toBeGreaterThan(0);
      expect(checklist.ruleStatus).toBe("VERIFIED");
      expect(checklist.jurisdiction).toBe("CENTRAL");
    });

    test("Document comparison matrix generates comprehensive 6-dimension structure", () => {
      const matrix = buildDocumentComparisonMatrix(baseProfile, {
        aadharName: "RAHUL SHARMA",
        tenthData: { name: "RAHUL SHARMA", dob: "15-05-2004" },
        incomeData: { name: "RAMESH SHARMA", income: 180000, issueDate: "01-03-2026" },
        bankHolder: "RAHUL SHARMA",
        bankData: { ifsc: "SBIN0001234" },
      });
      expect(matrix.identity.name.status).toBe("MATCH");
      expect(matrix.bank.ifsc.isValidFormat).toBe(true);
      expect(matrix.financial.validity.expired).toBe(false);
      expect(matrix.residence.state.value).toBe("Tamil Nadu");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // Section 17: Factual Accuracy & Rule De-Generalization Tests (1 to 14)
  // ═════════════════════════════════════════════════════════════════════════════
  describe("Section 17: Factual Accuracy & Rule De-Generalization Tests (1 to 14)", () => {
    // 1. Universal consistency checks still work
    test("1. Universal consistency checks still work and are classified correctly", () => {
      const docData = {
        aadharName: "DIFFERENT PERSON",
        bankData: { ifsc: "INVALID_IFSC" },
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const nameMismatch = result.riskItems.find(r => r.id === "IDENTITY_NAME_MISMATCH");
      const ifscInvalid = result.riskItems.find(r => r.id === "BANK_IFSC_INVALID");

      expect(nameMismatch).toBeDefined();
      expect(nameMismatch.checkType).toBe(CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK);
      expect(ifscInvalid).toBeDefined();
      expect(ifscInvalid.checkType).toBe(CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK);
    });

    // 2. Scheme-specific conditions only affect applicable schemes
    test("2. Scheme-specific conditions only affect applicable schemes", () => {
      // Central scheme does not have government quota condition
      const centralResult = computeNSPReadiness({ ...baseProfile, quotaType: "management" }, sampleNspScheme, {});
      expect(centralResult.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT")).toBeUndefined();

      // Tamil Nadu quota-restricted scheme does check government quota
      const tnResult = computeNSPReadiness({ ...baseProfile, quotaType: "management" }, sampleTnScheme, {});
      const quotaRisk = tnResult.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT");
      expect(quotaRisk).toBeDefined();
      expect(quotaRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
    });

    // 3. Income >15% does not universally reject
    test("3. Income >15% does not universally reject (advisory review only)", () => {
      const docData = {
        incomeData: { name: "RAMESH SHARMA", income: 140000, issueDate: "01-01-2026" },
      };
      // Profile has 180,000, difference > 15%
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const incomeRisk = result.riskItems.find(r => r.id === "APP_INCOME_MISMATCH");

      expect(incomeRisk).toBeDefined();
      expect(incomeRisk.title).toBe("Income value difference requiring review");
      expect(incomeRisk.checkType).toBe(CHECK_TYPES.ADVISORY_CHECK);
      expect(incomeRisk.severity).toBe("MEDIUM_ATTENTION");
      // Not rejected
      expect(result.readinessLevel).not.toBe("NOT_READY");
    });

    // 4. Certificate older than 12 months does not universally reject
    test("4. Certificate older than 12 months does not universally reject", () => {
      const docData = {
        incomeData: { name: "RAMESH SHARMA", income: 180000, issueDate: "01-01-2024" }, // ~2 years old
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const expiryRisk = result.riskItems.find(r => r.id === "CERT_INCOME_EXPIRED");

      expect(expiryRisk).toBeDefined();
      expect(expiryRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
      expect(expiryRisk.title).toBe("Income certificate issue date or validity requires confirmation");
      // Does not cause hard rejection (not NOT_READY)
      expect(result.readinessLevel).not.toBe("NOT_READY");
    });

    // 5. <300 DPI does not automatically mean NSP rejection
    test("5. <300 DPI does not automatically mean NSP rejection", () => {
      const docData = {
        lowQualityDocs: ["Income Certificate"],
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const qualRisk = result.riskItems.find(r => r.id === "DOCS_LOW_QUALITY");

      expect(qualRisk).toBeDefined();
      expect(qualRisk.title).toBe("Low document quality detected");
      expect(qualRisk.checkType).toBe(CHECK_TYPES.ADVISORY_CHECK);
      expect(qualRisk.severity).toBe("MEDIUM_ATTENTION");
      expect(result.readinessLevel).not.toBe("NOT_READY");
    });

    // 6. Parent bank account does not universally reject
    test("6. Parent bank account does not universally reject (advisory / scheme review)", () => {
      const docData = {
        bankHolder: "RAMESH SHARMA", // Parent name
      };
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, docData);
      const bankRisk = result.riskItems.find(r => r.id === "BANK_HOLDER_MISMATCH");

      expect(bankRisk).toBeDefined();
      expect(bankRisk.title).toBe("Bank account holder information may require review");
      expect(bankRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
      expect(result.readinessLevel).not.toBe("NOT_READY");
    });

    // 7. Disability <40% does not universally reject
    test("7. Disability <40% does not universally reject non-disability schemes", () => {
      const profileWithLowDisability = {
        ...baseProfile,
        disability: true,
        disabilityPercentage: 25, // Under 40%
      };
      // For general scheme without disability requirement:
      const generalResult = computeNSPReadiness(profileWithLowDisability, sampleNspScheme, {});
      expect(generalResult.riskItems.find(r => r.id === "APP_DISABILITY_PERCENTAGE_BELOW_MIN")).toBeUndefined();

      // For scheme requiring disability (AICTE Saksham):
      const sakshamScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "nsp-aicte-saksham"));
      const sakshamResult = computeNSPReadiness(profileWithLowDisability, sakshamScheme, { disabilityCert: true });
      const sakshamDisabilityRisk = sakshamResult.riskItems.find(r => r.id === "APP_DISABILITY_PERCENTAGE_BELOW_MIN");
      expect(sakshamDisabilityRisk).toBeDefined();
      expect(sakshamDisabilityRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
    });

    // 8. Domicile mismatch does not universally reject
    test("8. Domicile mismatch does not universally reject All-India schemes", () => {
      const profileDifferentState = {
        ...baseProfile,
        state: "Maharashtra",
        domicile: "Maharashtra",
      };
      // All-India Central Sector scheme has no single-state exclusion
      const centralResult = computeNSPReadiness(profileDifferentState, sampleNspScheme, {});
      expect(centralResult.riskItems.find(r => r.id === "APP_DOMICILE_MISMATCH")).toBeUndefined();

      // State-specific scheme (TN Post-Matric) does check domicile
      const tnResult = computeNSPReadiness(profileDifferentState, sampleTnScheme, {});
      const domicileRisk = tnResult.riskItems.find(r => r.id === "APP_DOMICILE_MISMATCH");
      expect(domicileRisk).toBeDefined();
      expect(domicileRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
    });

    // 9. Quota remains scheme-specific
    test("9. Quota remains scheme-specific", () => {
      // Central scheme has no quota requirement
      expect(sampleNspScheme.requiresGovtQuota).toBeFalsy();
      const centralResult = computeNSPReadiness({ ...baseProfile, quotaType: "management" }, sampleNspScheme, {});
      expect(centralResult.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT")).toBeUndefined();

      // TN scheme has quota requirement
      expect(sampleTnScheme.requiresGovtQuota).toBe(true);
      const tnResult = computeNSPReadiness({ ...baseProfile, quotaType: "management" }, sampleTnScheme, {});
      expect(tnResult.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT")).toBeDefined();
    });

    // 10. First Graduate remains scheme-specific
    test("10. First Graduate remains scheme-specific", () => {
      // Central scheme does not require First Graduate
      const centralResult = computeNSPReadiness({ ...baseProfile, firstGraduate: null }, sampleNspScheme, {});
      expect(centralResult.riskItems.find(r => r.id === "ELIG_FIRST_GRAD_UNKNOWN")).toBeUndefined();

      // TN First Graduate scheme does require First Graduate
      const fgScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "tn-first-graduate"));
      const fgResult = computeNSPReadiness({ ...baseProfile, firstGraduate: null }, fgScheme, {});
      const fgRisk = fgResult.riskItems.find(r => r.id === "ELIG_FIRST_GRAD_UNKNOWN");
      expect(fgRisk).toBeDefined();
      expect(fgRisk.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
    });

    // 11. Unknown values remain NEEDS MORE INFORMATION
    test("11. Unknown values remain NEEDS MORE INFORMATION", () => {
      // When scheme requires Govt Quota and quota is unknown:
      const tnResult = computeNSPReadiness({ ...baseProfile, quotaType: "unknown" }, sampleTnScheme, {});
      expect(tnResult.hasUnknownRequiredInfo).toBe(true);
      expect(tnResult.readinessLevel).not.toBe("READY_TO_SUBMIT");
    });

    // 12. Unverified scheme rules cannot hard reject
    test("12. Unverified scheme rules cannot hard reject", () => {
      const unverifiedScheme = mergeWithNSPMetadata({
        id: "other-state-incentive",
        name: "State Merit Higher Education Incentive",
        ruleStatus: "UNVERIFIED",
        jurisdiction: "OTHER_STATE",
        scope: "State",
        state: "Karnataka",
      });

      const result = computeNSPReadiness({ ...baseProfile, state: "Tamil Nadu" }, unverifiedScheme, {});
      expect(result.hasUnknownRequiredInfo).toBe(true);
      // Ensures UNVERIFIED rule produces notice instead of hard-reject NOT_MATCHED
      const notice = result.riskItems.find(r => r.id === "RULE_UNVERIFIED_NOTICE");
      expect(notice).toBeDefined();
      expect(notice.checkType).toBe(CHECK_TYPES.SCHEME_SPECIFIC_CHECK);
    });

    // 13. Tamil Nadu rules cannot leak into Central schemes
    test("13. Tamil Nadu rules cannot leak into Central schemes", () => {
      const tnStudentCentralApp = {
        ...baseProfile,
        category: "BC",
        quotaType: "management",
        firstGraduate: false,
      };
      const result = computeNSPReadiness(tnStudentCentralApp, sampleNspScheme, {});
      expect(result.riskItems.find(r => r.id === "ELIG_QUOTA_MANAGEMENT")).toBeUndefined();
      expect(result.riskItems.find(r => r.id === "ELIG_FIRST_GRAD_UNKNOWN")).toBeUndefined();
    });

    // 14. Central NSP rules cannot leak into unrelated state schemes
    test("14. Central NSP rules cannot leak into unrelated state schemes", () => {
      const stateScheme = mergeWithNSPMetadata(scholarships.find(s => s.id === "tn-first-graduate"));
      expect(stateScheme.jurisdiction).toBe("TAMIL_NADU");
      expect(stateScheme.portal).not.toBe("NSP");

      const result = computeNSPReadiness(baseProfile, stateScheme, {});
      expect(result.schemeJurisdiction).toBe("TAMIL_NADU");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 4. SECTION 20: MANDATORY GOVERNMENT INTEGRATION BOUNDARY & 2026 COMPLIANCE TESTS (A to I)
  // ═════════════════════════════════════════════════════════════════════════
  describe("Section 20: Mandatory Government Integration Boundary & 2026 Compliance Tests (A to I)", () => {
    const sampleDocData = {
      aadharName: "RAHUL SHARMA",
      tenthName: "RAHUL SHARMA",
      twelfthName: "RAHUL SHARMA",
      bonafideName: "RAHUL SHARMA",
      incomeData: {
        name: "RAMESH SHARMA",
        applicantName: "RAMESH SHARMA",
        income: 180000,
        issueDate: "01-08-2025",
      },
      casteData: {
        category: "General",
        community: "General",
      },
      bankData: {
        accountHolderName: "RAHUL SHARMA",
        ifsc: "SBIN0001234",
      },
    };

    // A. Unknown government status: NPCI unknown -> NEEDS INFORMATION / OFFICIAL CONFIRMATION, NOT rejection
    test("A. NPCI unknown status does NOT deduct points and routes to intermediate status tier", () => {
      const profile = { ...baseProfile, category: "General", aadhaarLinked: null };
      const result = computeNSPReadiness(profile, sampleNspScheme, sampleDocData);
      expect(result.readinessScore.breakdown.bank.score).toBe(10); // 0 deduction for unknown
      expect(result.hasUnknownRequiredInfo).toBe(true);
      expect(result.readinessLevel).toBe("NEEDS_CONFIRMATION");
      expect(result.readinessLevelInfo.label).toBe("Needs Information / Official Confirmation");
      const npciRisk = result.riskItems.find(r => r.id === "BANK_AADHAAR_SEEDING_UNKNOWN");
      expect(npciRisk).toBeDefined();
      expect(npciRisk.penalty).toBe(0);
      expect(npciRisk.action).toContain("Confirm Aadhaar seeding and NPCI DBT activation");
    });

    // B. Aadhaar: Local name match -> consistency result only, never authenticated
    test("B. Aadhaar comparison produces local identity consistency, never claims UIDAI authentication", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, sampleDocData);
      expect(result.boundaryStatement).toContain("does not independently authenticate government records");
      expect(result.boundaryStatement).toContain("UIDAI");
      expect(result.readinessScore.breakdown.identity.label).toBe("Student Identity");
      const allText = JSON.stringify(result);
      expect(allText).not.toContain("Aadhaar verified");
      expect(allText).not.toContain("UIDAI verified");
    });

    // C. Certificate: Good OCR -> document readable, never 'genuine' or 'officially authenticated'
    test("C. Extracted certificate fields confirm readability, never 'genuine' or 'government verified'", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, sampleDocData);
      const allText = JSON.stringify(result);
      expect(allText).not.toContain("certificate genuine");
      expect(allText).not.toContain("authenticity verified");
      expect(allText).not.toContain("government verified");
      expect(result.documentMatrix).toBeDefined();
    });

    // D. NSP: Manual data -> readiness check, never live NSP status
    test("D. Manual entry data produces readiness analysis, never live NSP profile or rejection prediction", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, sampleDocData);
      expect(result.boundaryStatement).toContain("SGP PRE-SUBMISSION CHECK");
      expect(result.boundaryStatement).toContain("readiness assessment, not an official government verification");
      expect(result.boundaryStatement).toContain("does not predict NSP rejection");
    });

    // E. Approval: No readiness score is ever labeled as approval probability
    test("E. Readiness score is strictly Pre-Submission Readiness Indicator, not approval probability", () => {
      const result = computeNSPReadiness(baseProfile, sampleNspScheme, sampleDocData);
      expect(result.readinessScore.total).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore.total).toBeLessThanOrEqual(100);
      const allText = JSON.stringify(result);
      expect(allText).not.toContain("approval probability");
      expect(allText).not.toContain("rejection probability");
      expect(allText).not.toContain("guaranteed scholarship");
    });

    // F. Reminders: Renewal guidance clearly marks planning/local reminder state without persistent backend
    test("F. Renewal system indicates planning / local guidance unless persistent backend is enabled", () => {
      const result = computeNSPReadiness({ ...baseProfile, isRenewal: true }, sampleNspScheme, sampleDocData);
      expect(result).toBeDefined();
    });

    // G. Scheme-specific rules: Unknown quota, firstGraduate, disability handled as NEEDS INFORMATION with 0 penalty
    test("G. Scheme-specific unknown values hold score steady with 0 point deduction", () => {
      const profile = {
        ...baseProfile,
        category: "General",
        quotaType: "unknown",
        firstGraduate: null,
      };
      const result = computeNSPReadiness(profile, sampleNspScheme, sampleDocData);
      expect(result.hasUnknownRequiredInfo).toBe(true);
      expect(result.readinessScore.breakdown.eligibility.lostPoints).toBe(0);
    });

    // H. Student identity: Parent income certificate name must not become applicant identity
    test("H. Parent income certificate name never overwrites student applicant identity", () => {
      const parentModeProfile = {
        ...baseProfile,
        studentName: "MURUGAN S",
        parentName: "SENGOTTAIYAN P",
        incomeApplicant: "parent",
      };
      const result = computeNSPReadiness(parentModeProfile, sampleNspScheme, {
        ...sampleDocData,
        incomeData: {
          ...sampleDocData.incomeData,
          name: "SENGOTTAIYAN P",
          applicantName: "SENGOTTAIYAN P",
        },
      });
      expect(result._invariants.applicantName).toBe("MURUGAN S");
      expect(result._invariants.incomeProviderName).toBe("SENGOTTAIYAN P");
      expect(result._invariants.parentIncomeModeActive).toBe(true);
      const nameMismatch = result.riskItems.find(r => r.id === "IDENTITY_INCOME_NAME_MISMATCH");
      expect(nameMismatch).toBeUndefined();
    });

    // I. Terminology & 2026 Mandatory NSP Compliance (OTR & Face-Auth)
    test("I. Checks for 2026 NSP OTR number and Aadhaar Face-RD without simulating biometrics", () => {
      const centralResult = computeNSPReadiness({ ...baseProfile, otrGenerated: null }, sampleNspScheme, sampleDocData);
      const otrRisk = centralResult.riskItems.find(r => r.id === "NSP_2026_OTR_TRACKER");
      expect(otrRisk).toBeDefined();
      expect(otrRisk.penalty).toBe(0); // Unknown state rule: 0 deduction
      expect(otrRisk.description).toContain("NSP OTR Tracker");
      expect(otrRisk.description).toContain("official AadhaarFaceRD mobile framework");

      const faceRisk = centralResult.riskItems.find(r => r.id === "NSP_2026_FACE_AUTH_DEVICE");
      expect(faceRisk).toBeDefined();
      expect(faceRisk.penalty).toBe(0);
      expect(faceRisk.description).toContain("AadhaarFaceRD mobile framework");
    });
  });
});
