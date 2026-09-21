#!/usr/bin/env python3
"""
adaptive_preprocess.py — Privacy-Safe, Local Adaptive Image Preprocessing for OCR.

Provides lightweight Pillow and NumPy image preprocessing variants:
- grayscale: 8-bit luminance conversion
- contrast: normalized histogram and dynamic contrast stretching
- norm: background illumination normalization (recovers uneven lighting / shadow drop-offs)
- sharp: mild unsharp-mask sharpening (for blurred scans)
- denoise: median / spatial filtering for sensor noise
- upscale_2x, upscale_3x: high-quality resampling for fine character strokes
- threshold_otsu: Otsu / adaptive binarization (watermark & pattern removal)
- threshold_inverted: inverted thresholding for negative prints

100% offline. Pillow/NumPy is the primary engine; OpenCV is purely optional.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Dict, Optional

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    import cv2
except ImportError:
    cv2 = None


def to_grayscale(image: Image.Image) -> Image.Image:
    """Convert RGB/RGBA to single-channel 8-bit grayscale."""
    return image.convert("L")


def enhance_contrast(image: Image.Image, factor: float = 1.75) -> Image.Image:
    """Enhance contrast of image while preserving dynamic range."""
    gray = to_grayscale(image)
    return ImageEnhance.Contrast(gray).enhance(factor)


def normalize_illumination(image: Image.Image, blur_radius: int = 50, target_level: float = 200.0) -> Image.Image:
    """
    Background illumination division to eliminate non-uniform lighting and shadows.
    Estimates the low-frequency background shading map, divides the image by it,
    and scales to a clean white document baseline.
    """
    gray = to_grayscale(image)
    bg = gray.filter(ImageFilter.GaussianBlur(blur_radius))
    bg_arr = np.array(bg, dtype=np.float32) + 1.0  # avoid division by zero
    norm_arr = (np.array(gray, dtype=np.float32) / bg_arr) * target_level
    clipped = np.clip(norm_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(clipped)


def sharpen_image(image: Image.Image, radius: float = 2.0, percent: int = 220, threshold: int = 2) -> Image.Image:
    """Mild unsharp-mask filter to restore blurred character edges."""
    gray = to_grayscale(image)
    return gray.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))


def denoise_image(image: Image.Image, size: int = 3) -> Image.Image:
    """Removes high-frequency Gaussian / speckle noise using median filtering."""
    gray = to_grayscale(image)
    return gray.filter(ImageFilter.MedianFilter(size=size))


def upscale_image(image: Image.Image, factor: int = 2) -> Image.Image:
    """Upscales image using high-quality Lanczos / Bicubic interpolation."""
    gray = to_grayscale(image)
    new_size = (int(gray.width * factor), int(gray.height * factor))
    return gray.resize(new_size, Image.Resampling.LANCZOS)


def upscale_and_sharpen(image: Image.Image, factor: int = 2, radius: float = 1.5, percent: int = 200) -> Image.Image:
    """Upscales and sharpens fine typography strokes."""
    up = upscale_image(image, factor=factor)
    return up.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))


def compute_otsu_threshold(arr: np.ndarray) -> int:
    """Computes global Otsu binarization threshold via NumPy."""
    hist, _ = np.histogram(arr, bins=256, range=(0, 256))
    total = arr.size
    current_max = 0.0
    threshold = 128

    sum_total = np.dot(np.arange(256), hist)
    weight_background = 0.0
    sum_background = 0.0

    for t in range(256):
        weight_background += hist[t]
        if weight_background == 0:
            continue
        weight_foreground = total - weight_background
        if weight_foreground == 0:
            break

        sum_background += t * hist[t]
        mean_background = sum_background / weight_background
        mean_foreground = (sum_total - sum_background) / weight_foreground

        between_class_variance = (
            weight_background * weight_foreground * ((mean_background - mean_foreground) ** 2)
        )
        if between_class_variance > current_max:
            current_max = between_class_variance
            threshold = t

    return int(np.clip(threshold, 60, 200))


def threshold_otsu(image: Image.Image) -> Image.Image:
    """Binarizes image with Otsu's optimal threshold."""
    gray = to_grayscale(image)
    arr = np.array(gray)
    thresh = compute_otsu_threshold(arr)
    bin_arr = np.where(arr >= thresh, 255, 0).astype(np.uint8)
    return Image.fromarray(bin_arr)


