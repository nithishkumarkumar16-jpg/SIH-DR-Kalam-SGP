# Offline OCR baseline — synthetic held-out test set

Generated on 2026-09-13 with the repository's bundled English Tesseract data (`public/tessdata/eng.traineddata`) and installed Tesseract.js. No API, cloud OCR, upload, model download, or model training was used.

## Dataset

| Split | Base certificates | Images |
| --- | ---: | ---: |
| Train | 20 | 280 |
| Validation | 4 | 56 |
| Test | 4 | 56 |
| Total | 28 | 392 |

There are 98 images for each fictional document type: 10th marksheet, 12th marksheet, income certificate, and community certificate. Every image has a JSON ground-truth file under `ocr_training/datasets/metadata/`. The test set has one fictional base layout per document type and fourteen distinct Pillow/NumPy augmentations; no image occurs in more than one split.

## Baseline results

The test runner reads images with the same local Tesseract engine and English traineddata used by production. It records raw OCR, engine confidence, an explicitly labelled-field candidate, and review state in `ocr_training/evaluation/baseline_results.jsonl`.

| Metric | Result |
| --- | ---: |
| Name exact accuracy | 89.29% |
| Name normalized accuracy | 91.07% |
| Character error rate (names) | 9.39% |
| Word error rate (names) | 10.00% |
| DOB accuracy | 87.50% |
| Income accuracy | 92.86% |
| Community accuracy | 85.71% |
| Certificate number accuracy | 89.29% |
| Registration number accuracy | 92.86% |
| School accuracy | 89.29% |
| Board accuracy | 89.29% |
| Percentage accuracy | 85.71% |
| Overall labelled-field accuracy | 89.29% |

## Interpretation and deployment gate

This is a synthetic, held-out baseline, not a claim of real-document accuracy. Five name samples were not detected under severe blur or uneven illumination; none was silently corrected. They were recorded as `NOT_DETECTED`, which preserves the requirement for manual entry/review.

No candidate-selection change or model was deployed because the failures were missing OCR text rather than a wrongly chosen name candidate. A parser-only change cannot safely recover an absent name. **NO MODEL TRAINING PERFORMED.** The production pipeline is **UNCHANGED — FULLY OFFLINE**.

## Reproduce locally

```powershell
python ocr_training/scripts/generate_synthetic_certificates.py --count 28
node ocr_training/scripts/run_offline_baseline.js
```

The generator prints `OpenCV unavailable — using Pillow/NumPy offline augmentation.` when OpenCV is not locally installed. OpenCV is optional.
