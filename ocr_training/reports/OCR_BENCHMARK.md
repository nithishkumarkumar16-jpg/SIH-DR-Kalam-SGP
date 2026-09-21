# Offline OCR Benchmark Summary

Evaluation conducted on the 56 held-out synthetic test certificates (`ocr_training/datasets/test.jsonl`) using the repository's bundled English Tesseract data (`public/tessdata/eng.traineddata`) and local preprocessing.

> **CRITICAL CONSTRAINTS MAINTAINED**:
> - **NO MODEL TRAINING PERFORMED**
> - **NO CLOUD OCR / NO THIRD-PARTY APIS (OpenAI, Gemini, Groq)**
> - **100% OFFLINE AND LOCAL EXECUTION**
> - **OPENCV NOT REQUIRED** (pure Pillow/NumPy preprocessing + HTML5 Canvas in-browser)
> - **SAFETY PRESERVED**: `UNCERTAIN NAME -> REVIEW REQUIRED`, zero silent guessing or hallucination

---

## 1. Overall Metrics Comparison

| Metric | Baseline | Improved Offline Pipeline | Difference | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Exact Name Accuracy** | 89.29% (50/56) | **98.21% (55/56)** | **+8.92%** | 4 of 5 historical failures recovered cleanly |
| **Normalized Name Accuracy** | 91.07% (51/56) | **98.21% (55/56)** | **+7.14%** | Reached 100% on 3 of 4 document categories |
| **Character Error Rate (CER)** | 9.39% | **1.84%** | **-7.55%** | Measured via Levenshtein edit distance on student names |
| **Word Error Rate (WER)** | 10.00% | **1.43%** | **-8.57%** | Massive drop in token dropouts |
| **Overall Labelled-Field Accuracy** | 88.96% | **90.58%** | **+1.62%** | Comprehensive cross-field accuracy |
| **Silent Name Hallucinations** | 0 | **0** | **0** | **Zero wrong names promoted** |
| **Safety Invariant Maintained** | YES | **YES** | — | Blurred sample safely remains `NOT_DETECTED` |

---

## 2. Accuracy Breakdown by Document Type

| Document Type | Test Images | Baseline Exact | Baseline Norm | Improved Exact | Improved Norm | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **10th Marksheet** (`10th_marksheet`) | 14 | 13/14 (92.86%) | 13/14 (92.86%) | **14/14 (100.0%)** | **14/14 (100.0%)** | **100% Recovered** |
| **12th Marksheet** (`12th_marksheet`) | 14 | 13/14 (92.86%) | 13/14 (92.86%) | **14/14 (100.0%)** | **14/14 (100.0%)** | **100% Recovered** |
| **Income Certificate** (`income_certificate`) | 14 | 12/14 (85.71%) | 13/14 (92.86%) | **14/14 (100.0%)** | **14/14 (100.0%)** | **100% Recovered** |
| **Community Certificate** (`community_certificate`) | 14 | 12/14 (85.71%) | 12/14 (85.71%) | **13/14 (92.86%)** | **13/14 (92.86%)** | **Preserved Safety** |
| **Total Held-out Test Set** | **56** | **50/56 (89.29%)** | **51/56 (91.07%)** | **55/56 (98.21%)** | **55/56 (98.21%)** | **+8.92% Exact / +7.14% Norm** |

---

## 3. Resolution of the Five Historical Failures

| Failure ID | Document Type | Ground Truth | Degradation | Baseline Result | Improved Result | Resolution Technique |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `FAIL_NAME_001` | 10th Marksheet | `Murugesan` | Uneven Lighting | `NOT_DETECTED` (58%) | **`Murugesan` (94%, HIGH)** | Local background division (illumination norm) |
| `FAIL_NAME_002` | 12th Marksheet | `Divya` | Uneven Lighting / Detached column | `NOT_DETECTED` (61%) | **`Divya` (90%, HIGH)** | Adaptive illumination normalization + TitleCase unblocking |
| `FAIL_NAME_003` | Income Certificate | `Suresh Kumar` | Shaded Background | `NOT_DETECTED` (62%) | **`Suresh Kumar` (92%, HIGH)** | Illumination normalization |
| `FAIL_NAME_004` | Community Certificate | `Keerthana` | Severe Gaussian Blur | `NOT_DETECTED` (43%) | **`NOT_DETECTED` (Safe review)** | Multi-pass disagreement guard. No hallucination. |
| `FAIL_NAME_005` | Community Certificate | `Keerthana` | Uneven Background | `NOT_DETECTED` (41%) | **`Keerthana` (94%, HIGH)** | Illumination normalization |

---

## 4. Reproducing Locally

```powershell
# Run the offline benchmark on the 56 held-out test images
node ocr_training/scripts/run_offline_benchmark.js

# Run the 18 dedicated regression and edge case tests
npm test -- --watchAll=false src/utils/ocrNameRegression.test.js

# Run full project regression suite (266 tests across 15 suites)
npm test -- --watchAll=false
```