def threshold_inverted(image: Image.Image) -> Image.Image:
    """Inverted binarization for white-on-dark or inverted seal text."""
    bin_img = threshold_otsu(image)
    return ImageOps.invert(bin_img)


def extract_name_region(image: Image.Image, doc_type: Optional[str] = None) -> Image.Image:
    """
    Crops the likely candidate name spatial band based on document layout.
    For standard certificate layouts, the student/applicant name is situated
    below the header banner (y=15%..45%).
    """
    w, h = image.size
    top = int(h * 0.14)
    bottom = int(h * 0.48)
    left = int(w * 0.08)
    right = int(w * 0.94)
    return image.crop((left, top, right, bottom))


def get_all_adaptive_variants(image: Image.Image) -> Dict[str, Image.Image]:
    """Generates all adaptive preprocessing variants for multi-pass recognition."""
    norm = normalize_illumination(image)
    sharp = sharpen_image(image)
    return {
        "original": image,
        "grayscale": to_grayscale(image),
        "contrast": enhance_contrast(image),
        "norm": norm,
        "sharp": sharp,
        "denoise": denoise_image(image),
        "up_sharp": upscale_and_sharpen(image, factor=2),
        "norm_sharp": sharpen_image(norm, radius=1.8, percent=180),
        "binary": threshold_otsu(image),
        "norm_binary": threshold_otsu(norm),
        "name_region": extract_name_region(norm),
    }


def preprocess_variant(image_path: Path | str, variant: str) -> Image.Image:
    """Loads image and applies specified adaptive preprocessing variant."""
    img = Image.open(image_path)
    var = variant.lower().strip()
    if var in ("orig", "original"):
        return img
    if var in ("gray", "grayscale"):
        return to_grayscale(img)
    if var in ("contrast",):
        return enhance_contrast(img)
    if var in ("norm", "illumination", "normalize"):
        return normalize_illumination(img)
    if var in ("sharp", "sharpened"):
        return sharpen_image(img)
    if var in ("denoise",):
        return denoise_image(img)
    if var in ("up", "upscale", "upscale_2x"):
        return upscale_image(img, 2)
    if var in ("up_sharp",):
        return upscale_and_sharpen(img, 2)
    if var in ("norm_sharp",):
        return sharpen_image(normalize_illumination(img))
    if var in ("binary", "otsu"):
        return threshold_otsu(img)
    if var in ("norm_binary",):
        return threshold_otsu(normalize_illumination(img))
    if var in ("name_region", "crop"):
        return extract_name_region(normalize_illumination(img))
    raise ValueError(f"Unknown preprocessing variant: {variant}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Adaptive Image Preprocessing for SGP OCR.")
    parser.add_argument("input", type=str, help="Input image path")
    parser.add_argument("output", type=str, nargs="?", default=None, help="Output image path or directory")
    parser.add_argument(
        "--variant",
        type=str,
        default="norm",
        choices=["original", "grayscale", "contrast", "norm", "sharp", "denoise", "up_sharp", "norm_sharp", "binary", "norm_binary", "name_region"],
        help="Preprocessing variant to produce",
    )
    parser.add_argument("--all", action="store_true", help="Generate all variants into output directory")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)

    image = Image.open(input_path)

    if args.all:
        out_dir = Path(args.output or input_path.parent / "preprocessed")
        out_dir.mkdir(parents=True, exist_ok=True)
        variants = get_all_adaptive_variants(image)
        for name, var_img in variants.items():
            out_file = out_dir / f"{input_path.stem}_{name}.jpg"
            var_img.save(out_file, "JPEG", quality=92)
        print(f"Generated {len(variants)} variants in {out_dir}")
        return

    output_path = Path(args.output or f"{input_path.stem}_{args.variant}.jpg")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    res = preprocess_variant(input_path, args.variant)
    res.save(output_path, "JPEG" if output_path.suffix.lower() in (".jpg", ".jpeg") else "PNG", quality=92)
    print(f"Wrote {args.variant} to {output_path}")


if __name__ == "__main__":
    main()
