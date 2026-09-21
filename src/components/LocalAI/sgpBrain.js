/**
 * sgpBrain.js — SGP Master Local AI Engine
 * 
 * "Same SGP face. New scholarship brain."
 *
 * Upgraded with:
 * - Anti-Hallucination Guard (Never invents state, category, course, income, or student profile)
 * - High-Priority Full-Form Intent (NSP, UMIS, DBT, NPCI, UIDAI, etc. + multi-entity support)
 * - Multi-Entity Question Answering ("full of UMIS and NSP")
 * - Direct Identity Response ("I'm the SGP Virtual Assistant...")
 * - Entity-Specific Application Guidance ("how to apply", "umis how to apply", "nsp how to apply")
 * - Verified Search Engine (NLP tokenization & stopword filtering)
 * - Enhanced Slot Extractor (Indian comma formatting, conversational updates, 38 TN districts)
 * - Multi-Criteria Eligibility Engine (gatekeeper validations, match score 0-100%, criteria reasons)
 * - 25 Verified Scholarship Schemes (Tamil Nadu + Central NSP)
 * - 4,558 Verified Official Q&A Records (Handpicked + Multi-Topic Matrix)
 *
 * 100% Offline • Zero External APIs • Privacy First
 */

import { extractSlots as extractEngineSlots, extractEntities, findMatchingQA } from "../../engine/searchEngine.js";
import { evaluateAllScholarships } from "../../engine/eligibilityEngine.js";
import { scholarships as allScholarships } from "../../knowledge/scholarships.js";
import { buildUnifiedProfile } from "../../adapters/profileAdapter.js";

// ── 1. DOMAIN ACRONYMS REPOSITORY ───────────────────────────────────────────

export const ACRONYMS = {
  NSP: {
    acronym: "NSP",
    fullForm: "National Scholarship Portal",
    url: "scholarships.gov.in",
    description: "The Government of India's central unified digital portal for national, ministry, and UGC scholarship schemes."
  },
  UMIS: {
    acronym: "UMIS",
    fullForm: "University Management Information System",
    url: "umis.tn.gov.in",
    description: "The official higher education portal of Tamil Nadu used by colleges to manage admissions and coordinate state welfare scholarships (such as Pudhumaipenn, Tamil Pudhalvan, and BC/MBC/SC/ST post-matric fee concessions)."
  },
  DBT: {
    acronym: "DBT",
    fullForm: "Direct Benefit Transfer",
    url: "dbtbharat.gov.in",
    description: "The Government of India's electronic mechanism that credits scholarship funds directly into students' Aadhaar-seeded bank accounts without intermediaries."
  },
  NPCI: {
    acronym: "NPCI",
    fullForm: "National Payments Corporation of India",
    url: "npci.org.in",
    description: "The umbrella organization for retail payments in India; maintains the central Aadhaar mapper switch required for DBT scholarship crediting."
  },
  UIDAI: {
    acronym: "UIDAI",
    fullForm: "Unique Identification Authority of India",
    url: "uidai.gov.in",
    description: "The statutory authority that issues Aadhaar cards and handles demographic updates (name, DOB, mobile)."
  },
  EMIS: {
    acronym: "EMIS",
    fullForm: "Education Management Information System",
    description: "Tamil Nadu's school education database that assigns unique student identification numbers across government and aided schools."
  },
  AICTE: {
    acronym: "AICTE",
    fullForm: "All India Council for Technical Education",
    url: "aicte-india.org",
    description: "The national statutory body for technical education running schemes like Saksham (for differently-abled) and Pragati (for girl students)."
  },
  UGC: {
    acronym: "UGC",
    fullForm: "University Grants Commission",
    url: "ugc.ac.in",
    description: "The apex body coordinating university education standards and national collegiate fellowships."
  },
  PFMS: {
    acronym: "PFMS",
    fullForm: "Public Financial Management System",
    url: "pfms.nic.in",
    description: "The central government payment tracking platform for scholarship disbursements."
  }
};

// ── 2. AUTHORITATIVE SGP KNOWLEDGE BASE ──────────────────────────────────────

export const KB = {
  scholarships: allScholarships,

  documents: {
    mandatory: [
      "Aadhaar Card (student)",
      "Bank Passbook (Aadhaar-linked & DBT-enabled)",
      "Community Certificate (from Tahsildar, in student's name)",
      "Income Certificate (current financial year, from Tahsildar)",
      "10th Marksheet & Pass Certificate",
      "12th Marksheet & Pass Certificate (for UG applicants)",
      "College Bonafide Certificate / Fee Receipt",
      "Passport size photo (recent, white background)",
    ],
    optional: [
      "Hostel certificate (if residing in hostel)",
      "Disability certificate (minimum 40% from District Medical Officer)",
      "Bank Aadhaar seeding confirmation letter",
      "Migration certificate (if from other state)",
      "First generation graduate declaration (notarised)",
    ],
    scan_tips: [
      "Scan in colour, minimum 200 DPI",
      "File size: 50 KB – 500 KB per document",
      "Accepted formats: PDF or JPG",
      "Name and date must be clearly visible",
      "No handwritten corrections visible on scanned copy",
    ],
  },

  dbt: {
    steps: [
      "Visit your bank branch with Aadhaar card + photocopy",
      "Fill the Aadhaar seeding / linking form",
      "Specifically request 'NPCI DBT activation' by name",
      "Ensure your mobile number is linked to the bank account",
      "Get written acknowledgement or SMS confirmation",
      "Wait 3–7 working days",
      "Verify at npci.org.in/npci/aadhaar-mapper",
    ],
    difference: {
      linked: "Aadhaar Linked — bank has your Aadhaar number stored. NOT sufficient for scholarship payment.",
      seeded: "Aadhaar Seeded — Aadhaar is stored in bank's CBS. NPCI mapper may not yet be active.",
      dbt:    "DBT Enabled — Aadhaar is mapped in NPCI. Scholarship amount will be credited directly. ✅ REQUIRED.",
    },
    common_issues: [
      "Account is savings but not active (must be active for DBT)",
      "Joint account — DBT works only on individual/sole accounts",
      "Mobile number not updated in bank records",
      "Bank branch did NPCI seeding but forgot NPCI mapper activation",
      "Old Aadhaar number updated but NPCI not re-mapped",
    ],
  },

  rejection_reasons: [
    { reason: "Name or DOB mismatch between Aadhaar and certificates", fix: "Visit myaadhaar.uidai.gov.in to correct Aadhaar" },
    { reason: "Bank account not DBT-enabled (NPCI mapping missing)", fix: "Visit bank branch and request NPCI DBT activation" },
    { reason: "Expired income certificate (must be current year)", fix: "Get fresh income certificate from Tahsildar" },
    { reason: "Wrong or unverified community certificate", fix: "Get fresh community cert with correct sub-caste from Tahsildar" },
    { reason: "Blurred or incomplete document uploads", fix: "Re-scan documents at 200 DPI, colour, PDF format" },
    { reason: "Late submission after deadline", fix: "Apply in the very first month — portals open August onwards" },
    { reason: "Duplicate application on same portal", fix: "Login with original credentials — do not create new account" },
    { reason: "Attendance below 75% in previous year", fix: "Maintain 75%+ attendance before applying for renewal" },
    { reason: "Institute did not verify application on portal", fix: "Follow up with scholarship coordinator at college" },
    { reason: "Mobile number not linked to Aadhaar", fix: "Visit nearest Aadhaar centre to link mobile number" },
    { reason: "Aadhaar not linked to correct bank account", fix: "Visit bank and check which account Aadhaar is linked to" },
    { reason: "Wrong course/level selected during application", fix: "Check if your course is UG/PG/Diploma and select correctly" },
  ],

  portals: {
    nsp:   { name: "NSP", full: "National Scholarship Portal", url: "scholarships.gov.in", schemes: ["CSSS", "PM-YASASVI", "Post-Matric Minorities", "AICTE Saksham", "NMMSS"] },
    umis:  { name: "UMIS", full: "Tamil Nadu Unified Higher Education Portal", url: "umis.tn.gov.in", schemes: ["Pudhumaipenn", "Tamil Pudhalvan", "First Graduate", "BC/MBC/SC/ST Post-Matric"] },
    tnscholarships: { name: "TN Scholarships", url: "tnscholarships.gov.in", schemes: ["SC/ST/SCC Post-Matric", "First Graduate"] },
    uidai: { name: "UIDAI", url: "myaadhaar.uidai.gov.in", purpose: "Aadhaar correction, name/DOB/mobile update" },
    npci:  { name: "NPCI", url: "npci.org.in/npci/aadhaar-mapper", purpose: "Check DBT activation status" },
  },

  renewal: {
    process: [
      "Gather fresh documents: latest marksheet, new income certificate, bonafide",
      "Verify your bank DBT status is still active",
      "Login to original portal (NSP or UMIS) with your same Application ID",
      "Fill renewal form — update marks, academic year, course details",
      "Upload fresh documents as required",
      "Submit and note new acknowledgement receipt number",
      "Ensure your college verifies and forwards the renewal on portal",
    ],
    conditions: [
      "Minimum 75% attendance in previous academic year",
      "Must have passed all subjects in the previous year",
      "Fresh income certificate (current financial year) is mandatory",
      "Must apply on the same portal as original application",
      "DBT-enabled bank account must still be active",
      "No change in course or institution without prior intimation",
    ],
    tips: [
      "Renewal window usually opens in June–July — don't wait",
      "Update your marks even if slightly lower — renewal is not merit-based",
      "If you changed college mid-year, contact the portal helpdesk",
    ],
  },
};

