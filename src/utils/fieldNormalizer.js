/**
 * fieldNormalizer.js — SGP Centralized Field Normalization
 * 
 * Standardizers for:
 * - Names (honorifics stripping, token-sorting, case normalization)
 * - Dates (Indian DD/MM/YYYY formats, validation, ISO standard comparison)
 * - Incomes (currency symbol & delimiter removal, integer normalization)
 * - Communities & Categories (canonical mapping for Tamil Nadu & Central schemes)
 */

export const INDIAN_HONORIFICS_REGEX = new RegExp(
  "^(?:" +
    "thirumathi|thirumati|thiru|tirumati|tmt|" +
    "selvan|selvi|kumari|km|" +
    "mrs|miss|mr|ms|prof|dr|" +
    "srimati|shri|sri|smt|kum|" +
    "m\\/s|messrs|" +
    "s\\/o|d\\/o|w\\/o|h\\/o|g\\/o" +
  ")(?:\\.|\\b)\\s*",
  "i"
);

/**
 * Strips all common Indian prefixes, salutations, and honorifics.
 */
export function stripHonorifics(name) {
  if (!name) return "";
  let s = String(name).trim();
  let prev;
  do {
    prev = s;
    s = s.replace(INDIAN_HONORIFICS_REGEX, "").trim();
  } while (s !== prev);
  return s;
}

/**
 * Cleans OCR artifacts and extraneous characters from candidate names.
 */
