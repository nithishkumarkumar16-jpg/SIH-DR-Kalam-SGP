/**
 * nspSchemes.js — Source-Controlled Scholarship Knowledge Base for NSP Readiness Framework
 *
 * PURPOSE:
 *   Contains source-controlled scheme metadata, document checklists, application
 *   fields, official portal references, and rule verification statuses.
 *
 * RULE STATUS VALUES:
 *   "VERIFIED"           — Rule confirmed from authoritative current government source
 *   "PARTIALLY_VERIFIED" — Rule partially confirmed; some details require official confirmation
 *   "UNVERIFIED"         — Current-year rule could not be confirmed; NEVER used for hard rejection
 *
 * JURISDICTION VALUES:
 *   "CENTRAL"    — Central/All-India scheme (NSP portal)
 *   "TAMIL_NADU" — Tamil Nadu State scheme (UMIS / State portals)
 *   "OTHER_STATE"— Other state scheme
 *
 * PORTAL VALUES:
 *   "NSP"   — National Scholarship Portal (scholarships.gov.in)
 *   "UMIS"  — Tamil Nadu University Management Information System
 *   "OTHER" — State or departmental portal
 *
 * SOURCES:
 *   - NSP Portal (Central Sector, PM-YASASVI, MoMA): https://scholarships.gov.in
 *   - AICTE Portal (Pragati, Saksham):               https://www.aicte-india.org
 *   - TN BC & MBC Welfare Dept (G.O. Ms. No. 92):   https://bcmbcmw.tn.gov.in
 *   - TN Higher Education Dept (G.O. Ms. No. 85):   https://tnscholarships.gov.in
 *   - TN Adi Dravidar Dept (G.O. Ms. No. 92):       https://tnscholarships.gov.in
 *   - UGC Portal (Ishan Uday guidelines):            https://www.ugc.gov.in
 */

// ─── Document Checklist Item Helper ───────────────────────────────────────────
// Classification: "REQUIRED" | "CONDITIONAL" | "OPTIONAL" | "NOT_REQUIRED"
export const DOC = (label, purpose, notes = "", status = "REQUIRED") => {
  const normStatus = typeof status === "boolean" ? (status ? "REQUIRED" : "OPTIONAL") : (status || "REQUIRED");
  return {
    label,
    purpose,
    notes,
    status: normStatus,
    required: normStatus === "REQUIRED",
    conditional: normStatus === "CONDITIONAL",
  };
};

// ─── Source-Controlled Scheme Metadata ─────────────────────────────────────────