// ── 3. TOKENIZER & INTENT DEFINITIONS ────────────────────────────────────────

export function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function extractSlots(tokensOrQuery) {
  const query = Array.isArray(tokensOrQuery) ? tokensOrQuery.join(" ") : tokensOrQuery;
  return extractEngineSlots(query);
}

export const INTENTS = [
  // Quick buttons / greetings / identity
  { name: "greeting",        priority: true, patterns: ["hi", "hello", "hey", "vanakkam", "good morning", "good afternoon", "good evening", "welcome", "start"] },
  { name: "i_am_student",    priority: true, patterns: ["i am student", "i am a student", "student here"] },
  { name: "bot_identity",    priority: true, patterns: ["your name", "what are you", "who are you", "what is your name", "are you a bot", "are you ai", "are you robot", "tell me about yourself", "introduce yourself", "who made you", "who built you"] },
  { name: "quota_7_5",       priority: true, patterns: ["7.5% quota", "7.5 percent quota", "7.5% government school quota", "7.5% govt school quota", "government school quota", "govt school quota", "7.5 quota", "7.5% reservation", "7.5 percent reservation", "what is 7.5% quota", "what is 7.5 quota", "am i eligible for 7.5% quota", "am i eligible for 7.5% government school quota", "eligible for 7.5% government school quota", "eligible for 7.5% quota", "eligible for 7.5"] },
  { name: "scholarship_purpose", priority: true, patterns: [
    "why apply scholarship",
    "why should i apply for scholarship",
    "why do i need scholarship",
    "why do i need to apply for scholarship",
    "why i need to apply scholarship",
    "what is the purpose of scholarship",
    "purpose of scholarship",
    "purpose of scholarships",
    "why scholarships are important",
    "why scholarship is important",
    "benefits of applying for scholarship",
    "why should students apply for scholarships",
    "what are the benefits of scholarships",
    "benefits of scholarship",
    "benefits of scholarships",
    "importance of scholarship",
    "importance of scholarships",
    "why scholarship",
    "why apply for scholarship"
  ] },
  { name: "how_it_works",    priority: true, patterns: ["how do you work", "how you work", "how does this work", "how does it work", "how this works", "api key", "based on", "offline", "online", "internet", "technology"] },
  { name: "off_topic",       priority: true, patterns: ["time now", "weather", "news", "cricket", "movie", "film", "song", "joke", "porn", "sex", "politics", "stock", "bitcoin", "game"] },

  // DBT
  { name: "dbt_what",        patterns: ["what is dbt", "dbt mean", "direct benefit transfer", "explain dbt"] },
  { name: "dbt_activate",    patterns: ["activate dbt", "enable dbt", "how to dbt", "dbt enable", "npci mapping", "dbt bank", "bank dbt", "dbt active", "dbt not working", "dbt failed", "npci", "how do i enable dbt", "how to enable dbt"] },
  { name: "dbt_check",       patterns: ["check dbt", "dbt status", "my dbt", "verify dbt", "dbt linked or not", "i don't know whether my bank is dbt enabled", "check whether dbt enabled", "is dbt enabled in my bank", "check dbt enabled", "how do i check npci mapping", "check npci mapping", "check npci", "npci mapping"] },
  { name: "dbt_difference",  patterns: ["difference between linked", "difference between linked and seeded", "difference between linked seeded", "linked vs seeded", "seeded vs dbt", "aadhaar linked seeded", "linked and seeded", "linked or seeded", "is dbt enabled", "my aadhaar is linked to my bank. is dbt enabled", "my bank account is aadhaar seeded", "aadhaar seeded can i receive scholarship", "can i receive scholarship with seeded", "what is aadhaar seeding", "aadhaar seeding meaning", "explain aadhaar seeding", "aadhaar seeding"] },
  { name: "dbt_issues",      patterns: ["dbt problem", "dbt issue", "dbt not received", "money not received", "payment failed dbt", "dbt common issue"] },

  // Core SGP Quick Question Actions
  { name: "bank_link",        patterns: ["bank not linked", "bank account link", "link bank aadhaar", "bank for scholarship", "account not linked", "how do i link aadhaar with my bank account", "link aadhaar with my bank account", "link aadhaar to bank"] },
  { name: "aadhaar_mismatch", patterns: ["name mismatch", "dob mismatch", "aadhaar mismatch", "aadhaar correction", "wrong name aadhaar", "update aadhaar", "aadhaar name change", "mismatch aadhaar", "my name is different in aadhaar and 10th marksheet", "name is different in aadhaar", "why should my name match across documents", "what happens if my aadhaar name and marksheet name are different", "name are different", "name is different", "name different in marksheet", "aadhaar name and marksheet", "name match across documents"] },
  { name: "rejection",        patterns: ["why rejected", "rejection reason", "application rejected", "scholarship rejected", "not approved", "failed application"] },
  { name: "deadline",         patterns: ["deadline", "last date", "closing date", "when to apply", "scheme closing", "scheme closing date", "scholarship deadline"] },
  { name: "documents",        patterns: ["documents needed", "document", "certificates needed", "required documents", "what to upload", "which documents", "certificate list", "documents required", "what documents do i need for scholarship", "what documents are required to apply"] },
  { name: "apply",            patterns: ["how to apply", "how do i apply", "how can i apply", "apply online", "how to register", "where to apply", "application process", "step by step"] },

  // Eligibility
  { name: "eligibility",      patterns: [
    "am i eligible", "check eligibility", "which scholarship for me",
    "scholarship for me", "which scheme for me", "can i apply",
    "eligible for scholarship", "qualify for scholarship", "eligible",
    "scholarships are available", "scholarships available"
  ]},

  // Guides
  { name: "scan_tips",        patterns: ["scan document", "how to scan", "document size", "upload size", "file size"] },
  { name: "portal_nsp",       patterns: ["nsp portal", "scholarships.gov", "portal nsp"] },
  { name: "portal_umis",      patterns: ["umis portal", "umis.tn", "portal umis"] },
  { name: "renewal",          patterns: ["renew scholarship", "how to renew", "renewal process", "second year scholarship", "renewal application", "renew"] },
  { name: "income_expired",   patterns: ["expired income certificate", "income certificate expired", "income validity", "old income certificate", "old date", "income certificate has an old date", "income certificate old"] },
  { name: "income_cert",      patterns: ["income certificate", "get income certificate", "income proof", "family income certificate", "what income certificate is required"] },
  { name: "community_cert",   patterns: ["community certificate", "caste certificate", "get community certificate", "what community certificate is required"] },
  { name: "verify_cert",      patterns: ["verify whether my certificate is genuine", "verify certificate", "genuine certificate", "is my certificate genuine", "check certificate genuine", "can you verify whether my certificate"] },
  { name: "dual_scholarship", patterns: ["both nsp and tamil nadu", "both nsp and state", "can i get both nsp and tamil nadu scholarship", "two scholarships at the same time", "can i apply for two scholarships", "multiple scholarships"] },
  { name: "which_scholarship_first", patterns: ["which scholarship should i apply for first", "which scholarship to apply first", "which scheme first"] },
  { name: "scholarship_list", patterns: ["list of scholarships", "all scholarships", "available scholarships", "what scholarships", "types of scholarship", "scholarship schemes"] },
  { name: "amount",           patterns: ["how much money", "scholarship amount", "how much scholarship", "payment amount", "scholarship money"] },
  { name: "status",           patterns: ["application status", "check status", "track application", "scholarship status"] },
  { name: "readiness",        patterns: ["am i ready", "ready to apply", "check readiness", "before applying", "checklist", "what should i do before applying"] },
  { name: "help",             patterns: ["help", "what can you do", "guide me", "what do you know", "features"] }
];

export function detectIntent(tokensOrText, slots = {}) {
  const text = (Array.isArray(tokensOrText) ? tokensOrText.join(" ") : tokensOrText).toLowerCase();

  // Helper for regex whole word / phrase boundary matching
  function matchesPattern(str, pattern) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
    return rx.test(str);
  }

  // Priority intents
  const priorityIntents = INTENTS.filter(i => i.priority);
  for (const intent of priorityIntents) {
    for (const pattern of intent.patterns) {
      if (matchesPattern(text, pattern)) return intent.name;
    }
  }

  // If query contains community / course / income / disability and asks about schemes or eligibility -> eligibility
  if (slots.community || slots.category || slots.disabled !== undefined || slots.disabilityUnderBenchmark || slots.disabilityPercent !== undefined) {
    if (text.includes("eligible") || text.includes("scholarship") || text.includes("scheme") || text.includes("apply") || text.includes("for me") || slots.income !== undefined || slots.disabled !== undefined || slots.disabilityUnderBenchmark) {
      return "eligibility";
    }
  }

  // Score remaining intents
  const scores = {};
  const nonPriority = INTENTS.filter(i => !i.priority);
  for (const intent of nonPriority) {
    scores[intent.name] = 0;
    for (const pattern of intent.patterns) {
      if (matchesPattern(text, pattern)) {
        scores[intent.name] += pattern.split(" ").length * 2;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] > 0) {
    return sorted[0][0];
  }

  return "unknown";
}

