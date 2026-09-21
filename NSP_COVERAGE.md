# NSP Coverage & Knowledge Base Audit Report (SGP)

## 1. Executive Summary & Core Positioning

**Core Product Positioning:**
> **"SGP is a privacy-focused Pre-Submission Scholarship Readiness Platform that helps students identify and correct preventable application issues before submitting through official scholarship portals."**

**Secondary Statement:**
> **"SGP does not replace NSP, UMIS or government verification systems. It prepares the student's information and documents for submission to those official systems."**

> [!IMPORTANT]
> **Strict Boundary Notice:** SGP is a pre-submission readiness checker that detects preventable application and document errors. It does not independently authenticate government records, predict government decisions, or guarantee scholarship approval. The official portal remains the source of truth for authentication, application status, verification, sanction, and payment.

---

## 2. Capability Matrix — SGP Today vs Official Integration

| Capability | SGP Today | Official Integration Required? | Safe SGP Alternative |
|---|---|---|---|
| **NSP live status** | No | Yes | Manual entry + official portal handoff |
| **NSP submission** | No | Yes | Official portal handoff |
| **UIDAI authentication** | No | Yes | Local identity consistency |
| **NPCI live DBT status** | No | Yes | DBT readiness guidance (myaadhaar / branch) |
| **Government certificate lookup** | No | Yes | Local OCR + cross-document consistency checks |
| **Certificate authenticity** | No | Yes | Structural/document completeness review |
| **DigiLocker verification** | No | Yes / authorized access | User-directed official verification |
| **PFMS payment status** | No | Yes | Official portal guidance |
| **Scholarship approval prediction** | No | Not appropriate | Pre-Submission Risk & Readiness Analysis |
| **Persistent reminders** | Partially planned | Backend required | Local renewal planning & schedule framework |
| **OCR** | Yes | No | Browser-local Tesseract.js |
| **Cross-document comparison** | Yes | No | Local deterministic consistency engine |
| **Eligibility guidance** | Yes | No | Rule-based potential matching from official rules |
| **Document completeness** | Yes | No | Checklist engine |
| **DBT readiness guidance** | Yes | No | Official confirmation required advisory |
| **Official submission** | No | Yes | Portal handoff (scholarships.gov.in / UMIS) |

---

## 3. Scheme Knowledge Base Breakdown

Total Schemes in `src/knowledge/nspSchemes.js`: **11 schemes**
- **Verified (`VERIFIED`)**: **8 schemes** (Confirmed from current authoritative government sources)
- **Partially Verified (`PARTIALLY_VERIFIED`)**: **2 schemes** (Core rules verified; select current-year details pending official gazette update)
- **Unverified (`UNVERIFIED`)**: **1 scheme** (Draft state notice; safe fallback that does not hard-reject candidates)

### Detailed Scheme Inventory

