/**
 * searchEngine.js — Verified Search Engine & Slot Extractor
 * Ported from Project B to native ES Module JavaScript for SGP-MAIN
 *
 * Capabilities:
 * - Robust tokenization with stopword filtering
 * - Strict regex boundary slot extraction avoiding noise false-positives
 * - All 38 Tamil Nadu districts recognition with automatic State attribution
 * - Multi-format income parser (Indian comma "₹1,50,000", conversational updates "now ₹5 lakh", lakh/lpa units)
 * - Jaccard similarity & priority keyphrase FAQ matcher
 */

import { TAMIL_NADU_DISTRICTS, INDIAN_STATES, toSgpLevel } from "../adapters/profileAdapter.js";
import { scholarshipQAs as defaultQAs } from "../knowledge/scholarshipQA.js";
import { evaluateAllScholarships } from "./eligibilityEngine.js";
import { scholarships as defaultScholarships } from "../knowledge/scholarships.js";

// Standard Stopwords for NLP token filtering
export const STOP_WORDS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "a", "an", "the", "and", "but", "or", "as", "if", "of", "at", "by", "for", "with", "about",
  "to", "in", "on", "into", "through", "during", "before", "after", "above", "below", "from",
  "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
  "too", "very", "can", "will", "just", "should", "now", "what", "who", "your", "mine", "you",
  "i", "me", "my", "we", "our", "us", "them", "their", "they", "he", "him", "his", "she", "her",
  "please", "tell", "show", "give", "want", "need", "get", "like"
]);

/**
 * Tokenize and clean phrases into words of length > 2
 */
export function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Tokenize and strip common stopwords
 */
export function tokenizeClean(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

/**
 * Extract numeric annual income from natural language query.
 * Handles:
 * - Indian commas: "₹1,50,000", "2,50,000", "5,00,000"
 * - Conversational filler words: "actually", "currently", "now", "around", "about"
 * - Lakh units: "1.5 lakh", "2 lakh", "2.5 lpa"
 * - Standalone numbers: "250000"
 */
export function extractIncome(query) {
  if (!query || typeof query !== "string") return undefined;
  const norm = query.toLowerCase();

  function toVal(rawNum, unit) {
    const clean = rawNum.replace(/,/g, "").trim();
    const val = parseFloat(clean);
    if (isNaN(val)) return undefined;
    if (unit && /\b(lakh|lakhs|lac|lacs|lpa)\b/i.test(unit)) {
      return Math.round(val * 100000);
    }
    if (unit && /\b(k|thousand)\b/i.test(unit)) {
      return Math.round(val * 1000);
    }
    return Math.round(val);
  }

  // 1. Explicit keyword pattern with optional filler words
  const keywordMatch = norm.match(/(?:income|salary|earns?|earning|earnings)\s*(?:is|was|of|under|below|less than|more than|around|approximately|approx|about|actually|currently|now|estimated|near|equal to|to|at|be|:|=|\s)*\s*₹?\s*(?:rs\.?|inr|rupees)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?|[0-9.]+)\s*(lakhs?|lpa|lacs?|k|thousand)?/i);
  if (keywordMatch) {
    return toVal(keywordMatch[1], keywordMatch[2]);
  }

  // 1b. Number preceding income keyword: "2 lakh income", "₹1,50,000 annual income", "250000 family income"
  const reverseMatch = norm.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(lakhs?|lpa|lacs?|k|thousand)?\s*(?:per annum|\/year|a year)?\s*(?:my|our|family|family's|annual|yearly|household)?\s*(?:income|salary|earning)/i);
  if (reverseMatch) {
    return toVal(reverseMatch[1], reverseMatch[2]);
  }

  // 2. Currency symbol prefix: "₹1,50,000", "₹2,50,000", "₹5,00,000", "₹250000", "₹2 lakh"
  const currencyMatch = norm.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(lakhs?|lpa|lacs?|k|thousand)?/i);
  if (currencyMatch) {
    return toVal(currencyMatch[1], currencyMatch[2]);
  }

  // 3. Number with explicit lakh/lpa unit: "1 lakh", "1.5 lakh", "2 lakh", "5 lakh"
  const lakhMatch = norm.match(/\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(lakhs?|lpa|lacs?)\b/i);
  if (lakhMatch) {
    return toVal(lakhMatch[1], lakhMatch[2]);
  }

  // 4. Indian comma-formatted numbers: "1,50,000", "2,50,000", "5,00,000", "10,00,000"
  const commaMatch = norm.match(/\b([0-9]{1,2},[0-9]{2},[0-9]{3}|[0-9]{1,3},[0-9]{3})\b/);
  if (commaMatch) {
    return toVal(commaMatch[1]);
  }

  // 5. Standalone numeric string: "250000", "₹250000"
  const standaloneMatch = norm.match(/^\s*₹?\s*([0-9]{5,8})\s*$/);
  if (standaloneMatch) {
    return toVal(standaloneMatch[1]);
  }

  return undefined;
}