// Fact block builder preserved for backward compatibility
export function buildFactBlock(intent, slots) {
  return null;
}

// ── 4. FULL-FORM & ENTITY HANDLERS ──────────────────────────────────────────

export function checkFullFormQuery(query, entities = []) {
  const norm = query.toLowerCase().trim();

  // 1. Explicit full-form asking phrases:
  const fullFormTriggers = [
    /\bfull\s*form\b/i,
    /\bfullform\b/i,
    /\bfull\s+of\b/i,
    /\bfull\s*names?\b/i,
    /\bstands?\s+for\b/i,
    /\bstands?\s+4\b/i,
    /\bmeans?\b/i,
    /\bmeaning\b/i,
    /\bwhat\s+does\b/i,
    /\bexpansion\s+of\b/i,
    /\bexpand\b/i
  ];
  const hasTrigger = fullFormTriggers.some(rx => rx.test(norm));

  // 2. Standalone acronym or simple "what is <acronym>"
  const isBareAcronym = /^[\s]*(nsp|umis|dbt|npci|uidai|emis|aicte|ugc|pfms)[\s?!.]*$/i.test(norm);
  const isWhatIsAcronym = /^[\s]*(what\s+is|what\s+are)\s+(the\s+)?(nsp|umis|dbt|npci|uidai|emis|aicte|ugc|pfms)[\s?!.]*$/i.test(norm);

  if ((hasTrigger || isBareAcronym || isWhatIsAcronym) && entities.length > 0) {
    if (entities.length === 1) {
      const info = ACRONYMS[entities[0]];
      if (info) {
        let resp = `**${info.acronym}** stands for **${info.fullForm}**.\n\n${info.description}`;
        if (info.url) {
          resp += `\n\n🌐 **Official Portal**: [${info.url}](https://${info.url})`;
        }
        return resp;
      }
    } else {
      let resp = "Here are the full forms:\n\n";
      for (const ent of entities) {
        const info = ACRONYMS[ent];
        if (info) {
          resp += `• **${info.acronym}**: **${info.fullForm}** — ${info.description}\n`;
        }
      }
      return resp.trim();
    }
  }

  return null;
}

export function isScholarshipPurposeQuery(text) {
  if (!text || typeof text !== "string") return false;
  const norm = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // EXCLUSIONS
  // 1. If asking about documents or certificates
  if (/\b(?:documents?|certificates?|proofs?)\b/i.test(norm)) return false;

  // 2. If asking HOW / WHERE / WHEN to apply or register
  if (/\b(?:how|where|when)\b/i.test(norm) && /\b(?:apply|applying|application|register|registration|portal)\b/i.test(norm)) return false;
  if (/\b(?:steps|procedure|process|workflow|guide)\s+to\s+apply\b/i.test(norm)) return false;

  // 3. Specific entity or portal lookups
  if (/^(?:what\s+is\s+)?(?:nsp|umis|dbt|npci|uidai)\b/i.test(norm)) return false;
  if (/\b7\.5\s*(?:%|percent)?\b/i.test(norm)) return false;
  if (/\b(?:verify|genuine|fake)\b/i.test(norm)) return false;

  const hasScholarship = /\bscholarships?\b/i.test(norm);
  const hasParticipation = /\b(?:apply|applying|application|take|taking|get|getting|receive|receiving|avail|availing)\b/i.test(norm);

  const hasWhy = /\bwhy\b/i.test(norm);
  const hasPurpose = /\b(?:purpose|purposes)\b/i.test(norm);
  const hasBenefit = /\b(?:benefits?|advantage|advantages)\b/i.test(norm);
  const hasImportance = /\b(?:importance|important|matter|matters)\b/i.test(norm);
  const hasValue = /\b(?:value|worth|worthwhile)\b/i.test(norm);
  const hasUtility = /\b(?:useful|usefulness|helpful|help|helps|helping|support|supports)\b/i.test(norm);
  const hasNeed = /\b(?:need|needs|needed|necessary|necessity)\b/i.test(norm);

  // 1. Direct 'Why' combinations:
  // 'Why do scholarships matter?', 'Why should I take a scholarship?', 'Why should students get scholarships?', 'Why apply for a scholarship?', 'Why should I apply?', 'Why get a scholarship?', 'Why do students need scholarships?', 'Why should students apply?'
  if (hasWhy && (hasScholarship || hasParticipation)) return true;

  // 2. Benefit / Purpose / Importance / Advantage / Value + scholarship or participation:
  // 'What is the benefit of getting a scholarship?', 'What are the benefits of scholarships?', 'What is the purpose of a scholarship?', 'What benefits do scholarships provide?'
  if ((hasBenefit || hasPurpose || hasImportance || hasValue) && (hasScholarship || hasParticipation)) return true;

  // 3. Utility / Worth / Need / Matter + scholarship or (need + participation):
  // 'Is applying for a scholarship useful?', 'Do I really need to apply for a scholarship?', 'Are scholarships useful?', 'Are scholarships worth applying for?', 'Is scholarship useful for students?'
  if ((hasUtility || hasValue || hasNeed || hasImportance) && (hasScholarship || (hasNeed && hasParticipation))) return true;

  // 4. 'How does a scholarship help/support...'
  if (hasScholarship && hasUtility) return true;

  // 5. Phrasal regex fallbacks
  const phrasalRegexes = [
    /\bwhy\s+.*?(?:scholarships?|apply|take|get)\b/i,
    /\bwhat\s+(?:is|are)\s+the\s+(?:benefit|benefits|purpose|importance|value|advantage|advantages)\b/i,
    /\b(?:is|are|do|does)\s+.*?(?:useful|worth|worthwhile|helpful|help|matter|needed|necessary)\b/i,
    /\bhow\s+(?:does|can|do)\s+.*?(?:help|support|benefit)\b/i
  ];

  if ((hasScholarship || hasParticipation) && phrasalRegexes.some(rx => rx.test(norm))) {
    return true;
  }

  return false;
}

