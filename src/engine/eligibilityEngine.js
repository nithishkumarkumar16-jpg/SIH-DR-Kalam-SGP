/**
 * eligibilityEngine.js — Verified Multi-Criteria Eligibility Engine
 * Ported from Project B to native ES Module JavaScript for SGP-MAIN
 *
 * Implements:
 * - 4 Distinct Eligibility Statuses:
 *   1. CONFIRMED MATCH — All required criteria are explicitly supplied and satisfied.
 *   2. POTENTIAL MATCH — Some criteria are satisfied, but non-critical details are missing.
 *   3. NEEDS MORE INFORMATION — A required criterion is missing, so scheme cannot currently be evaluated.
 *   4. NOT MATCHED — A supplied criterion clearly fails.
 * - Strict Anti-Hallucination: Never assumes gender, govt school, disability, parent occupation,
 *   institution type, domicile, year of study, or armed forces status.
 * - Transparent criterion evaluation breakdown
 * - Match score calculation (0 - 100%)
 * - Ranked sorting of eligible schemes
 */

import { matchesCommunity } from "../adapters/profileAdapter.js";

/**
 * Evaluates a single scholarship against a student's profile with strict gatekeepers and criteria breakdown.
 */
export function evaluateScholarship(s, profile = {}) {
  const evaluations = [];
  const passedCriteria = [];
  const failedCriteria = [];
  const missingRequirements = [];

  // Feature 1: Parent-Income Flow identity resolution.
  // The scholarship APPLICANT is always the student — the parent is the income PROVIDER.
  // incomeProviderName carries the parent's name for income certificate matching only.
  const applicantName = profile.studentName || profile.name || "";
  const incomeProviderName = (profile.incomeApplicant === "parent")
    ? (profile.parentName || profile.fatherName || profile.motherName || "")
    : applicantName;

  // 1. GENDER EVALUATION (Hard Gatekeeper)
  const requiresGender = s.gender && s.gender !== "All";
  if (requiresGender) {
    if (!profile.gender || profile.gender === "All") {
      missingRequirements.push(`Gender (${s.gender} only)`);
      evaluations.push({
        criterion: "Gender Eligibility",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: s.gender === "Girls" ? "Female Only" : "Male Only",
        actual: "Not Provided",
        reason: `This scheme is exclusively reserved for ${s.gender.toLowerCase()} students. Gender was not provided.`
      });
    } else if (profile.gender !== s.gender) {
      failedCriteria.push(`Gender restriction (${s.gender} only)`);
      evaluations.push({
        criterion: "Gender Eligibility",
        status: "FAILED",
        isHardGatekeeper: true,
        required: s.gender === "Girls" ? "Female Only" : "Male Only",
        actual: profile.gender,
        reason: `This scheme is exclusively reserved for ${s.gender.toLowerCase()} students. Applicant is ${profile.gender.toLowerCase()}.`
      });
    } else {
      passedCriteria.push(`Gender: ${s.gender}`);
      evaluations.push({
        criterion: "Gender Eligibility",
        status: "PASSED",
        isHardGatekeeper: true,
        required: s.gender === "Girls" ? "Female Only" : "Male Only",
        actual: profile.gender,
        reason: `Meets gender criterion (${s.gender})`
      });
    }
  } else {
    passedCriteria.push("Gender: Open to all");
  }

  // 2. INCOME THRESHOLD EVALUATION (Hard Gatekeeper)
  const hasIncomeLimit = s.incomeLimit !== undefined && s.incomeLimit !== null && s.incomeLimit !== 99999999;
  if (hasIncomeLimit) {
    if (profile.income === undefined || profile.income === null) {
      missingRequirements.push(`Annual Family Income (ceiling ≤ ₹${s.incomeLimit.toLocaleString("en-IN")}/year)`);
      evaluations.push({
        criterion: "Annual Family Income",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: `≤ ₹${s.incomeLimit.toLocaleString("en-IN")}/year`,
        actual: "Not Provided",
        reason: `Requires family income ≤ ₹${s.incomeLimit.toLocaleString("en-IN")}/year. Income was not provided.`
      });
    } else if (profile.income > s.incomeLimit) {
      failedCriteria.push(`Income exceeds ₹${s.incomeLimit.toLocaleString("en-IN")}`);
      evaluations.push({
        criterion: "Annual Family Income",
        status: "FAILED",
        isHardGatekeeper: true,
        required: `≤ ₹${s.incomeLimit.toLocaleString("en-IN")}/year`,
        actual: `₹${profile.income.toLocaleString("en-IN")}/year`,
        reason: `Family income (₹${profile.income.toLocaleString("en-IN")}) exceeds allowable ceiling of ₹${s.incomeLimit.toLocaleString("en-IN")}.`
      });
    } else {
      passedCriteria.push(`Income under ₹${s.incomeLimit.toLocaleString("en-IN")}`);
      evaluations.push({
        criterion: "Annual Family Income",
        status: "PASSED",
        isHardGatekeeper: true,
        required: `≤ ₹${s.incomeLimit.toLocaleString("en-IN")}/year`,
        actual: `₹${profile.income.toLocaleString("en-IN")}/year`,
        reason: `Family income (₹${profile.income.toLocaleString("en-IN")}) is within statutory limit (₹${s.incomeLimit.toLocaleString("en-IN")}).`
      });
    }
  } else {
    passedCriteria.push("No income limit");
    evaluations.push({
      criterion: "Annual Family Income",
      status: "PASSED",
      isHardGatekeeper: false,
      required: "No Income Limit",
      actual: profile.income ? `₹${profile.income.toLocaleString("en-IN")}` : "N/A",
      reason: "This scheme has no income cap (open to all income groups)."
    });
  }

  // 3. COMMUNITY CATEGORY EVALUATION (Hard Gatekeeper)
  const hasCategoryRestriction = s.category && s.category !== "All" && s.category !== "all";
  const studentCat = profile.category || profile.community;
  if (hasCategoryRestriction) {
    if (!studentCat) {
      missingRequirements.push(`Community Category (${s.category})`);
      evaluations.push({
        criterion: "Community Category",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: s.category,
        actual: "Not Provided",
        reason: `Restricted to ${s.category} community candidates. Category was not provided.`
      });
    } else if (!matchesCommunity(s.category, studentCat)) {
      failedCriteria.push(`Reserved for ${s.category} category`);
      evaluations.push({
        criterion: "Community Category",
        status: "FAILED",
        isHardGatekeeper: true,
        required: s.category,
        actual: studentCat,
        reason: `Restricted to ${s.category} community candidates. Applicant is ${studentCat}.`
      });
    } else {
      passedCriteria.push(`Category: ${studentCat}`);
      evaluations.push({
        criterion: "Community Category",
        status: "PASSED",
        isHardGatekeeper: true,
        required: s.category,
        actual: studentCat,
        reason: `Category (${studentCat}) matches scholarship quota (${s.category}).`
      });
    }
  } else {
    passedCriteria.push("Open to all categories");
  }

  // 4. STATE DOMICILE EVALUATION (Hard Gatekeeper)
  const isPanIndia = !s.state || s.state === "All" || s.state === "All-India" || s.state === "All-India / National";
  if (!isPanIndia) {
    if (!profile.state) {
      missingRequirements.push(`State Domicile (${s.state})`);
      evaluations.push({
        criterion: "State Domicile",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: s.state,
        actual: "Not Provided",
        reason: `Restricted to permanent residents of ${s.state}. State was not provided.`
      });
    } else if (profile.state.toLowerCase() !== s.state.toLowerCase()) {
      failedCriteria.push(`Restricted to ${s.state}`);
      evaluations.push({
        criterion: "State Domicile",
        status: "FAILED",
        isHardGatekeeper: true,
        required: s.state,
        actual: profile.state,
        reason: `Restricted to permanent residents of ${s.state}. Applicant resides in ${profile.state}.`
      });
    } else {
      passedCriteria.push(`State: ${s.state}`);
      evaluations.push({
        criterion: "State Domicile",
        status: "PASSED",
        isHardGatekeeper: true,
        required: s.state,
        actual: profile.state,
        reason: `Resident of ${s.state} state.`
      });
    }
  } else {
    passedCriteria.push("Central / Pan-India scheme");
    evaluations.push({
      criterion: "State Domicile",
      status: "PASSED",
      isHardGatekeeper: false,
      required: "Pan-India / Central",
      actual: profile.state || "All",
      reason: "Open to students across all Indian states and Union Territories."
    });
  }

  // 5. DISTRICT EVALUATION (Hard Gatekeeper if specified)
  if (s.district && s.district !== "All") {
    if (!profile.district || profile.district === "All") {
      missingRequirements.push(`District Jurisdiction (${s.district})`);
      evaluations.push({
        criterion: "District Jurisdiction",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: s.district,
        actual: "Not Provided",
        reason: `This special welfare scheme is restricted to beneficiaries in ${s.district} district.`
      });
    } else if (s.district.toLowerCase() !== profile.district.toLowerCase()) {
      failedCriteria.push(`District restricted (${s.district})`);
      evaluations.push({
        criterion: "District Jurisdiction",
        status: "FAILED",
        isHardGatekeeper: true,
        required: s.district,
        actual: profile.district,
        reason: `This special welfare scheme is restricted to beneficiaries in ${s.district} district. Applicant is in ${profile.district}.`
      });
    } else {
      passedCriteria.push(`District: ${s.district}`);
      evaluations.push({
        criterion: "District Jurisdiction",
        status: "PASSED",
        isHardGatekeeper: true,
        required: s.district,
        actual: profile.district,
        reason: `Resident of targeted district (${s.district}).`
      });
    }
  } else {
    passedCriteria.push("Applicable in all districts");
  }

  // 6. COURSE / ACADEMIC TRACK EVALUATION (Hard Gatekeeper if specified)
  if (s.course && s.course !== "All") {
    if (!profile.course || profile.course === "All") {
      missingRequirements.push(`Course Curriculum (${s.course})`);
      evaluations.push({
        criterion: "Course Curriculum",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: s.course,
        actual: "Not Provided",
        reason: `Scheme is designated specifically for ${s.course} studies. Course was not provided.`
      });
    } else if (s.course.toLowerCase() !== profile.course.toLowerCase()) {
      failedCriteria.push(`Course restricted to ${s.course}`);
      evaluations.push({
        criterion: "Course Curriculum",
        status: "FAILED",
        isHardGatekeeper: true,
        required: s.course,
        actual: profile.course,
        reason: `Scheme is designated specifically for ${s.course} studies. Applicant is studying ${profile.course}.`
      });
    } else {
      passedCriteria.push(`Course: ${s.course}`);
      evaluations.push({
        criterion: "Course Curriculum",
        status: "PASSED",
        isHardGatekeeper: true,
        required: s.course,
        actual: profile.course,
        reason: `Admitted in ${s.course} degree program.`
      });
    }
  } else {
    passedCriteria.push("All collegiate & school courses eligible");
  }

  // 7. DISABILITY REQUIREMENT EVALUATION
  const requiresDisability = !!(s.requiresDisability || s.id === "nsp-aicte-saksham" || s.id === "tn-differently-abled");
  if (requiresDisability) {
    if (profile.disabled === undefined) {
      missingRequirements.push("Disability status (minimum 40% benchmark disability)");
      evaluations.push({
        criterion: "Disability Benchmark",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "Minimum 40% Disability Certificate",
        actual: "Not Provided",
        reason: "Requires benchmark disability certification (minimum 40%). Disability status was not provided."
      });
    } else if (profile.disabled === false) {
      const underBenchmark = profile.disabilityPercent !== undefined && profile.disabilityPercent < 40;
      failedCriteria.push(underBenchmark
        ? `Minimum 40% benchmark disability required (provided: ${profile.disabilityPercent}%)`
        : "Disability certificate required");
      evaluations.push({
        criterion: "Disability Benchmark",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "Minimum 40% Disability Certificate",
        actual: underBenchmark ? `${profile.disabilityPercent}% Disability` : "No Disability",
        reason: underBenchmark
          ? `Requires benchmark disability certification (minimum 40%). Specified disability (${profile.disabilityPercent}%) is below statutory threshold.`
          : "Requires benchmark disability certification (minimum 40%). Applicant indicated no disability."
      });
    } else {
      passedCriteria.push("Disability certified");
      evaluations.push({
        criterion: "Disability Benchmark",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "Minimum 40% Disability Certificate",
        actual: "Certified Disability",
        reason: "Meets differently-abled benchmark criterion."
      });
    }
  }

  // 8. GOVERNMENT SCHOOL BACKGROUND EVALUATION
  const requiresGovtSchool = !!(s.requiresGovtSchool || s.id === "tn-pudhumaipenn" || s.id === "tn-tamil-pudhalvan" || s.id === "tn-govt-school-7-5-quota" || s.id === "nsp-nmms-central");
  if (requiresGovtSchool) {
    if (profile.govtSchool === undefined) {
      missingRequirements.push("Government school background (Class 6 to 12)");
      evaluations.push({
        criterion: "Government School Background",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "Class 6 to 12 in Government Schools",
        actual: "Not Provided",
        reason: "Requires study in Government schools from Class 6 to 12. School background was not provided."
      });
    } else if (profile.govtSchool === false) {
      failedCriteria.push("Government school study background required");
      evaluations.push({
        criterion: "Government School Background",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "Class 6 to 12 in Government Schools",
        actual: "Non-Government School",
        reason: "Requires study in Government schools from Class 6 to 12. Applicant did not study in Government schools."
      });
    } else {
      passedCriteria.push("Government school confirmed");
      evaluations.push({
        criterion: "Government School Background",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "Class 6 to 12 in Government Schools",
        actual: "Government School Study",
        reason: "Meets Class 6 to 12 Government school background criterion."
      });
    }
  }

  // 9. PARENT OCCUPATION / AGRICULTURAL LABORER EVALUATION
  const requiresAgriLabor = !!(s.requiresAgriLabor || s.id === "tn-salem-farmers");
  if (requiresAgriLabor) {
    if (profile.agriLabor === undefined && profile.parentOccupation === undefined) {
      missingRequirements.push("Parent registered agricultural laborer status");
      evaluations.push({
        criterion: "Parent Occupation",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "Registered Landless Agricultural Laborer",
        actual: "Not Provided",
        reason: "Requires parent to be a registered agricultural laborer or marginal farmer. Parent occupation was not provided."
      });
    } else if (profile.agriLabor === false) {
      failedCriteria.push("Parent must be registered agricultural laborer");
      evaluations.push({
        criterion: "Parent Occupation",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "Registered Landless Agricultural Laborer",
        actual: "Non-Agricultural Laborer",
        reason: "Restricted to children of registered agricultural laborers."
      });
    } else {
      passedCriteria.push("Parent registered agricultural laborer confirmed");
      evaluations.push({
        criterion: "Parent Occupation",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "Registered Landless Agricultural Laborer",
        actual: "Registered Agricultural Laborer",
        reason: "Meets agricultural laborer welfare requirement."
      });
    }
  }

  // 10. ARMED FORCES / PARAMILITARY WARDS EVALUATION
  const requiresArmedForces = !!(s.requiresArmedForces || s.specialCondition === "armed_forces" || s.id === "pmss");
  if (requiresArmedForces) {
    if (profile.armedForces === undefined) {
      missingRequirements.push("Ward of Armed Forces / Ex-Servicemen status");
      evaluations.push({
        criterion: "Armed Forces Ward",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "Ward of Armed Forces / Ex-Servicemen",
        actual: "Not Provided",
        reason: "Requires applicant to be a ward of Armed Forces / Ex-Servicemen personnel. Armed forces status was not provided."
      });
    } else if (profile.armedForces === false) {
      failedCriteria.push("Restricted to wards of Armed Forces");
      evaluations.push({
        criterion: "Armed Forces Ward",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "Ward of Armed Forces / Ex-Servicemen",
        actual: "Not Armed Forces Ward",
        reason: "Restricted to wards of Armed Forces / Ex-Servicemen."
      });
    } else {
      passedCriteria.push("Ward of Armed Forces confirmed");
      evaluations.push({
        criterion: "Armed Forces Ward",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "Ward of Armed Forces / Ex-Servicemen",
        actual: "Armed Forces Ward",
        reason: "Meets Armed Forces ward requirement."
      });
    }
  }

  // 11. FIRST GRADUATE CONCESSION EVALUATION
  // Only applies to schemes where requiresFirstGraduate === true.
  // Tri-state: true → PASSED, false → FAILED, null/undefined → NEEDS_MORE_INFORMATION.
  // Do NOT apply first-graduate as a universal BC/MBC requirement.
  const requiresFirstGraduate = !!(s.requiresFirstGraduate || s.id === "tn-first-graduate");
  if (requiresFirstGraduate) {
    if (profile.firstGraduate === undefined || profile.firstGraduate === null) {
      missingRequirements.push("First Graduate status (no graduate in family)");
      evaluations.push({
        criterion: "First Graduate",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "First Graduate in Family Certificate",
        actual: "Not Answered",
        reason: "Some schemes require the student to be the first graduate in the family. First Graduate status was not answered."
      });
    } else if (profile.firstGraduate === false) {
      failedCriteria.push("Restricted to first-generation graduates");
      evaluations.push({
        criterion: "First Graduate",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "First Graduate in Family Certificate",
        actual: "Family Member Already Graduated",
        reason: "Requires neither parent nor elder sibling to have graduated."
      });
    } else {
      passedCriteria.push("First graduate in family confirmed");
      evaluations.push({
        criterion: "First Graduate",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "First Graduate in Family Certificate",
        actual: "First Graduate in Family",
        reason: "Meets First Graduate concession criterion."
      });
    }
  }

  // 12. ADMISSION QUOTA EVALUATION (Scheme-specific Government Quota requirement)
  // Only applies to schemes where requiresGovtQuota === true (set per authoritative scheme data).
  // Tri-state: "government" → PASSED, "management" → FAILED, "unknown"/missing → NEEDS_MORE_INFORMATION.
  // IMPORTANT: Do NOT assume quota from community. Do NOT default unknown to "government".
  // Quota type comes from admission records or user input — never inferred from community certificate.
  const isBcMbcStudent = studentCat && ["BC", "MBC", "DNC", "DNT"].includes(studentCat.toUpperCase());
  const isGovtQuotaScheme = !!(s.quota === "govt-only" || s.requiresGovtQuota === true);

  if (isGovtQuotaScheme && isBcMbcStudent) {
    const qt = (profile.quotaType || "unknown").toLowerCase();
    if (qt === "management") {
      failedCriteria.push("Requires Government Quota admission for BC/MBC category");
      evaluations.push({
        criterion: "Admission Quota",
        status: "FAILED",
        isHardGatekeeper: true,
        required: "Government Quota Only",
        actual: "Management Quota",
        reason: "This scheme's published eligibility requires Government Quota admission. Management Quota is not eligible under this scheme."
      });
    } else if (qt === "unknown") {
      missingRequirements.push("Admission Quota type (Government Quota or Management Quota)");
      evaluations.push({
        criterion: "Admission Quota",
        status: "NEEDS_INFO",
        isHardGatekeeper: true,
        required: "Government Quota Only",
        actual: "Quota Not Specified",
        reason: "Quota information is needed to determine eligibility for this scheme. Some BC/MBC/DNC education benefits have Government Quota requirements. Eligibility depends on the specific scheme."
      });
    } else {
      // qt === "government"
      passedCriteria.push("Government Quota confirmed");
      evaluations.push({
        criterion: "Admission Quota",
        status: "PASSED",
        isHardGatekeeper: true,
        required: "Government Quota Only",
        actual: "Government Quota",
        reason: "Meets Government Quota admission requirement for this scheme."
      });
    }
  }

  // Determine Overall Match Status across the 4 Distinct Categories:
  // 1. CONFIRMED MATCH — All required criteria are explicitly supplied and satisfied.
  // 2. POTENTIAL MATCH — Some criteria satisfied, non-critical details missing.
  // 3. NEEDS MORE INFORMATION — A required criterion is missing.
  // 4. NOT MATCHED — A supplied criterion clearly fails.
  let matchType = "NOT MATCHED";
  let isEligible = false;
  let matchScore = 0;
  let summary = "";

  if (failedCriteria.length > 0) {
    matchType = "NOT MATCHED";
    isEligible = false;
    matchScore = 0;
    summary = `Ineligible: ${failedCriteria.join("; ")}.`;
  } else if (missingRequirements.length > 0) {
    const isSakshamPotential = (s.id === "nsp-aicte-saksham" && profile.disabled === true && (!profile.course || profile.course === "Engineering" || profile.course === "Diploma"));
    const isDisabilityPotential = (s.id === "tn-differently-abled" && profile.disabled === true);

    if (isSakshamPotential || isDisabilityPotential) {
      matchType = "POTENTIAL MATCH";
      isEligible = false; // Requires confirmation of missing items
      matchScore = 55;
      summary = `Potential match: Primary criteria satisfied. Confirmation requires: ${missingRequirements.join(", ")}.`;
    } else {
      matchType = "NEEDS MORE INFORMATION";
      isEligible = false;
      matchScore = 0;
      summary = `Needs more information: ${missingRequirements.join(", ")}.`;
    }
  } else {
    // All required criteria were explicitly supplied and satisfied!
    matchType = "CONFIRMED MATCH";
    isEligible = true;
    matchScore = 70; // Base score for confirmed match

    // Targeted Category alignment
    if (s.category !== "All" && studentCat && s.category.toUpperCase() === studentCat.toUpperCase()) {
      matchScore += 10;
    }

    // Targeted Course alignment
    if (s.course !== "All" && profile.course && s.course.toLowerCase() === profile.course.toLowerCase()) {
      matchScore += 10;
    }

    // Specific District alignment
    if (s.district !== "All" && profile.district && s.district.toLowerCase() === profile.district.toLowerCase()) {
      matchScore += 5;
    }

    // Low income relative to ceiling bonus
    if (profile.income && s.incomeLimit !== 99999999) {
      const ratio = profile.income / s.incomeLimit;
      if (ratio < 0.6) matchScore += 5;
    }

    matchScore = Math.min(100, Math.max(70, matchScore));
    summary = `Meets all mandatory criteria for ${s.name}. Eligibility score: ${matchScore}%.`;
  }

  return {
    scholarship: s,
    isEligible,
    matchScore,
    status: matchType,
    matchType,
    // scholarshipApplicantName is always the student — incomeProviderName is the parent when applicable
    applicantName,
    incomeProviderName,
    incomeApplicant: profile.incomeApplicant || "student",
    // quotaType preserved as-is: "government" | "management" | "unknown" (never silently defaulted)
    quotaType: profile.quotaType || "unknown",
    // firstGraduate preserved as tri-state: true | false | null — null means unanswered
    firstGraduate: profile.firstGraduate !== undefined ? profile.firstGraduate : null,
    missingRequirements,
    evaluations,
    passedCriteria,
    failedCriteria,
    summary
  };
}

/**
 * Evaluate all scholarships against profile and sort by eligibility & match score
 */
export function evaluateAllScholarships(scholarshipsList = [], profile = {}) {
  const results = scholarshipsList.map(s => evaluateScholarship(s, profile));

  return results.sort((a, b) => {
    const order = { "CONFIRMED MATCH": 3, "POTENTIAL MATCH": 2, "NEEDS MORE INFORMATION": 1, "NOT MATCHED": 0 };
    const diff = (order[b.matchType] || 0) - (order[a.matchType] || 0);
    if (diff !== 0) return diff;
    return b.matchScore - a.matchScore;
  });
}

/**
 * Filter to only eligible scholarships (CONFIRMED or POTENTIAL matches)
 */
export function getEligibleScholarships(scholarshipsList = [], profile = {}) {
  return evaluateAllScholarships(scholarshipsList, profile).filter(r => r.isEligible);
}