| # | Scheme ID | Scheme Name | Jurisdiction | Portal | Academic Year | Rule Status | Official Source / Authority |
|---|-----------|-------------|--------------|--------|---------------|-------------|-----------------------------|
| 1 | `nsp-central-sector` | Central Sector Scheme of Scholarship for College and University Students | `CENTRAL` | `NSP` | 2026-27 | **VERIFIED** | Department of Higher Education, Ministry of Education, GoI ([scholarships.gov.in](https://scholarships.gov.in)) |
| 2 | `nsp-pm-yasasvi` | PM Young Achievers Scholarship Award Scheme (PM-YASASVI) | `CENTRAL` | `NSP` | 2026-27 | **VERIFIED** | Ministry of Social Justice & Empowerment, GoI ([scholarships.gov.in](https://scholarships.gov.in)) |
| 3 | `nsp-minority-postmatric` | Post Matric Scholarship Scheme for Minorities | `CENTRAL` | `NSP` | 2026-27 | **VERIFIED** | Ministry of Minority Affairs, GoI ([scholarships.gov.in](https://scholarships.gov.in)) |
| 4 | `nsp-aicte-pragati` | AICTE Pragati Scholarship for Girl Students | `CENTRAL` | `NSP` | 2026-27 | **VERIFIED** | All India Council for Technical Education ([aicte-india.org](https://www.aicte-india.org)) |
| 5 | `nsp-aicte-saksham` | AICTE Saksham Scholarship for Specially-Abled Students | `CENTRAL` | `NSP` | 2026-27 | **VERIFIED** | All India Council for Technical Education ([aicte-india.org](https://www.aicte-india.org)) |
| 6 | `tn-post-matric-bc-mbc` | Tamil Nadu Post-Matric Scholarship for BC/MBC/DNC Students | `TAMIL_NADU` | `UMIS` | 2026-27 | **VERIFIED** | BC, MBC & Minorities Welfare Dept, Govt of Tamil Nadu (G.O. Ms. No. 92; [bcmbcmw.tn.gov.in](https://bcmbcmw.tn.gov.in)) |
| 7 | `tn-post-matric-sc-st` | Tamil Nadu Post-Matric Scholarship for SC and ST Students | `TAMIL_NADU` | `UMIS` | 2026-27 | **VERIFIED** | Adi Dravidar & Tribal Welfare Dept, Govt of Tamil Nadu (G.O. Ms. No. 92; [tnscholarships.gov.in](https://tnscholarships.gov.in)) |
| 8 | `tn-first-graduate` | Tamil Nadu First Graduate Tuition Fee Concession | `TAMIL_NADU` | `OTHER` | 2026-27 | **VERIFIED** | Directorate of Technical Education / Higher Education Dept, TN (G.O. Ms. No. 85; [tnscholarships.gov.in](https://tnscholarships.gov.in)) |
| 9 | `tn-bc-mbc-free-education` | Tamil Nadu BC/MBC Free Education Scheme (3-Yr UG Degree & Polytechnic) | `TAMIL_NADU` | `UMIS` | 2026-27 | **PARTIALLY_VERIFIED** | Directorate of BC Welfare, Tamil Nadu (Citizen Charter & [bcw.tn.gov.in/sub_page/8](https://www.bcw.tn.gov.in/sub_page/8)) |
| 10 | `nsp-ishan-uday` | Ishan Uday Special Scholarship for North Eastern Region | `CENTRAL` | `NSP` | 2026-27 | **PARTIALLY_VERIFIED** | University Grants Commission (UGC) Guidelines ([ugc.gov.in](https://www.ugc.gov.in)) |
| 11 | `other-state-incentive` | State Merit Higher Education Incentive (Sample) | `OTHER_STATE` | `OTHER` | 2026-27 | **UNVERIFIED** | State Higher Education Council Draft (Demonstrates non-hard-rejection handling) |

---

## 4. Supported Document Types

The engine supports checking and extracting consistency signals across **10 standard scholarship certificate types**:

1. **Aadhaar Card** (Identity consistency, name normalisation, DOB, gender)
2. **Class 10 Marksheet** (DOB statutory reference, secondary school name record)
3. **Class 12 / Higher Secondary Marksheet** (Qualifying percentage, board, registration number)
4. **Income Certificate** (Parent/guardian or student income, certificate number, issue date, currency check ≤ 1 year)
5. **Community / Caste Certificate** (OBC, SC, ST, DNT, BC, MBC categories, issuing authority, issue date)
6. **Bank Account Passbook / Statement** (Account holder name, IFSC format validation, DBT mapping guidance)
7. **College Bonafide / Enrollment Certificate** (College name, AISHE code, regular enrollment status)
8. **College Allotment Order** (Single-window government counseling allotment proof vs Management quota)
9. **First Graduate Certificate & Joint Declaration** (Family non-graduation undertaking under G.O. Ms. No. 85)
10. **Disability Certificate** (District Medical Board permanent disability percentage verification ≥ 40%)

---

## 5. Supported Eligibility & Profile Dimensions (21 Dimensions)

The SGP engine validates the following **21 Eligibility/Profile Dimensions**:

1. `studentName` (Always the scholarship applicant; never replaced by parent)
2. `parentName` (Parent/guardian income provider named on certificate)
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
20. `disability` (`true` | `false` — indicates specially-abled status)
21. `disabilityPercentage` (Certified disability percentage, e.g. ≥ 40%)

---

## 6. Pre-Submission Risk Checks (24 Audited Checks)

A risk check is a pre-submission consistency check — **NOT an automatic NSP rejection rule**. All 24 checks are classified into one of three distinct categories:

### Check Classification Summary

- **Universal Consistency Checks (`UNIVERSAL_CONSISTENCY_CHECK`)**: 8 checks (General consistency across student documents regardless of scheme)
- **Scheme-Specific Checks (`SCHEME_SPECIFIC_CHECK`)**: 12 checks (Evaluated strictly against the selected scheme's published rules, including 2026 NSP OTR & Face-Auth compliance)
- **Advisory Checks (`ADVISORY_CHECK`)**: 4 checks (Quality, scan clarity, and variance anomaly review flags)

### Detailed 24-Check Classification Matrix

| Check ID | Risk / Rule Name | Dimension | Severity | Classification | Description / Handling |
|---|---|---|---|---|---|
| 1 | `IDENTITY_NAME_MISMATCH` | Student name mismatch across documents | Identity | `UNIVERSAL_CONSISTENCY_CHECK` | High attention; flags name variations between Aadhaar, 10th, 12th, and bonafide |
| 2 | `IDENTITY_DOB_MISMATCH` | Date of Birth mismatch across documents | Identity | `UNIVERSAL_CONSISTENCY_CHECK` | High attention; cross-checks DOB between 10th marksheet and Aadhaar |
| 3 | `IDENTITY_INCOME_NAME_MISMATCH` | Student mode income cert name mismatch | Identity | `UNIVERSAL_CONSISTENCY_CHECK` | Student mode only; never checked against student name in Parent Income mode |
| 4 | `APP_INCOME_MISMATCH` | Income value difference requiring review | Application | `ADVISORY_CHECK` | Anomaly review check (>15% variance); not a universal NSP rejection rule |
| 5 | `CERT_INCOME_EXPIRED` | Income certificate issue date or validity review | Certificates | `SCHEME_SPECIFIC_CHECK` | Checks explicit expiry date or scheme academic year requirements |
| 6 | `WRONG_ACADEMIC_YEAR` | Academic year cycle mismatch | Certificates | `SCHEME_SPECIFIC_CHECK` | Verifies application cycle against scheme's current active cycle |
| 7 | `DOCS_MISSING_REQUIRED` | Missing required scheme document | Documents | `SCHEME_SPECIFIC_CHECK` | Informs student of missing documents required for the specific scholarship |
| 8 | `DOCS_WRONG_TYPE` | Wrong document type in slot | Documents | `UNIVERSAL_CONSISTENCY_CHECK` | High attention; detects mismatch between slot label and uploaded document |
| 9 | `DOCS_LOW_QUALITY` | Low document quality detected | Documents | `ADVISORY_CHECK` | Internal quality heuristic (blur, low contrast); 300 DPI recommended, not a universal rule |
| 10 | `DOCS_MISSING_CERT_NUMBER` | Certificate number unreadable or absent | Documents | `ADVISORY_CHECK` | Low attention advisory to check certificate readability |
| 11 | `DOCS_MISSING_AUTHORITY` | Issuing authority stamp/signature absent | Documents | `ADVISORY_CHECK` | Low attention advisory to verify revenue officer / tahsildar endorsement |
| 12 | `APP_INSTITUTION_MISMATCH` | College name differs from document | Application | `UNIVERSAL_CONSISTENCY_CHECK` | Verifies application college against bonafide student certificate |
| 13 | `APP_COURSE_MISMATCH` | Course name differs from document | Application | `UNIVERSAL_CONSISTENCY_CHECK` | Verifies course name against admission allotment or marksheet |
| 14 | `APP_COURSE_LEVEL_MISMATCH` | Course level mismatch with scheme rule | Application | `SCHEME_SPECIFIC_CHECK` | Verifies eligibility for Diploma vs UG vs PG specific schemes |
| 15 | `BANK_HOLDER_MISMATCH` | Bank account holder info requires review | Bank/DBT | `SCHEME_SPECIFIC_CHECK` | Scheme-specific; advisory for DBT readiness (central schemes require student's own account) |
| 16 | `BANK_IFSC_INVALID` | IFSC does not match standard 11-char format | Bank/DBT | `UNIVERSAL_CONSISTENCY_CHECK` | Standard banking format validation (4 letters, 0, 6 alphanumeric) |
| 17 | `BANK_AADHAAR_NOT_SEEDED` | Bank account Aadhaar / DBT mapping | Bank/DBT | `SCHEME_SPECIFIC_CHECK` | Guidance on verifying Aadhaar seeding at bank branch or myaadhaar.uidai.gov.in |
| 18 | `APP_DOMICILE_MISMATCH` | State domicile does not match scheme restriction | Application | `SCHEME_SPECIFIC_CHECK` | Only applies to state-restricted schemes; never excludes All-India schemes |
| 19 | `APP_DISABILITY_CERT_MISSING` | Disability certificate / percentage check | Application | `SCHEME_SPECIFIC_CHECK` | Only applies to schemes with requiresDisability: true; verifies minimumDisabilityPercentage |
| 20 | `ELIG_QUOTA_UNKNOWN` | Admission quota check | Eligibility | `SCHEME_SPECIFIC_CHECK` | Only applies when scheme requires requiresGovtQuota: true; management quota cannot reject open schemes |
| 21 | `ELIG_FIRST_GRADUATE_UNKNOWN` | First Graduate status confirmation | Eligibility | `SCHEME_SPECIFIC_CHECK` | Only applies when scheme requires requiresFirstGraduate: true; null preserved as Needs More Info |
| 22 | `RENEWAL_DOC_MISSING` | Previous year marksheet missing for renewal | Certificates | `SCHEME_SPECIFIC_CHECK` | Only applies when renewal application is submitted |
| 23 | `APP_CATEGORY_MISMATCH` | Category differs from community certificate | Application | `UNIVERSAL_CONSISTENCY_CHECK` | Cross-checks profile category against community certificate |
| 24 | `NSP_2026_OTR_TRACKER` | Mandatory 2026 NSP OTR & Face-RD Compliance | Application | `SCHEME_SPECIFIC_CHECK` | Checks OTR number generation & Face-RD device readiness. Never mocks/simulates biometrics |

---

## 7. The Unknown State Rule (100-Point Readiness Engine)

In the 100-Point Readiness Model:
- **Zero Penalty for Unknowns:** If a data block is unverified or missing (e.g., student hasn't checked NPCI mapping or First Graduate status is left as null), the system **holds the score steady** with 0 point deduction.
- **Intermediate Status Tier:** It routes the application to **"NEEDS INFORMATION / OFFICIAL CONFIRMATION"**.
- **Contradiction-Only Deductions:** Points can **ONLY** be deducted if there is an explicit, extracted contradiction (e.g. an expired certificate date, a direct name character mismatch, or an IFSC syntax violation).

---

## 8. Four-Year Renewal Planning & Reminder Framework

- **Current Status:** `Planning / local guidance unless persistent backend is enabled.`
- **Design:** Provides annual renewal milestones, checklist preparation, and scheme deadline calendars locally in the browser.
- **Future Production Architecture:**
  `Student Consent → Minimal Structured Reminder Record → Secure Database → Scheduler Worker → Email/SMS/Push Provider → Delivery Status → Renewal Tracking`
- **Privacy Guarantee:** Certificate images and sensitive biometric records are **never** stored for reminder functionality.

---

## 9. Government Integration Roadmap

```mermaid
flowchart TD
    L0["LEVEL 0 — CURRENT SGP (Active)
    • Browser-local Tesseract.js OCR
    • Local Document Parsing & Normalization
    • Cross-Document Consistency Engine
    • Rule-Based Eligibility Guidance
    • 100-Pt Pre-Submission Readiness Scoring
    • DBT Readiness Guidance (Advisory)
    • Official Portal Handoff Links
    • Zero Server Storage / Privacy-First"]
    
    L1["LEVEL 1 — AUTHORIZED DATA SOURCES (Future)
    • Official Scheme Rules API Data Feeds
    • Gazette Policy Updates
    • Authorized State Certificate Verification
    • Authorized DigiLocker Integration"]
    
    L2["LEVEL 2 — IDENTITY / PAYMENT INTEGRATION (Future)
    • Authorized UIDAI Authentication Services
    • NPCI Live DBT Seeding Status API
    • PFMS Disbursement Status API"]
    
    L3["LEVEL 3 — OFFICIAL WORKFLOW INTEGRATION (Future)
    • Authorized NSP OTR Direct Integration
    • Bi-directional Defect/Query Status
    • Direct Submission Handoff (OAuth)"]

    L0 -->|Requires Authorized Government Access| L1
    L1 -->|Requires Statutory Approvals| L2
    L2 -->|Requires Ministry Partnership| L3
```

---

## 10. Explicit Boundary Disclaimers

1. **Do NOT claim SGP predicts NSP rejection**: SGP provides pre-submission risk checks and anomaly detection, not predictive rejection decisions.
2. **Do NOT claim SGP verifies government documents**: SGP inspects document clarity, consistency, and completeness locally in the browser. It does not connect to live government databases.
3. **Do NOT claim SGP guarantees NSP approval**: Final sanction and fund disbursement are strictly subject to official portal verification and quota limits.
4. **Do NOT claim all NSP scholarships are verified**: Only schemes audited against authoritative official gazettes are marked `VERIFIED`; others are marked `PARTIALLY_VERIFIED` or `UNVERIFIED`.
5. **No Live NPCI / UIDAI Connectivity**: SGP cannot verify real-time Aadhaar-bank seeding on the NPCI mapper. It provides guidance on how students can check status on `myaadhaar.uidai.gov.in`.
6. **State Rule Boundaries**: Tamil Nadu rules (G.O. Ms. No. 92 and G.O. Ms. No. 85) are strictly isolated and never leak into central or other state schemes.