export function checkHowToApplyQuery(query, entities = []) {
  const norm = query.toLowerCase().trim();
  const isApplyQuery = /\b(how\s+to\s+apply|how\s+do\s+i\s+apply|how\s+can\s+i\s+apply|where\s+(?:to|should\s+i|can\s+i|do\s+i)\s+apply|application\s+process|procedure\s+to\s+apply|apply\s+online)\b/i.test(norm)
    || norm === "apply"
    || norm === "how to apply?"
    || norm === "how to apply";

  if (!isApplyQuery) return null;

  // 1. UMIS-specific application
  if (entities.includes("UMIS") || /\bumis\b/i.test(norm)) {
    return {
      intent: "apply_umis",
      response: `📝 **How to Apply via UMIS (University Management Information System) — Typical Process:**

In Tamil Nadu, collegiate welfare scholarship schemes (such as Pudhumaipenn, Tamil Pudhalvan, and post-matric fee concessions) are typically coordinated through your college scholarship desk:

1. **Student Profile on UMIS**: During admission, your college links your student profile to the state higher education database (UMIS) using your registration or EMIS details.
2. **Submit Required Documents to College**: Provide copies of your Community Certificate, current financial year Income Certificate, Aadhaar card, fee receipt, and bank passbook details.
3. **Institutional Entry & Verification**: The college scholarship nodal coordinator registers your application and verifies documents on the official UMIS portal at [umis.tn.gov.in](https://umis.tn.gov.in).
4. **Departmental Approval**: Applications are forwarded online by the institution to the district welfare department for sanction.
5. **Direct Benefit Transfer (DBT)**: Sanctioned allowances are credited directly to your Aadhaar-mapped bank account via DBT.

💡 *Note*: Exact steps and verification requirements vary by scheme and institution.
📌 *Official portal/reference*: [umis.tn.gov.in](https://umis.tn.gov.in)`
    };
  }

  // 2. Tamil Nadu specific application portals
  if (/\b(tamil\s*nadu|tn\b)/i.test(norm)) {
    return {
      intent: "apply_tn",
      response: `📝 **Where & How to Apply for Tamil Nadu Scholarships — Typical Process:**

In Tamil Nadu, government scholarships and fee concessions are processed primarily through these channels:

1. **Collegiate Welfare Scholarships (UMIS Portal)**:
   • **Portal**: [umis.tn.gov.in](https://umis.tn.gov.in)
   • **Schemes**: Pudhumaipenn, Tamil Pudhalvan, and Post-Matric Tuition Fee Concessions (BC/MBC/DNC and SC/ST).
   • **Process**: Coordinated through your college scholarship nodal desk.

2. **Tamil Nadu e-Scholarship Portal**:
   • **Portal**: [tnscholarships.gov.in](https://tnscholarships.gov.in)
   • **Schemes**: Post-Matric and Higher Education Special Scholarships for Adi Dravidar and Tribal Welfare.

3. **Counseling-Time Concessions (Single-Window Admissions)**:
   • **Schemes**: First Graduate Fee Concession (₹25,000/yr) and 7.5% Government School Quota (100% free education).
   • **Process**: Availed during centralized counseling (TNEA/Medical/DOTE) at the time of seat allotment.

4. **Welfare Board / District Collectorate Schemes**:
   • Applied through local e-Sevai centres or District Collectorate Welfare Wings (e.g. Agricultural Workers Welfare Board).

💡 *Important*: Ensure your bank account has **NPCI DBT active** and Aadhaar details match your 10th marksheet before applying!
📌 *Official portal/reference*: [umis.tn.gov.in](https://umis.tn.gov.in) • [tnscholarships.gov.in](https://tnscholarships.gov.in)`
    };
  }

  // 3. NSP-specific application
  if (entities.includes("NSP") || /\bnsp\b/i.test(norm)) {
    return {
      intent: "apply_nsp",
      response: `📝 **How to Apply on the National Scholarship Portal (NSP) — Typical Process:**

Exact steps and verification rules may vary by specific ministry scheme and academic year.

**Typical application flow:**
1. **Visit Official Portal**: Go to the National Scholarship Portal at [scholarships.gov.in](https://scholarships.gov.in).
2. **Complete One-Time Registration (OTR)**: Complete e-KYC using your Aadhaar number and registered mobile number to generate your OTR Reference Number.
3. **Log In & Select Scheme**: Log in with your OTR credentials to view schemes open for your category and course.
4. **Fill Application Details**: Provide academic details, institutional AISHE/UDISE code, family income, and community details.
5. **Upload Required Documents**: Upload required documents (such as income proof, caste certificate, marksheet, and bonafide) in the formats specified on the portal.
6. **Submit Application**: Review details carefully and submit your application online.
7. **Institutional Verification**: Coordinate with your institution's scholarship nodal officer for online verification.

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in)`
    };
  }

  // 4. General How-to-Apply (STRICT ANTI-HALLUCINATION: Never invent state, category, or course)
  return {
    intent: "apply_general",
    response: `📝 **General Step-by-Step Scholarship Application Guide (Typical Overview):**

Exact steps, documents, and verification requirements vary by scheme and current portal instructions. Check the selected scheme's official portal before applying.

**Typical process:**
1. **Identify Candidate Schemes**: Select the scheme that matches your education level, course, category, and family income.
2. **Check Scheme Requirements**: Review official eligibility criteria, income ceilings, and deadlines.
3. **Prepare Required Documents**: Keep your identity proof (Aadhaar), valid income certificate, community certificate (if applicable), and educational marksheets ready.
4. **Bank & Payment Readiness**: Ensure your single savings bank account is operational and seeded/mapped for DBT if required by the scheme.
5. **Submit Online Application**:
   • **National / Central Schemes**: Register on the National Scholarship Portal (NSP) at [scholarships.gov.in](https://scholarships.gov.in).
   • **Tamil Nadu State Schemes**: Applied through your college scholarship desk via UMIS at [umis.tn.gov.in](https://umis.tn.gov.in) or state portals.
6. **Verification Route**: Complete institutional verification with your college or school nodal coordinator if required by the portal.
7. **Track Status**: Monitor application and payment status on the respective official portal.

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in) (NSP) • [umis.tn.gov.in](https://umis.tn.gov.in) (UMIS)`
  };
}

// ── 5. INTENT RESPONSE FORMATTERS ─────────────────────────────────────────────

function formatEligibilityResponse(slots, userText = "") {
  const unifiedProfile = buildUnifiedProfile(slots);

  // Progressive Conversational Flow (User Instructions 8, 9, 10):
  // 1. Under-benchmark disability (e.g. 39% disability)
  if (slots.disabilityUnderBenchmark || (unifiedProfile.disabilityPercent !== undefined && unifiedProfile.disabilityPercent < 40)) {
    const courseLabel = unifiedProfile.course ? `Course: **${unifiedProfile.course}** • ` : "";
    return `🔍 **Eligibility Assessment**: ${courseLabel}Differently Abled: **${unifiedProfile.disabilityPercent}% (Below 40% Benchmark)**

⚠️ **Statutory Benchmark Disability Requirement:**

Government disability scholarships (such as **AICTE Saksham** and **Tamil Nadu Differently Abled Scholarship**) strictly require a **minimum 40% permanent benchmark disability** certified by a competent District Medical Board.

With **${unifiedProfile.disabilityPercent}% disability**, the statutory 40% benchmark requirement is not met.

If you have other qualifying criteria (such as community category, income ceiling, or academic merit), you may still qualify for general post-matric or central scholarships!`;
  }

  // 2. User provided only category (e.g. "I am MBC but I don't know which scholarship is best for me")
  if (unifiedProfile.category && unifiedProfile.income === undefined && !unifiedProfile.course && !unifiedProfile.disabled) {
    return `🔍 **Eligibility Assessment**: Community: **${unifiedProfile.category}**

I can help shortlist the right scholarships.

First tell me:
1. **Your annual family income** (e.g. "₹1,50,000" or "below 2.5 lakh")
2. **Your course/degree** (e.g. Engineering, Arts, Science, Medical, Diploma, School)

Then I'll ask only for additional information required by the schemes that match.`;
  }

  // 3. User provided only course in Tamil Nadu (e.g. "I am studying engineering in Tamil Nadu. Which scholarships can I apply for?")
  if (unifiedProfile.course && !unifiedProfile.category && unifiedProfile.income === undefined && !unifiedProfile.disabled) {
    return `🔍 **Eligibility Assessment**: Course: **${unifiedProfile.course}**${unifiedProfile.state ? ` • State: **${unifiedProfile.state}**` : ""}

I can shortlist scholarships for you. First tell me:
• **Community/category** (e.g. BC, MBC, SC, ST, Minority, General)
• **Annual family income** (e.g. "₹1,50,000" or "2 lakh")

Then I'll ask only for any additional criteria needed for the matching schemes.`;
  }

  // 4. User provided only district / location (e.g. "I am from Salem. What scholarships are available?")
  if (unifiedProfile.district && !unifiedProfile.category && unifiedProfile.income === undefined && !unifiedProfile.course && !unifiedProfile.disabled && !unifiedProfile.agriLabor) {
    return `📋 **Scholarship Guidance for ${unifiedProfile.district} Students**

I can help find scholarships available to students in ${unifiedProfile.district}.

Please tell me:
• **Community/category** (e.g. SC, ST, BC, MBC, Minority, General)
• **Annual family income** (e.g. "₹1,50,000" or "2 lakh")
• **Course/degree** (e.g. Engineering, Arts, Science, Medical, Diploma, School)

I'll then shortlist the schemes that match the information you provide.`;
  }

  // 5. User provided course and income, but missing category
  if (unifiedProfile.course && unifiedProfile.income !== undefined && !unifiedProfile.category && !unifiedProfile.disabled) {
    return `🔍 **Eligibility Assessment**: Course: **${unifiedProfile.course}** • Income: **≤ ₹${unifiedProfile.income.toLocaleString("en-IN")}/yr**

I can shortlist scholarships for you. First tell me:
• **Community/category** (e.g. BC, MBC, SC, ST, Minority, General)

Once you share your category, I can immediately identify whether state post-matric, Central Sector, or special welfare schemes apply to you.`;
  }

  // For conversational screening, evaluate preliminary matches while asking for unconfirmed items
  const screeningProfile = {
    ...unifiedProfile,
    quotaType: (unifiedProfile.quotaType && unifiedProfile.quotaType !== "unknown") ? unifiedProfile.quotaType : "government",
  };
  const evaluationResults = evaluateAllScholarships(allScholarships, screeningProfile);
  const confirmedMatches = evaluationResults.filter(r => r.matchType === "CONFIRMED MATCH");
  const potentialMatches = evaluationResults.filter(r => r.matchType === "POTENTIAL MATCH");

  const contextItems = [];
  if (unifiedProfile.category) contextItems.push(`Community: **${unifiedProfile.category}**`);
  if (unifiedProfile.income !== undefined) contextItems.push(`Income: **≤ ₹${unifiedProfile.income.toLocaleString("en-IN")}/yr**`);
  if (unifiedProfile.course) contextItems.push(`Course: **${unifiedProfile.course}**`);
  if (unifiedProfile.level) contextItems.push(`Level: **${unifiedProfile.level.toUpperCase()}**`);
  if (unifiedProfile.district) contextItems.push(`District: **${unifiedProfile.district}**`);
  if (unifiedProfile.gender) contextItems.push(`Gender: **${unifiedProfile.gender}**`);
  if (unifiedProfile.disabled) {
    contextItems.push(unifiedProfile.disabilityPercent ? `Differently Abled: **Yes (${unifiedProfile.disabilityPercent}% Benchmark)**` : `Differently Abled: **Yes**`);
  }
  if (unifiedProfile.govtSchool) contextItems.push(`School: **Govt School (Class 6-12)**`);
  if (unifiedProfile.agriLabor) contextItems.push(`Parent: **Agricultural Laborer**`);

  if (confirmedMatches.length === 0 && potentialMatches.length === 0) {
    return `🔍 **Eligibility Assessment**: ${contextItems.join(" • ")}

⚠️ **Needs additional information or no matching scheme found.**

Based on the information provided, no confirmed or potential schemes match yet.

Please provide your community category, annual family income, or course of study so I can evaluate matching schemes accurately.`;
  }

  let response = `🔍 **Eligibility Assessment**: ${contextItems.join(" • ")}\n\n`;

  if (confirmedMatches.length > 0) {
    response += `**Potentially eligible based on the information provided (${confirmedMatches.length} scheme(s)):**\n\n`;
    confirmedMatches.slice(0, 4).forEach((res, i) => {
      const s = res.scholarship;
      response += `### ${i + 1}. ${s.name}\n`;
      response += `• **Match Status**: 🎯 CONFIRMED MATCH\n`;
      response += `• **Grant / Benefit**: 💰 ${s.amount}\n`;
      response += `• **Income Ceiling**: ${s.incomeLimit === 99999999 ? "No income limit" : "≤ ₹" + s.incomeLimit.toLocaleString("en-IN") + " / year"}\n`;
      response += `• **Official portal/reference**: [${s.officialPortal || "scholarships.gov.in"}](${s.officialPortal || "https://scholarships.gov.in"})\n`;
      response += `• **Authority**: ${s.issuingAuthority || "Department of Higher Education"}\n`;
      if (s.documents && s.documents.length > 0) {
        response += `• **Key Documents**: ${s.documents.slice(0, 3).join(", ")}\n`;
      }
      response += `• **Criteria Met**: ${res.summary}\n\n`;
    });
  }

  if (potentialMatches.length > 0) {
    response += `**Potential matching schemes (${potentialMatches.length} scheme(s)):**\n\n`;
    potentialMatches.slice(0, 3).forEach((res, i) => {
      const s = res.scholarship;
      response += `### ${s.name}\n`;
      response += `• **Match Status**: ⏳ POTENTIAL MATCH / NEEDS MORE INFORMATION\n`;
      response += `• **Grant / Benefit**: 💰 ${s.amount}\n`;
      response += `• **Income Ceiling**: ${s.incomeLimit === 99999999 ? "No income limit" : "≤ ₹" + s.incomeLimit.toLocaleString("en-IN") + " / year"}\n`;
      response += `• **Official portal/reference**: [${s.officialPortal || "scholarships.gov.in"}](${s.officialPortal || "https://scholarships.gov.in"})\n`;
      response += `• **Authority**: ${s.issuingAuthority || "Department of Higher Education"}\n`;
      if (res.passedCriteria.length > 0) {
        response += `• **Key Criteria Met**: ${res.passedCriteria.join(", ")}\n`;
      }
      if (res.missingRequirements.length > 0) {
        response += `• **Mandatory Information Still Required to Confirm**: ${res.missingRequirements.join(", ")}\n`;
      }
      response += `\n`;
    });
  }

  // Progressive missing information request
  const neededChecklist = [];
  if (potentialMatches.some(p => p.scholarship.id === "nsp-aicte-saksham")) {
    if (unifiedProfile.income === undefined) neededChecklist.push("• Family annual income (ceiling: ≤ ₹8,00,000 / year)");
    neededChecklist.push("• Confirmation that your technical college is AICTE-approved");
  } else {
    if (unifiedProfile.gender === undefined) neededChecklist.push("• Gender (Female / Male)");
    if (unifiedProfile.govtSchool === undefined) neededChecklist.push("• Government/private school background where applicable");
    if (unifiedProfile.disabled === undefined) neededChecklist.push("• Disability status where applicable");
    if (unifiedProfile.agriLabor === undefined) neededChecklist.push("• Parent occupation where applicable");
    neededChecklist.push("• Institution type");
    neededChecklist.push("• Year of study");
  }

  if (neededChecklist.length > 0) {
    response += `📋 **To check additional schemes accurately, I need:**\n`;
    response += `${neededChecklist.join("\n")}\n\n`;
    response += `*These details are required because I will not assume eligibility conditions that you haven't provided.*\n\n`;
  }

  response += `📝 **How to Apply**: Ensure your Aadhaar is linked to your bank with **NPCI DBT active**. Apply via the respective official portal/reference listed above!`;

  return response;
}

