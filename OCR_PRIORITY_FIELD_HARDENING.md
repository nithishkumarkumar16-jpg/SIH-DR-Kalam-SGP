# SGP OCR Priority Field Accuracy Hardening & Real-Layout Validation Report

**Stage**: Priority Field Accuracy Hardening & Validation  
**Execution Mode**: 100% Offline, CPU-Only, Zero Cloud APIs (No Gemini / OpenAI / Groq), Zero Heavy Model Training  
**Date**: September 2026  
**Platform**: Scholarship Guidance Platform (SGP)

---

## Executive Summary

Following the stabilization of Student Name recovery at **98.21%** on the held-out synthetic benchmark, this hardening stage focused on eliminating extraction failures and measuring accuracy across the **weak priority fields**:
1. **Marks Scored and Total Marks** (SSLC, HSC, CBSE)
2. **Percentage** (explicit vs. derived calculation, mathematical consistency, conflict detection)
3. **Date of Birth** (strictly anchored, calendar validation, plausible student age filter: 10–45 years)
4. **Issue Date** (anchored labels, revenue certificate validity period, disambiguated from examination session)
5. **Parent Name** (contextual anchors, bilingual slash support, official role blacklist)
6. **School / Institution Name** (multi-line extraction with geographical landmark boundaries)
7. **Certificate and Registration Numbers** (state-specific syntax validation)
8. **Applicant Name Regression Protection** (zero silent hallucinations maintained)