/**
 * Extract slots from user text query with strict regex boundaries.
 * Separates Category, State, District, Course, Level, Gender, and Income.
 */
export function extractSlots(query) {
  if (!query || typeof query !== "string") return {};
  const normalized = query.toLowerCase();
  const slots = {};

  // 1. Category Extraction
  if (/\bmbc\b|\bdnc\b|\bmost backward\b/.test(normalized)) {
    slots.category = "MBC";
    slots.community = "mbc";
  } else if (/\bbc\b|\bobc\b|\bbackward class\b|\bbackward\b/.test(normalized)) {
    slots.category = "BC";
    slots.community = "bc";
  } else if (/\bsc\b|\bs\.c\.\b|\bscheduled caste\b|\bdravidar\b/.test(normalized) && !/\bst\b|\bscheduled tribe\b/.test(normalized)) {
    slots.category = "SC";
    slots.community = "sc";
  } else if (/\bst\b|\bs\.t\.\b|\bscheduled tribe\b|\btribal\b/.test(normalized)) {
    slots.category = "ST";
    slots.community = "st";
  } else if (/\bminority\b|\bmuslim\b|\bchristian\b|\bjain\b|\bsikh\b|\bbuddhist\b/.test(normalized)) {
    slots.category = "Minority";
    slots.community = "minority";
  } else if (/\bgeneral\b|\boc\b|\bfc\b|\bopen category\b|\bews\b/.test(normalized)) {
    slots.category = "General";
    slots.community = "general";
  }

  // 2. Tamil Nadu District Extraction
  for (const d of TAMIL_NADU_DISTRICTS) {
    const rx = new RegExp(`\\b${d.toLowerCase()}\\b`, "i");
    if (rx.test(normalized)) {
      slots.district = d;
      slots.state = "Tamil Nadu";
      break;
    }
  }

  // 3. State Extraction (if not already found as TN district)
  if (!slots.state) {
    for (const st of INDIAN_STATES) {
      const stLower = st.toLowerCase().replace(/[^a-z]/g, " ");
      const rx = new RegExp(`\\b${stLower.trim()}\\b`, "i");
      if (rx.test(normalized)) {
        slots.state = st;
        break;
      }
    }
  }

  // Alias state shortcuts: "tn" -> "Tamil Nadu", "up" -> "Uttar Pradesh", "wb" -> "West Bengal"
  if (/\btn\b|\btamil\s*nadu\b|\btamilnadu\b/.test(normalized)) {
    slots.state = "Tamil Nadu";
  } else if (/\bup\b|\buttarpra?desh\b/.test(normalized)) {
    slots.state = "Uttar Pradesh";
  } else if (/\bwb\b|\bwest\s*bengal\b/.test(normalized)) {
    slots.state = "West Bengal";
  }

  // 3b. Explicit 7.5% Government School Quota Detection (Tamil Nadu Higher Education Preferential Admission)
  const isQuota75 = /\b(7\.5\s*(?:%|percent)?\s*(?:government\s*school\s*|govt\s*school\s*)?quota|government\s*school\s*quota|govt\s*school\s*quota|7\.5\s*quota)\b/i.test(normalized);
  if (isQuota75) {
    slots.govtSchoolQuota = true;
    slots.govtSchool = true;
    if (!slots.state) slots.state = "Tamil Nadu";
  }

  // 4. Course & Level Extraction
  if (!isQuota75) {
    if (/\bengineering\b|\bbe\b|\bb\.e\b|\bbtech\b|\bb\.tech\b|\bcse\b|\bmechanical\b|\beee\b|\bece\b/.test(normalized)) {
      slots.course = "Engineering";
      slots.level = "ug";
    } else if (/\bmedicine\b|\bmbbs\b|\bbds\b|\bnursing\b|\bmedical\b|\bpharmacy\b|\bb\.pharm\b/.test(normalized)) {
      slots.course = "Medical";
      slots.level = "ug";
    } else if (/\bdiploma\b|\bpolytechnic\b|\biti\b/.test(normalized)) {
      slots.course = "Diploma";
      slots.level = /\biti\b/.test(normalized) ? "iti" : "diploma";
    } else if (/\b(class\s*1[012]\b|class\s*[6-9]\b|high\s*school\b|10th\s*(?:std|standard|marksheet)?\b|12th\s*(?:std|standard|marksheet)?\b|nmms\b|school\s*student\b|currently\s+in\s+school\b)/.test(normalized) || (/\bschool\b/.test(normalized) && !/\b(?:govt|government)\s*school\b/.test(normalized))) {
      slots.course = "School";
      slots.level = "prematric";
    } else if (/\bbsc\b|\bb\.sc\b|\bscience\b|\bmsc\b/.test(normalized)) {
      slots.course = "Science";
      slots.level = /\bmsc\b/.test(normalized) ? "pg" : "ug";
    } else if (
      /\barts\b|\bhistory\b|\benglish\b|\beconomics\b|\bba\b|\bb\.a\b|\bbcom\b|\bb\.com\b/.test(normalized) && 
      !/\btamil\s*nadu\b|\btamilnadu\b/.test(normalized)
    ) {
      slots.course = "Arts";
      slots.level = "ug";
    }
  }

  // Explicit level if not detected from course
  if (!slots.level && !isQuota75) {
    const mappedLevel = toSgpLevel(normalized);
    if (mappedLevel) slots.level = mappedLevel;
  }

  // 5. Gender Extraction
  if (/\b(girl|girls|female|women|woman|lady|ladies)\b/.test(normalized)) {
    slots.gender = "Girls";
  } else if (/\b(boy|boys|male|men|man)\b/.test(normalized)) {
    slots.gender = "Boys";
  }

  // 6. Disability Benchmark Status
  const disPctMatch = normalized.match(/([0-9]{1,2})\s*%\s*(?:disability|disabled|pwd|benchmark)/i)
    || normalized.match(/(?:disability|disabled|pwd|benchmark)\s*(?:of|is|at|level|rate|percentage)?\s*([0-9]{1,2})\s*%/i);
  if (disPctMatch) {
    const pct = parseInt(disPctMatch[1], 10);
    slots.disabilityPercent = pct;
    if (pct >= 40) {
      slots.disabled = true;
    } else {
      slots.disabled = false;
      slots.disabilityUnderBenchmark = true;
    }
  } else if (/\b(disabled|disability|differently[\s-]abled|handicapped?|pwd|saksham)\b/.test(normalized)) {
    slots.disabled = true;
  }

  // 7. Government School Background (Class 6 to 12)
  if (/\b(govt\s*school|government\s*school|govt\s*\.?\s*aided|tamil\s*medium\s*school|model\s*school)\b/.test(normalized)) {
    slots.govtSchool = true;
    if (!slots.state) {
      slots.state = "Tamil Nadu";
    }
  } else if (/\b(private\s*school|cbse|icse|matriculation)\b/.test(normalized)) {
    slots.govtSchool = false;
  }

  // 8. Parent Occupation / Agricultural Laborer Status
  if (/\b(agricultural\s*(?:laborer|labourer|worker|coolie)|marginal\s*farmer|farmer|farming|peasant)\b/.test(normalized)) {
    slots.agriLabor = true;
  }

  // 9. Armed Forces / Paramilitary Ward Status
  if (/\b(armed\s*forces|ex[\s-]*servicem[ae]n|esm|defence|defense|crpf|bsf|police\s*ward|military|army|navy|air\s*force)\b/.test(normalized)) {
    slots.armedForces = true;
  }

  // 10. First Graduate in Family Status
  if (/\b(first\s*graduate|first\s*in\s*(?:my\s*)?family|first\s*generation\s*graduate)\b/.test(normalized)) {
    slots.firstGraduate = true;
  }

  // 11. Income Extraction
  const extractedIncome = extractIncome(query);
  if (extractedIncome !== undefined) {
    slots.income = extractedIncome;
  }

  return slots;
}

