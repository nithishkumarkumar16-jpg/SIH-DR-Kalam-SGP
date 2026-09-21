/**
 * verificationEngine.js — SGP Cross-Document Consistency & Readiness Engine
 * 
 * Performs multi-layer client-side verification:
 * 1. Multi-level Name Matching (Exact, Whitespace, Token-order, Initials, Levenshtein)
 * 2. Date of Birth Consistency Cross-Check
 * 3. Income Consistency Check (Certificate vs Student Input + Certificate Freshness)
 * 4. Community / Category Cross-Check (Certificate vs Student Input)
 * 5. Full All-Pairs Cross-Document Matrix (including Income Name)
 * 6. Explainable Pre-Submission Readiness & Consistency Score Calculation
 * 
 * 100% API-key-free, local consistency verification only.
 */

import {
  normalizeName,
  normalizeDateToISO,
  normalizeIncome,
  normalizeCommunity,
  parseIndianDate,
  formatTitleName,
} from "./fieldNormalizer";

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const m = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(
        m[i - 1][j] + 1,        // deletion
        m[i][j - 1] + 1,        // insertion
        m[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  return m[a.length][b.length];
}

/**
 * Normalizes and tokenizes a name for comparison:
 * - strips honorifics (Thiru, Mr, Dr, etc.)
 * - removes surrounding punctuation from each token (e.g. "K." -> "k")
 * - lowercase
 * - returns array of non-empty tokens
 */
export function getNormalizedNameTokens(raw) {
  if (!raw) return [];
  const normalized = normalizeName(raw).toLowerCase();
  return normalized
    .split(/\s+/)
    .map(t => t.replace(/^[.,\-_/\\#;:'"]+/, "").replace(/[.,\-_/\\#;:'"]+$/, ""))
    .filter(t => t.length > 0);
}

/**
 * Checks if two lists of tokens represent a valid initial expansion
 * (e.g. ["balasubramaniam", "s"] vs ["balasubramaniam", "sivasankaranarayanan"])
 * where each token in one list corresponds 1:1 to a token in the other list.
 */
function checkInitialExpansion(list1, list2) {
  if (list1.length !== list2.length) return false;

  const used = new Array(list2.length).fill(false);
  let expansions = 0;

  for (let i = 0; i < list1.length; i++) {
    const t1 = list1[i];
    let matchedIdx = list2.findIndex((t2, idx) => !used[idx] && t2 === t1);
    if (matchedIdx !== -1) {
      used[matchedIdx] = true;
      continue;
    }
    matchedIdx = list2.findIndex((t2, idx) => {
      if (used[idx]) return false;
      if (t1.length === 1 && t2.length > 1 && t2.startsWith(t1)) return true;
      if (t2.length === 1 && t1.length > 1 && t1.startsWith(t2)) return true;
      return false;
    });
    if (matchedIdx !== -1) {
      used[matchedIdx] = true;
      expansions++;
      continue;
    }
    return false;
  }

  return expansions > 0 && used.every(Boolean);
}

/**
 * Multi-Level Name Comparison Engine.
 * 
 * @param {string} rawA First name
 * @param {string} rawB Second name
 * @param {boolean} isStrict If true, enforces strict matching (Aadhaar, Community, Income, Bank)
 * @returns {Object} { status: "EXACT_MATCH"|"LIKELY_MATCH"|"MINOR_DIFFERENCE"|"NEEDS_REVIEW"|"MISMATCH"|"MISSING", score, explanation }
 */
export function compareNames(rawA, rawB, isStrict = false) {
  if (!rawA || !rawB) {
    return { status: "MISSING", score: 0, explanation: "One or both names are missing." };
  }

  const toksA = getNormalizedNameTokens(rawA);
  const toksB = getNormalizedNameTokens(rawB);

  if (toksA.length === 0 || toksB.length === 0) {
    return { status: "MISSING", score: 0, explanation: "One or both names could not be parsed." };
  }

  const strA = toksA.join(" ");
  const strB = toksB.join(" ");

  // LEVEL 1: Exact Normalized Match
  if (strA === strB) {
    return { status: "EXACT_MATCH", score: 1.0, explanation: "Exact character match." };
  }

  // LEVEL 2: Token-Order Variation (Permutation, e.g. "Raj Arun Kumar" vs "Arun Kumar Raj")
  const sortedA = [...toksA].sort().join(" ");
  const sortedB = [...toksB].sort().join(" ");
  if (sortedA === sortedB) {
    return {
      status: "EXACT_MATCH",
      score: 0.98,
      explanation: "Same name tokens in different word order (e.g. Surname first).",
    };
  }

  // LEVEL 3: Pure Single Initial Addition / Omission
  const wordsA = toksA.filter(t => t.length > 1);
  const wordsB = toksB.filter(t => t.length > 1);
  const initsA = toksA.filter(t => t.length === 1);
  const initsB = toksB.filter(t => t.length === 1);

  const sortedWordsA = [...wordsA].sort().join(" ");
  const sortedWordsB = [...wordsB].sort().join(" ");

  if (wordsA.length > 0 && wordsB.length > 0 && sortedWordsA === sortedWordsB) {
    // One document has single-letter initial(s) while the other has none
    if ((initsA.length > 0 && initsB.length === 0) || (initsB.length > 0 && initsA.length === 0)) {
      if (isStrict) {
        return {
          status: "LIKELY_MATCH",
          score: 0.92,
          explanation: "Main names match exactly; one document contains an initial or prefix.",
        };
      }
      return {
        status: "EXACT_MATCH",
        score: 0.95,
        explanation: "Main names match; initial difference is acceptable for marksheets.",
      };
    }
  }

  // LEVEL 4: Patronymic / Initial Expansion (e.g. "Balasubramaniam S" vs "Balasubramaniam Sivasankaranarayanan")
  if (checkInitialExpansion(toksA, toksB)) {
    return {
      status: "LIKELY_MATCH",
      score: 0.90,
      explanation: "Name initial matches expanded full name (patronymic expansion).",
    };
  }

  // LEVEL 5: Token Alignment & Unexpected Extra Token Detection
  const [shortToks, longToks] = toksA.length <= toksB.length ? [toksA, toksB] : [toksB, toksA];
  const usedLong = new Array(longToks.length).fill(false);
  let shortMatchCount = 0;

  for (const st of shortToks) {
    // 1. Exact match
    let matchIdx = longToks.findIndex((lt, idx) => !usedLong[idx] && lt === st);
    // 2. Initial expansion
    if (matchIdx === -1 && st.length === 1) {
      matchIdx = longToks.findIndex((lt, idx) => !usedLong[idx] && lt.length > 1 && lt.startsWith(st));
    }
    // 3. Typo match (st.length >= 4)
    if (matchIdx === -1 && st.length >= 4) {
      matchIdx = longToks.findIndex((lt, idx) => !usedLong[idx] && lt.length >= 4 && levenshteinDistance(lt, st) <= 1);
    }

    if (matchIdx !== -1) {
      usedLong[matchIdx] = true;
      shortMatchCount++;
    }
  }

  const allShortMatched = shortMatchCount === shortToks.length;
  const unmatchedLong = longToks.filter((_, idx) => !usedLong[idx]);

  if (allShortMatched && unmatchedLong.length > 0) {
    const extraTokensStr = unmatchedLong.map(t => formatTitleName(t) || t.toUpperCase()).join(", ");
    return {
      status: "NEEDS_REVIEW",
      score: 0.65,
      explanation: `Unexpected additional token(s) ('${extraTokensStr}') detected in document name. Manual review required.`,
    };
  }

  // LEVEL 6: Fuzzy Levenshtein Distance (Minor Typos, e.g. "DEMO CANDIDATE" vs "DEMO CANDDATE")
  const maxLen = Math.max(strA.length, strB.length, 1);
  const dist = levenshteinDistance(strA, strB);
  const similarity = 1 - (dist / maxLen);

  if (similarity >= 0.85) {
    if (isStrict) {
      return {
        status: "MINOR_DIFFERENCE",
        score: Math.min(similarity, 0.90),
        explanation: `Minor spelling variation (similarity ${(similarity * 100).toFixed(0)}%). Review recommended.`,
      };
    }
    return {
      status: "LIKELY_MATCH",
      score: similarity,
      explanation: `Spelling differs slightly (similarity ${(similarity * 100).toFixed(0)}%), acceptable for marksheets.`,
    };
  }

  // LEVEL 7: Significant Difference / Mismatch
  return {
    status: "MISMATCH",
    score: Math.max(0, similarity),
    explanation: `Names differ significantly ("${rawA}" vs "${rawB}"). Document correction required.`,
  };
}

/**
 * Verifies names with safe offline logic for Parent-Income Flow.
 * 
 * If incomeApplicant === "parent", the automatic student-vs-parent hard mismatch
 * is skipped and marked for review (NEEDS_REVIEW) with parentNameUsed: true.
 * 
 * @param {Object} profile Profile containing incomeApplicant, parentName, studentName, etc.
 * @param {Object} result Verification result object to enrich
 * @returns {Object} Enriched verification result
 */
export function verifyNames(profile = {}, result = {}) {
  const isParentIncome = profile.incomeApplicant === "parent";

  if (isParentIncome) {
    result.studentNameMatch = "SKIPPED";
    result.parentNameUsed = true;
    result.requiresReview = true;
    result.reason = "Parent declared as income applicant; student-parent name match skipped. Verification required.";
    
    // If parent name and income certificate holder name are available, verify consistency
    const parentName = profile.parentName || profile.fatherName || profile.motherName;
    const incomeCertName = profile.incomeCertificateName || profile.incomeName || profile.incomeCertHolder;
    if (parentName && incomeCertName) {
      const comp = compareNames(parentName, incomeCertName, false);
      result.parentIncomeMatch = comp.status;
      result.parentIncomeScore = comp.score;
      if (comp.status === "MATCH" || comp.status === "EXACT_MATCH") {
        result.parentIncomeConsistent = true;
      }
    }

    // Safety constraint: Never auto-resolve to FAIL when parent is declared, set to NEEDS_REVIEW
    if (result.status === "FAIL" || !result.status) {
      result.status = "NEEDS_REVIEW";
    }
    return result;
  }

  // Default student applicant flow
  result.studentNameMatch = "CHECKED";
  result.parentNameUsed = false;
  return result;
}


/**
 * Compares two Date of Birth strings.
 * 
 * @param {string} dobA 
 * @param {string} dobB 
 * @returns {Object} { status: "MATCH"|"MISMATCH"|"MISSING"|"UNREADABLE"|"AMBIGUOUS", explanation }
 */
export function compareDOB(dobA, dobB) {
  if (!dobA || !dobB) {
    return { status: "MISSING", explanation: "One or both date of birth fields are missing." };
  }

  const isoA = normalizeDateToISO(dobA);
  const isoB = normalizeDateToISO(dobB);

  if (!isoA || !isoB) {
    return { status: "UNREADABLE", explanation: "Date format could not be parsed." };
  }

  if (isoA === isoB) {
    return { status: "MATCH", explanation: `DOB matches: ${isoA}.` };
  }

  return {
    status: "MISMATCH",
    explanation: `DOB mismatch: ${isoA} vs ${isoB}. Must be identical to Aadhaar.`,
  };
}

/**
 * Computes Income Certificate Freshness & Expiry.
 */
export function evaluateIncomeFreshness(issueDate, validUpto) {
  const now = new Date();

  if (validUpto) {
    const validD = parseIndianDate(validUpto);
    if (validD) {
      if (validD < now) {
        const monthsAgo = (now - validD) / (1000 * 60 * 60 * 24 * 30);
        return {
          status: "expired",
          label: "Expired",
          color: "red",
          detail: `Certificate expired on ${validUpto} (${Math.round(monthsAgo)} month(s) ago). A fresh certificate is required.`,
        };
      }
      const monthsLeft = (validD - now) / (1000 * 60 * 60 * 24 * 30);
      return {
        status: monthsLeft < 1 ? "warning" : "valid",
        label: monthsLeft < 1 ? "Expires Very Soon" : monthsLeft < 3 ? "Valid (Expiring Soon)" : "Valid",
        color: monthsLeft < 1 ? "yellow" : "green",
        detail: `Valid upto ${validUpto} (${Math.round(monthsLeft)} month(s) remaining).`,
      };
    }
  }

  if (issueDate) {
    const issueD = parseIndianDate(issueDate);
    if (issueD) {
      const ageMonths = (now - issueD) / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths > 12) {
        return {
          status: "expired",
          label: "Outdated (>12 Months)",
          color: "red",
          detail: `Issued on ${issueDate} (${Math.round(ageMonths)} months ago). NSP requires a certificate from the current financial year.`,
        };
      }
      if (ageMonths > 6) {
        return {
          status: "warning",
          label: "Ageing (6-12 Months)",
          color: "yellow",
          detail: `Issued ${Math.round(ageMonths)} months ago. Fresh within 6 months is recommended.`,
        };
      }
      return {
        status: "valid",
        label: "Fresh (<6 Months)",
        color: "green",
        detail: `Issued on ${issueDate} (${Math.round(ageMonths)} month(s) ago) — fresh.`,
      };
    }
  }

  return {
    status: "unknown",
    label: "Unknown Date",
    color: "grey",
    detail: "Issue / validity date could not be read from certificate.",
  };
}

/**
 * Compares Income Certificate amount vs Student entered income.
 */
export function compareIncome(certIncome, studentIncome, issueDate = null, validUpto = null) {
  const numCert = normalizeIncome(certIncome);
  const numStudent = normalizeIncome(studentIncome);
  const freshness = evaluateIncomeFreshness(issueDate, validUpto);

  if (numCert === null && numStudent === null) {
    return { status: "MISSING", explanation: "Income details not provided.", freshness };
  }

  if (numCert === null) {
    return { status: "WARNING", explanation: "Income could not be read from certificate.", freshness };
  }

  if (numStudent === null) {
    return { status: "WARNING", explanation: "Student entered income is missing.", numCert, freshness };
  }

  if (numCert === numStudent) {
    return {
      status: freshness.status === "expired" ? "EXPIRED" : "MATCH",
      explanation: `Income matches entered details (₹${numCert.toLocaleString("en-IN")}).`,
      numCert,
      numStudent,
      freshness,
    };
  }

  return {
    status: "MISMATCH",
    explanation: `Income differs: Certificate shows ₹${numCert.toLocaleString("en-IN")}, but entered income is ₹${numStudent.toLocaleString("en-IN")}.`,
    numCert,
    numStudent,
    freshness,
  };
}

/**
 * Compares Community Certificate category vs Student entered category.
 */
export function compareCommunity(certCommunity, studentCategory) {
  const normCert = normalizeCommunity(certCommunity);
  const normStudent = normalizeCommunity(studentCategory);

  if (!normCert && !normStudent) {
    return { status: "MISSING", explanation: "Community details not provided." };
  }

  if (!normCert) {
    return { status: "WARNING", explanation: "Community could not be read from certificate." };
  }

  if (!normStudent) {
    return { status: "WARNING", explanation: "Student entered community is missing." };
  }

  if (normCert === normStudent) {
    return {
      status: "MATCH",
      explanation: `Category matches: ${normCert}.`,
      normCert,
      normStudent,
    };
  }

  return {
    status: "MISMATCH",
    explanation: `Category mismatch: Certificate shows "${normCert}", but entered category is "${normStudent}".`,
    normCert,
    normStudent,
  };
}

/**
 * Builds the complete Cross-Document Matrix across all available sources.
 * 
 * IMPORTANT: Includes Income Certificate Holder Name (fixing the audit issue).
 */
export function buildCrossDocumentMatrix({
  aadharName = "",
  aadharDob = "",
  bankHolder = "",
  bankAccType = "",
  tenthData = null,
  twelfthData = null,
  communityData = null,
  incomeData = null,
  studentIncome = "",
  studentCategory = "",
  incomeApplicant = "student",
}) {
  // 1. All Name Sources
  const nameSources = [
    { doc: "Aadhaar Card",          ico: "🪪", val: aadharName.trim() || null, strict: true },
    { doc: "Community Certificate", ico: "📜", val: communityData?.name || null, strict: true },
    { doc: "Income Certificate",    ico: "💰", val: incomeData?.name || null, strict: true },
    { doc: "10th Marksheet",        ico: "📋", val: tenthData?.name || null, strict: false },
    { doc: "12th Marksheet",        ico: "📋", val: twelfthData?.name || null, strict: false },
    { doc: "Bank Passbook",         ico: "🏦", val: bankHolder.trim() || null, strict: true },
  ].filter(s => s.val && String(s.val) !== "null" && String(s.val).trim() !== "");

  // Pair-by-pair comparison
  const namePairs = [];
  for (let i = 0; i < nameSources.length; i++) {
    for (let j = i + 1; j < nameSources.length; j++) {
      const a = nameSources[i];
      const b = nameSources[j];
      const isStrict = a.strict || b.strict;
      let res = compareNames(a.val, b.val, isStrict);

      // Feature 1: Parent-Income Flow
      if (incomeApplicant === "parent" && (a.doc === "Income Certificate" || b.doc === "Income Certificate")) {
        res = {
          ...res,
          parentNameUsed: true,
          status: "NEEDS_REVIEW",
          requiresReview: true,
          explanation: `Parent declared as income applicant (${a.doc === "Income Certificate" ? a.val : b.val}). Student identity match check skipped. Verification required.`,
        };
      }

      namePairs.push({ a, b, isStrict, ...res });
    }
  }

  const hasNameMismatch = namePairs.some(p => p.status === "MISMATCH");
  const hasNameMinor = !hasNameMismatch && namePairs.some(p => p.status === "MINOR_DIFFERENCE" || p.status === "LIKELY_MATCH" || p.status === "NEEDS_REVIEW");
  const nameConsistencyStatus = nameSources.length < 2 ? "grey" : (hasNameMismatch ? "red" : hasNameMinor ? "yellow" : "green");

  // 2. DOB Sources
  const dobSources = [
    { doc: "Aadhaar Card",          ico: "🪪", val: aadharDob.trim() || null },
    { doc: "Community Certificate", ico: "📜", val: communityData?.dob || null },
    { doc: "Income Certificate",    ico: "💰", val: incomeData?.dob || null },
    { doc: "10th Marksheet",        ico: "📋", val: tenthData?.dob || null },
    { doc: "12th Marksheet",        ico: "📋", val: twelfthData?.dob || null },
  ].filter(s => s.val && String(s.val) !== "null" && String(s.val).trim() !== "");

  const dobPairs = [];
  if (aadharDob.trim()) {
    for (const src of dobSources) {
      if (src.doc !== "Aadhaar Card") {
        const res = compareDOB(src.val, aadharDob.trim());
        dobPairs.push({ doc: src.doc, ico: src.ico, val: src.val, ...res });
      }
    }
  }

  const hasDobMismatch = dobPairs.some(p => p.status === "MISMATCH");
  const dobConsistencyStatus = !aadharDob.trim() ? "grey" : (hasDobMismatch ? "red" : dobPairs.some(p => p.status === "MATCH") ? "green" : "grey");

  // 3. Income Check
  const incomeResult = compareIncome(
    incomeData?.incomeNumber || incomeData?.income,
    studentIncome,
    incomeData?.issueDate,
    incomeData?.validUpto
  );

  // 4. Community Check
  const communityResult = compareCommunity(
    communityData?.communityCategory || communityData?.community,
    studentCategory
  );

  // 5. Pre-Submission Readiness / Consistency Score Breakdown
  let scorePoints = 0;
  let maxPoints = 0;
  const breakdown = [];

  // Name Score (30 pts)
  maxPoints += 30;
  if (nameConsistencyStatus === "green") {
    scorePoints += 30;
    breakdown.push({ item: "Name Consistency Across Documents", status: "PASS", points: 30, max: 30, note: "All document names match or have acceptable token variations." });
  } else if (nameConsistencyStatus === "yellow") {
    scorePoints += 20;
    const note = incomeApplicant === "parent"
      ? "Parent declared as income applicant. Review required for parental relationship."
      : "Minor name formatting/initial difference detected.";
    breakdown.push({ item: "Name Consistency Across Documents", status: "WARN", points: 20, max: 30, note });
  } else if (nameConsistencyStatus === "red") {
    breakdown.push({ item: "Name Consistency Across Documents", status: "FAIL", points: 0, max: 30, note: "Name mismatch detected between key identity documents." });
  } else {
    breakdown.push({ item: "Name Consistency Across Documents", status: "PENDING", points: 0, max: 30, note: "Upload documents to verify name consistency." });
  }

  // DOB Score (20 pts)
  maxPoints += 20;
  if (dobConsistencyStatus === "green") {
    scorePoints += 20;
    breakdown.push({ item: "Date of Birth Consistency", status: "PASS", points: 20, max: 20, note: "DOB is consistent with Aadhaar reference." });
  } else if (dobConsistencyStatus === "red") {
    scorePoints += 0;
    breakdown.push({ item: "Date of Birth Consistency", status: "FAIL", points: 0, max: 20, note: "DOB on certificate does not match Aadhaar." });
  } else {
    breakdown.push({ item: "Date of Birth Consistency", status: "PENDING", points: 0, max: 20, note: "DOB check pending." });
  }

  // Income Freshness & Consistency (20 pts)
  maxPoints += 20;
  if (incomeResult.status === "MATCH" && (incomeResult.freshness?.status === "valid" || incomeResult.freshness?.status === "unknown" || !incomeResult.freshness)) {
    scorePoints += 20;
    breakdown.push({ item: "Income Verification & Freshness", status: "PASS", points: 20, max: 20, note: "Income matches student input." });
  } else if (incomeResult.status === "MATCH" && incomeResult.freshness?.status === "warning") {
    scorePoints += 15;
    breakdown.push({ item: "Income Verification & Freshness", status: "WARN", points: 15, max: 20, note: "Income matches, but certificate is 6-12 months old." });
  } else if (incomeResult.status === "EXPIRED" || incomeResult.freshness?.status === "expired") {
    breakdown.push({ item: "Income Verification & Freshness", status: "FAIL", points: 0, max: 20, note: "Income certificate is older than 12 months." });
  } else if (incomeResult.status === "MISMATCH") {
    breakdown.push({ item: "Income Verification & Freshness", status: "FAIL", points: 0, max: 20, note: "Income amount differs between certificate and student input." });
  } else {
    breakdown.push({ item: "Income Verification & Freshness", status: "PENDING", points: 0, max: 20, note: "Upload income certificate to verify." });
  }

  // Community Category Match (15 pts)
  maxPoints += 15;
  if (communityResult.status === "MATCH") {
    scorePoints += 15;
    breakdown.push({ item: "Community Category Consistency", status: "PASS", points: 15, max: 15, note: "Community category matches certificate." });
  } else if (communityResult.status === "MISMATCH") {
    breakdown.push({ item: "Community Category Consistency", status: "FAIL", points: 0, max: 15, note: "Entered category differs from certificate." });
  } else {
    breakdown.push({ item: "Community Category Consistency", status: "PENDING", points: 0, max: 15, note: "Upload community certificate to verify." });
  }

  // Bank Account Type (15 pts)
  maxPoints += 15;
  if (bankAccType === "Single") {
    scorePoints += 15;
    breakdown.push({ item: "Bank Account Type", status: "PASS", points: 15, max: 15, note: "Single Savings Account confirmed (NSP required)." });
  } else if (bankAccType === "Joint") {
    breakdown.push({ item: "Bank Account Type", status: "FAIL", points: 0, max: 15, note: "Joint accounts are rejected for NSP direct benefit transfer." });
  } else {
    breakdown.push({ item: "Bank Account Type", status: "PENDING", points: 0, max: 15, note: "Bank details pending." });
  }

  const consistencyPercentage = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 0;
  let overallReadiness = "Needs Review";
  if (hasNameMismatch || hasDobMismatch || bankAccType === "Joint" || incomeResult.status === "EXPIRED" || communityResult.status === "MISMATCH") {
    overallReadiness = "Issues Found — Correction Required";
  } else if (consistencyPercentage >= 85) {
    overallReadiness = "High Consistency — Ready for Official Application";
  } else if (consistencyPercentage >= 60) {
    overallReadiness = "Moderate Consistency — Review Warnings";
  }

  return {
    incomeApplicant,
    nameSources,
    namePairs,
    nameConsistencyStatus,
    hasNameMismatch,
    hasNameMinor,
    dobSources,
    dobPairs,
    dobConsistencyStatus,
    hasDobMismatch,
    incomeResult,
    communityResult,
    scorePoints,
    maxPoints,
    consistencyPercentage,
    overallReadiness,
    breakdown,
  };
}

/**
 * Reconciles candidate student names across multiple uploaded documents.
 * Employs cross-document consensus to resolve character ambiguity (e.g. N1THISHKUMAR vs NITHISHKUMAR).
 * 
 * Safety Principle:
 * Strictly uses audit note: "Name appears consistent across uploaded documents."
 * NEVER claims: "Name verified by government."
 */
export function reconcileCrossDocumentName(documents = []) {
  const docs = Array.isArray(documents)
    ? documents
    : Object.entries(documents).map(([k, v]) => ({ docType: k, ...(v || {}) }));

  const validEntries = docs.filter(d => d && (d.name || d.candidateName || d.studentName || d.rawValue));
  if (!validEntries.length) {
    return {
      consensusName: null,
      status: "NOT_DETECTED",
      confidence: 0,
      note: "No candidate name detected across uploaded documents.",
      agreements: 0,
      hasConflict: false,
    };
  }

  // Extract and normalize candidates
  const candidates = validEntries.map(d => {
    const raw = String(d.name || d.candidateName || d.studentName || d.rawValue || "").trim();
    // Common OCR digit substitution for cross-document reconciliation
    const cleaned = raw.replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B");
    const norm = cleaned.toUpperCase().replace(/[^A-Z]/g, "");
    return {
      docType: d.docType || "document",
      raw,
      cleaned,
      norm,
      hasConfusion: /\d/.test(raw),
      confidence: typeof d.confidence === "number" ? d.confidence : 80,
    };
  }).filter(c => c.norm.length >= 3);

  if (!candidates.length) {
    return {
      consensusName: null,
      status: "NOT_DETECTED",
      confidence: 0,
      note: "No valid candidate name format detected.",
      agreements: 0,
      hasConflict: false,
    };
  }

  // Count frequency of normalized name
  const freq = {};
  for (const c of candidates) {
    freq[c.norm] = (freq[c.norm] || 0) + 1;
  }

  const sortedNorms = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  const bestNorm = sortedNorms[0];
  const bestCount = freq[bestNorm];

  // Check for genuine conflicts (multiple distinct names with significant presence)
  const conflictingNorms = sortedNorms.filter(n => n !== bestNorm);
  const hasConflict = conflictingNorms.length > 0 && conflictingNorms.some(n => freq[n] >= 1 && levenshteinDistance(n, bestNorm) > 2);

  // Pick representative best display name (preferring clean string without numbers)
  const matchingCandidates = candidates.filter(c => c.norm === bestNorm);
  const cleanMatch = matchingCandidates.find(c => !c.hasConfusion);
  const consensusName = cleanMatch ? cleanMatch.raw : matchingCandidates[0].cleaned;

  if (hasConflict) {
    return {
      consensusName,
      status: "NEEDS_REVIEW",
      confidence: 60,
      note: "Conflicting names detected across uploaded documents. Manual review required.",
      agreements: bestCount,
      totalDocuments: candidates.length,
      hasConflict: true,
    };
  }

  if (bestCount >= 2) {
    const hasResolvedConfusion = matchingCandidates.some(c => c.hasConfusion);
    return {
      consensusName,
      status: hasResolvedConfusion ? "NEEDS_REVIEW" : "HIGH_CONFIDENCE",
      confidence: Math.min(98, 85 + bestCount * 4),
      note: "Name appears consistent across uploaded documents.",
      agreements: bestCount,
      totalDocuments: candidates.length,
      hasConflict: false,
      hasResolvedConfusion,
    };
  }

  // Single document agreement
  const single = matchingCandidates[0];
  return {
    consensusName,
    status: single.hasConfusion ? "NEEDS_REVIEW" : "HIGH_CONFIDENCE",
    confidence: single.hasConfusion ? 68 : Math.round(single.confidence),
    note: single.hasConfusion
      ? "OCR character ambiguity detected; verification recommended."
      : "Candidate name detected from uploaded document.",
    agreements: 1,
    totalDocuments: 1,
    hasConflict: false,
  };
}

/**
 * Evaluates holistic cross-document consistency across a multi-document cohort.
 * 
 * Compares:
 * - 10th name, 12th name, Community name, Income applicant name
 * - Date of Birth (DOB) where available
 * 
 * Returns one of 4 standardized statuses:
 * - "CONSISTENT": All valid documents show consistent names and matching DOB.
 * - "MINOR DIFFERENCE": Minor character/initial differences or single-char edit distance without contradiction.
 * - "SIGNIFICANT CONFLICT": Conflicting names or conflicting birth dates between uploaded documents.
 * - "INSUFFICIENT DATA": Fewer than two documents available with readable identity information.
 * 
 * Strictly uses neutral, non-authoritative wording.
 * NEVER claims: "certificate is genuine", "government verified", "UIDAI verified", or "officially authenticated".
 */
export function evaluateCrossDocumentCase(documents = {}) {
  const docs = Array.isArray(documents)
    ? documents
    : Object.entries(documents).map(([k, v]) => ({ docType: k, ...(v || {}) }));

  const validDocs = docs.filter(d => d && (d.name || d.candidateName || d.studentName || d.applicantName || d.dob || d.dateOfBirth));

  if (validDocs.length < 2) {
    return {
      status: "INSUFFICIENT DATA",
      hasConflict: false,
      hasMinor: false,
      nameStatus: "INSUFFICIENT DATA",
      dobStatus: "INSUFFICIENT DATA",
      explanation: "Insufficient uploaded documents to perform cross-document consistency check (minimum 2 required).",
      documentCount: validDocs.length,
    };
  }

  // Name comparisons across all pairs
  const nameEntries = validDocs
    .map(d => ({ docType: d.docType || "document", name: String(d.name || d.candidateName || d.studentName || d.applicantName || "").trim() }))
    .filter(e => e.name && e.name.toLowerCase() !== "null" && e.name.toLowerCase() !== "not_detected");

  if (nameEntries.length < 2) {
    return {
      status: "INSUFFICIENT DATA",
      hasConflict: false,
      hasMinor: false,
      nameStatus: "INSUFFICIENT DATA",
      dobStatus: "INSUFFICIENT DATA",
      explanation: "Fewer than two documents contained a detected candidate name.",
      documentCount: validDocs.length,
    };
  }

  let hasConflict = false;
  let hasMinor = false;
  const nameDetails = [];

  for (let i = 0; i < nameEntries.length; i++) {
    for (let j = i + 1; j < nameEntries.length; j++) {
      const a = nameEntries[i];
      const b = nameEntries[j];
      const comp = compareNames(a.name, b.name, false);
      nameDetails.push({ a: a.docType, b: b.docType, status: comp.status, explanation: comp.explanation });
      if (comp.status === "MISMATCH") {
        hasConflict = true;
      } else if (comp.status === "MINOR_DIFFERENCE" || comp.status === "LIKELY_MATCH" || comp.status === "NEEDS_REVIEW") {
        hasMinor = true;
      }
    }
  }

  // DOB comparisons
  const dobEntries = validDocs
    .map(d => ({ docType: d.docType || "document", dob: String(d.dob || d.dateOfBirth || "").trim() }))
    .filter(e => e.dob && e.dob.toLowerCase() !== "null");

  let dobConflict = false;
  if (dobEntries.length >= 2) {
    for (let i = 0; i < dobEntries.length; i++) {
      for (let j = i + 1; j < dobEntries.length; j++) {
        const dComp = compareDOB(dobEntries[i].dob, dobEntries[j].dob);
        if (dComp.status === "MISMATCH") {
          dobConflict = true;
          hasConflict = true;
        }
      }
    }
  }

  // Parent name comparisons
  const parentEntries = validDocs
    .map(d => ({ docType: d.docType || "document", parentName: String(d.parentName || d.fatherName || d.motherName || "").trim() }))
    .filter(e => e.parentName && e.parentName.toLowerCase() !== "null" && e.parentName.toLowerCase() !== "not_detected");

  let parentConflict = false;
  let parentMinor = false;
  const parentDetails = [];
  if (parentEntries.length >= 2) {
    for (let i = 0; i < parentEntries.length; i++) {
      for (let j = i + 1; j < parentEntries.length; j++) {
        const pComp = compareNames(parentEntries[i].parentName, parentEntries[j].parentName, false);
        parentDetails.push({ a: parentEntries[i].docType, b: parentEntries[j].docType, status: pComp.status, explanation: pComp.explanation });
        if (pComp.status === "MISMATCH") {
          parentConflict = true;
          hasConflict = true;
        } else if (pComp.status === "MINOR_DIFFERENCE" || pComp.status === "LIKELY_MATCH" || pComp.status === "NEEDS_REVIEW") {
          parentMinor = true;
          hasMinor = true;
        }
      }
    }
  }

  let overallStatus = "CONSISTENT";
  let explanation = "Information appears consistent across uploaded documents.";

  if (hasConflict) {
    overallStatus = "SIGNIFICANT CONFLICT";
    explanation = dobConflict
      ? "Conflicting date of birth or name values detected between uploaded documents. Manual review required."
      : parentConflict
      ? "Conflicting parent name values detected between uploaded documents. Manual review required."
      : "Conflicting candidate names detected across uploaded documents. Manual review required.";
  } else if (hasMinor) {
    overallStatus = "MINOR DIFFERENCE";
    explanation = "Minor name variation or initial difference detected between uploaded documents; review recommended.";
  }

  return {
    status: overallStatus,
    hasConflict,
    hasMinor,
    nameStatus: hasConflict ? "SIGNIFICANT CONFLICT" : hasMinor ? "MINOR DIFFERENCE" : "CONSISTENT",
    dobStatus: dobConflict ? "SIGNIFICANT CONFLICT" : dobEntries.length >= 2 ? "CONSISTENT" : "INSUFFICIENT DATA",
    parentStatus: parentConflict ? "SIGNIFICANT CONFLICT" : parentMinor ? "MINOR DIFFERENCE" : parentEntries.length >= 2 ? "CONSISTENT" : "INSUFFICIENT DATA",
    explanation,
    documentCount: validDocs.length,
    nameComparisons: nameDetails,
    parentComparisons: parentDetails,
  };
}