function buildAuthoritativeResponse(intent, slots, userText) {
  switch (intent) {

    case "i_am_student":
      return `🎓 **Welcome Student!**

I am your local scholarship guidance assistant. I can help you identify schemes, check requirements, and complete your application.

**How can I assist you right now?**
• **Check Eligibility**: Tell me your community (SC/ST/BC/MBC), annual family income, and course (e.g. Engineering, Arts, Diploma).
• **Required Documents**: Type "Documents Needed" for a complete checklist.
• **Application Guide**: Type "How to Apply" for step-by-step NSP & UMIS portals guide.
• **DBT Bank Setup**: Type "Bank Not Linked" to verify direct scholarship crediting.

Try asking: *"I am an MBC student, income ₹1,50,000, studying Engineering. Am I eligible?"*`;

    case "greeting":
      return `👋 **Vanakkam! Welcome to Virtual Assistant.**

I run 100% locally on your device — safe, private, and instant.

I can assist you with:
• **Eligibility Check**: Instant match against 25+ scholarship schemes in our knowledge base
• **Documents Needed**: Checklist and image readiness guidance
• **DBT & Bank Setup**: NPCI mapper activation steps
• **Portal Guidance**: NSP, UMIS, and state welfare portals
• **Rejection Solutions**: Troubleshooting rejected applications
• **Renewal Support**: Criteria for continuing scholarship holders

What would you like to know today? 😊`;

    case "bot_identity":
      return `I'm the **SGP Virtual Assistant**, your scholarship guidance assistant.

I help students check eligibility, prepare required documents, and navigate government scholarship schemes (like NSP and UMIS) 100% offline and securely.`;

    case "how_it_works":
      return `⚙️ **How SGP Local AI Works:**

1. **Local NLP Engine**: Parses your question and extracts key criteria (Community, Course, Income, District) entirely within your browser.
2. **Multi-Criteria Eligibility Engine**: Applies statutory gatekeepers (income caps, gender quotas, community criteria) without external APIs.
3. **Knowledge Base**: Powered by 25 scholarship schemes in our knowledge base and over 4,500 scholarship guidance knowledge records.
4. **Privacy Guaranteed**: Zero cookies, no trackers, and no external Gemini API calls.`;

    case "quota_7_5": {
      const isAskingEligibility = /\b(am\s+i|can\s+i|eligible|qualify|i\s+am\s+eligible)\b/i.test(userText || "");
      let resp = `🎓 **Tamil Nadu 7.5% Government School Quota & Fee Concession:**

The **7.5% Quota** is a preferential admission and 100% financial assistance policy enacted by the Government of Tamil Nadu for students from government schools.

**Key Provisions:**
• **Preferential Seats**: 7.5% of seats in professional undergraduate admissions (Engineering via TNEA, Medical MBBS/BDS, Agriculture, Veterinary, Fisheries, and Law) are reserved on a preferential basis.
• **100% Fee Exemption**: For students admitted under the 7.5% quota, the Tamil Nadu Government covers the **entire educational expense** — including tuition fees, special fees, hostel/boarding charges, and exam fees for the entire duration of the course.
• **Statutory Requirement**: The student must have studied continuously from **Class 6 to Class 12 in Tamil Nadu Government schools** (Government, Municipal, Corporation, Adi Dravidar & Tribal Welfare, Forest, or Kallar Reclamation schools).`;

      if (isAskingEligibility) {
        resp += `\n\n**To assess your potential eligibility, I need to know:**\n1. Did you study continuously from **Class 6 to Class 12 in Tamil Nadu Government schools**? (A bonafide certificate from your Headmaster countersigned by the BEO/DEO is required).\n2. Have you applied for higher education admission through official single-window counseling (such as TNEA for Engineering or TN Medical Selection for MBBS)?\n\n*Note: Exact eligibility and seat allotment are determined by the respective counseling authorities during admission based on verified school records.*`;
      } else {
        resp += `\n\n**Eligibility Assessment Requirements:**\n• Continuous study from **Class 6 to Class 12 in Tamil Nadu Government schools**\n• Admission secured through Tamil Nadu centralized single-window counseling (TNEA/Medical Selection/DOTE)\n\n*Eligibility is officially determined by admission counseling committees based on verified school bonafide certificates.*`;
      }

      resp += `\n\n📌 *Official portal/reference*: [tneaonline.org](https://www.tneaonline.org) (Engineering) • [tnmedicalselection.net](https://tnmedicalselection.net) (Medical)`;
      return resp;
    }

    case "scholarship_purpose":
      return `🎓 **Why Should I Apply for a Scholarship?**

Scholarships can help reduce the financial burden of education.

They may provide support such as:
• Tuition or fee assistance
• Maintenance or living support
• Hostel or other education-related expenses
• Financial support for students who meet specific scheme criteria

**Important:** Benefits and eligibility depend on the specific scholarship scheme. Not every student is eligible for every scholarship.

If you want, tell me:
• Community/category
• Annual family income
• Course/degree

Then SGP can help identify scholarships you may potentially qualify for.`;

    case "off_topic":
      return `🎓 **Scholarship Focus Notice**

I am a dedicated scholarship guidance assistant. I can only assist with government scholarship schemes, eligibility checks, document requirements, portal workflows, and DBT bank account configuration.

Try asking:
• *"What scholarships are available for BC students?"*
• *"What is the First Graduate fee concession?"*
• *"How to activate NPCI DBT in my bank?"*`;

    case "dbt_what":
      return `💳 **What is DBT (Direct Benefit Transfer)?**

DBT is the Government of India's electronic transfer system that credits scholarship funds directly into the student's Aadhaar-seeded bank account.

**Key Considerations:**
• The account must be in the student's individual name (single account).
• Aadhaar must be mapped on the **NPCI central mapper switch**.
• The savings bank account must be active with KYC completed.

💡 *Note*: Aadhaar linking for KYC does not by itself confirm that DBT is enabled. You should confirm that your Aadhaar is seeded/mapped for DBT through the appropriate official bank or NPCI channel.

📌 *Official portal/reference*: [dbtbharat.gov.in](https://dbtbharat.gov.in)`;

    case "dbt_activate":
    case "bank_link":
      return `🏦 **How to Activate DBT / Link Bank Account — Typical Steps:**

To enable Direct Benefit Transfer for scholarships, follow these steps:
1. Visit your bank branch with your original Aadhaar card and passbook photocopy.
2. Request the **"Aadhaar NPCI DBT Seeding & Consent Form"**.
3. Mention that you need **NPCI DBT Mapping** for government scholarship disbursement.
4. Ensure your active mobile number is updated in core banking (CBS).
5. Obtain a stamped acknowledgement slip from the branch.
6. Processing typically takes 3 to 7 working days depending on branch and bank sync.
7. Verify status on the official NPCI consumer portal.

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;

    case "dbt_check":
      return `🔍 **How to Verify Your DBT Status:**

1. Open the official NPCI consumer portal: [npci.org.in](https://www.npci.org.in)
2. Navigate to the Aadhaar mapper status verification page.
3. Enter your 12-digit Aadhaar number and captcha.
4. Enter the OTP sent to your Aadhaar-linked mobile phone.
5. If your bank name is displayed with status **"Active"**, your account is mapped for DBT.
6. If inactive or mapped to a previous account, submit a fresh mandate at your branch.

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;

    case "dbt_difference": {
      const qNorm = (userText || "").toLowerCase();
      if (qNorm.includes("my aadhaar is linked") || (qNorm.includes("linked") && qNorm.includes("is dbt enabled"))) {
        return `🏦 **Aadhaar Linking vs. DBT Activation:**

Aadhaar being linked to your bank account does not by itself confirm that DBT is active. You should confirm that your Aadhaar is seeded/mapped for DBT through the appropriate official bank branch or official NPCI channel.

**Key distinctions:**
• **Aadhaar Linked (KYC Only)**: Aadhaar was submitted to the bank solely for identity/KYC records. This does not automatically map your account on the NPCI central switch for Direct Benefit Transfer.
• **Aadhaar Seeded & Mapped (DBT Pathway)**: Aadhaar number is integrated in core banking (CBS) and registered on the NPCI central mapper switch so government departments can disburse funds via Aadhaar Payment Bridge.
• **Application Approval**: Even with DBT enabled, scholarship funds will only be received after your scholarship application is verified and sanctioned by the nodal department.

💡 *Next Step*: Check your live status on the NPCI consumer portal or visit your bank branch to request NPCI DBT mapping. SGP can guide you on the steps, but cannot view your live banking records.

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;
      }

      if (qNorm.includes("seeded") && (qNorm.includes("can i receive") || qNorm.includes("receive scholarship"))) {
        return `🏦 **Aadhaar Seeded Status & Scholarship Receipt:**

That is a positive step, but Aadhaar seeding alone does not guarantee scholarship payment. The scholarship must also be approved and the applicable DBT/payment requirements must be satisfied.

**What is required for scholarship disbursement:**
1. **Application Sanction**: Your scholarship application must be verified by your college nodal officer, approved by the district welfare department, and sanctioned by the ministry.
2. **Active NPCI Mapping**: Your bank account must be actively seeded and mapped on the NPCI Aadhaar mapper switch.
3. **Operational Account**: The bank account must be an active, individual (single) account, free of credit freezes or dormancy.

💡 *Note*: Exact payment procedures vary by scheme (some disburse via Aadhaar Payment Bridge while others use Direct Account Transfer via PFMS). SGP provides pre-submission guidance and cannot view your live banking status.

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;
      }

      return `🔍 **Aadhaar Seeding & Bank Account Connection Levels:**

• **Aadhaar Linked (KYC)**: Aadhaar is on file with the bank for identification purposes. This does not necessarily prove DBT readiness.
• **Aadhaar Seeded & Mapped**: Aadhaar is linked in the bank's core system and mapped on the NPCI central gateway for Direct Benefit Transfer (DBT) payments.
• **DBT Enabled / DBT Readiness**: Exact payment requirements depend on the scholarship and disbursement pathway. SGP can guide you on preparation, but cannot inspect live bank or NPCI databases.

💡 *Action*: If you are unsure whether your account is mapped for DBT, check the NPCI consumer portal or request **NPCI DBT Seeding & Mapper Activation** at your bank branch.

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;
    }

    case "dbt_issues":
      return `⚠️ **Common DBT Payment Inconsistencies & Fixes:**

• **Dormant Account**: Account was inactive for > 6 months. *Fix: Deposit a small amount to reactivate.*
• **Joint Account**: Many portals reject joint parent-child accounts. *Fix: Open an individual zero-balance student account.*
• **NPCI Disconnected**: Multiple accounts linked Aadhaar and overwrote mapper. *Fix: Submit fresh NPCI mandate to your chosen primary bank.*

📌 *Official portal/reference*: [npci.org.in](https://www.npci.org.in)`;

    case "aadhaar_mismatch": {
      const qNorm = (userText || "").toLowerCase();
      if (qNorm.includes("why") || qNorm.includes("across documents")) {
        return `✏️ **Identity Verification & Name Matching:**

Consistent identity details reduce verification problems. SGP can compare names and other fields and classify differences such as exact, minor, or significant mismatch.

**How identity matching works:**
• **Exact Match**: Full name and initials match across all documents.
• **Minor Difference**: Minor variations such as initial placement (e.g. "K. Ramesh" vs "Ramesh K") or spacing may be accepted on some state portals or verified through institutional bonafide.
• **Significant Mismatch**: Completely different spellings, missing surnames, or different dates of birth often lead to automated e-KYC validation failures.

**Recommendations:**
1. Use SGP's document verification tool on your dashboard to check your match score before applying.
2. If there is a significant discrepancy, update your Aadhaar demographics via [myaadhaar.uidai.gov.in](https://myaadhaar.uidai.gov.in) before submitting your scholarship application.

📌 *Official portal/reference*: [myaadhaar.uidai.gov.in](https://myaadhaar.uidai.gov.in)`;
      }

      return `✏️ **Applying with Name Differences:**

You may still be able to apply, but the mismatch could cause verification issues. First identify whether it is a minor formatting/spelling difference or a significant difference. SGP can help compare the documents and guide you on the appropriate correction/clarification.

**Guidance:**
• **Minor Variations (Initials / Order)**: If the difference is only initial placement (e.g. "S. Priya" vs "Priya S"), some state portals or colleges can verify your application with an institutional bonafide or affidavit.
• **Major Discrepancies (Spelling / Name Change)**: Central portals like NSP use automated e-KYC verification with UIDAI. A major spelling mismatch can prevent portal verification.
• **Correction Route**: You can update your name on Aadhaar online at [myaadhaar.uidai.gov.in](https://myaadhaar.uidai.gov.in) using your 10th marksheet as Proof of Identity (PoI).

💡 *SGP Tip*: Upload your Aadhaar and marksheet to the SGP Document Verification dashboard to see whether the difference is classified as minor or significant.

📌 *Official portal/reference*: [myaadhaar.uidai.gov.in](https://myaadhaar.uidai.gov.in)`;
    }

    case "documents":
      return `📁 **Commonly Required Scholarship Documents:**

Exact documents vary by scholarship scheme and application route. Check the selected scheme's official requirements before submission.

**Common Documents (Frequently Requested):**
• **Aadhaar Card / Identity Proof**: Ensure name and date of birth match your academic records
• **Bank Account Details**: Active single savings account mapped for DBT/NPCI
• **Educational Marksheets**: 10th standard and 12th standard marksheets
• **Bonafide Student Certificate & Fee Receipt**: Issued by your current college or school
• **Passport-size Photograph**: Recent color photograph

**Additional Documents (Applicable Based on Scheme Criteria):**
• **Community / Caste Certificate**: Required for reserved category schemes (SC, ST, BC, MBC, DNC)
• **Income Certificate**: Required where the scheme specifies an annual family income ceiling
• **Disability Certificate**: Required for differently-abled schemes (minimum 40% benchmark disability)
• **First Graduate Certificate & Joint Declaration**: Required if claiming first-generation graduate fee concession in Tamil Nadu
• **Hostel Resident Certificate**: Required if claiming hosteller maintenance allowance`;

    case "scan_tips":
      return `🖨️ **Document Scanning & Upload Specifications (Typical Guidelines):**

• **Resolution**: Recommended scan at **200 DPI** in color.
• **File Size**: Typically between **50 KB and 500 KB** per document.
• **File Format**: Clear PDF or JPG (PDF preferred for certificates).
• **Clarity**: Seal, signature, certificate number, and student name must be readable.
• **No Modifications**: Avoid handwritten corrections or cropped borders.`;

    case "rejection":
      return `⚠️ **Common Reasons for Application Rejection & Return Queries:**

1. **Aadhaar Name/DOB Mismatch** → Demographic mismatch during automated portal e-KYC.
2. **Bank Account Not DBT-Enabled** → Account not mapped on NPCI central switch.
3. **Outdated Income Certificate** → Certificate not issued for the applicable financial year.
4. **Income Exceeds Scheme Ceiling** → Reported income above the scheme's statutory limit.
5. **Pending Institutional Verification** → Application awaiting college nodal officer approval.
6. **Attendance Requirement** → For renewals, attendance falling below scheme threshold (typically 75%).`;

    case "renewal":
      return `🔄 **Scholarship Renewal Guidelines (Typical Process):**

1. **Existing Portal ID**: Renewal applications typically use your existing registration ID rather than a new registration.
2. **Typical Conditions**:
   • Meeting minimum 75% attendance criteria in the preceding year.
   • Cleared required examinations as per scheme guidelines.
   • Current financial year Income Certificate where required.
3. **Steps**:
   • Log in to the respective portal (NSP: [scholarships.gov.in](https://scholarships.gov.in) or UMIS: [umis.tn.gov.in](https://umis.tn.gov.in)).
   • Select **"Apply for Renewal"**.
   • Update academic marks and upload bonafide certificate.
   • Submit and notify your college scholarship coordinator.

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in) • [umis.tn.gov.in](https://umis.tn.gov.in)`;

    case "deadline":
      return `📅 **Scholarship Deadlines & Academic Cycles (Typical Schedule):**

• **Tamil Nadu UMIS State Schemes**: Applications typically open August and close between November and December.
• **National Scholarship Portal (NSP)**: Schemes generally open in July/August and close between October and December.
• **First Graduate Tuition Fee Concession**: Processed during centralized single-window counseling.
• **Institutional Verification**: Colleges are usually given an extension window after student closing dates.

💡 *Tip*: Check the official portals regularly as exact dates are updated each academic year.

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in) • [umis.tn.gov.in](https://umis.tn.gov.in)`;

    case "scholarship_list":
      return `🎓 **Flagship Available Scholarship Schemes:**

**Tamil Nadu State Schemes (via UMIS & State Portals):**
1. **Pudhumaipenn Scheme**: ₹1,000/month for girl students from TN govt schools.
2. **Tamil Pudhalvan Scheme**: ₹1,000/month for boy students from TN govt schools.
3. **First Graduate Fee Concession**: Tuition fee concession for first-generation graduates.
4. **7.5% Govt School Quota**: Complete fee exemption for professional admissions.
5. **BC / MBC / DNC Post-Matric**: Tuition fee concession and allowances.
6. **SC / ST / SCC Post-Matric**: Tuition fee concession and maintenance allowances.
7. **Differently Abled Students Welfare**: Special state education grant.

**Central Schemes (via NSP):**
8. **PM-YASASVI**: For OBC, EBC & DNT students.
9. **Central Sector Scheme (CSSS)**: For top 20th percentile board exam scorers.
10. **Post-Matric Scheme for Minorities**: Muslim, Christian, Sikh, Jain, Buddhist, Parsi.
11. **AICTE Saksham**: Differently-abled students in technical education.

Share your details for a tailored eligibility check!`;

    case "amount":
      return `💰 **Scholarship Benefit Overview (Indicative Grant Amounts):**

• **Pudhumaipenn & Tamil Pudhalvan**: ₹1,000 / month (₹12,000 / year).
• **First Graduate Concession**: ₹25,000 / year (Engineering) up to ₹50,000 / year (Medical).
• **SC / ST Post-Matric**: Full tuition fee waiver + monthly maintenance allowance.
• **BC / MBC Post-Matric**: Tuition fee waiver + exam fees + maintenance as per norms.
• **PM-YASASVI**: Up to ₹20,000 / year tuition + maintenance.
• **AICTE Saksham / Pragati**: ₹50,000 / year for technical degree/diploma.
• **NMMSS (School)**: ₹12,000 / year.

*Exact grant amounts depend on course type, hostel status, and government sanction.*`;

    case "status":
      return `🔍 **How to Track Application Status:**

• **NSP Portal**: Visit [scholarships.gov.in](https://scholarships.gov.in) → Login with OTR/Application ID → Click **"Track Application Status"**.
• **UMIS Portal**: Visit [umis.tn.gov.in](https://umis.tn.gov.in) → Student Login → Click **"Scholarship Status"**.

**Typical Status Flow:**
⏳ *Submitted* → Pending College Verification
✅ *Institute Approved* → Forwarded to District / State Welfare Officer
💰 *Sanctioned* → Payment approved by Ministry / Department
🟢 *Disbursed via DBT* → Amount credited to bank account

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in) • [umis.tn.gov.in](https://umis.tn.gov.in)`;

    case "readiness":
      return `📊 **8-Step Scholarship Readiness Checklist:**

✅ 1. Aadhaar name and DOB match academic marksheets
✅ 2. Single savings bank account active and seeded for DBT
✅ 3. Mobile number linked to both Aadhaar & Bank
✅ 4. Valid Community Certificate in student's name (where applicable)
✅ 5. Valid Income Certificate for current financial year (where applicable)
✅ 6. Educational marksheets ready
✅ 7. College Bonafide and fee receipt obtained
✅ 8. First Graduate certificate (if claiming first graduate concession)

*Prepare these details before starting your application!* ✅`;

    case "income_cert":
      return `📄 **Income Certificate Requirements:**

Requirements vary by scheme and issuing authority.

• **Issuing Authority**: In Tamil Nadu, revenue certificates are typically issued by the Revenue Department (Tahsildar / Zonal Deputy Tahsildar) via e-Sevai centres.
• **Validity**: Income certificates are generally issued for a specific financial year. Portals typically require a certificate valid for the current academic/financial cycle.
• **Family Details**: Must reflect parental/guardian annual income with the student listed as dependent.
• **Digital Verification**: Issued with a digital signature and verifiable QR code/barcode.

💡 *Important*: An outdated or invalid income certificate may cause an application to be rejected, returned for correction, or treated as ineligible depending on the scheme's current requirements. Always verify the specific scheme guidelines on the official portal.

📌 *Official portal/reference*: [tnesevai.tn.gov.in](https://www.tnesevai.tn.gov.in)`;

    case "income_expired":
      return `⚠️ **Outdated / Prior-Year Income Certificate Guidance:**

• **Portal Requirements**: Most government scholarship portals (such as NSP and state portals) require an income certificate corresponding to the current financial year.
• **Impact**: An outdated or invalid income certificate may cause an application to be rejected, returned for correction, or treated as ineligible depending on the scheme's current requirements.
• **Recommended Action**: Apply for a current financial year income certificate through your nearest e-Sevai centre or online via [tnesevai.tn.gov.in](https://www.tnesevai.tn.gov.in).
• Requirements and processing timelines vary by issuing authority and state.

📌 *Official portal/reference*: [tnesevai.tn.gov.in](https://www.tnesevai.tn.gov.in)`;

    case "community_cert":
      return `📜 **Community / Caste Certificate Information:**

• **Issuing Authority**: In Tamil Nadu, issued by Revenue Department (Tahsildar / RDO) via e-Sevai.
• **Validity**: Community certificates generally have **permanent validity** in Tamil Nadu once issued.
• **Student Details**: Should be issued in the student's own name with correct community and sub-caste classification.
• **Format**: Digital certificate with verifiable QR code/barcode.

📌 *Official portal/reference*: [edistricts.tn.gov.in](https://edistricts.tn.gov.in)`;

    case "verify_cert":
      return `🔍 **Certificate Authenticity & SGP Verification Scope:**

SGP can perform a document consistency and readiness check, but it cannot independently confirm that a government certificate is genuine.

**What SGP can check locally:**
• Document image quality & readability
• Extracted fields and certificate numbers
• Name, date of birth, and number consistency across your documents
• Missing or suspicious inconsistencies before portal submission

**For official authenticity verification:**
Use the issuing department's official verification service or certificate verification mechanism:
• **Official verification resource (TN Revenue / e-Sevai)**: [edistricts.tn.gov.in](https://edistricts.tn.gov.in)
• **Official verification resource (Aadhaar)**: [myaadhaar.uidai.gov.in/verify-aadhaar](https://myaadhaar.uidai.gov.in/verify-aadhaar)
• **Official verification resource (DBT / NPCI Mapper)**: [npci.org.in](https://www.npci.org.in)`;

    case "dual_scholarship":
      return `⚖️ **Availing NSP and Tamil Nadu Scholarships Concurrently:**

It depends on the specific NSP and Tamil Nadu schemes.

Some scholarships may not permit simultaneous benefits, while some benefits may be compatible. The exact rules are determined by the individual scheme.

**General Guidelines:**
• **Tuition Fee Concessions**: Most government departments prohibit drawing multiple tuition fee waivers or full maintenance scholarships for the same academic course from different government sources simultaneously.
• **Living / Incentive Stipends**: Certain incentive schemes (such as Pudhumaipenn or Tamil Pudhalvan monthly student allowances in Tamil Nadu) are specifically designed as welfare grants to support higher education retention and may have distinct concurrent eligibility rules compared to tuition reimbursement schemes.

If you tell me the two scholarship names, I can compare their stored eligibility and concurrent-benefit rules. Before accepting two benefits, confirm the current official scheme guidelines.`;

    case "which_scholarship_first":
      return `🎯 **Application Sequencing Guidance:**

Application priorities depend on your admission route and qualifying criteria.

**Typical application sequence:**
1. **Counseling-Time Concessions**: First Graduate Tuition Concession or 7.5% Government School Quota should be claimed during centralized counseling (TNEA/Medical) at seat allotment.
2. **State Welfare Post-Matric (UMIS)**: Coordinate through your college scholarship nodal desk when admissions open in August/September.
3. **Targeted State Incentives**: Pudhumaipenn (Girls) or Tamil Pudhalvan (Boys) enrolled through your college UMIS desk for eligible government school students.
4. **Central / National Schemes (NSP)**: Apply on [scholarships.gov.in](https://scholarships.gov.in) if you meet specific national merit or central ministry criteria and do not draw duplicate state tuition concessions.

📌 *Official portal/reference*: [scholarships.gov.in](https://scholarships.gov.in) (NSP) • [umis.tn.gov.in](https://umis.tn.gov.in) (UMIS)`;

    case "help":
      return `🤖 **I can help you with:**

📋 **Eligibility Check** — Tell me community, income, and course
📁 **Document Checklist** — Required proofs & scanning rules
🏦 **DBT & Bank Setup** — NPCI Aadhaar mapper instructions
📝 **How to Apply** — Typical NSP & UMIS instructions
🔍 **Acronym Full Forms** — Ask "NSP full form", "UMIS full form", or "full of UMIS and NSP"
⚠️ **Rejection Solutions** — How to resolve errors
🔄 **Renewal Guidance** — Requirements for second/third year
📅 **Deadlines & Grant Amounts** — Key dates and benefits
✏️ **Aadhaar Corrections** — How to fix name and DOB discrepancies

💡 *Try asking*: *"What scholarships are available for BC engineering students?"*`;

    default:
      return null;
  }
}

// ── 6. MASTER ENTRY POINT ────────────────────────────────────────────────────

/**
 * askSGPBrain(userInput)
 *
 * Master entry point preserving the authoritative SGP contract:
 * Input: userInput (string)
 * Output: Promise<{ intent: string, slots: object, response: string }>
 */
export async function askSGPBrain(userInput) {
  // Guard against empty / invalid input
  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return {
      intent: "unknown",
      slots: {},
      response: "🤔 Please type your question and I'll be happy to help you with scholarships, documents, or eligibility!",
    };
  }

  const query = userInput.trim();

  try {
    const slots = extractSlots(query);
    const entities = extractEntities(query);
    if (entities.length > 0) {
      slots.entities = entities;
    }

    // ── PRIORITY 1: GREETINGS (Exact boundary check) ─────────────────────────
    if (/^(hi|hello|hey|vanakkam|namaste|good\s+morning|good\s+afternoon|good\s+evening)[\s!.,]*$/i.test(query)) {
      return {
        intent: "greeting",
        slots,
        response: buildAuthoritativeResponse("greeting", slots, query)
      };
    }

    // ── PRIORITY 2: IDENTITY / NAME ──────────────────────────────────────────
    if (/\b(what\s+is\s+your\s+name|who\s+are\s+you|your\s+name|who\s+made\s+you|who\s+built\s+you)\b/i.test(query)) {
      return {
        intent: "bot_identity",
        slots,
        response: buildAuthoritativeResponse("bot_identity", slots, query)
      };
    }

    // ── PRIORITY 2.5: 7.5% GOVERNMENT SCHOOL QUOTA (Tamil Nadu Higher Education) ──
    if (/\b(7\.5\s*(?:%|percent)?\s*(?:government\s*school\s*|govt\s*school\s*)?quota|government\s*school\s*quota|govt\s*school\s*quota|7\.5\s*quota)\b/i.test(query)) {
      return {
        intent: "quota_7_5",
        slots,
        response: buildAuthoritativeResponse("quota_7_5", slots, query)
      };
    }

    // ── PRIORITY 2.6: SCHOLARSHIP PURPOSE & BENEFITS (General Guidance) ─────
    if (isScholarshipPurposeQuery(query)) {
      return {
        intent: "scholarship_purpose",
        slots,
        response: buildAuthoritativeResponse("scholarship_purpose", slots, query)
      };
    }

    // ── PRIORITY 3: FULL-FORM INTENT (Single or Multi-Entity) ────────────────
    const fullFormResponse = checkFullFormQuery(query, entities);
    if (fullFormResponse) {
      return {
        intent: "full_form",
        slots,
        response: fullFormResponse
      };
    }

    // ── PRIORITY 4: EXPLICIT HOW-TO-APPLY INTENT ─────────────────────────────
    const applyResult = checkHowToApplyQuery(query, entities);
    if (applyResult) {
      return {
        intent: applyResult.intent,
        slots,
        response: applyResult.response
      };
    }

    // ── PRIORITY 5: OTHER AUTHORITATIVE SGP INTENTS (DBT, Docs, Quick Actions)
    const detected = detectIntent(query, slots);
    const authoritativeResponse = buildAuthoritativeResponse(detected, slots, query);
    if (authoritativeResponse) {
      return { intent: detected, slots, response: authoritativeResponse };
    }

    // ── PRIORITY 6: EXPLICIT ELIGIBILITY EVALUATION ───────────────────────────
    if (detected === "eligibility" || slots.community || slots.category || slots.income !== undefined || slots.disabled !== undefined || slots.disabilityUnderBenchmark || slots.disabilityPercent !== undefined) {
      const eligibilityResponse = formatEligibilityResponse(slots, query);
      return {
        intent: "eligibility",
        slots,
        response: eligibilityResponse
      };
    }

    // ── PRIORITY 7: VERIFIED Q&A KNOWLEDGE BASE (Anti-Hallucination Matrix Guard)
    const qaResult = findMatchingQA(query);
    if (qaResult && qaResult.score >= 0.25) {
      let qaResponse = qaResult.qa.answer;
      if (qaResult.qa.officialReference) {
        qaResponse += `\n\n📌 *Official Reference*: ${qaResult.qa.officialReference}`;
      }
      return {
        intent: "qa_match",
        slots,
        response: qaResponse
      };
    }

    // ── PRIORITY 8: GENERAL FALLBACK ─────────────────────────────────────────
    const fallbackResponse = `🤔 I couldn't find an exact match for that question.

Here is what I can help you with:
• **Full Forms**: Ask "NSP full form", "UMIS full form", or "full of UMIS and NSP"
• **Check Eligibility**: Tell me your Community (SC/ST/BC/MBC), Annual Income, and Course
• **Application Steps**: Ask "How to Apply" or "UMIS how to apply"
• **Flagship Schemes**: Pudhumaipenn, Tamil Pudhalvan, First Graduate, 7.5% Quota
• **Banking**: Activating NPCI DBT for scholarship credit
• **Checklists**: Documents needed and scanning guidelines

💡 *Try asking*: *"What scholarships are available for BC engineering students?"* or type **"help"**.`;

    return {
      intent: detected || "unknown",
      slots,
      response: fallbackResponse
    };

  } catch (err) {
    console.error("askSGPBrain error:", err);
    return {
      intent: "unknown",
      slots: {},
      response: "⚠️ An error occurred while processing your question. Please try again or type \"help\".",
    };
  }
}