export function normalizeName(name) {
  if (!name) return "";
  const withoutHonorifics = stripHonorifics(name);
  return withoutHonorifics
    .replace(/^[:\-–—.]\s*/, "")
    .replace(/[^a-zA-Z0-9\s.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns sorted string of name tokens for word-order invariant comparison.
 * e.g. "Test Student" -> "student test"
 *      "Student Test" -> "student test"
 */
export function tokenSort(name) {
  const clean = normalizeName(name).toLowerCase();
  return clean.split(/\s+/).filter(Boolean).sort().join(" ");
}

/**
 * Formats a name to proper Title Case while preserving standard Indian single-letter initials.
 */
export function formatTitleName(name) {
  const clean = normalizeName(name);
  if (!clean) return "";

  return clean.split(/\s+/).map(part => {
    const letters = part.replace(/[^A-Za-z]/g, "");
    if (!letters) return part;
    if (letters.length === 1) return letters.toUpperCase();
    return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
  }).join(" ");
}

/**
 * Parses and validates an Indian date string.
 * Supports DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD.
 * 
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export function parseIndianDate(dateStr) {
  if (!dateStr || dateStr === "null" || dateStr === "N/A" || dateStr === "Unknown") return null;
  const s = String(dateStr).trim();

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
    return null;
  }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
    return null;
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Normalizes date to standardized ISO YYYY-MM-DD string for comparison.
 */
export function normalizeDateToISO(dateStr) {
  const d = parseIndianDate(dateStr);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formats date to user-friendly DD-MM-YYYY display format.
 */
export function formatDateDisplay(dateStr) {
  const d = parseIndianDate(dateStr);
  if (!d) return dateStr || null;
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}-${m}-${y}`;
}

/**
 * Normalizes income representation to a clean positive integer.
 * Handles OCR noise: ₹2,50,000, Rs. 250000/-, R. 180000, "INR 2,00,000/-", "Rs 75,000.00"
 */
export function normalizeIncome(incomeStr) {
  if (incomeStr === null || incomeStr === undefined) return null;
  if (typeof incomeStr === "number") return incomeStr >= 0 ? Math.round(incomeStr) : null;

  let raw = String(incomeStr).trim();
  if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return null;

  // If explicit leading negative sign, reject
  if (/^\s*-\s*\d/.test(raw)) return null;

  // Layer 1: Strip currency symbols, words, abbreviations (₹, Rs, R., INR, Rupees, etc.)
  raw = raw.replace(/(?:₹|[\u20B9]|Rs\.?|R\.(?=\s*\d)|Re\.?|INR|Rupees?)/gi, " ");

  // Layer 2: Remove trailing delimiters (/-, / -, .00, paise)
  raw = raw.replace(/\/\s*-\s*$/, "");
  // If dot is used as decimal paise (1-2 digits at end of string), strip decimals
  raw = raw.replace(/\.\d{1,2}\s*$/, "");
  // If dots are used as thousand separators (e.g. 1.80.000), strip them
  raw = raw.replace(/\.(?=\d{3})/g, "");

  // Layer 3: OCR noise scrubbing for commonly confused characters in numeric contexts
  // If the string contains digits, replace O/o with 0, and l/I with 1
  if (/\d/.test(raw)) {
    raw = raw.replace(/[Oo]/g, "0");
    raw = raw.replace(/(?<=[\d,\s]|^)[lI](?=[\d,\s]|$)/g, "1");
  }

  // Layer 4: Strip all remaining non-numeric characters (commas, whitespace, noise punctuation)
  const clean = raw.replace(/[^\d]/g, "");
  const num = parseInt(clean, 10);
  if (isNaN(num) || num < 0 || num > 100_000_000) return null;
  return num;
}

/**
 * Formats numeric income into Indian Rupees format: ₹2,50,000.
 */
export function formatIncomeDisplay(income) {
  const num = normalizeIncome(income);
  if (num === null) return null;
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Normalizes community text into standardized acronyms (SC, ST, BC, MBC, DNC, OBC, EBC, General).
 */
export function normalizeCommunity(communityStr) {
  if (!communityStr) return "";
  const raw = String(communityStr).toLowerCase().trim();

  const directMap = {
    sc: "SC",
    "scheduled caste": "SC",
    "adi dravidar": "SC",
    "adi dravida": "SC",
    st: "ST",
    "scheduled tribe": "ST",
    tribal: "ST",
    bc: "BC",
    "backward class": "BC",
    "backward classes": "BC",
    mbc: "MBC",
    "most backward class": "MBC",
    "most backward classes": "MBC",
    dnc: "DNC",
    dnt: "DNC",
    "denotified community": "DNC",
    "denotified tribe": "DNC",
    obc: "OBC",
    "other backward class": "OBC",
    "other backward classes": "OBC",
    ebc: "EBC",
    "economically backward class": "EBC",
    gen: "General",
    general: "General",
    fc: "General",
    "forward class": "General",
    "open category": "General",
    unreserved: "General",
  };

  if (directMap[raw]) return directMap[raw];

  // Match parentheses e.g. "Most Backward Class (MBC)"
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].trim().toUpperCase();
    if (["SC", "ST", "BC", "MBC", "DNC", "OBC", "EBC", "GEN"].includes(inner)) {
      return inner === "GEN" ? "General" : inner;
    }
  }

  if (raw.includes("scheduled caste")) return "SC";
  if (raw.includes("scheduled tribe")) return "ST";
  if (raw.includes("most backward")) return "MBC";
  if (raw.includes("denotified")) return "DNC";
  if (raw.includes("backward class")) return "BC";
  if (raw.includes("other backward")) return "OBC";
  if (raw.includes("forward class") || raw.includes("general")) return "General";

  return communityStr.trim();
}

/**
 * Normalizes religion keywords.
 */
export function normalizeReligion(religionStr) {
  if (!religionStr) return "";
  const val = String(religionStr).toLowerCase().trim();

  if (val.includes("hindu")) return "Hindu";
  if (val.includes("muslim") || val.includes("islam")) return "Muslim";
  if (val.includes("christian")) return "Christian";
  if (val.includes("sikh")) return "Sikh";
  if (val.includes("buddhist")) return "Buddhist";
  if (val.includes("jain")) return "Jain";
  if (val.includes("parsi") || val.includes("zoroastrian")) return "Parsi";

  return religionStr.trim();
}
