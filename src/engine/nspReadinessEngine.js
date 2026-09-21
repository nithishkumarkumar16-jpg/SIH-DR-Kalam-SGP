/**
 * nspReadinessEngine.js — NSP Pre-Submission Risk & Consistency Checker
 *
 * PURPOSE:
 *   Helps students identify preventable application and document issues BEFORE
 *   submitting their scholarship application on NSP or State Portals.
 *
 * STRICT BOUNDARY STATEMENT:
 *   SGP checks document information and consistency. It does not independently
 *   authenticate government records, guarantee scholarship approval, confirm
 *   certificate database authenticity, or access NPCI / UIDAI live systems.
 *
 * TERMINOLOGY NOTICE:
 *   This engine provides a "Pre-Submission Risk Check" — NOT an "AI Rejection
 *   Prediction". All checks are deterministic, transparent, and independently
 *   explainable rules.
 *
 * SEVERITY LEVELS:
 *   HIGH_ATTENTION   — Likely causes NSP delay, query, or rejection if unaddressed
 *   MEDIUM_ATTENTION — Inconsistency or missing detail that requires verification
 *   LOW_ATTENTION    — Advisory note; worth reviewing before submission
 *
 * SCORE MODEL (100 points total):
 *   Student Identity       20 pts (name & DOB consistency across student documents)
 *   Document Completeness  20 pts (required docs present, valid format, readable)
 *   Eligibility            20 pts (scheme criteria match from official rules)
 *   Application Data       20 pts (user entered application data vs document evidence)
 *   Bank / DBT             10 pts (student account holder, IFSC format, DBT guidance)
 *   Certificate Validity   10 pts (income cert currency ≤ 1 yr, community cert recency)
 *
 * STATUSES:
 *   READY TO SUBMIT       (90–100 pts, no required info missing)
 *   REVIEW BEFORE SUBMIT  (75–89 pts, or score ≥ 90 with unknown required fields)
 *   CORRECTIONS NEEDED    (50–74 pts)
 *   NOT READY             (0–49 pts)
 *
 * CORE INVARIANTS:
 *   1. Student is ALWAYS the scholarship applicant (never the parent).
 *   2. Parent is strictly the income provider (incomeProviderName).
 *   3. In parent income mode, parent's name on income cert is NEVER compared to student name.
 *   4. Student identity documents (Aadhaar ↔ 10th ↔ 12th ↔ Bank) are always cross-checked.
 *   5. Admission quota defaults to "unknown" — NEVER silently assumed as "government".
 *   6. First Graduate preserves null — NEVER silently converted to false.
 *   7. Tamil Nadu rules NEVER leak into Central NSP or other state schemes.
 *   8. Unverified rules NEVER cause automatic hard rejections.
 */

import { evaluateScholarship } from "./eligibilityEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_SCORES = {
  identity: 20,
  documents: 20,
  eligibility: 20,
  application: 20,
  bank: 10,
  certificates: 10,
};

export const READINESS_THRESHOLDS = {
  READY_TO_SUBMIT: 90,
  REVIEW_BEFORE_SUBMIT: 75,
  CORRECTIONS_NEEDED: 50,
  NOT_READY: 0,
};

export const READINESS_LEVEL_INFO = {
  READY_TO_SUBMIT: {
    label: "Ready to Submit",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.12)",
    icon: "✅",
    description: "Your documents and eligibility look strong. Review the official portal and proceed to submit.",
  },
  NEEDS_CONFIRMATION: {
    label: "Needs Information / Official Confirmation",
    color: "#0284c7",
    bgColor: "rgba(2,132,199,0.12)",
    icon: "ℹ️",
    description: "Some required details or official live statuses are unconfirmed. Verify them on official portals before submitting.",
  },
  REVIEW_BEFORE_SUBMIT: {
    label: "Review Before Submit",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.12)",
    icon: "⚠️",
    description: "A few items need your attention or confirmation before submitting to the portal.",
  },
  CORRECTIONS_NEEDED: {
    label: "Corrections Needed",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.12)",
    icon: "🔧",
    description: "Several issues found. Please correct them before applying on the official portal.",
  },
  NOT_READY: {
    label: "Not Ready",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.12)",
    icon: "🚫",
    description: "Critical issues found. Do not apply until these are resolved.",
  },
};

export const CHECK_TYPES = {
  UNIVERSAL_CONSISTENCY_CHECK: "UNIVERSAL_CONSISTENCY_CHECK",
  SCHEME_SPECIFIC_CHECK: "SCHEME_SPECIFIC_CHECK",
  ADVISORY_CHECK: "ADVISORY_CHECK",
};

export const CORE_POSITIONING =
  "SGP is a privacy-focused Pre-Submission Scholarship Readiness Platform that helps students identify and correct preventable application issues before submitting through official scholarship portals.";

export const SECONDARY_POSITIONING =
  "SGP does not replace NSP, UMIS or government verification systems. It prepares the student's information and documents for submission to those official systems.";

export const BOUNDARY_STATEMENT =
  "SGP checks document information and consistency. It does not independently authenticate government records, " +
  "guarantee scholarship approval, confirm certificate database authenticity, or access NPCI / UIDAI live systems. " +
  "SGP PRE-SUBMISSION CHECK: This result is a readiness assessment, not an official government verification or approval decision. " +
  "SGP does not replace government verification. It reduces preventable errors before government verification begins. " +
  "The official portal remains the source of truth for authentication, application status, verification, sanction and payment. " +
  "SGP does not predict NSP rejection, and does not guarantee scholarship approval.";

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Levenshtein edit distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0;
  }
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Character-level similarity ratio (0.0 – 1.0).
 */
