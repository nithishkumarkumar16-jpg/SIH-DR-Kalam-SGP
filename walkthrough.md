# SGP Final Hardening Pass & Knowledge Audit — Final Report

## 1. Executive Summary & Verification Result

- **Build Result**: `Compiled successfully.` (0 ESLint warnings, 0 compiler errors)
- **Target Regression Test Suites**: **95 passed, 95 total** across `nspReadinessEngine.test.js`, `sgpThreeFeatures.test.js`, and `eligibilityEngine.test.js`.
- **Full Test Suite**: **399 passed, 400 total** (the single failing test in parallel run is a pre-existing React Router v6 concurrency issue in `documentUploadStep4.test.js` which passes 16/16 in isolation).
- **Dashboard Grid Correction**: Standalone duplicate 7th "Prepare for NSP" card successfully removed from `Dashboard.js`. The 6-card (3-column × 2-row) layout is restored intact. The `/nsp` route and footer navigation remain fully active.

---

## 2. Hardened Knowledge Base Inventory (`nspSchemes.js`)

1. **Exact Number of Schemes**: **11 schemes**
2. **Number VERIFIED**: **8 schemes**
3. **Number PARTIALLY_VERIFIED**: **2 schemes**
4. **Number UNVERIFIED**: **1 scheme**