export const nspSchemeMetadata = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CENTRAL / NSP ALL-INDIA SCHEMES (Jurisdiction: CENTRAL)
  // ═══════════════════════════════════════════════════════════════════════════

  "nsp-central-sector": {
    id: "nsp-central-sector",
    name: "Central Sector Scheme of Scholarship for College and University Students",
    authority: "Department of Higher Education, Ministry of Education, Govt of India",
    portal: "NSP",
    scope: "All-India",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "General",
    course: "Regular Full-Time Degree (UG / PG)",
    level: "Undergraduate / Postgraduate",
    institutionType: "Recognized Colleges / Universities with AISHE Code",
    incomeRule: "Annual family income ≤ ₹4,50,000",
    academicRule: "Above 80th percentile of successful candidates in Class 12 board",
    genderRule: "All",
    disabilityRule: "None (3% horizontal reservation)",
    domicileRule: "All-India (State quota allocation by population)",
    quotaRule: "None — no government admission quota restriction",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("Aadhaar Card", "Identity verification and DBT payment", "Must be linked to Aadhaar-seeded bank account"),
      DOC("Class 12 Marksheet", "Academic eligibility — above 80th percentile", "From recognized State or Central Board"),
      DOC("Income Certificate", "Annual parental income ceiling proof", "Issued by competent revenue authority within 1 year"),
      DOC("Bank Passbook / Account Statement", "DBT disbursement proof", "Account must be in student's own name, Aadhaar-seeded, NPCI-mapped"),
      DOC("College Bonafide Student Certificate", "Current enrollment proof", "Must include institution AISHE code"),
    ],
    optionalDocuments: [
      DOC("Previous Year Marksheet", "Renewal evaluation (min 50% marks)", "Required for 2nd year onwards", false),
    ],
    renewalDocuments: [
      DOC("Previous Year Marksheet", "Proof of passing with ≥ 50% marks"),
      DOC("Attendance Certificate", "Proof of ≥ 75% attendance"),
    ],
    renewalConditions: "Annual renewal via NSP. Minimum 50% marks in semester/annual exams. Minimum 75% attendance. No disciplinary backlogs.",
    applicationFields: [
      "name", "dob", "gender", "category", "income", "course", "institution",
      "aisheCode", "bankAccountNumber", "ifsc", "aadhaarNumber", "previousYearMarks",
    ],
    sourceUrl: "https://scholarships.gov.in",
    sourceTitle: "Central Sector Scheme Official Guidelines 2025-26",
    sourceAuthority: "Department of Higher Education, Ministry of Education, GoI",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Strictly for regular full-time collegiate degree courses. Diploma, correspondence, and distance education students are not eligible.",
  },

  "nsp-pm-yasasvi": {
    id: "nsp-pm-yasasvi",
    name: "PM Young Achievers Scholarship Award Scheme for Vibrant India (PM-YASASVI)",
    authority: "Ministry of Social Justice & Empowerment, Govt of India",
    portal: "NSP",
    scope: "All-India",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "OBC / EBC / DNT",
    course: "Class 9 to Post-Matric in Top Class Institutions",
    level: "School & Higher Education",
    institutionType: "Empaneled Top-Class Institutions across India",
    incomeRule: "Annual parental income ≤ ₹2,50,000",
    academicRule: "Passing marks in qualifying examination",
    genderRule: "All (minimum 30% earmarked for girls)",
    disabilityRule: "None",
    domicileRule: "All-India",
    quotaRule: "None",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("Aadhaar Card", "Identity and DBT verification"),
      DOC("OBC / EBC / DNT Community Certificate", "Category eligibility", "Issued by competent government authority"),
      DOC("Income Certificate (≤ ₹2.5 lakh)", "Family income ceiling", "Must be issued within current academic year"),
      DOC("Bonafide Student Certificate", "Enrollment in recognized/empaneled institution"),
      DOC("Previous Year Marksheet", "Academic qualifying proof"),
      DOC("Bank Passbook", "Active bank account in student's name"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Annual Marksheet", "Promotion proof to next academic year"),
    ],
    renewalConditions: "Annual renewal via NSP. Must be promoted to next academic year.",
    applicationFields: [
      "name", "dob", "category", "income", "institution", "course",
      "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://scholarships.gov.in",
    sourceTitle: "PM-YASASVI Scheme Guidelines No. 11014/01/2021",
    sourceAuthority: "Ministry of Social Justice & Empowerment, GoI",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Covers tuition fee, hostel fee, and books allowance for OBC, EBC, and DNT candidates in shortlisted institutions.",
  },

  "nsp-minority-postmatric": {
    id: "nsp-minority-postmatric",
    name: "Post Matric Scholarship Scheme for Minorities",
    authority: "Ministry of Minority Affairs, Govt of India",
    portal: "NSP",
    scope: "All-India",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "Minority (Muslim, Christian, Sikh, Buddhist, Jain, Parsi)",
    course: "Post-Matric (Class 11 through Ph.D.)",
    level: "Higher Secondary to Doctoral",
    institutionType: "Recognized Schools, Colleges, and Universities",
    incomeRule: "Annual parental/guardian income ≤ ₹2,00,000",
    academicRule: "Minimum 50% marks in previous final examination",
    genderRule: "All (30% reserved for girl students)",
    disabilityRule: "None",
    domicileRule: "All-India (State quota allocation)",
    quotaRule: "None",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("Minority Community Self-Declaration", "Community confirmation", "Self-declaration for 6 notified minority communities"),
      DOC("Income Certificate (≤ ₹2.0 lakh)", "Income ceiling proof", "Current year from competent authority"),
      DOC("Aadhaar Card", "Identity and DBT payment"),
      DOC("Previous Qualifying Marksheet (min 50%)", "Academic marks verification"),
      DOC("College / School Fee Receipt", "Fee reimbursement proof"),
      DOC("Bank Passbook", "Student's own Aadhaar-seeded bank account"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Marksheet with ≥ 50% marks", "Proof of academic continuity"),
    ],
    renewalConditions: "Annual renewal via NSP. Must score minimum 50% in previous exam.",
    applicationFields: [
      "name", "dob", "minorityCommunity", "income", "institution", "course",
      "bankAccountNumber", "ifsc", "aadhaarNumber", "previousMarks",
    ],
    sourceUrl: "https://scholarships.gov.in",
    sourceTitle: "MoMA Post-Matric Scholarship Scheme Guidelines 2025-26",
    sourceAuthority: "Ministry of Minority Affairs, GoI",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Applicable to students belonging to Muslim, Christian, Sikh, Buddhist, Jain, and Zoroastrian (Parsi) communities.",
  },

  "nsp-aicte-pragati": {
    id: "nsp-aicte-pragati",
    name: "AICTE Pragati Scholarship for Girl Students (Technical Degree & Diploma)",
    authority: "All India Council for Technical Education (AICTE), Ministry of Education",
    portal: "NSP",
    scope: "All-India",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "All (Exclusively for Girl Students)",
    course: "Technical Degree (Engineering/Tech) or Technical Diploma",
    level: "Degree (1st year / Lateral entry) or Diploma",
    institutionType: "AICTE-Approved Institutions Only",
    incomeRule: "Annual family income ≤ ₹8,00,000",
    academicRule: "Admitted to 1st year of Degree/Diploma or 2nd year lateral entry",
    genderRule: "Girls Only (Maximum 2 girls per family)",
    disabilityRule: "None",
    domicileRule: "All-India",
    quotaRule: "Admitted through centralized counseling / state admission process",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("AICTE Approved College Admission Letter", "Institution eligibility verification"),
      DOC("Class 10 Marksheet", "Age and academic record"),
      DOC("Class 12 / Diploma Marksheet", "Qualifying examination record"),
      DOC("Parental Income Certificate (≤ ₹8.0 lakh)", "Income ceiling verification", "Current year"),
      DOC("Aadhaar Card", "Identity and DBT payment"),
      DOC("Tuition Fee Receipt", "Paid tuition fee verification"),
      DOC("Family Composition / Ration Card / Affidavit", "Proof of maximum 2 girls per family"),
    ],
    optionalDocuments: [
      DOC("Lateral Entry Admission Proof", "For 2nd year direct lateral entry", "If applicable", false),
    ],
    renewalDocuments: [
      DOC("Annual Marksheet", "Passing certificate with no pending backlog"),
      DOC("Bonafide Renewal Certificate", "College nodal officer endorsement"),
    ],
    renewalConditions: "Annual renewal via NSP. Passing every semester without pending backlog.",
    applicationFields: [
      "name", "dob", "gender", "institution", "aicteCode", "course",
      "income", "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://www.aicte-india.org",
    sourceTitle: "AICTE Pragati Scholarship Scheme Guidelines F.No. 1-104/AICTE/Pragati",
    sourceAuthority: "All India Council for Technical Education (AICTE)",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Provides ₹50,000 per year towards tuition and college fee. Exclusively for girl students in AICTE-approved colleges.",
  },

  "nsp-aicte-saksham": {
    id: "nsp-aicte-saksham",
    name: "AICTE Saksham Scholarship for Specially-Abled Students",
    authority: "All India Council for Technical Education (AICTE), Ministry of Education",
    portal: "NSP",
    scope: "All-India",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "All (Specially-Abled)",
    course: "Technical Degree or Diploma",
    level: "Undergraduate Degree / Diploma",
    institutionType: "AICTE-Approved Institutions Only",
    incomeRule: "Annual family income ≤ ₹8,00,000",
    academicRule: "Admitted to 1st year of Degree/Diploma or 2nd year lateral entry",
    genderRule: "All",
    disabilityRule: "Minimum 40% permanent certified disability",
    requiresDisability: true,
    minimumDisabilityPercentage: 40,
    domicileRule: "All-India",
    quotaRule: "Admitted through centralized or recognized admission process",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("Disability Certificate (min 40%)", "Permanent disability verification", "Issued by District Medical Board"),
      DOC("AICTE College Admission Proof", "Institution approval verification"),
      DOC("Income Certificate (≤ ₹8.0 lakh)", "Income ceiling verification", "Current year"),
      DOC("Aadhaar Card", "Identity and DBT"),
      DOC("Class 10 & 12 Marksheets", "Qualifying exam records"),
      DOC("Bank Passbook", "Student's own Aadhaar-seeded account"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Semester Marksheet", "Passing marks without backlog"),
    ],
    renewalConditions: "Annual renewal. Must pass exams without pending backlogs.",
    applicationFields: [
      "name", "dob", "disabilityPercentage", "disabilityCertNumber",
      "institution", "aicteCode", "income", "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://www.aicte-india.org",
    sourceTitle: "AICTE Saksham Scholarship Notification F.No. 1-104/AICTE/Saksham",
    sourceAuthority: "All India Council for Technical Education (AICTE)",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Provides ₹50,000 per year to students with permanent physical disability not less than 40%.",
  },

  "nsp-ishan-uday": {
    id: "nsp-ishan-uday",
    name: "Ishan Uday Special Scholarship Scheme for North Eastern Region",
    authority: "University Grants Commission (UGC), Ministry of Education",
    portal: "NSP",
    scope: "North Eastern Region",
    jurisdiction: "CENTRAL",
    academicYear: "2026-27",
    category: "All",
    course: "General Degree, Technical / Professional, Medical, Paramedical",
    level: "Undergraduate (1st year)",
    institutionType: "UGC Recognized Universities / Colleges",
    incomeRule: "Annual family income ≤ ₹4,50,000",
    academicRule: "Passed Class 12 from a school within North Eastern Region (NER)",
    genderRule: "All",
    disabilityRule: "None (3% horizontal reservation)",
    domicileRule: "Permanent Resident of Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, or Tripura",
    quotaRule: "None",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("Domicile / Permanent Residence Certificate (NER)", "NER state residency verification", "Issued by District Magistrate or authorized authority"),
      DOC("Class 12 Marksheet", "Passed from an institution within NER"),
      DOC("Income Certificate (≤ ₹4.5 lakh)", "Income ceiling proof"),
      DOC("Aadhaar Card", "Identity and DBT"),
      DOC("Bonafide Student Certificate", "1st year regular UG admission proof"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Annual Exam Marksheet", "Promotion proof with satisfactory attendance"),
    ],
    renewalConditions: "Annual renewal on NSP. Must be promoted to next class with continuous attendance.",
    applicationFields: [
      "name", "dob", "domicile", "state", "income", "institution", "course",
      "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://www.ugc.gov.in",
    sourceTitle: "UGC Ishan Uday Special Scholarship Guidelines",
    sourceAuthority: "University Grants Commission (UGC)",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "PARTIALLY_VERIFIED",
    notes: "10,000 fresh scholarships annually for students with NER domicile pursuing general or professional degree courses.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TAMIL NADU STATE SCHEMES (Jurisdiction: TAMIL_NADU, Portal: UMIS / State)
  // CRITICAL: These rules apply ONLY to Tamil Nadu. They must NEVER be applied
  //           to Central NSP schemes or other states.
  // ═══════════════════════════════════════════════════════════════════════════

  "tn-post-matric-bc-mbc": {
    id: "tn-post-matric-bc-mbc",
    name: "Tamil Nadu Post-Matric Scholarship for BC, MBC & DNC Students",
    authority: "Backward Classes, Most Backward Classes & Minorities Welfare Department, Govt of Tamil Nadu",
    portal: "UMIS",
    scope: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    academicYear: "2026-27",
    category: "BC / MBC / DNC",
    course: "Post-Matric (Polytechnic, Degree, Professional Courses)",
    level: "Diploma / UG / PG / Professional",
    institutionType: "Government, Aided, and Self-Financing (Government Quota only)",
    incomeRule: "Annual parental income ≤ ₹2,50,000",
    academicRule: "Satisfactory attendance and academic progress",
    genderRule: "All",
    disabilityRule: "None",
    domicileRule: "Permanent resident of Tamil Nadu",
    quotaRule: "Requires Government Quota admission for self-financing institutions (G.O. Ms. No. 92)",
    firstGraduateRule: "None (applies to both First Graduate and non-First Graduate students under Tier 3/4)",
    quotaNote:
      "For Self-Financing institutions, scholarship is restricted to students admitted through " +
      "single-window counseling under Government Quota. Management quota students are ineligible. " +
      "Source: G.O. Ms. No. 92, BC Welfare Dept and bcmbcmw.tn.gov.in FAQ.",
    requiredDocuments: [
      DOC("Community Certificate (BC/MBC/DNC)", "Category verification", "From Tahsildar / e-Sevai portal"),
      DOC("Parental Income Certificate (≤ ₹2.5 lakh)", "Income ceiling verification", "Issued in current academic year in parent/guardian's name"),
      DOC("Aadhaar Card copy", "Identity and DBT seeding"),
      DOC("College Admission Allotment Order", "Government Quota allotment proof",
          "Mandatory for self-financing colleges — confirms single-window counseling allotment"),
      DOC("Bank Account Passbook", "Aadhaar-seeded account in student's name"),
    ],
    optionalDocuments: [
      DOC("UMIS Student ID", "TN UMIS portal student registration", "Provided by college", false),
    ],
    renewalDocuments: [
      DOC("College Bonafide Renewal Certificate", "Endorsement of continuing enrollment and attendance"),
    ],
    renewalConditions: "Annual renewal through college nodal officer on UMIS portal. Minimum 75% attendance.",
    applicationFields: [
      "studentName", "dob", "category", "income", "incomeApplicant", "parentName",
      "quotaType", "institution", "course", "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://bcmbcmw.tn.gov.in",
    sourceTitle: "G.O. Ms. No. 92, Backward Classes, Most Backward Classes & Minorities Welfare Department",
    sourceAuthority: "BC, MBC & Minorities Welfare Department, Govt of Tamil Nadu",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes:
      "Income is parental income (the student remains the scholarship applicant). " +
      "Application is submitted via college nodal officer through UMIS portal, not directly on NSP.",
  },

  "tn-post-matric-sc-st": {
    id: "tn-post-matric-sc-st",
    name: "Tamil Nadu Post-Matric Scholarship for SC and ST Students",
    authority: "Adi Dravidar and Tribal Welfare Department, Govt of Tamil Nadu",
    portal: "UMIS",
    scope: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    academicYear: "2026-27",
    category: "SC / ST / SCC",
    course: "Post-Matric (Class 11 to Ph.D., Professional, Technical)",
    level: "Higher Secondary to Doctoral",
    institutionType: "Government, Aided, and Self-Financing Institutions",
    incomeRule: "Annual parental income ≤ ₹2,50,000 (relaxed for select schemes)",
    academicRule: "Satisfactory attendance",
    genderRule: "All",
    disabilityRule: "None",
    domicileRule: "Permanent resident of Tamil Nadu",
    quotaRule: "No government quota restriction for SC/ST students",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("SC / ST Community Certificate", "Category verification", "From Revenue Divisional Officer (RDO) or Tahsildar"),
      DOC("Parental Income Certificate (≤ ₹2.5 lakh)", "Income ceiling verification", "Current year"),
      DOC("Aadhaar Card", "Identity and DBT verification"),
      DOC("Bonafide Certificate", "College enrollment verification"),
      DOC("Bank Passbook", "Aadhaar-seeded bank account in student's name"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Bonafide Renewal Certificate", "Academic progress endorsement"),
    ],
    renewalConditions: "Annual renewal via college nodal officer on UMIS / Adi Dravidar portal.",
    applicationFields: [
      "studentName", "dob", "category", "income", "incomeApplicant", "parentName",
      "institution", "course", "bankAccountNumber", "ifsc", "aadhaarNumber",
    ],
    sourceUrl: "https://tnscholarships.gov.in",
    sourceTitle: "G.O. (Ms) No. 92, Adi Dravidar and Tribal Welfare (ADW-3) Department",
    sourceAuthority: "Adi Dravidar and Tribal Welfare Department, Govt of Tamil Nadu",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes: "Full compulsory tuition fee reimbursement is provided. No quota restriction applies to SC/ST students.",
  },

  "tn-first-graduate": {
    id: "tn-first-graduate",
    name: "Tamil Nadu First Graduate Tuition Fee Concession",
    authority: "Directorate of Technical Education (DOTE) / Higher Education Dept, Tamil Nadu",
    portal: "OTHER",
    scope: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    academicYear: "2026-27",
    category: "All Communities",
    course: "Professional Courses (B.E., B.Tech, MBBS, BDS, Agriculture)",
    level: "Undergraduate Professional Degree",
    institutionType: "Government, Aided, and Self-Financing Professional Colleges",
    incomeRule: "No income ceiling (concession is based on first graduate status, not income)",
    academicRule: "Admitted through Single Window Government Counseling (TNEA / TN Medical Selection)",
    genderRule: "All",
    disabilityRule: "None",
    domicileRule: "Permanent resident of Tamil Nadu",
    quotaRule: "Strictly requires Single Window Counseling (TNEA/Medical) allotment. Management quota is ineligible.",
    firstGraduateRule: "Neither parents nor elder siblings must have graduated from any college",
    firstGraduateNote:
      "First Graduate Certificate must be obtained from Tahsildar through e-Sevai centers (https://it.tn.gov.in/en/node/174). " +
      "If an elder sibling has already availed First Graduate concession or completed graduation, student is not eligible.",
    quotaNote:
      "Must be admitted through Single Window Government Counseling (TNEA / TN Medical). " +
      "Students admitted through Management Quota / NRI / institutional quota are ineligible (G.O. Ms. No. 85).",
    requiredDocuments: [
      DOC("First Graduate Certificate", "First-generation graduate proof", "Issued by Tahsildar or e-Sevai portal"),
      DOC("Joint Declaration Form", "Family undertaking signed by parents and candidate"),
      DOC("Single-Window Allotment Order (TNEA / TN Medical)", "Single-window admission proof", "Mandatory — confirms government counseling allotment"),
      DOC("Community Certificate", "Community verification"),
      DOC("Transfer Certificate (TC)", "School leaving and conduct proof"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("College Continuation Bonafide", "Annual continuation certificate from college principal"),
    ],
    renewalConditions: "Automatic annual renewal provided the student maintains enrollment in the professional degree.",
    applicationFields: [
      "studentName", "dob", "firstGraduate", "quotaType", "institution", "course",
    ],
    sourceUrl: "https://tnscholarships.gov.in",
    sourceTitle: "G.O. Ms. No. 85, Higher Education (J2) Department, Tamil Nadu",
    sourceAuthority: "Directorate of Technical Education (DOTE) / Higher Education Dept, TN",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "VERIFIED",
    notes:
      "Waives tuition fee up to ₹25,000/year (Govt quota in self-financing colleges) or full tuition fee in Govt/Aided colleges. " +
      "No income ceiling applies.",
  },

  "tn-bc-mbc-free-education": {
    id: "tn-bc-mbc-free-education",
    name: "Tamil Nadu BC/MBC Free Education Scheme (3-Yr UG Degree & Polytechnic)",
    authority: "Directorate of Backward Classes Welfare, Government of Tamil Nadu",
    portal: "UMIS",
    scope: "Tamil Nadu",
    jurisdiction: "TAMIL_NADU",
    academicYear: "2026-27",
    category: "BC / MBC / DNC",
    course: "3-Year UG Arts & Science Degree, Polytechnic Diploma",
    level: "Undergraduate / Diploma",
    institutionType: "Government and Government-Aided Colleges Only",
    incomeRule: "UG Degree: No income limit; Polytechnic: Annual parental income ≤ ₹2,50,000",
    academicRule: "Enrollment in recognized regular 3-year degree or polytechnic",
    genderRule: "All",
    disabilityRule: "None",
    domicileRule: "Permanent resident of Tamil Nadu",
    quotaRule: "Applies to Government and Government-Aided colleges. No management quota restriction documented.",
    firstGraduateRule: "None for UG degree; First Diploma/Degree preferred for Polytechnic",
    quotaNote:
      "Scheme applies to Government and Government-Aided institutions. " +
      "Source: Citizen Charter and bcw.tn.gov.in/sub_page/8 (Tier 1 & Tier 2 Free Education).",
    requiredDocuments: [
      DOC("Community Certificate (BC/MBC/DNC)", "Category verification"),
      DOC("Parental Income Certificate", "Income verification for polytechnic (not required for UG degree)"),
      DOC("Class 12 / Higher Secondary Marksheet", "Qualifying academic record"),
      DOC("College Bonafide Certificate", "Enrollment in Govt or Govt Aided institution"),
    ],
    optionalDocuments: [],
    renewalDocuments: [
      DOC("Annual Marksheet", "Continuation proof"),
    ],
    renewalConditions: "Annual renewal via UMIS portal. Continued enrollment in Government or Aided institution.",
    applicationFields: [
      "studentName", "dob", "category", "income", "institution", "course",
    ],
    sourceUrl: "https://bcmbcmw.tn.gov.in",
    sourceTitle: "Citizen Charter, BC & MBC Welfare Department, Tamil Nadu",
    sourceAuthority: "Directorate of Backward Classes Welfare, Government of Tamil Nadu",
    sourceVerifiedDate: "2025-09-01",
    ruleStatus: "PARTIALLY_VERIFIED",
    notes:
      "Covers tuition fees for 3-year BA/BSc/BCom in Government/Aided colleges. " +
      "For professional courses in self-financing colleges, refer to tn-post-matric-bc-mbc.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SAMPLE UNVERIFIED SCHEME (Demonstrating safe non-hard-reject handling)
  // ═══════════════════════════════════════════════════════════════════════════

  "other-state-incentive": {
    id: "other-state-incentive",
    name: "State Merit Higher Education Incentive (Unverified Current-Year Rule)",
    authority: "State Higher Education Council",
    portal: "OTHER",
    scope: "State",
    jurisdiction: "OTHER_STATE",
    academicYear: "2026-27",
    category: "All",
    course: "Higher Education",
    level: "Undergraduate",
    institutionType: "State Recognized Institutions",
    incomeRule: "Subject to current-year state government notification",
    academicRule: "Subject to current-year cutoff notification",
    genderRule: "All",
    disabilityRule: "None",
    domicileRule: "State Resident",
    quotaRule: "Unconfirmed",
    firstGraduateRule: "None",
    requiredDocuments: [
      DOC("State Domicile Certificate", "Residency proof"),
      DOC("College Admission Letter", "Enrollment proof"),
      DOC("Income Certificate", "Income verification"),
    ],
    optionalDocuments: [],
    renewalDocuments: [],
    renewalConditions: "Subject to state notification.",
    applicationFields: ["name", "dob", "state", "income", "course"],
    sourceUrl: "",
    sourceTitle: "Draft State Incentive Notice (Pending Official Gazetting)",
    sourceAuthority: "State Higher Education Council",
    sourceVerifiedDate: "",
    ruleStatus: "UNVERIFIED",
    notes:
      "Current-year eligibility condition requires confirmation from official state portal. " +
      "SGP does not use unverified rules for hard rejection.",
  },
};

// ─── Query & Helper Functions ─────────────────────────────────────────────────

export function getNSPSchemeMetadata(schemeId) {
  return nspSchemeMetadata[schemeId] || null;
}

/**
 * Merge base scholarship record with NSP metadata.
 * Preserves base scholarship fields while injecting source-controlled metadata.
 */
export function mergeWithNSPMetadata(baseScheme) {
  const meta = getNSPSchemeMetadata(baseScheme?.id);
  if (!meta) return baseScheme;
  return {
    ...baseScheme,
    requiredDocuments: meta.requiredDocuments || baseScheme.documents || [],
    optionalDocuments: meta.optionalDocuments || [],
    renewalDocuments: meta.renewalDocuments || [],
    renewalConditions: meta.renewalConditions || "",
    ruleStatus: meta.ruleStatus,
    jurisdiction: meta.jurisdiction,
    portal: meta.portal,
    scope: meta.scope,
    academicYear: meta.academicYear,
    sourceUrl: meta.sourceUrl || baseScheme.officialPortal,
    sourceTitle: meta.sourceTitle || baseScheme.officialSource,
    sourceAuthority: meta.sourceAuthority || baseScheme.issuingAuthority,
    sourceVerifiedDate: meta.sourceVerifiedDate || meta.verifiedDate,
    applicationFields: meta.applicationFields,
    quotaNote: meta.quotaNote,
    firstGraduateNote: meta.firstGraduateNote,
    nspNotes: meta.notes,
  };
}

/**
 * Get scheme document checklist with verification status.
 */
export function getSchemeDocumentChecklist(scheme) {
  const meta = getNSPSchemeMetadata(scheme?.id);
  const required = meta?.requiredDocuments || scheme?.documents?.map(d => ({
    label: d, purpose: "Required for this scholarship", notes: "", required: true,
  })) || [];
  const optional = meta?.optionalDocuments || [];
  const renewal = meta?.renewalDocuments || [];
  return {
    required,
    optional,
    renewal,
    ruleStatus: meta?.ruleStatus || "UNVERIFIED",
    academicYear: meta?.academicYear || "2026-27",
    sourceUrl: meta?.sourceUrl || scheme?.officialPortal,
    sourceTitle: meta?.sourceTitle || scheme?.officialSource,
    jurisdiction: meta?.jurisdiction || "CENTRAL",
    portal: meta?.portal || "NSP",
    quotaNote: meta?.quotaNote || null,
    firstGraduateNote: meta?.firstGraduateNote || null,
  };
}

/**
 * List of scheme IDs by ruleStatus.
 */
export const verifiedSchemeIds = Object.keys(nspSchemeMetadata).filter(
  id => nspSchemeMetadata[id].ruleStatus === "VERIFIED"
);

export const partiallyVerifiedSchemeIds = Object.keys(nspSchemeMetadata).filter(
  id => nspSchemeMetadata[id].ruleStatus === "PARTIALLY_VERIFIED"
);

export const unverifiedSchemeIds = Object.keys(nspSchemeMetadata).filter(
  id => nspSchemeMetadata[id].ruleStatus === "UNVERIFIED"
);