/**
 * Extract known scholarship domain acronym entities from query (e.g. NSP, UMIS, DBT, NPCI, UIDAI, etc.)
 */
export function extractEntities(query) {
  if (!query || typeof query !== "string") return [];
  const entities = [];
  const norm = query.toLowerCase();

  const entityDefinitions = [
    { name: "UMIS", rx: /\bumis\b/i },
    { name: "NSP", rx: /\bnsp\b/i },
    { name: "DBT", rx: /\bdbt\b/i },
    { name: "NPCI", rx: /\bnpci\b/i },
    { name: "UIDAI", rx: /\buidai\b/i },
    { name: "EMIS", rx: /\bemis\b/i },
    { name: "AICTE", rx: /\baicte\b/i },
    { name: "UGC", rx: /\bugc\b/i },
    { name: "PFMS", rx: /\bpfms\b/i }
  ];

  for (const ed of entityDefinitions) {
    if (ed.rx.test(norm)) {
      entities.push(ed.name);
    }
  }

  return entities;
}

/**
 * Find closest matching QA record with priority pattern checking and token overlap
 */
export function findMatchingQA(query, customQAs) {
  const targetQAs = customQAs || defaultQAs;
  if (!query || typeof query !== "string") return null;

  const normQuery = query.toLowerCase().trim().replace(/[?.,!]/g, "");
  if (!normQuery) return null;

  // 1. Direct exact match
  for (const qa of targetQAs) {
    const qNorm = qa.question.toLowerCase().trim().replace(/[?.,!]/g, "");
    if (qNorm === normQuery) {
      return { qa, score: 1.0 };
    }
  }

  // 2. High priority key phrases
  const priorityMap = [
    { pattern: /^hi$|^hello$|^hey$|^vanakkam$|^namaste$/i, id: 4 },
    { pattern: /what is umis|umis portal/i, id: 14 },
    { pattern: /what is emis|emis id/i, id: 15 },
    { pattern: /pudhumaipenn/i, id: 16 },
    { pattern: /tamil pudhalvan/i, id: 17 },
    { pattern: /first graduate/i, id: 18 },
    { pattern: /7\.5\s*%|7\.5 percent|government school quota/i, id: 19 },
    { pattern: /bc mbc scholarship|mbc scholarship/i, id: 20 },
    { pattern: /sc st post matric/i, id: 21 },
    { pattern: /salem.*farmer|salem.*agricultural/i, id: 22 },
    { pattern: /is aadhaar mandatory|aadhar mandatory/i, id: 10 },
    { pattern: /what is nsp|national scholarship portal/i, id: 11 },
    { pattern: /how does dbt payment work|direct benefit transfer/i, id: 12 }
  ];

  for (const p of priorityMap) {
    if (p.pattern.test(normQuery)) {
      const match = targetQAs.find(q => q.id === p.id);
      if (match) return { qa: match, score: 0.95 };
    }
  }

  // 3. Stopwords-filtered token overlap scoring (Jaccard similarity)
  const queryTokens = tokenizeClean(normQuery);
  if (queryTokens.length === 0) return null;

  let bestQA = null;
  let highestScore = 0;

  for (const qa of targetQAs) {
    // ANTI-HALLUCINATION GUARD for procedural matrix records (id >= 1000):
    // Only match matrix questions if the user explicitly mentioned the specific state, category, or course!
    if (qa.id >= 1000) {
      if (qa.state && qa.state.toLowerCase() !== "central nsp") {
        const stateWord = qa.state.toLowerCase().replace(/[^a-z]/g, " ").trim();
        if (stateWord && !normQuery.includes(stateWord)) continue;
      }
      if (qa.category) {
        const catWord = qa.category.toLowerCase().trim();
        const rxCat = new RegExp(`\\b${catWord}\\b`, "i");
        if (!rxCat.test(normQuery)) continue;
      }
      const qLower = qa.question.toLowerCase();
      const courseKeywords = ["engineering", "medical", "arts", "science", "diploma", "school"];
      let hasCourseMismatch = false;
      for (const cr of courseKeywords) {
        if (qLower.includes(cr) && !normQuery.includes(cr)) {
          hasCourseMismatch = true;
          break;
        }
      }
      if (hasCourseMismatch) continue;
    }

    const questionTokens = tokenizeClean(qa.question);
    if (questionTokens.length === 0) continue;

    let matchCount = 0;
    for (const tok of queryTokens) {
      if (questionTokens.includes(tok)) {
        matchCount++;
      }
    }

    if (matchCount === 0) continue;

    const union = new Set([...queryTokens, ...questionTokens]);
    let score = matchCount / union.size;

    const lowerQuestion = qa.question.toLowerCase();
    if (normQuery.includes(lowerQuestion) || lowerQuestion.includes(normQuery)) {
      score += 0.35;
    }

    if (score > highestScore) {
      highestScore = score;
      bestQA = qa;
    }
  }

  return bestQA && highestScore >= 0.20 ? { qa: bestQA, score: highestScore } : null;
}

/**
 * Recommended Scholarships delegating to the unified Eligibility Engine
 */
export function getRecommendedScholarships(profile, scholarshipsList) {
  const targetScholarships = scholarshipsList || defaultScholarships;
  const results = evaluateAllScholarships(targetScholarships, profile);

  return results
    .filter(r => r.isEligible)
    .map(r => ({
      scholarship: r.scholarship,
      score: r.matchScore
    }));
}