export function computeStringSimilarity(a, b) {
  if (!a || !b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

/**
 * Normalise a name string: uppercase, collapse whitespace, strip punctuation.
 */
export function normaliseName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ");
}

/**
 * Normalise a date string to DD-MM-YYYY format.
 */
export function normaliseDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.replace(/\./g, "-").replace(/\//g, "-").trim();
  return clean;
}

/**
 * Check whether an income certificate is older than maxMonths,
 * or evaluate explicit expiry date.
 */
export function checkCertExpiry(issueDateStr, maxMonths = 12, explicitExpiryDate = null) {
  if (explicitExpiryDate) {
    try {
      const parts = explicitExpiryDate.replace(/\./g, "/").replace(/-/g, "/").split("/");
      if (parts.length === 3) {
        let d, m, y;
        if (parts[0].length === 4) [y, m, d] = parts;
        else if (Number(parts[2]) > 31) [d, m, y] = parts;
        else [d, m, y] = parts;
        const expDate = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        if (!isNaN(expDate.getTime())) {
          const isExp = Date.now() > expDate.getTime();
          return { expired: isExp, unknown: false, explicit: true, validityStatus: isExp ? "EXPIRED" : "VALID" };
        }
      }
    } catch {}
  }
  if (!issueDateStr) return { expired: false, unknown: true, monthsOld: null, validityStatus: "UNKNOWN" };
  try {
    const parts = issueDateStr.replace(/\./g, "/").replace(/-/g, "/").split("/");
    if (parts.length !== 3) return { expired: false, unknown: true, monthsOld: null, validityStatus: "UNKNOWN" };
    let d, m, y;
    if (parts[0].length === 4) {
      [y, m, d] = parts;
    } else if (Number(parts[2]) > 31) {
      [d, m, y] = parts;
    } else {
      [d, m, y] = parts;
    }
    const date = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    if (isNaN(date.getTime())) return { expired: false, unknown: true, monthsOld: null, validityStatus: "UNKNOWN" };
    const monthsOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return {
      expired: monthsOld > maxMonths,
      unknown: false,
      monthsOld: Math.round(monthsOld),
      validityStatus: monthsOld > maxMonths ? "REQUIRES_REVIEW" : "VALID",
    };
  } catch {
    return { expired: false, unknown: true, monthsOld: null, validityStatus: "UNKNOWN" };
  }
}

/**
 * Validates Indian Financial System Code (IFSC) standard format (4 letters, 0, 6 alphanumeric).
 */
export function isValidIFSC(ifsc) {
  if (!ifsc || typeof ifsc !== "string") return false;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
}

/**
 * Determine readiness level considering both numerical score and presence of unknown required info.
 */
export function getReadinessLevel(score, hasUnknownRequired = false) {
  if (hasUnknownRequired && score >= READINESS_THRESHOLDS.REVIEW_BEFORE_SUBMIT) {
    return "NEEDS_CONFIRMATION";
  }
  if (score >= READINESS_THRESHOLDS.READY_TO_SUBMIT) return hasUnknownRequired ? "NEEDS_CONFIRMATION" : "READY_TO_SUBMIT";
  if (score >= READINESS_THRESHOLDS.REVIEW_BEFORE_SUBMIT) return "REVIEW_BEFORE_SUBMIT";
  if (score >= READINESS_THRESHOLDS.CORRECTIONS_NEEDED) return "CORRECTIONS_NEEDED";
  return "NOT_READY";
}

// ─── Risk Item Builder ────────────────────────────────────────────────────────

function risk(id, severity, box, field, title, detail, action, scoreDeduction = 0, checkType = CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK) {
  return {
    id,
    severity,
    box,
    field: field || box,
    reason: title,
    title,
    evidence: detail,
    detail,
    description: detail,
    action,
    recommendedAction: action,
    scoreDeduction,
    penalty: scoreDeduction,
    checkType,
  };
}

// ─── Document Matching Helper ─────────────────────────────────────────────────

export function docMatchesUpload(label, upType) {
  const l = (label || "").toLowerCase();
  const u = (upType || "").toLowerCase();
  if (l.includes(u) || u.includes(l)) return true;
  if ((l.includes("marksheet") || l.includes("class") || l.includes("12th") || l.includes("10th")) &&
      (u.includes("marksheet") || u.includes("twelfth") || u.includes("tenth") || u.includes("class"))) return true;
  if ((l.includes("bank") || l.includes("passbook") || l.includes("statement")) &&
      (u.includes("bank") || u.includes("passbook") || u.includes("statement"))) return true;
  if ((l.includes("bonafide") || l.includes("enrollment") || l.includes("college") || l.includes("admission")) &&
      (u.includes("bonafide") || u.includes("college") || u.includes("enrollment") || u.includes("admission"))) return true;
  if ((l.includes("aishe") || l.includes("institute")) &&
      (u.includes("aishe") || u.includes("institute") || u.includes("bonafide") || u.includes("college"))) return true;
  if ((l.includes("aadhaar") || l.includes("identity")) &&
      (u.includes("aadhaar") || u.includes("aadhar") || u.includes("identity"))) return true;
  if (l.includes("income") && u.includes("income")) return true;
  if ((l.includes("community") || l.includes("caste") || l.includes("obc") || l.includes("sc") || l.includes("st")) &&
      (u.includes("community") || u.includes("caste"))) return true;
  if (l.includes("first graduate") && (u.includes("first_graduate") || u.includes("graduate"))) return true;
  if (l.includes("disability") && u.includes("disability")) return true;
  return false;
}

// ─── Section 5: Reusable Document Comparison Matrix ───────────────────────────

/**
 * Builds a structured comparison matrix of extracted document fields across all uploaded certificates.
 *
 * @param {object} profile
 * @param {object} documentData
 * @returns {object} Structured document matrix across the 6 categories
 */
export function buildDocumentComparisonMatrix(profile = {}, documentData = {}) {
  const incomeApplicant = profile.incomeApplicant || "student";
  const studentName = profile.studentName || profile.name || null;
  const parentName = profile.parentName || profile.fatherName || profile.motherName || null;

  // 1. Identity Fields
  const aadhaarName = documentData.aadharName || documentData.aadhaarName || null;
  const tenthName = documentData.tenthData?.name || null;
  const twelfthName = documentData.twelfthData?.name || null;
  const bankHolderName = documentData.bankHolder || profile.bankHolder || null;
  const bonafideName = documentData.bonafideName || null;

  // Names comparison (student documents only)
  const studentNames = [aadhaarName, tenthName, twelfthName, bankHolderName, bonafideName].filter(Boolean);
  let nameConsistency = "MATCH";
  if (studentNames.length > 1) {
    const normRef = normaliseName(studentNames[0]);
    const hasDiff = studentNames.some(n => computeStringSimilarity(normRef, normaliseName(n)) < 0.75);
    if (hasDiff) nameConsistency = "MISMATCH";
  }

  // DOB comparison
  const tenthDob = documentData.tenthData?.dob || null;
  const aadharDob = documentData.aadharDob || documentData.aadhaarDob || null;
  let dobConsistency = "MATCH";
  if (tenthDob && aadharDob && normaliseDate(tenthDob) !== normaliseDate(aadharDob)) {
    dobConsistency = "MISMATCH";
  }

  // 2. Financial Fields
  const incomeCertName = documentData.incomeData?.name || null;
  const incomeCertAmount = documentData.incomeData?.income != null ? Number(documentData.incomeData.income) : null;
  const incomeIssueDate = documentData.incomeData?.issueDate || documentData.incomeIssueDate || null;
  const incomeExpiry = checkCertExpiry(incomeIssueDate, 12);

  // 3. Bank Fields
  const ifsc = documentData.bankData?.ifsc || profile.ifsc || null;
  const isIfscValid = ifsc ? isValidIFSC(ifsc) : null;
  const isAadhaarBankLinked = documentData.aadhaarBankLinked ?? profile.aadhaarBankLinked ?? null;

  // 4. Social / Category
  const communityCategory = documentData.communityData?.communityCategory || null;
  const communityIssueDate = documentData.communityData?.issueDate || null;
  const communityExpiry = checkCertExpiry(communityIssueDate, 60);

  return {
    identity: {
      name: {
        aadhaar: aadhaarName,
        tenth: tenthName,
        twelfth: twelfthName,
        bank: bankHolderName,
        bonafide: bonafideName,
        status: nameConsistency,
      },
      dob: {
        tenth: tenthDob,
        aadhaar: aadharDob,
        status: dobConsistency,
      },
      gender: {
        profile: profile.gender || null,
        aadhaar: documentData.aadharGender || null,
        status: (profile.gender && documentData.aadharGender)
          ? (profile.gender.toLowerCase() === documentData.aadharGender.toLowerCase() ? "MATCH" : "MISMATCH")
          : "UNCONFIRMED",
      },
    },
    academic: {
      tenthYear: { value: documentData.tenthData?.year || null, doc: "10th Marksheet" },
      twelfthYear: { value: documentData.twelfthData?.year || null, doc: "12th Marksheet" },
      marks: { value: documentData.twelfthData?.marks || documentData.tenthData?.marks || null, doc: "Marksheet" },
      percentage: { value: documentData.twelfthData?.percentage || documentData.tenthData?.percentage || null, doc: "Marksheet" },
      board: { value: documentData.twelfthData?.board || documentData.tenthData?.board || null, doc: "Marksheet" },
      registrationNumber: { value: documentData.twelfthData?.regNumber || documentData.tenthData?.regNumber || null, doc: "Marksheet" },
      course: { value: documentData.courseName || profile.course || null, doc: "Admission / Bonafide" },
      institution: { value: documentData.institutionName || profile.institution || null, doc: "Bonafide" },
    },
    social: {
      community: { value: documentData.communityData?.communityName || null, doc: "Community Certificate" },
      category: { value: communityCategory, doc: "Community Certificate" },
      disability: { value: documentData.disabilityPercentage || null, doc: "Disability Certificate" },
      firstGraduate: { value: profile.firstGraduate, doc: documentData.firstGraduateCert ? "First Graduate Cert" : "User Input" },
      validity: { expired: communityExpiry.expired, monthsOld: communityExpiry.monthsOld, doc: "Community Certificate" },
    },
    financial: {
      incomeAmount: { value: incomeCertAmount, doc: "Income Certificate" },
      incomeYear: { value: documentData.incomeData?.academicYear || null, doc: "Income Certificate" },
      incomeProvider: {
        value: incomeApplicant === "parent" ? (parentName || "Parent") : (studentName || "Student"),
        certName: incomeCertName,
        role: incomeApplicant,
        doc: "Income Certificate",
      },
      certificateNumber: { value: documentData.incomeData?.certNumber || null, doc: "Income Certificate" },
      issueDate: { value: incomeIssueDate, doc: "Income Certificate" },
      validity: { expired: incomeExpiry.expired, monthsOld: incomeExpiry.monthsOld, doc: "Income Certificate" },
    },
    bank: {
      accountHolderName: { value: bankHolderName, doc: "Bank Passbook" },
      ifsc: { value: ifsc, isValidFormat: isIfscValid, doc: "Bank Passbook" },
      accountType: { value: documentData.bankData?.accountType || "Savings", doc: "Bank Passbook" },
      dbtReadiness: { aadhaarLinked: isAadhaarBankLinked, doc: "Self-Reported / Passbook" },
    },
    residence: {
      state: { value: profile.state || documentData.state || null, doc: "Domicile / Address" },
      district: { value: profile.district || documentData.district || null, doc: "Address / Cert" },
      domicile: { value: profile.domicile || profile.state || null, doc: "Domicile Certificate" },
    },
  };
}

// ─── Section 7: Application-vs-Document Comparison ────────────────────────────

/**
 * Performs field-by-field comparison between User Application Data and Extracted Document Evidence.
 *
 * Statuses:
 *   "MATCH"            — Field identical or semantically equivalent
 *   "MINOR_DIFFERENCE" — Minor variation (e.g. initials, minor spelling, small income difference ≤ 10%)
 *   "MISMATCH"         — Significant contradiction (different name, different DOB, category mismatch)
 *   "MISSING"          — Field present in application but missing in document evidence (or vice-versa)
 *
 * @param {object} profile      Application data entered by student
 * @param {object} documentData  Evidence extracted from uploaded documents
 * @returns {Array} Array of comparison results per field
 */
export function buildApplicationVsDocumentComparison(profile = {}, documentData = {}) {
  const comparisons = [];
  const incomeApplicant = profile.incomeApplicant || "student";
  const studentName = profile.studentName || profile.name || "";
  const parentName = profile.parentName || profile.fatherName || profile.motherName || "";

  // 1. Name
  const docName = documentData.aadharName || documentData.tenthData?.name || documentData.twelfthData?.name || null;
  if (!studentName && !docName) {
    comparisons.push({ field: "Name", applicationValue: "—", documentEvidence: "—", status: "MISSING", detail: "Name not entered or extracted.", action: "Enter student full name exactly as in Aadhaar / 10th marksheet." });
  } else if (!docName) {
    comparisons.push({ field: "Name", applicationValue: studentName, documentEvidence: "Not extracted", status: "MISSING", detail: "Name not extracted from uploaded documents.", action: "Upload readable Aadhaar card or 10th marksheet." });
  } else {
    const sim = computeStringSimilarity(normaliseName(studentName), normaliseName(docName));
    if (sim >= 0.90) {
      comparisons.push({ field: "Name", applicationValue: studentName, documentEvidence: docName, status: "MATCH", detail: "Student name matches document evidence.", action: "None" });
    } else if (sim >= 0.75) {
      comparisons.push({ field: "Name", applicationValue: studentName, documentEvidence: docName, status: "MINOR_DIFFERENCE", detail: `Minor variation between "${studentName}" and "${docName}".`, action: "Check the original documents before submitting the NSP application." });
    } else {
      comparisons.push({ field: "Name", applicationValue: studentName, documentEvidence: docName, status: "MISMATCH", detail: `Significant name mismatch: Application has "${studentName}", document has "${docName}".`, action: "Check the original documents before submitting the NSP application. Do not apply with mismatched names." });
    }
  }

  // 2. Date of Birth (DOB)
  const appDob = profile.dob || null;
  const docDob = documentData.tenthData?.dob || documentData.aadharDob || null;
  if (!appDob && !docDob) {
    comparisons.push({ field: "Date of Birth", applicationValue: "—", documentEvidence: "—", status: "MISSING", detail: "DOB not provided or extracted.", action: "Enter Date of Birth." });
  } else if (!docDob) {
    comparisons.push({ field: "Date of Birth", applicationValue: appDob, documentEvidence: "Not extracted", status: "MISSING", detail: "DOB not extracted from documents.", action: "Verify DOB against Class 10 certificate." });
  } else {
    const normApp = normaliseDate(appDob);
    const normDoc = normaliseDate(docDob);
    if (normApp && normDoc && normApp === normDoc) {
      comparisons.push({ field: "Date of Birth", applicationValue: appDob, documentEvidence: docDob, status: "MATCH", detail: "DOB exactly matches.", action: "None" });
    } else {
      comparisons.push({ field: "Date of Birth", applicationValue: appDob, documentEvidence: docDob, status: "MISMATCH", detail: `DOB mismatch: Application has ${appDob}, document has ${docDob}.`, action: "Check the original documents before submitting the NSP application." });
    }
  }

  // 3. Category / Community
  const appCat = (profile.category || "").toUpperCase().trim();
  const docCat = (documentData.communityData?.communityCategory || "").toUpperCase().trim();
  if (!appCat && !docCat) {
    comparisons.push({ field: "Category", applicationValue: "—", documentEvidence: "—", status: "MISSING", detail: "Category not provided.", action: "Select your community category." });
  } else if (!docCat) {
    comparisons.push({ field: "Category", applicationValue: appCat, documentEvidence: "Not extracted", status: "MISSING", detail: "Community category not extracted from certificate.", action: "Upload valid community/caste certificate." });
  } else if (appCat === docCat) {
    comparisons.push({ field: "Category", applicationValue: appCat, documentEvidence: docCat, status: "MATCH", detail: "Category matches community certificate.", action: "None" });
  } else {
    comparisons.push({ field: "Category", applicationValue: appCat, documentEvidence: docCat, status: "MISMATCH", detail: `Category mismatch: Application states ${appCat}, certificate states ${docCat}.`, action: "Check the original documents before submitting the NSP application. Use category shown on community certificate." });
  }

  // 4. Annual Family Income
  const appIncome = typeof profile.income === "number" ? profile.income : null;
  const docIncome = documentData.incomeData?.income != null ? Number(documentData.incomeData.income) : null;
  if (appIncome === null && docIncome === null) {
    comparisons.push({ field: "Family Income", applicationValue: "—", documentEvidence: "—", status: "MISSING", detail: "Income not entered or extracted.", action: "Enter annual family income." });
  } else if (docIncome === null) {
    comparisons.push({ field: "Family Income", applicationValue: `₹${appIncome?.toLocaleString("en-IN")}`, documentEvidence: "Not extracted", status: "MISSING", detail: "Income certificate value not extracted.", action: "Upload readable income certificate." });
  } else {
    const diff = Math.abs(appIncome - docIncome);
    const maxVal = Math.max(appIncome, docIncome);
    const pct = maxVal > 0 ? diff / maxVal : 0;
    if (diff === 0) {
      comparisons.push({ field: "Family Income", applicationValue: `₹${appIncome.toLocaleString("en-IN")}`, documentEvidence: `₹${docIncome.toLocaleString("en-IN")}`, status: "MATCH", detail: "Income amount matches income certificate.", action: "None" });
    } else if (pct <= 0.10) {
      comparisons.push({ field: "Family Income", applicationValue: `₹${appIncome.toLocaleString("en-IN")}`, documentEvidence: `₹${docIncome.toLocaleString("en-IN")}`, status: "MINOR_DIFFERENCE", detail: `Minor difference between application (₹${appIncome.toLocaleString("en-IN")}) and certificate (₹${docIncome.toLocaleString("en-IN")}).`, action: "Use the exact income figure from the income certificate." });
    } else {
      comparisons.push({ field: "Family Income", applicationValue: `₹${appIncome.toLocaleString("en-IN")}`, documentEvidence: `₹${docIncome.toLocaleString("en-IN")}`, status: "MISMATCH", detail: `Income discrepancy: Application has ₹${appIncome.toLocaleString("en-IN")}, certificate has ₹${docIncome.toLocaleString("en-IN")}.`, action: "Check the original documents before submitting. Income value differences require review before portal submission." });
    }
  }

  // 5. Income Certificate Applicant / Provider
  const docIncomeHolder = documentData.incomeData?.name || null;
  if (incomeApplicant === "parent") {
    if (!parentName) {
      comparisons.push({ field: "Income Provider", applicationValue: "Parent Mode (Name missing)", documentEvidence: docIncomeHolder || "Not extracted", status: "MISSING", detail: "Parent name not entered in profile.", action: "Enter parent/guardian name who holds the income certificate." });
    } else if (!docIncomeHolder) {
      comparisons.push({ field: "Income Provider", applicationValue: `Parent: ${parentName}`, documentEvidence: "Not extracted", status: "MISSING", detail: "Name on income cert not extracted.", action: "Ensure parent name on income certificate is readable." });
    } else {
      const sim = computeStringSimilarity(normaliseName(parentName), normaliseName(docIncomeHolder));
      if (sim >= 0.75) {
        comparisons.push({ field: "Income Provider", applicationValue: `Parent: ${parentName}`, documentEvidence: docIncomeHolder, status: "MATCH", detail: "Parent name matches income certificate holder. Student remains scholarship applicant.", action: "None" });
      } else {
        comparisons.push({ field: "Income Provider", applicationValue: `Parent: ${parentName}`, documentEvidence: docIncomeHolder, status: "MISMATCH", detail: `Parent name "${parentName}" differs from income certificate name "${docIncomeHolder}".`, action: "Check the original documents before submitting the NSP application." });
      }
    }
  } else {
    if (docIncomeHolder && studentName) {
      const sim = computeStringSimilarity(normaliseName(studentName), normaliseName(docIncomeHolder));
      if (sim >= 0.75) {
        comparisons.push({ field: "Income Provider", applicationValue: `Student: ${studentName}`, documentEvidence: docIncomeHolder, status: "MATCH", detail: "Student name matches income certificate holder.", action: "None" });
      } else {
        comparisons.push({ field: "Income Provider", applicationValue: `Student: ${studentName}`, documentEvidence: docIncomeHolder, status: "MISMATCH", detail: `Student mode selected, but certificate belongs to "${docIncomeHolder}".`, action: "Switch to 'Parent/Guardian Income' mode if certificate belongs to parent." });
      }
    }
  }

  // 6. Bank Account Holder
  const docBankHolder = documentData.bankHolder || profile.bankHolder || null;
  if (!docBankHolder) {
    comparisons.push({ field: "Bank Account Holder", applicationValue: studentName, documentEvidence: "Not provided", status: "MISSING", detail: "Bank passbook holder name not provided.", action: "Confirm bank account is in student's own name." });
  } else {
    const sim = computeStringSimilarity(normaliseName(studentName), normaliseName(docBankHolder));
    if (sim >= 0.75) {
      comparisons.push({ field: "Bank Account Holder", applicationValue: studentName, documentEvidence: docBankHolder, status: "MATCH", detail: "Account holder matches student applicant.", action: "None" });
    } else {
      comparisons.push({ field: "Bank Account Holder", applicationValue: studentName, documentEvidence: docBankHolder, status: "MISMATCH", detail: `Account holder "${docBankHolder}" differs from student "${studentName}".`, action: "Bank account holder information may require review. Central NSP DBT guidelines require the account to be in student's own name." });
    }
  }

  // 7. State / Domicile
  const appState = profile.state || null;
  const docState = documentData.state || null;
  if (appState && docState) {
    if (appState.toLowerCase() === docState.toLowerCase()) {
      comparisons.push({ field: "State Domicile", applicationValue: appState, documentEvidence: docState, status: "MATCH", detail: "State matches document evidence.", action: "None" });
    } else {
      comparisons.push({ field: "State Domicile", applicationValue: appState, documentEvidence: docState, status: "MISMATCH", detail: `State discrepancy: Application has ${appState}, document has ${docState}.`, action: "Verify state of permanent residence before applying." });
    }
  }

  return comparisons;
}

// ─── Section 8: Main NSP Readiness Engine (23 Risk Checks) ────────────────────

/**
 * Computes pre-submission readiness for an application against a scheme.
 *
 * @param {object} profile      Student profile (matches SGP profile schema)
 * @param {object|null} scheme  Scholarship scheme object
 * @param {object} documentData Extracted OCR and format data
 * @returns {object} Full readiness result with scores, risks, matrix, and comparisons
 */
export function computeNSPReadiness(profile = {}, scheme = null, documentData = {}) {
  const items = [];
  let hasUnknownRequiredInfo = false;

  // ── Score accumulators (each starts at max) ──
  let identityScore = MAX_SCORES.identity;
  let documentsScore = MAX_SCORES.documents;
  let eligibilityScore = MAX_SCORES.eligibility;
  let applicationScore = MAX_SCORES.application;
  let bankScore = MAX_SCORES.bank;
  let certScore = MAX_SCORES.certificates;

  const deduct = (dim, pts, item) => {
    if (dim === "identity") identityScore = Math.max(0, identityScore - pts);
    else if (dim === "documents") documentsScore = Math.max(0, documentsScore - pts);
    else if (dim === "eligibility") eligibilityScore = Math.max(0, eligibilityScore - pts);
    else if (dim === "application") applicationScore = Math.max(0, applicationScore - pts);
    else if (dim === "bank") bankScore = Math.max(0, bankScore - pts);
    else if (dim === "certificates") certScore = Math.max(0, certScore - pts);
    if (item) items.push({ ...item, scoreDeduction: pts });
  };

  // ── Resolved identifiers & Invariants ──
  const schemeId = scheme?.id || null;
  const schemeName = scheme?.name || "Selected Scheme";
  const schemeJurisdiction = scheme?.jurisdiction || (scheme?.state === "Tamil Nadu" ? "TAMIL_NADU" : "CENTRAL");
  const schemeState = scheme?.state || "All-India";
  const incomeApplicant = profile.incomeApplicant || "student";

  // INVARIANT 1: Student is ALWAYS the scholarship applicant
  const studentName = profile.studentName || profile.name || null;
  // INVARIANT 2: Parent is strictly the income provider
  const incomeProviderName =
    incomeApplicant === "parent"
      ? profile.parentName || profile.fatherName || profile.motherName || null
      : studentName;

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 1 — STUDENT IDENTITY CONSISTENCY (max 20)
  // ════════════════════════════════════════════════════════════════════════════

  // CHECK 1: Student name mismatch across documents
  const studentDocNames = [
    { src: "Aadhaar / Identity", val: documentData.aadharName || documentData.aadhaarName || null },
    { src: "10th Marksheet", val: documentData.tenthData?.name || null },
    { src: "12th Marksheet", val: documentData.twelfthData?.name || null },
    { src: "Bank Passbook", val: documentData.bankHolder || null },
    { src: "Bonafide / Admission", val: documentData.bonafideName || null },
  ].filter(d => d.val);

  if (studentName && studentDocNames.length > 0) {
    const normStudent = normaliseName(studentName);
    const mismatched = studentDocNames.filter(d => {
      const sim = computeStringSimilarity(normStudent, normaliseName(d.val));
      return sim < 0.75;
    });
    if (mismatched.length > 0) {
      const pts = Math.min(15, mismatched.length * 6);
      deduct("identity", pts, risk(
        "IDENTITY_NAME_MISMATCH",
        "HIGH_ATTENTION",
        "identity",
        "name",
        "Student name mismatch across documents",
        `Name "${studentName}" differs from: ${mismatched.map(d => `${d.src} ("${d.val}")`).join("; ")}.`,
        "Verify and correct the name discrepancy before applying. Ensure consistent name spelling across all certificates.",
        pts,
        CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
      ));
    }
  }

  // CHECK 2: DOB mismatch
  const profileDob = profile.dob || null;
  const docDobs = [
    { src: "10th Marksheet", val: documentData.tenthData?.dob || null },
    { src: "Aadhaar", val: documentData.aadharDob || documentData.aadhaarDob || null },
  ].filter(d => d.val);

  if (profileDob && docDobs.length > 0) {
    const normProfileDob = normaliseDate(profileDob);
    const mismatchedDobs = docDobs.filter(d => {
      const normDocDob = normaliseDate(d.val);
      return normProfileDob && normDocDob && normProfileDob !== normDocDob;
    });
    if (mismatchedDobs.length > 0) {
      deduct("identity", 8, risk(
        "IDENTITY_DOB_MISMATCH",
        "HIGH_ATTENTION",
        "identity",
        "dob",
        "Date of Birth mismatch between profile and documents",
        `Profile DOB: ${profileDob}. Differs in: ${mismatchedDobs.map(d => d.src).join(", ")}.`,
        "Verify the correct DOB and ensure it is consistent across all documents. DOB mismatches are a common pre-submission issue.",
        8,
        CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
      ));
    }
  }

  // CHECK 3: Income certificate name (Student mode only)
  // INVARIANT: In parent mode, income cert name is NEVER compared to student name
  if (incomeApplicant === "student" && documentData.incomeData?.name && studentName) {
    const sim = computeStringSimilarity(normaliseName(studentName), normaliseName(documentData.incomeData.name));
    if (sim < 0.70) {
      deduct("identity", 6, risk(
        "IDENTITY_INCOME_NAME_MISMATCH",
        "HIGH_ATTENTION",
        "identity",
        "incomeProvider",
        "Income certificate name differs from student name",
        `Student: "${studentName}". Income certificate: "${documentData.incomeData.name}". Mode is Student Income.`,
        "Ensure names match, or switch to 'Parent/Guardian income' if the certificate belongs to the parent.",
        6,
        CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 2 — DOCUMENT COMPLETENESS & FORMAT (max 20)
  // ════════════════════════════════════════════════════════════════════════════

  // CHECK 7: Missing required documents
  const requiredDocs = scheme?.requiredDocuments || scheme?.documents || [];
  const uploadedTypes = documentData.uploadedTypes || [];

  if (requiredDocs.length > 0 && uploadedTypes.length > 0) {
    const missingDocs = [];
    for (const doc of requiredDocs) {
      const label = typeof doc === "string" ? doc : (doc.label || "");
      const found = uploadedTypes.some(u => docMatchesUpload(label, u));
      if (!found) missingDocs.push(label);
    }
    if (missingDocs.length > 0) {
      const pts = Math.min(16, missingDocs.length * 5);
      const severity = missingDocs.length >= 3 ? "HIGH_ATTENTION" : "MEDIUM_ATTENTION";
      deduct("documents", pts, risk(
        "DOCS_MISSING_REQUIRED",
        severity,
        "documents",
        "requiredDocuments",
        `${missingDocs.length} required document${missingDocs.length > 1 ? "s" : ""} not uploaded`,
        `Missing: ${missingDocs.slice(0, 4).join(", ")}${missingDocs.length > 4 ? ` (+${missingDocs.length - 4} more)` : ""}.`,
        "Upload all required documents before applying. Incomplete applications may delay verification.",
        pts,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  } else if (requiredDocs.length > 0 && uploadedTypes.length === 0) {
    deduct("documents", 12, risk(
      "DOCS_NONE_UPLOADED",
      "HIGH_ATTENTION",
      "documents",
      "requiredDocuments",
      "No documents have been uploaded yet",
      `${schemeName} requires ${requiredDocs.length} document${requiredDocs.length > 1 ? "s" : ""}. None uploaded.`,
      "Upload all required scheme documents through Document Upload before checking readiness.",
      12,
      CHECK_TYPES.SCHEME_SPECIFIC_CHECK
    ));
  }

  // CHECK 8: Wrong document type
  const wrongDocTypes = documentData.wrongDocTypes || [];
  if (wrongDocTypes.length > 0) {
    const pts = Math.min(10, wrongDocTypes.length * 5);
    deduct("documents", pts, risk(
      "DOCS_WRONG_TYPE",
      "HIGH_ATTENTION",
      "documents",
      "documentType",
      "Possible wrong document type detected",
      `Suspected wrong type: ${wrongDocTypes.join(", ")}.`,
      "Verify each document is uploaded to the correct slot.",
      pts,
      CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
    ));
  }

  // CHECK 9: Poor document / image quality (Internal heuristic, not universal NSP rejection rule)
  const lowQualityDocs = documentData.lowQualityDocs || [];
  if (lowQualityDocs.length > 0) {
    const pts = Math.min(8, lowQualityDocs.length * 3);
    deduct("documents", pts, risk(
      "DOCS_LOW_QUALITY",
      "MEDIUM_ATTENTION",
      "documents",
      "documentQuality",
      "Low document quality detected",
      `Document quality flags (blur, low resolution, poor contrast, unreadable text, or orientation issues): ${lowQualityDocs.join(", ")}. OCR extraction may be incomplete.`,
      "Re-photograph or re-scan documents clearly with good lighting and contrast (300 DPI recommended as internal quality heuristic). Low quality documents may delay portal verification.",
      pts,
      CHECK_TYPES.ADVISORY_CHECK
    ));
  }

  // CHECK 10: Missing certificate number
  if (documentData.incomeData && !documentData.incomeData.certNumber) {
    deduct("documents", 3, risk(
      "DOCS_MISSING_CERT_NUMBER",
      "LOW_ATTENTION",
      "documents",
      "certificateNumber",
      "Income certificate number not extracted",
      "The certificate number could not be read from the income certificate image.",
      "Ensure the certificate number issued by the authority is clearly visible on the document.",
      3,
      CHECK_TYPES.ADVISORY_CHECK
    ));
  }

  // CHECK 11: Missing issuing authority
  if (documentData.incomeData && !documentData.incomeData.authority && !documentData.incomeData.certAuthority) {
    deduct("documents", 2, risk(
      "DOCS_MISSING_AUTHORITY",
      "LOW_ATTENTION",
      "documents",
      "issuingAuthority",
      "Issuing authority not identified on income certificate",
      "Could not detect issuing revenue authority (e.g. Tahsildar, Revenue Officer).",
      "Confirm the certificate includes the official stamp or digital signature of the competent authority.",
      2,
      CHECK_TYPES.ADVISORY_CHECK
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 3 — ELIGIBILITY (max 20)
  // ════════════════════════════════════════════════════════════════════════════

  if (scheme) {
    // Check if current-year rule is UNVERIFIED
    if (scheme.ruleStatus === "UNVERIFIED") {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "RULE_UNVERIFIED_NOTICE",
        "MEDIUM_ATTENTION",
        "eligibility",
        "ruleStatus",
        "Current-year eligibility condition requires confirmation",
        `Current-year rules for ${schemeName} are not fully confirmed from authoritative gazette.`,
        "Check the official portal before applying. SGP will not reject this scheme automatically.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }

    const eligResult = evaluateScholarship(scheme, profile);

    if (eligResult.status === "CONFIRMED MATCH") {
      // Full score
    } else if (eligResult.status === "POTENTIAL MATCH") {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "ELIG_POTENTIAL_ONLY",
        "MEDIUM_ATTENTION",
        "eligibility",
        "eligibilityStatus",
        "Eligibility is potential — some criteria are unconfirmed",
        `Missing or unconfirmed: ${(eligResult.missingRequirements || []).slice(0, 3).join(", ")}.`,
        "Confirm all missing eligibility criteria before submitting to the portal.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    } else if (eligResult.status === "NEEDS MORE INFORMATION") {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "ELIG_NEEDS_INFO",
        "HIGH_ATTENTION",
        "eligibility",
        "eligibilityStatus",
        "Eligibility cannot be confirmed — required information missing",
        `Required but missing: ${(eligResult.missingRequirements || []).slice(0, 3).join(", ")}.`,
        "Provide the missing eligibility information. Do not submit until eligibility is confirmed.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    } else if (eligResult.status === "NOT MATCHED") {
      // If unverified scheme, do NOT hard-fail eligibility
      if (scheme.ruleStatus === "UNVERIFIED") {
        hasUnknownRequiredInfo = true;
        items.push(risk(
          "ELIG_UNVERIFIED_GAP",
          "MEDIUM_ATTENTION",
          "eligibility",
          "eligibilityStatus",
          "Unverified condition may differ from current notification",
          `Rule status is unverified. Check official guidelines.`,
          "Verify your eligibility on the official portal.",
          0, // Unknown State Rule: 0 points deduction
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      } else {
        deduct("eligibility", 20, risk(
          "ELIG_NOT_MATCHED",
          "HIGH_ATTENTION",
          "eligibility",
          "eligibilityStatus",
          "Student does not meet the scheme eligibility criteria",
          `Failed criteria: ${(eligResult.failedCriteria || []).slice(0, 2).join(", ")}.`,
          "Review scheme requirements carefully. Applying to a scheme you are ineligible for results in rejection.",
          20,
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      }
    }

    // CHECK 20 & 21: Scheme-specific Quota and First-Graduate checks
    // INVARIANT 7: Tamil Nadu rules NEVER apply to Central NSP schemes
    const isCentral = schemeJurisdiction === "CENTRAL" || schemeState === "All-India" || scheme.authority === "Central";

    if (!isCentral && scheme.requiresGovtQuota) {
      const qt = profile.quotaType || "unknown";
      if (qt === "unknown" || qt === null) {
        hasUnknownRequiredInfo = true;
        items.push(risk(
          "ELIG_QUOTA_UNKNOWN",
          "HIGH_ATTENTION",
          "eligibility",
          "quotaType",
          "Admission quota not confirmed for quota-restricted scheme",
          `${schemeName} requires Government Quota admission. Quota is not confirmed.`,
          "Provide your admission quota from your admission allotment letter. Do not assume Government Quota.",
          0,
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      } else if (qt === "management") {
        items.push(risk(
          "ELIG_QUOTA_MANAGEMENT",
          "HIGH_ATTENTION",
          "eligibility",
          "quotaType",
          "Management quota admission is ineligible for this scheme",
          `Student is admitted under Management Quota. This scheme requires Government Quota allotment.`,
          "Explore central or merit-based scholarships open to all admission quotas.",
          0,
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      }
    }

    if (!isCentral && scheme.requiresFirstGraduate) {
      const fg = profile.firstGraduate;
      if (fg === null || fg === undefined) {
        hasUnknownRequiredInfo = true;
        items.push(risk(
          "ELIG_FIRST_GRAD_UNKNOWN",
          "HIGH_ATTENTION",
          "eligibility",
          "firstGraduate",
          "First Graduate status not answered — required for this scheme",
          `${schemeName} requires confirmation of First Graduate status in the family.`,
          "Answer First Graduate question. Unanswered values are treated as 'Needs More Information' and not 'No'.",
          0,
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 4 — APPLICATION CONSISTENCY (max 20)
  // ════════════════════════════════════════════════════════════════════════════

  // CHECK 4: Income value mismatch (profile vs cert)
  // ADVISORY ANOMALY CHECK — not a universal rejection rule
  const profileIncome = typeof profile.income === "number" ? profile.income : null;
  const docIncome = documentData.incomeData?.income != null ? Number(documentData.incomeData.income) : null;
  if (profileIncome !== null && docIncome !== null && !isNaN(docIncome)) {
    const maxVal = Math.max(profileIncome, docIncome);
    const pct = maxVal > 0 ? Math.abs(profileIncome - docIncome) / maxVal : 0;
    if (pct > 0.15) {
      deduct("application", 4, risk(
        "APP_INCOME_MISMATCH",
        "MEDIUM_ATTENTION",
        "application",
        "income",
        "Income value difference requiring review",
        `Profile income: ₹${profileIncome.toLocaleString("en-IN")}. Certificate income: ₹${docIncome.toLocaleString("en-IN")} (~${Math.round(pct * 100)}% variance).`,
        "Review the income difference before submission. Check scheme and certificate requirements; most portals expect the exact figure from the income certificate.",
        4,
        CHECK_TYPES.ADVISORY_CHECK
      ));
    }
  }

  // CHECK 23: Category consistency
  const profileCategory = (profile.category || "").toUpperCase().trim();
  const docCategory = (documentData.communityData?.communityCategory || "").toUpperCase().trim();
  if (profileCategory && docCategory && profileCategory !== docCategory) {
    deduct("application", 8, risk(
      "APP_CATEGORY_MISMATCH",
      "HIGH_ATTENTION",
      "application",
      "category",
      "Category mismatch between profile and community certificate",
      `Profile category: ${profileCategory}. Community certificate: ${docCategory}.`,
      "Ensure category entered in your application exactly matches the community certificate.",
      8,
      CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
    ));
  }

  // CHECK 12 & 13: Institution and Course mismatch
  const docCourse = documentData.courseName || documentData.twelfthData?.course || null;
  const appCourse = profile.course || null;
  if (appCourse && docCourse) {
    const sim = computeStringSimilarity(normaliseName(appCourse), normaliseName(docCourse));
    if (sim < 0.60) {
      deduct("application", 4, risk(
        "APP_COURSE_MISMATCH",
        "MEDIUM_ATTENTION",
        "application",
        "course",
        "Course name in application differs from document evidence",
        `Application course: "${appCourse}". Document evidence: "${docCourse}".`,
        "Verify your course name against college admission allotment order.",
        4,
        CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
      ));
    }
  }

  const docInstitution = documentData.institutionName || null;
  const appInstitution = profile.institution || null;
  if (appInstitution && docInstitution) {
    const sim = computeStringSimilarity(normaliseName(appInstitution), normaliseName(docInstitution));
    if (sim < 0.60) {
      deduct("application", 4, risk(
        "APP_INSTITUTION_MISMATCH",
        "MEDIUM_ATTENTION",
        "application",
        "institution",
        "Institution name in application differs from document evidence",
        `Application institution: "${appInstitution}". Document evidence: "${docInstitution}".`,
        "Verify institution name matches official AISHE/AICTE college record.",
        4,
        CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
      ));
    }
  }

  // CHECK 14: Course-level mismatch
  if (scheme?.level && profile.level) {
    const normSchemeLevel = scheme.level.toLowerCase();
    const normProfLevel = profile.level.toLowerCase();
    if (!normSchemeLevel.includes(normProfLevel) && !normProfLevel.includes(normSchemeLevel)) {
      deduct("application", 4, risk(
        "APP_COURSE_LEVEL_MISMATCH",
        "HIGH_ATTENTION",
        "application",
        "level",
        "Course level mismatch with scheme requirement",
        `Scheme level: ${scheme.level}. Applicant level: ${profile.level}.`,
        "Check scheme course level (e.g. Undergraduate vs Diploma vs Postgraduate).",
        4,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // CHECK 18: Domicile / State (Only applies when scheme explicitly restricts domicile)
  const schemeRequiresDomicile = !!(
    scheme?.domicileRequired ||
    (schemeState && schemeState !== "All-India" && schemeJurisdiction !== "CENTRAL") ||
    (scheme?.domicileRule && !scheme.domicileRule.includes("All-India") && !scheme.domicileRule.startsWith("None"))
  );

  if (schemeRequiresDomicile) {
    const profileState = profile.state || profile.domicile || null;
    if (!profileState) {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "APP_DOMICILE_MISSING",
        "MEDIUM_ATTENTION",
        "application",
        "state",
        "State of domicile not confirmed for a state-specific scheme",
        `${schemeName} is restricted to ${schemeState || "specific state"}. Domicile is not specified.`,
        `Confirm you are a permanent resident of ${schemeState || "the applicable state"}. Domicile certificate may be required.`,
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    } else if (schemeState && schemeState !== "All-India" && profileState.toLowerCase() !== schemeState.toLowerCase()) {
      deduct("application", 10, risk(
        "APP_DOMICILE_MISMATCH",
        "HIGH_ATTENTION",
        "application",
        "state",
        "Student state does not match scheme's state restriction",
        `Your state: ${profileState}. Scheme state: ${schemeState}.`,
        `Apply for schemes in your home state (${profileState}), or select All-India central schemes.`,
        10,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // CHECK 19: Disability requirements (Scheme-specific only)
  const requiresDisability = !!(
    scheme?.requiresDisability ||
    (scheme?.disabilityRule && scheme.disabilityRule !== "None" && !scheme.disabilityRule.startsWith("None"))
  );

  if (requiresDisability) {
    const minDisabilityPct = scheme?.minimumDisabilityPercentage || 40;
    const studentDisabilityPct = profile.disabilityPercentage ?? documentData.disabilityPercentage ?? null;

    if (studentDisabilityPct !== null && studentDisabilityPct !== undefined) {
      if (Number(studentDisabilityPct) < minDisabilityPct) {
        deduct("application", 6, risk(
          "APP_DISABILITY_PERCENTAGE_BELOW_MIN",
          "HIGH_ATTENTION",
          "application",
          "disabilityPercentage",
          "Disability percentage is below scheme minimum threshold",
          `${schemeName} requires minimum ${minDisabilityPct}% disability. Current value is ${studentDisabilityPct}%.`,
          "Review scheme guidelines. Only candidates meeting the minimum disability threshold are eligible.",
          6,
          CHECK_TYPES.SCHEME_SPECIFIC_CHECK
        ));
      }
    } else if (profile.disability === true || documentData.disabilityCert) {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "APP_DISABILITY_PERCENTAGE_UNKNOWN",
        "MEDIUM_ATTENTION",
        "application",
        "disabilityPercentage",
        "Disability percentage requires confirmation",
        `${schemeName} requires minimum ${minDisabilityPct}% disability, but percentage is not confirmed.`,
        "Enter disability percentage from the District Medical Board certificate.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }

    if (!documentData.disabilityCert) {
      deduct("application", 6, risk(
        "APP_DISABILITY_CERT_MISSING",
        "HIGH_ATTENTION",
        "application",
        "disability",
        "Disability certificate required but not uploaded",
        `${schemeName} requires a disability certificate (minimum ${minDisabilityPct}% permanent disability).`,
        "Obtain and upload a valid disability certificate from District Medical Board.",
        6,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 5 — BANK / DBT READINESS (max 10)
  // ════════════════════════════════════════════════════════════════════════════

  // CHECK 15: Bank holder name vs student applicant (Scheme/process specific review)
  const bankHolder = documentData.bankHolder || profile.bankHolder || null;
  if (bankHolder && studentName) {
    const sim = computeStringSimilarity(normaliseName(studentName), normaliseName(bankHolder));
    if (sim < 0.75) {
      deduct("bank", 5, risk(
        "BANK_HOLDER_MISMATCH",
        "HIGH_ATTENTION",
        "bank",
        "bankHolder",
        "Bank account holder information may require review",
        `Student applicant: "${studentName}". Passbook holder: "${bankHolder}". While some state schemes permit minor/parent accounts, central NSP DBT guidelines require the account to be in student's own name.`,
        "Confirm whether the selected scheme permits parent/joint accounts, or open an account in the student's own name to prevent DBT payment delay.",
        5,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // CHECK 16: IFSC format
  const ifsc = documentData.bankData?.ifsc || profile.ifsc || null;
  if (ifsc && !isValidIFSC(ifsc)) {
    deduct("bank", 3, risk(
      "BANK_IFSC_INVALID",
      "MEDIUM_ATTENTION",
      "bank",
      "ifsc",
      "IFSC code format appears invalid",
      `IFSC "${ifsc}" does not match standard 11-character format (e.g., SBIN0001234).`,
      "Verify IFSC from bank passbook or official bank portal. Invalid IFSC causes payment bounce.",
      3,
      CHECK_TYPES.UNIVERSAL_CONSISTENCY_CHECK
    ));
  }

  // CHECK 17: Aadhaar-bank DBT seeding guidance
  const aadhaarLinked = documentData.aadhaarBankLinked ?? profile.aadhaarBankLinked ?? null;
  if (aadhaarLinked === false) {
    deduct("bank", 2, risk(
      "BANK_AADHAAR_NOT_SEEDED",
      "HIGH_ATTENTION",
      "bank",
      "aadhaarBankLinked",
      "Aadhaar not seeded with bank account",
      "NSP scholarships are credited only to Aadhaar-seeded, DBT-enabled bank accounts.",
      "Visit your bank branch to seed Aadhaar and activate NPCI DBT mapping. Check at myaadhaar.uidai.gov.in",
      2,
      CHECK_TYPES.SCHEME_SPECIFIC_CHECK
    ));
  } else if (aadhaarLinked === null) {
    hasUnknownRequiredInfo = true;
    items.push(risk(
      "BANK_AADHAAR_SEEDING_UNKNOWN",
      "LOW_ATTENTION",
      "bank",
      "aadhaarBankLinked",
      "Aadhaar-bank seeding status not confirmed",
      "Could not confirm whether Aadhaar is seeded and DBT is enabled for the bank account.",
      "Confirm Aadhaar seeding and NPCI DBT activation at your bank branch or via myaadhaar.uidai.gov.in",
      0, // Unknown State Rule: 0 points deduction
      CHECK_TYPES.SCHEME_SPECIFIC_CHECK
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIMENSION 6 — CERTIFICATE VALIDITY & AGE (max 10)
  // ════════════════════════════════════════════════════════════════════════════

  // CHECK 5: Income certificate age & validity (Determined from explicit expiry, scheme requirement, or academic year)
  const explicitExpiry = documentData.incomeData?.expiryDate || documentData.incomeData?.validUntil || null;
  const incomeIssueDate = documentData.incomeData?.issueDate || documentData.incomeIssueDate || null;

  if (explicitExpiry) {
    const { expired } = checkCertExpiry(null, 12, explicitExpiry);
    if (expired) {
      deduct("certificates", 6, risk(
        "CERT_INCOME_EXPIRED",
        "HIGH_ATTENTION",
        "certificates",
        "expiryDate",
        "Income certificate has expired according to stated validity date",
        `Stated validity date was ${explicitExpiry}. The certificate is no longer valid.`,
        "Obtain a fresh income certificate for the current academic year before applying.",
        6,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  } else if (incomeIssueDate) {
    const { expired, unknown, monthsOld } = checkCertExpiry(incomeIssueDate, 12);
    if (!unknown && expired) {
      deduct("certificates", 6, risk(
        "CERT_INCOME_EXPIRED",
        "HIGH_ATTENTION",
        "certificates",
        "issueDate",
        "Income certificate issue date or validity requires confirmation",
        `Issue date: ${incomeIssueDate} (~${monthsOld} months old). Official validity must be confirmed against scheme requirements or academic year cycle.`,
        "Confirm certificate validity with issuing revenue authority or check scheme guidelines for current-year requirements.",
        6,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  } else if (documentData.incomeData) {
    hasUnknownRequiredInfo = true;
    items.push(risk(
      "CERT_INCOME_DATE_MISSING",
      "MEDIUM_ATTENTION",
      "certificates",
      "issueDate",
      "Income certificate issue date could not be read",
      "Issue date was not extracted from the income certificate image.",
      "Ensure issue date is clearly visible on the income certificate.",
      0, // Unknown State Rule: 0 points deduction
      CHECK_TYPES.SCHEME_SPECIFIC_CHECK
    ));
  }

  // CHECK 6: Academic year alignment
  if (scheme?.academicYear && profile.academicYear) {
    if (scheme.academicYear !== profile.academicYear) {
      deduct("certificates", 3, risk(
        "WRONG_ACADEMIC_YEAR",
        "MEDIUM_ATTENTION",
        "certificates",
        "academicYear",
        "Academic year in application differs from current scheme cycle",
        `Scheme cycle: ${scheme.academicYear}. Profile entered: ${profile.academicYear}.`,
        `Confirm you are applying for the ${scheme.academicYear} scholarship cycle.`,
        3,
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // CHECK 22: Renewal conditions
  if (profile.isRenewal && scheme?.renewalConditions && !documentData.previousYearMarks) {
    hasUnknownRequiredInfo = true;
    items.push(risk(
      "RENEWAL_DOC_MISSING",
      "MEDIUM_ATTENTION",
      "certificates",
      "renewalMarks",
      "Renewal mark verification missing",
      `Renewal requires verification of previous year marks and attendance.`,
      "Upload previous year marksheet and attendance certificate for renewal applications.",
      0, // Unknown State Rule: 0 points deduction
      CHECK_TYPES.SCHEME_SPECIFIC_CHECK
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECK 24 — MANDATORY 2026 SYSTEM COMPLIANCE (NSP OTR & FACE-AUTH)
  // ════════════════════════════════════════════════════════════════════════════
  const isCentralOrNsp = schemeJurisdiction === "CENTRAL" || scheme?.portal === "NSP" || schemeState === "All-India";
  const otrGenerated = profile.otrGenerated ?? documentData.otrGenerated ?? null;
  const faceAuthDevice = profile.faceAuthDeviceAvailable ?? documentData.faceAuthDeviceAvailable ?? null;

  if (isCentralOrNsp) {
    if (otrGenerated === false || otrGenerated === null) {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "NSP_2026_OTR_TRACKER",
        "MEDIUM_ATTENTION",
        "application",
        "otrNumber",
        "NSP OTR Tracker: Official One-Time Registration (OTR) confirmation required",
        "NSP OTR Tracker: Please ensure you have generated your official One-Time Registration (OTR) number via the official NSP portal. Face-Authentication must be executed via the official AadhaarFaceRD mobile framework.",
        "Generate your official 14-digit OTR number on scholarships.gov.in using AadhaarFaceRD before selecting schemes. SGP does not simulate or mock OTR generation.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
    if (faceAuthDevice === false || faceAuthDevice === null) {
      hasUnknownRequiredInfo = true;
      items.push(risk(
        "NSP_2026_FACE_AUTH_DEVICE",
        "LOW_ATTENTION",
        "application",
        "faceAuthDevice",
        "Aadhaar Face-RD mobile framework availability",
        "NSP requires Face-Authentication executed via the official AadhaarFaceRD mobile framework on Android/iOS. SGP does not simulate or perform face recognition.",
        "Ensure access to an Android or iOS smartphone with camera and AadhaarFaceRD app installed.",
        0, // Unknown State Rule: 0 points deduction
        CHECK_TYPES.SCHEME_SPECIFIC_CHECK
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AGGREGATION & FINAL STATUS
  // ════════════════════════════════════════════════════════════════════════════

  const totalScore =
    identityScore + documentsScore + eligibilityScore +
    applicationScore + bankScore + certScore;

  const maxScore =
    MAX_SCORES.identity + MAX_SCORES.documents + MAX_SCORES.eligibility +
    MAX_SCORES.application + MAX_SCORES.bank + MAX_SCORES.certificates;

  // SECTION 11: If required info is unknown, do NOT classify as READY_TO_SUBMIT
  const readinessLevel = getReadinessLevel(totalScore, hasUnknownRequiredInfo);

  // Sort: HIGH → MEDIUM → LOW
  const severityOrder = { HIGH_ATTENTION: 0, MEDIUM_ATTENTION: 1, LOW_ATTENTION: 2 };
  items.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

  // Build matrix and application comparison
  const documentMatrix = buildDocumentComparisonMatrix(profile, documentData);
  const applicationComparison = buildApplicationVsDocumentComparison(profile, documentData);

  return {
    readinessScore: {
      total: totalScore,
      max: maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      breakdown: {
        identity:     { score: identityScore,     max: MAX_SCORES.identity,     label: "Student Identity",       lostPoints: MAX_SCORES.identity - identityScore },
        documents:    { score: documentsScore,    max: MAX_SCORES.documents,    label: "Document Completeness",  lostPoints: MAX_SCORES.documents - documentsScore },
        eligibility:  { score: eligibilityScore,  max: MAX_SCORES.eligibility,  label: "Eligibility",            lostPoints: MAX_SCORES.eligibility - eligibilityScore },
        application:  { score: applicationScore,  max: MAX_SCORES.application,  label: "Application Consistency",lostPoints: MAX_SCORES.application - applicationScore },
        bank:         { score: bankScore,         max: MAX_SCORES.bank,         label: "Bank / DBT Readiness",   lostPoints: MAX_SCORES.bank - bankScore },
        certificates: { score: certScore,         max: MAX_SCORES.certificates, label: "Certificate Validity",   lostPoints: MAX_SCORES.certificates - certScore },
      },
    },
    readinessLevel,
    readinessLevelInfo: READINESS_LEVEL_INFO[readinessLevel],
    hasUnknownRequiredInfo,
    riskItems: items,
    highAttentionCount:   items.filter(r => r.severity === "HIGH_ATTENTION").length,
    mediumAttentionCount: items.filter(r => r.severity === "MEDIUM_ATTENTION").length,
    lowAttentionCount:    items.filter(r => r.severity === "LOW_ATTENTION").length,
    documentMatrix,
    applicationComparison,
    schemeId,
    schemeName,
    schemeJurisdiction,
    _invariants: {
      applicantName: studentName,                      // ALWAYS the student
      incomeProviderName,                             // Parent name when in parent mode
      incomeApplicant,
      parentIncomeModeActive: incomeApplicant === "parent",
      quotaUsed: profile.quotaType || "unknown",       // NEVER defaults to "government"
      firstGraduatePreserved: profile.firstGraduate,  // null preserved
    },
    boundaryStatement: BOUNDARY_STATEMENT,
  };
}
