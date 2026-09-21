#!/usr/bin/env python3
"""Create privacy-safe, fully local OCR training samples.

Pillow and NumPy are the only core dependencies. OpenCV is detected at runtime
and enables one additional perspective transform when locally available.
No network requests are made and no real student data is used.
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

try:
    import cv2  # Optional local enhancement; never install/download it here.
except ImportError:
    cv2 = None

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = Path("C:/Windows/Fonts")
FONTS = [FONT_DIR / name for name in ("arial.ttf", "arialbd.ttf", "times.ttf", "calibri.ttf")]
NAMES = ["Nithishkumar", "Nithish Kumar", "Nithishkumar M", "Arun Kumar", "Suresh Kumar", "Murugesan", "Priya", "Priyadharshini", "Karthikeyan", "Sivaraman", "Rajesh Kumar", "Divya", "Keerthana", "Harish", "Manoj Kumar"]
SCHOOLS = ["Government Higher Secondary School, Madurai", "St. Joseph's Matriculation School, Chennai", "Vivekananda Vidyalaya, Coimbatore", "Municipal Higher Secondary School, Salem"]
COMMUNITIES = [("Vanniyar", "MBC"), ("Adi Dravidar", "SC"), ("Kongu Vellalar", "BC"), ("Mutharaiyar", "MBC")]
DOC_TYPES = ("10th_marksheet", "12th_marksheet", "income_certificate", "community_certificate")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [FONTS[1], FONTS[0]] if bold else [FONTS[0], FONTS[2], FONTS[3]]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def fields_for(doc_type: str, number: int) -> dict:
    name = random.choice(NAMES)
    dob = f"{random.randint(1, 28):02d}-{random.randint(1, 12):02d}-{random.randint(2004, 2008)}"
    common = {"studentName": name, "dateOfBirth": dob, "certificateNumber": f"TN-{random.randint(2019, 2026)}-{number:06d}", "issueDate": "15-06-2026"}
    if doc_type.endswith("marksheet"):
        total = random.randint(350, 480)
        return {**common, "parentName": random.choice(NAMES), "schoolName": random.choice(SCHOOLS), "board": "Tamil Nadu State Board", "registrationNumber": f"{random.randint(100000000, 999999999)}", "passingYear": str(random.randint(2021, 2025)), "totalMarks": str(total), "maximumMarks": "500", "percentage": f"{total / 5:.1f}"}
    if doc_type == "income_certificate":
        income = random.choice(("75000", "120000", "150000", "200000"))
        return {**common, "applicantName": name, "guardianName": random.choice(NAMES), "annualIncome": income, "taluk": random.choice(("Madurai North", "Mylapore", "Coimbatore South")), "district": random.choice(("Madurai", "Chennai", "Coimbatore")), "state": "Tamil Nadu"}
    community, category = random.choice(COMMUNITIES)
    return {**common, "applicantName": name, "guardianName": random.choice(NAMES), "community": community, "category": category, "taluk": "Madurai North", "district": "Madurai", "state": "Tamil Nadu"}


def certificate(doc_type: str, fields: dict, layout: int, scale: float) -> Image.Image:
    image = Image.new("RGB", (1600, 2200), (250, 248, 238))
    draw = ImageDraw.Draw(image)
    draw.rectangle((55, 55, 1545, 2145), outline=(35, 75, 120), width=8)
    title = {"10th_marksheet": "SECONDARY SCHOOL LEAVING CERTIFICATE", "12th_marksheet": "HIGHER SECONDARY EXAMINATION CERTIFICATE", "income_certificate": "INCOME CERTIFICATE", "community_certificate": "COMMUNITY CERTIFICATE"}[doc_type]
    draw.text((800, 150), "FICTIONAL EDUCATION RECORD", font=font(int(44 * scale), True), anchor="ma", fill=(15, 50, 92))
    draw.text((800, 230), title, font=font(int(35 * scale), True), anchor="ma", fill=(15, 50, 92))
    draw.line((150, 310, 1450, 310), fill=(15, 50, 92), width=3)
    pairs = list(fields.items())
    if layout % 2:
        random.shuffle(pairs)
    y = 410
    for key, value in pairs:
        label = " ".join(part.upper() for part in key.replace("studentName", "student name").replace("applicantName", "applicant name").split())
        draw.text((180, y), f"{label}:", font=font(int(29 * scale), True), fill=(25, 25, 25))
        draw.text((680, y), str(value), font=font(int(30 * scale)), fill=(20, 20, 20))
        draw.line((170, y + 52, 1430, y + 52), fill=(190, 190, 180), width=1)
        y += 105
    draw.text((1160, 1940), "TEST ISSUING AUTHORITY", font=font(int(25 * scale), True), fill=(25, 25, 25))
    draw.ellipse((1160, 1840, 1400, 2070), outline=(135, 35, 35), width=4)
    return image


def perspective(image: Image.Image) -> Image.Image:
    if cv2 is None:
        # Pillow-only fallback: a slight skew still exercises layout robustness.
        return image.rotate(random.uniform(-3.5, 3.5), resample=Image.Resampling.BICUBIC, fillcolor=(245, 243, 233))
    array = np.array(image)
    height, width = array.shape[:2]
    offset = random.randint(18, 80)
    src = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
    dst = np.float32([[offset, random.randint(0, offset)], [width - 1 - offset, random.randint(0, offset)], [width - 1, height - 1 - offset], [random.randint(0, offset), height - 1]])
    return Image.fromarray(cv2.warpPerspective(array, cv2.getPerspectiveTransform(src, dst), (width, height), borderValue=(245, 243, 233)))


def augment(image: Image.Image, kind: str) -> Image.Image:
    if kind == "clean": return image
    if kind == "blurred": return image.filter(ImageFilter.GaussianBlur(radius=random.uniform(1.2, 3.2)))
    if kind == "grayscale": return image.convert("L").convert("RGB")
    if kind == "rotated": return image.rotate(random.uniform(-5, 5), expand=False, fillcolor=(250, 248, 238))
    if kind == "low_resolution": return image.resize((600, 825)).resize(image.size, Image.Resampling.BILINEAR)
    if kind == "low_contrast": return ImageEnhance.Contrast(image).enhance(random.uniform(0.45, 0.7))
    if kind == "brightness": return ImageEnhance.Brightness(image).enhance(random.uniform(0.55, 1.35))
    if kind == "shadow":
        shade = Image.new("L", image.size, 0); d = ImageDraw.Draw(shade); d.polygon([(0, 0), (900, 0), (500, 2200), (0, 2200)], fill=85)
        return Image.composite(Image.new("RGB", image.size, (120, 110, 95)), image, shade.filter(ImageFilter.GaussianBlur(150)))
    if kind == "noise":
        array = np.asarray(image).astype(np.int16) + np.random.normal(0, 16, np.asarray(image).shape)
        return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))
    if kind == "compression":
        import io
        buffer = io.BytesIO(); image.save(buffer, "JPEG", quality=random.randint(18, 35)); return Image.open(buffer).convert("RGB")
    if kind == "skew": return image.rotate(random.uniform(-2, 2), resample=Image.Resampling.BICUBIC, fillcolor=(250, 248, 238))
    if kind == "perspective": return perspective(image)
    if kind == "faint_text": return ImageEnhance.Contrast(image).enhance(random.uniform(0.25, 0.45))
    if kind == "uneven_background":
        gradient = np.linspace(0.55, 1.0, image.width, dtype=np.float32)
        array = np.asarray(image).astype(np.float32) * gradient[None, :, None]
        return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))
    return image


def split_for(index: int, total: int) -> str:
    ratio = index / max(1, total)
    return "train" if ratio < .70 else "validation" if ratio < .85 else "test"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate local synthetic certificate OCR data.")
    parser.add_argument("--count", type=int, default=40, help="Base certificates to make (each has all variants).")
    parser.add_argument("--seed", type=int, default=20260913)
    args = parser.parse_args(); random.seed(args.seed); np.random.seed(args.seed)
    variants = ("clean", "grayscale", "blurred", "low_resolution", "low_contrast", "brightness", "shadow", "noise", "compression", "rotated", "skew", "perspective", "faint_text", "uneven_background")
    metadata_dir = ROOT / "datasets" / "metadata"; metadata_dir.mkdir(parents=True, exist_ok=True)
    writers = {split: (ROOT / "annotations" / f"{split}.jsonl").open("w", encoding="utf-8") for split in ("train", "validation", "test")}
    print("OpenCV unavailable — using Pillow/NumPy offline augmentation." if cv2 is None else "OpenCV available — enabling local perspective augmentation.")
    try:
        for index in range(args.count):
            doc_type = DOC_TYPES[index % len(DOC_TYPES)]; split = split_for(index, args.count)
            fields = fields_for(doc_type, index + 1); font_scale = (0.78, 1.0, 1.18)[index % 3]; base = certificate(doc_type, fields, index % 3, font_scale)
            for variant in variants:
                filename = f"{doc_type}_{index + 1:04d}_{variant}.jpg"; relative = Path("datasets") / split / filename
                augment(base, variant).save(ROOT / relative, "JPEG", quality=92)
                record = {"ground_truth_name": fields.get("studentName") or fields.get("applicantName"), "document_type": doc_type, "image_path": relative.as_posix(), "layout_type": f"fictional_layout_{index % 3 + 1}", "augmentation_type": variant, "fields": fields, "privacy": {"synthetic": True, "containsRealPII": False}}
                writers[split].write(json.dumps(record, ensure_ascii=False) + "\n")
                (metadata_dir / f"{filename}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    finally:
        for writer in writers.values(): writer.close()

if __name__ == "__main__": main()
