# Offline OCR training workspace

Production OCR uses only bundled local Tesseract assets: `public/tesseract/` and `public/tessdata/eng.traineddata`. It makes no OCR network request and has no API-key configuration.

Synthetic training data is generated on this machine only. It contains invented names and identifiers, never student documents or personal data.

## Prerequisites

Use Python 3.10+ with **locally available** wheels for Pillow, NumPy, and OpenCV. Do not make the generator download dependencies or data. Windows fonts from `C:\Windows\Fonts` are used by default.

```powershell
python -m pip install --no-index --find-links <local-wheel-directory> Pillow numpy opencv-python-headless
python ocr_training/scripts/generate_synthetic_certificates.py --count 100
```

The generator creates 70/15/15 train/validation/test splits, preserving separation by base document. It covers four document types, local fonts and layouts, invented Indian-style names and school names, plus clean, blur, rotation, low-resolution, shadow, noise, JPEG compression, skew, and perspective variants.

Each `ocr_training/annotations/<split>.jsonl` record stores the document type, relative image path, known synthetic fields, augmentation variant, and explicit privacy metadata.

## Model artifacts

Keep local-only artifacts in `ocr_training/models/base`, `trained`, and `quantized`. Record the model version, SHA-256 checksum, dataset version, configuration, and benchmark results in `ocr_training/reports`. Do not commit large artifacts unless that is an explicit release decision.

Training is optional. Establish a Tesseract baseline, evaluate character/word error rate and per-field accuracy, then only adopt a local model if it improves the held-out test split. Production remains CPU-compatible; any GPU training/inference option must remain optional and must load model files locally.