### Exact Official Sources Used:
- **Central Sector Scheme (CSSS)**: Department of Higher Education, Ministry of Education, GoI ([scholarships.gov.in](https://scholarships.gov.in))
- **PM-YASASVI**: Ministry of Social Justice & Empowerment, GoI (Guidelines No. 11014/01/2021; [scholarships.gov.in](https://scholarships.gov.in))
- **MoMA Post-Matric**: Ministry of Minority Affairs, GoI (Guidelines 2025-26; [scholarships.gov.in](https://scholarships.gov.in))
- **AICTE Pragati & Saksham**: All India Council for Technical Education (F.No. 1-104/AICTE/Pragati & Saksham; [aicte-india.org](https://www.aicte-india.org))
- **Ishan Uday Special Scholarship**: University Grants Commission (UGC Guidelines; [ugc.gov.in](https://www.ugc.gov.in))
- **TN Post-Matric BC/MBC**: BC, MBC & Minorities Welfare Department, Govt of Tamil Nadu (G.O. Ms. No. 92; [bcmbcmw.tn.gov.in](https://bcmbcmw.tn.gov.in))
- **TN Post-Matric SC/ST**: Adi Dravidar & Tribal Welfare Department, Govt of Tamil Nadu (G.O. (Ms) No. 92; [tnscholarships.gov.in](https://tnscholarships.gov.in))
- **TN First Graduate Concession**: Directorate of Technical Education / Higher Education Department, TN (G.O. Ms. No. 85; [tnscholarships.gov.in](https://tnscholarships.gov.in))
- **TN BC/MBC Free Education**: Directorate of Backward Classes Welfare, TN (Citizen Charter & [bcw.tn.gov.in/sub_page/8](https://www.bcw.tn.gov.in/sub_page/8))
- **State Merit Higher Education Incentive**: State Higher Education Council draft (Demonstrates non-hard-rejection handling)

---

## 3. Supported Document Types & Profile Fields

### 10 Supported Document Types:
1. Aadhaar Card
2. Class 10 Marksheet
3. Class 12 / Higher Secondary Marksheet
4. Parental / Student Income Certificate
5. Community / Caste Certificate (BC, MBC, DNC, SC, ST, OBC)
6. Bank Passbook / Account Statement (with IFSC and Aadhaar-DBT check)
7. College Bonafide Student Certificate (with AISHE code verification)
8. College Admission Allotment Order (Single-window Government Quota vs Management quota)
9. First Graduate Certificate & Joint Declaration (under G.O. Ms. No. 85)
10. Permanent Disability Certificate (District Medical Board ≥ 40%)

### 21 Eligibility/Profile Dimensions:
1. `studentName` (Always the scholarship applicant; never parent)
2. `parentName` (Parent/guardian income provider)
3. `incomeApplicant` (`"student"` | `"parent"`)
4. `dob` (Date of Birth standardised to DD-MM-YYYY)
5. `gender` (`"Male"`, `"Female"`, `"Transgender"`)
6. `category` (`"General"`, `"OBC"`, `"SC"`, `"ST"`, `"Minority"`)
7. `community` (Specific sub-caste / community name)
8. `income` (Annual family income in ₹)
9. `state` (State of permanent residence)
10. `domicile` (Domicile certificate status / residence state)
11. `district` (Home district)
12. `course` (Degree, Diploma, or Professional course of study)
13. `level` (`"Undergraduate"`, `"Postgraduate"`, `"Diploma"`, `"Doctoral"`)
14. `institutionType` (`"Government"`, `"Aided"`, `"Self-Financing"`, `"AICTE-Approved"`)
15. `institution` (College or university name and AISHE code)
16. `academicYear` (Scholarship cycle e.g. 2026-27)
17. `percentage` / marks (Previous qualifying examination percentage)
18. `quotaType` (`"government"` | `"management"` | `"unknown"`)
19. `firstGraduate` (`true` | `false` | `null` — null preserved as unanswered)
20. `disability` (`true` | `false` — specially-abled status)
21. `disabilityPercentage` (Certified disability percentage, e.g. ≥ 40%)

---

## 4. Pre-Submission Checks (23 Audited Checks)

Classified strictly into 3 categories:
- **Universal Consistency Checks (8)**:
  1. Student name mismatch across documents (`IDENTITY_NAME_MISMATCH`)
  2. DOB mismatch between profile and documents (`IDENTITY_DOB_MISMATCH`)
  3. Income cert name mismatch in Student mode (`IDENTITY_INCOME_NAME_MISMATCH`)
  4. Category mismatch between profile and community cert (`APP_CATEGORY_MISMATCH`)
  5. Wrong document type uploaded to slot (`DOCS_WRONG_TYPE`)
  6. Institution mismatch between application and bonafide (`APP_INSTITUTION_MISMATCH`)
  7. Course mismatch between application and marksheet (`APP_COURSE_MISMATCH`)
  8. Invalid IFSC format (`BANK_IFSC_INVALID`)
- **Scheme-Specific Checks (11)**:
  9. Missing required scheme documents (`DOCS_MISSING_REQUIRED`)
  10. Income certificate validity review (`CERT_INCOME_EXPIRED`)
  11. Academic year cycle mismatch (`WRONG_ACADEMIC_YEAR`)
  12. Course-level mismatch (`APP_COURSE_LEVEL_MISMATCH`)
  13. Bank account holder info requires review (`BANK_HOLDER_MISMATCH`)
  14. Aadhaar-bank DBT seeding guidance (`BANK_AADHAAR_NOT_SEEDED`)
  15. State domicile mismatch for state-restricted schemes (`APP_DOMICILE_MISMATCH`)
  16. Disability certificate / percentage check (`APP_DISABILITY_CERT_MISSING`)
  17. Admission quota check for govt-quota schemes (`ELIG_QUOTA_UNKNOWN`)
  18. First Graduate status check for FG schemes (`ELIG_FIRST_GRADUATE_UNKNOWN`)
  19. Renewal documentation check (`RENEWAL_DOC_MISSING`)
- **Advisory Checks (4)**:
  20. Income value difference requiring review (`APP_INCOME_MISMATCH` — anomaly review, not rejection rule)
  21. Low document quality detected (`DOCS_LOW_QUALITY` — 300 DPI internal heuristic)
  22. Missing certificate number (`DOCS_MISSING_CERT_NUMBER`)
  23. Missing issuing revenue authority (`DOCS_MISSING_AUTHORITY`)

---

## 5. Transparent Readiness Score Formula (100 Points)

| Dimension | Max Points | Evaluation Scope |
|-----------|------------|------------------|
| **Student Identity** | 20 | Name & DOB consistency across all student documents |
| **Document Completeness** | 20 | All scheme-required documents present, readable, valid type |
| **Eligibility** | 20 | Criteria match from official rules (unverified rules never hard-fail) |
| **Application Consistency** | 20 | Field-by-field match between application and document evidence |
| **Bank / DBT Readiness** | 10 | Account in student's name, valid IFSC, DBT guidance |
| **Certificate Validity** | 10 | Income cert currency ≤ 1 yr, community cert recency, academic year |
| **Total** | **100** | **Exact reasons and lost points shown for every deduction** |

### Four Final Statuses:
- **READY TO SUBMIT** (90–100 pts, no required info missing)
- **REVIEW BEFORE SUBMIT** (75–89 pts, or score ≥ 90 with unknown required fields)
- **CORRECTIONS NEEDED** (50–74 pts)
- **NOT READY** (0–49 pts)

---

## 6. Architecture Invariants

- **Student / Parent Identity Model**:
  - `applicantName === studentName` (ALWAYS the student, never the parent).
  - `incomeProviderName = parentName` when `incomeApplicant === "parent"`.
  - In parent income mode, parent's name on income cert is excluded from student name comparison (no false mismatch), while student documents (10th ↔ 12th ↔ Aadhaar ↔ Bank) are fully cross-verified.
- **Application vs Document Comparison Matrix**:
  - Evaluates each field: `MATCH`, `MINOR_DIFFERENCE`, `MISMATCH`, `MISSING`.
  - Action recommended: *"Check the original documents before submitting the NSP application."* No automated altering of user application data.
- **Tamil Nadu vs Central Rule Isolation**:
  - Central NSP schemes are tagged `jurisdiction: "CENTRAL"`.
  - Tamil Nadu-specific rules (e.g. Government Quota under G.O. Ms. No. 92, First Graduate under G.O. Ms. No. 85) are strictly restricted to `TAMIL_NADU` schemes and never apply to Central NSP schemes.
- **Safe Fallback for Unverified Schemes**:
  - Schemes with `ruleStatus: "UNVERIFIED"` return status `NEEDS MORE INFORMATION` with notice: *"Current-year eligibility condition requires confirmation."* No automatic hard rejection.

---

## 7. Product Claims Compliance

> [!NOTE]
> **Permitted Claim:** "SGP helps students prepare for NSP by checking scholarship eligibility, document completeness, cross-document consistency, and common pre-submission issues before they submit on the official portal."
>
> **Prohibited Claims (Strictly Avoided):**
> - ✗ SGP verifies NSP documents officially.
> - ✗ SGP predicts NSP rejection.
> - ✗ SGP guarantees scholarship approval.
> - ✗ All NSP scholarships verified.