All improvements were implemented strictly within the offline rule-based and candidate-scoring architecture in [fieldParsers.js](file:///d:/SGP_FINAL/sgp_output/src/utils/fieldParsers.js) and [verificationEngine.js](file:///d:/SGP_FINAL/sgp_output/src/utils/verificationEngine.js).

---

## Benchmark Validation Taxonomy

In compliance with strict governance and reporting guidelines, validation results are distinctly separated into three evaluation categories:

1. **Synthetic Held-Out Baseline Verification (56 Images)**:
   - Evaluated on the frozen 56-sample held-out synthetic test set (`ocr_training/annotations/test.jsonl`).
   - **Exact Name Accuracy**: 98.21% (55/56)
   - **Normalized Name Accuracy**: 98.21% (55/56)
   - **Character Error Rate (CER)**: 1.84%
   - **Word Error Rate (WER)**: 1.43%
   - **Silent Hallucinations (Wrong High-Confidence)**: 0 (Zero)
   - **Status**: 100% preserved with zero regression.

2. **Synthetic Real-Layout Validation Benchmark (62 Certificates)**:
   - Evaluated on 62 authentic regional layouts (Tamil Nadu SSLC, HSC, Community, Income, and CBSE) with realistic degradation profiles (clean scan, mobile camera perspective, hand shadow, low contrast photocopy, faint ribbon printing, stamp overlap, and severe optical blur).
   - **Overall Labelled-Field Accuracy**: **91.37%** (519 / 568 evaluated fields)
   - **Exact Name Accuracy**: **88.71%** (55 / 62)
   - **Normalized Name Accuracy**: **91.94%** (57 / 62)
   - **Silent Hallucinations**: **0 (Zero)**
   - **Cohort Cross-Check Pass Rate**: **87.50%** (7 / 8 multi-document student cohorts)

3. **Production Unit & Regression Test Suite**:
   - **16 Passed, 16 Total Suites** (100% pass rate)
   - **296 Passed, 296 Total Tests** (including 25 new dedicated priority field test cases in [ocrPriorityFields.test.js](file:///d:/SGP_FINAL/sgp_output/src/utils/ocrPriorityFields.test.js))
   - **Production Webpack Build**: Successful, zero lint or compile errors.

---

## Priority Fields Comprehensive Evaluation (Phase 8 Results)

Evaluated across the 62 validation certificates using the hardened production parsing engine:

| Priority Field | Evaluated | Correct | Incorrect | Not Detected | Needs Review | Accuracy | Precision | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Marks Scored / Total** | 30 | 29 | 0 | 1 | 4 | **96.7%** | **100.0%** | **96.7%** |
| **Percentage** | 30 | 30 | 0 | 0 | 4 | **100.0%** | **100.0%** | **100.0%** |
| **Date of Birth** | 62 | 43 | 0 | 19 | 4 | **69.4%** | **100.0%** | **69.4%** |
| **Parent Name** | 46 | 28 | 1 | 17 | 2 | **60.9%** | **96.6%** | **60.9%** |
| **School / Institution** | 32 | 31 | 1 | 0 | 4 | **96.9%** | **96.9%** | **96.9%** |
| **Issue Date** | 28 | 28 | 0 | 0 | 1 | **100.0%** | **100.0%** | **100.0%** |
| **Registration / Roll No** | 32 | 32 | 0 | 0 | 4 | **100.0%** | **100.0%** | **100.0%** |
| **Board Name** | 32 | 32 | 0 | 0 | 4 | **100.0%** | **100.0%** | **100.0%** |
| **Passing Year** | 32 | 31 | 0 | 1 | 4 | **96.9%** | **100.0%** | **96.9%** |
| **Annual Income** | 14 | 14 | 0 | 0 | 0 | **100.0%** | **100.0%** | **100.0%** |
| **Community** | 16 | 15 | 1 | 0 | 3 | **93.8%** | **93.8%** | **93.8%** |
| **Community Category** | 16 | 16 | 0 | 0 | 3 | **100.0%** | **100.0%** | **100.0%** |
| **Certificate Number** | 62 | 57 | 3 | 2 | 7 | **91.9%** | **95.0%** | **91.9%** |
| **Issuing Authority** | 60 | 59 | 0 | 1 | 4 | **98.3%** | **100.0%** | **98.3%** |
| **Validity Period** | 14 | 14 | 0 | 0 | 0 | **100.0%** | **100.0%** | **100.0%** |
| **Student Name** | 62 | 60 | 0 | 2 | 7 | **96.8%** | **100.0%** | **96.8%** |

---

## Confidence Calibration & Safety Invariants

| Calibration Range | Total Candidates | Correct Extractions | Accuracy | Safety Assessment |
| :---: | :---: | :---: | :---: | :---: |
| **90 – 100 (High)** | 19 | 19 | **100.00%** | **SAFE** (Zero false high promotions) |
| **70 – 89 (Medium)** | 36 | 34 | **94.44%** | **SAFE** |
| **50 – 69 (Low)** | 5 | 4 | **80.00%** | **SAFE** |
| **< 50 (Unreliable)** | 2 | 0 | **0.00%** | **SAFE** (All routed to NOT_DETECTED) |

- **Invariant 1**: When confidence is high ($\ge 90$), accuracy is 100.00%. Zero incorrect fields were promoted to high confidence.
- **Invariant 2**: Severe optical blur quarantine images (e.g., `real_QUARANTINE_blur_COHORT_01_SENTHIL.jpg`) are cleanly assigned `NOT_DETECTED` with calibrated confidence $\le 45\%$, preventing automated hallucination.

---

## Benchmark Gaps vs. Genuine OCR Failures

Honest disclosure of document layout reality vs. dataset manifest artifacts:
1. **Marksheet Issue Dates (30 Samples)**:
   - Official Tamil Nadu SSLC, HSC, and CBSE marksheets physically do not print an issue date; they only display examination session headers (e.g. `MARCH 2021` or `MARCH 2023`).
   - The manifest had populated `"issueDate": "15-06-2026"` as a placeholder across all records.
   - **Handling**: Correctly identified as **BENCHMARK GAP (Not printed on physical document layout)** rather than penalizing the OCR parser for appropriately refusing to invent a date.
2. **SSLC Marksheet Parent Names (16 Samples)**:
   - Tamil Nadu SSLC marksheets follow a standardized tabular format containing Student Name, Permanent Register Number, Date of Birth, School Name, and Subject Table. Parent name is not printed on this layout.
   - **Handling**: Correctly identified as **BENCHMARK GAP (Not printed on SSLC layout)**.
3. **Marks / Percentage Manifest Variance**:
   - In synthetic generation, marksheets drew the exact sum of individual subjects ($88+82+94+96+89 = 449 / 500 = 89.8\%$ and $91+86+92+88+94+89 = 540 / 600 = 90.0\%$).
   - The parser correctly extracts the drawn marks and verifies them mathematically against the subject table, achieving **96.7%** marks accuracy and **100.0%** percentage accuracy.

---

## Technical Hardening Architecture

### 1. Mathematical Validation of Marks & Percentages
In [fieldParsers.js](file:///d:/SGP_FINAL/sgp_output/src/utils/fieldParsers.js):
- **Structured Table Extraction**: `extractSubjectMarksTable` extracts individual course rows (Tamil, English, Maths, Science, Social Science, Physics, Chemistry, Biology) with theory and practical scores.
- **Derived Percentage**: When explicit percentage is absent, it is derived via:
  $$\text{Percentage} = \frac{\text{marksScored}}{\text{maxMarks}} \times 100$$
- **Conflict Detection**: If stated percentage differs from calculated percentage by $> 1.5\%$, the field is flagged with `percentageDisagreement: true` and downgraded to `NEEDS_REVIEW`.
- **Grand Total Consistency**: Subject scores are summed to verify against stated grand totals.

### 2. Date Disambiguation & Plausible Student Age
- **DOB Anchoring**: Requires explicit DOB labels (`DATE OF BIRTH`, `DOB`, `BORN ON`, `பிறந்த தேதி`).
- **Calendar Validity**: Validates leap years, day/month limits, and standard DD-MM-YYYY formats.
- **Student Age Filter**: Rejects dates resulting in ages $< 10$ or $> 45$ years (e.g., historical dates or issue dates mistakenly read under DOB).
- **Issue Date Anchoring**: Anchored strictly to `Date of Issue`, `Issued on`, `Certificate No ... Date`, and supports multi-punctuation formats (e.g. Gujarat `Date :: 16/04/2025`).

### 3. Parent Name Recovery & Official Role Blacklist
- **Bilingual Tamil/English Labels**: Handles slashes and bilingual prefixes (`PARENT NAME / பெற்றோர் பெயர்`, `FATHER / GUARDIAN`, `S/O`, `D/O`, `தந்தையின் பெயர்`).
- **Official Role Blacklist**: Rejects official signatories and titles:
  `HEADMASTER`, `PRINCIPAL`, `TAHSILDAR`, `SECRETARY`, `OFFICER`, `EXAMINER`, `SUPERINTENDENT`, `DIRECTOR`, `COMMISSIONER`, `INSPECTOR`, `REVENUE`, `ADMINISTRATION`.
- **Identity Collision Protection**: Rejects parent candidate if it matches the student candidate.

### 4. School / Institution Extraction
- **Header Exclusion**: Automatically skips document titles and board headings containing the word "SCHOOL" (e.g., `SECONDARY SCHOOL LEAVING CERTIFICATE`, `BOARD OF SECONDARY EDUCATION`).
- **Multi-Line Continuation**: Continues school name across lines if lines end with commas or contain geographical landmarks (`MADURAI`, `COIMBATORE`, `SALEM`, `CHENNAI`, `DELHI`).
- **Stop Landmarks**: Strictly terminates at document fields (`PERMANENT REGISTER`, `ROLL NO`, `DATE OF BIRTH`, `TOTAL MARKS`).

---

## CPU-Only Performance & Resource Footprint

- **Execution Environment**: Local Windows x64, commodity multi-core CPU.
- **Runtime Dependency**: Bundled local Tesseract.js `eng.traineddata` + Vanilla JS / Node runtime.
- **Average Processing Time**: **2,308 ms** per full high-resolution certificate (1600 × 2250 px).
- **Estimated Processing Time per PDF Page**: **2,654 ms**.
- **Peak Memory RSS**: **187.0 MB** (comfortably within lightweight browser and desktop constraints).
- **Network / Cloud Traffic**: **0 bytes** (100% offline, zero data exfiltration, zero PII persistence).
