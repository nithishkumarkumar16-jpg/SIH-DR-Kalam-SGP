#!/usr/bin/env python3
"""Generate realistic, privacy-safe, fully offline local validation certificates.

Creates authentic regional layouts:
- Tamil Nadu State Board SSLC (10th) Marksheet with subject table & seal
- Tamil Nadu Higher Secondary Examination (12th) Marksheet
- Tamil Nadu e-Sevai / Revenue Community Certificate with statutory clause
- Tamil Nadu e-District Income Certificate with statutory clause & validity
- CBSE Board Secondary School Examination Marksheet

Includes difficult real-world capture conditions:
- Mobile camera desk photograph / perspective tilt
- Uneven room lighting & shadows
- Low contrast / photocopy wash-out
- Faint dot-matrix / ribbon fading
- Overlapping circular official seals & signatures
- Initials variations & long composite Indian names
- Completely masked PII (Aadhaar XXXX-XXXX-1234, Bank XXXX5678, redacted QR)
- Multi-document cohorts for cross-document consistency validation

100% OFFLINE. Pillow/NumPy only. OpenCV optional.
"""
from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

try:
    import cv2
except ImportError:
    cv2 = None

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "datasets" / "real_validation"
IMAGES_DIR = OUTPUT_DIR / "images"
METADATA_DIR = OUTPUT_DIR / "metadata"

FONT_DIR = Path("C:/Windows/Fonts")
FONTS = {
    "regular": FONT_DIR / "arial.ttf",
    "bold": FONT_DIR / "arialbd.ttf",
    "serif": FONT_DIR / "times.ttf",
    "serif_bold": FONT_DIR / "timesbd.ttf",
    "mono": FONT_DIR / "cour.ttf",
    "mono_bold": FONT_DIR / "courbd.ttf",
}


def get_font(kind: str = "regular", size: int = 24) -> ImageFont.FreeTypeFont:
    font_path = FONTS.get(kind, FONTS["regular"])
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


# 8 Distinct Multi-Document Cohorts
COHORTS = [
    {
        "cohort_id": "COHORT_01_SENTHIL",
        "student_name": "SENTHIL KUMAR K",
        "alt_names": {"10th": "SENTHIL KUMAR K", "12th": "SENTHIL KUMAR K", "community": "SENTHIL KUMAR K", "income": "SENTHIL KUMAR K"},
        "parent_name": "KRISHNAMOORTHY M",
        "dob": "14-05-2005",
        "community": "Vanniyar",
        "category": "MBC",
        "income": "96000",
        "school": "Government Higher Secondary School, Madurai",
        "taluk": "Madurai South",
        "district": "Madurai",
        "expected_cross_status": "CONSISTENT",
    },
    {
        "cohort_id": "COHORT_02_PRIYADHARSHINI",
        "student_name": "PRIYADHARSHINI S",
        "alt_names": {"10th": "PRIYADHARSHINI S", "12th": "S. PRIYADHARSHINI", "community": "PRIYADHARSHINI S", "income": "PRIYADHARSHINI S"},
        "parent_name": "SUNDARAMURTHY V",
        "dob": "22-08-2006",
        "community": "Kongu Vellalar",
        "category": "BC",
        "income": "140000",
        "school": "St. Joseph's Matriculation School, Coimbatore",
        "taluk": "Coimbatore South",
        "district": "Coimbatore",
        "expected_cross_status": "CONSISTENT",
    },
    {
        "cohort_id": "COHORT_03_KARTHIKEYAN",
        "student_name": "KARTHIKEYAN M",
        "alt_names": {"10th": "KARTHIKEYAN M", "12th": "KARTHIKAYAN M", "community": "KARTHIKEYAN M", "income": "KARTHIKEYAN M"},
        "parent_name": "MURUGESAN P",
        "dob": "10-11-2005",
        "community": "Mutharaiyar",
        "category": "MBC",
        "income": "72000",
        "school": "Municipal Boys Higher Secondary School, Salem",
        "taluk": "Salem West",
        "district": "Salem",
        "expected_cross_status": "MINOR_DIFFERENCE",
    },
    {
        "cohort_id": "COHORT_04_CONFLICT_MUGILAN",
        "student_name": "MUGILAN R",
        "alt_names": {"10th": "MUGILAN R", "12th": "MUGILAN R", "community": "VIGNESH R", "income": "MUGILAN R"},
        "parent_name": "RAMESH BABU K",
        "dob": "18-03-2005",
        "community": "Adi Dravidar",
        "category": "SC",
        "income": "60000",
        "school": "Government Model Higher Secondary School, Tiruchirappalli",
        "taluk": "Tiruchirappalli East",
        "district": "Tiruchirappalli",
        "expected_cross_status": "SIGNIFICANT CONFLICT",
    },
    {
        "cohort_id": "COHORT_05_ANITHA_PARTIAL",
        "student_name": "ANITHA G",
        "alt_names": {"10th": "ANITHA G", "community": "ANITHA G"},
        "parent_name": "GUNASEKARAN N",
        "dob": "05-01-2006",
        "community": "Nadar",
        "category": "BC",
        "income": "110000",
        "school": "Hindu Higher Secondary School, Chennai",
        "taluk": "Mylapore",
        "district": "Chennai",
        "expected_cross_status": "INSUFFICIENT DATA",
    },
    {
        "cohort_id": "COHORT_06_BALASUBRAMANIAM",
        "student_name": "BALASUBRAMANIAM SIVASANKARANARAYANAN",
        "alt_names": {"10th": "BALASUBRAMANIAM SIVASANKARANARAYANAN", "12th": "BALASUBRAMANIAM S", "community": "BALASUBRAMANIAM SIVASANKARANARAYANAN", "income": "BALASUBRAMANIAM S"},
        "parent_name": "SIVASANKARANARAYANAN T",
        "dob": "30-07-2005",
        "community": "Brahmin",
        "category": "General",
        "income": "240000",
        "school": "Vivekananda Vidyalaya Matric Hr Sec School, Madurai",
        "taluk": "Madurai North",
        "district": "Madurai",
        "expected_cross_status": "CONSISTENT",
    },
    {
        "cohort_id": "COHORT_07_NITHISH_NOISE",
        "student_name": "NITHISH KUMAR M",
        "alt_names": {"10th": "NITHISH KUMAR M", "12th": "N1THISH KUMAR M", "community": "NITHISH KUMAR M", "income": "NITHISH KUMAR M"},
        "parent_name": "MURUGAN S",
        "dob": "26-09-2005",
        "community": "Kallar",
        "category": "BC",
        "income": "125000",
        "school": "Government Boys Higher Secondary School, Dindigul",
        "taluk": "Dindigul West",
        "district": "Dindigul",
        "expected_cross_status": "CONSISTENT",
    },
    {
        "cohort_id": "COHORT_08_DIVYA_TITLE",
        "student_name": "Divya Bharathi R",
        "alt_names": {"10th": "Divya Bharathi R", "12th": "DIVYA BHARATHI R", "community": "DIVYA BHARATHI R", "income": "Divya Bharathi R"},
        "parent_name": "RAJENDRAN C",
        "dob": "12-12-2006",
        "community": "Maravar",
        "category": "MBC",
        "income": "85000",
        "school": "Kamarajar Girls Higher Secondary School, Virudhunagar",
        "taluk": "Virudhunagar",
        "district": "Virudhunagar",
        "expected_cross_status": "CONSISTENT",
    },
]


def draw_circular_seal(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int = 80, text: str = "TAMIL NADU GOVT"):
    cx, cy = center
    purple = (105, 35, 135)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=purple, width=3)
    draw.ellipse((cx - radius + 8, cy - radius + 8, cx + radius - 8, cy + radius - 8), outline=purple, width=1)
    f = get_font("bold", 15)
    draw.text((cx, cy - 20), text, font=f, fill=purple, anchor="mm")
    draw.text((cx, cy + 5), "MADURAI", font=f, fill=purple, anchor="mm")
    draw.text((cx, cy + 25), "OFFICIAL SEAL", font=get_font("regular", 12), fill=purple, anchor="mm")


def draw_redacted_qr(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]):
    x0, y0, x1, y1 = box
    draw.rectangle((x0, y0, x1, y1), outline=(60, 60, 60), width=2, fill=(245, 245, 245))
    # Draw nested squares resembling QR corner markers
    s = 25
    for px, py in [(x0 + 8, y0 + 8), (x1 - 8 - s, y0 + 8), (x0 + 8, y1 - 8 - s)]:
        draw.rectangle((px, py, px + s, py + s), outline=(0, 0, 0), width=3)
        draw.rectangle((px + 6, py + 6, px + s - 6, py + s - 6), fill=(0, 0, 0))
    f = get_font("bold", 12)
    draw.text(((x0 + x1) // 2, (y0 + y1) // 2), "REDACTED", font=f, fill=(120, 20, 20), anchor="mm")
    draw.text(((x0 + x1) // 2, (y0 + y1) // 2 + 16), "NO PII", font=f, fill=(120, 20, 20), anchor="mm")


def render_tn_sslc(cohort: dict, reg_no: str, cert_no: str, year: str = "2021") -> Image.Image:
    """Renders authentic Tamil Nadu SSLC Marksheet with bilingual header, subject table, and seal."""
    img = Image.new("RGB", (1600, 2250), (252, 250, 242))
    draw = ImageDraw.Draw(img)
    # Double Border
    draw.rectangle((45, 45, 1555, 2205), outline=(20, 45, 90), width=6)
    draw.rectangle((55, 55, 1545, 2195), outline=(20, 45, 90), width=2)

    # Header
    draw.text((800, 110), "தமிழ்நாடு அரசு / GOVERNMENT OF TAMIL NADU", font=get_font("bold", 30), fill=(15, 35, 80), anchor="mm")
    draw.text((800, 155), "DEPARTMENT OF GOVERNMENT EXAMINATIONS", font=get_font("bold", 34), fill=(15, 35, 80), anchor="mm")
    draw.text((800, 200), "இடைநிலைப் பள்ளி விடுப்புச் சான்றிதழ் / SECONDARY SCHOOL LEAVING CERTIFICATE", font=get_font("bold", 24), fill=(25, 25, 25), anchor="mm")
    draw.text((800, 235), f"பத்தாம் வகுப்பு பொதுத் தேர்வு / X STANDARD PUBLIC EXAMINATION — MARCH {year}", font=get_font("bold", 22), fill=(40, 40, 40), anchor="mm")
    draw.line((100, 265, 1500, 265), fill=(20, 45, 90), width=3)

    # Student metadata section
    f_lbl = get_font("bold", 22)
    f_val = get_font("bold", 24)
    y = 300

    draw.text((120, y), "தேர்வரின் பெயர் / NAME OF THE CANDIDATE :", font=f_lbl, fill=(30, 30, 30))
    draw.text((700, y), cohort["alt_names"].get("10th", cohort["student_name"]), font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "நிரந்தரப் பதிவெண் / PERMANENT REGISTER NO :", font=f_lbl, fill=(30, 30, 30))
    draw.text((700, y), reg_no, font=get_font("mono_bold", 24), fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "பிறந்த தேதி / DATE OF BIRTH :", font=f_lbl, fill=(30, 30, 30))
    draw.text((700, y), cohort["dob"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "பள்ளியின் பெயர் / NAME OF THE SCHOOL :", font=f_lbl, fill=(30, 30, 30))
    draw.text((700, y), cohort["school"], font=get_font("serif_bold", 21), fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "சான்றிதழ் எண் / CERTIFICATE NUMBER :", font=f_lbl, fill=(30, 30, 30))
    draw.text((700, y), cert_no, font=get_font("mono_bold", 22), fill=(10, 10, 10))

    # Subject Table
    ty = y + 80
    draw.rectangle((120, ty, 1480, ty + 500), outline=(20, 45, 90), width=2)
    draw.line((120, ty + 60, 1480, ty + 60), fill=(20, 45, 90), width=2)

    # Columns: Subject (120-650), Theory (650-900), Practical (900-1150), Total (1150-1480)
    draw.line((650, ty, 650, ty + 500), fill=(20, 45, 90), width=1)
    draw.line((900, ty, 900, ty + 500), fill=(20, 45, 90), width=1)
    draw.line((1150, ty, 1150, ty + 500), fill=(20, 45, 90), width=1)

    tf = get_font("bold", 20)
    draw.text((380, ty + 18), "பாடங்கள் / SUBJECTS", font=tf, fill=(15, 35, 80), anchor="mm")
    draw.text((775, ty + 18), "THEORY (100)", font=tf, fill=(15, 35, 80), anchor="mm")
    draw.text((1025, ty + 18), "PRACTICAL", font=tf, fill=(15, 35, 80), anchor="mm")
    draw.text((1315, ty + 18), "TOTAL MARKS", font=tf, fill=(15, 35, 80), anchor="mm")

    subjects = [
        ("TAMIL", "088", "—", "088", "PASS"),
        ("ENGLISH", "082", "—", "082", "PASS"),
        ("MATHEMATICS", "094", "—", "094", "PASS"),
        ("SCIENCE", "072", "024", "096", "PASS"),
        ("SOCIAL SCIENCE", "089", "—", "089", "PASS"),
    ]

    row_y = ty + 65
    f_sub = get_font("bold", 20)
    f_num = get_font("mono_bold", 22)
    tot_score = 0
    for s_name, th, pr, tot, res in subjects:
        tot_score += int(tot)
        draw.text((150, row_y + 12), s_name, font=f_sub, fill=(20, 20, 20))
        draw.text((775, row_y + 12), th, font=f_num, fill=(20, 20, 20), anchor="mm")
        draw.text((1025, row_y + 12), pr, font=f_num, fill=(20, 20, 20), anchor="mm")
        draw.text((1315, row_y + 12), tot, font=f_num, fill=(20, 20, 20), anchor="mm")
        draw.line((120, row_y + 48, 1480, row_y + 48), fill=(200, 200, 200), width=1)
        row_y += 50

    # Grand Total Row
    draw.line((120, ty + 380, 1480, ty + 380), fill=(20, 45, 90), width=2)
    draw.text((380, ty + 410), "மொத்த மதிப்பெண்கள் / GRAND TOTAL", font=get_font("bold", 22), fill=(15, 35, 80), anchor="mm")
    draw.text((1315, ty + 410), f"{tot_score} / 500", font=get_font("bold", 26), fill=(10, 10, 10), anchor="mm")

    pct = f"{tot_score / 5:.1f}%"
    draw.text((380, ty + 460), f"PERCENTAGE : {pct}    RESULT : PASS", font=get_font("bold", 20), fill=(20, 20, 20), anchor="mm")

    # Signatures & Seals
    draw_circular_seal(draw, (320, 1850), radius=90, text="DEPT GOVT EXAMS")
    draw.text((1250, 1820), "Sd/-", font=get_font("serif_bold", 24), fill=(30, 30, 30), anchor="mm")
    draw.text((1250, 1860), "HEADMASTER / PRINCIPAL", font=get_font("bold", 20), fill=(30, 30, 30), anchor="mm")
    draw.text((1250, 1895), cohort["school"].split(",")[0], font=get_font("regular", 18), fill=(50, 50, 50), anchor="mm")
    draw.text((800, 2140), "TAMIL NADU STATE BOARD OF SCHOOL EXAMINATIONS (SSLC)", font=get_font("bold", 18), fill=(70, 70, 70), anchor="mm")

    return img


def render_tn_hsc(cohort: dict, reg_no: str, cert_no: str, year: str = "2023") -> Image.Image:
    """Renders authentic Tamil Nadu Higher Secondary (+2 HSC) Marksheet."""
    img = Image.new("RGB", (1600, 2250), (250, 248, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle((45, 45, 1555, 2205), outline=(80, 25, 25), width=6)
    draw.rectangle((55, 55, 1545, 2195), outline=(80, 25, 25), width=2)

    draw.text((800, 110), "GOVERNMENT OF TAMIL NADU", font=get_font("bold", 32), fill=(75, 20, 20), anchor="mm")
    draw.text((800, 160), "DEPARTMENT OF GOVERNMENT EXAMINATIONS, CHENNAI - 600 006", font=get_font("bold", 24), fill=(75, 20, 20), anchor="mm")
    draw.text((800, 205), "மேல்நிலைப் பள்ளித் தேர்வுச் சான்றிதழ் / HIGHER SECONDARY EXAMINATION CERTIFICATE", font=get_font("bold", 24), fill=(20, 20, 20), anchor="mm")
    draw.text((800, 245), f"GENERAL EDUCATION — MARCH {year}", font=get_font("bold", 22), fill=(40, 40, 40), anchor="mm")
    draw.line((100, 275, 1500, 275), fill=(80, 25, 25), width=3)

    f_lbl = get_font("bold", 22)
    f_val = get_font("bold", 24)
    y = 320

    name_to_print = cohort["alt_names"].get("12th", cohort["student_name"])
    draw.text((120, y), "STUDENT NAME / தேர்வரின் பெயர் :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), name_to_print, font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "PARENT NAME / பெற்றோர் பெயர் :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), cohort["parent_name"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "PERMANENT REGISTER NUMBER :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), reg_no, font=get_font("mono_bold", 24), fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "DATE OF BIRTH :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), cohort["dob"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "NAME OF THE SCHOOL :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), cohort["school"], font=get_font("serif_bold", 21), fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "CERTIFICATE NUMBER :", font=f_lbl, fill=(30, 30, 30))
    draw.text((720, y), cert_no, font=get_font("mono_bold", 22), fill=(10, 10, 10))

    # Subjects Table
    ty = y + 80
    draw.rectangle((120, ty, 1480, ty + 530), outline=(80, 25, 25), width=2)
    draw.line((120, ty + 60, 1480, ty + 60), fill=(80, 25, 25), width=2)
    draw.line((650, ty, 650, ty + 530), fill=(80, 25, 25), width=1)
    draw.line((950, ty, 950, ty + 530), fill=(80, 25, 25), width=1)
    draw.line((1200, ty, 1200, ty + 530), fill=(80, 25, 25), width=1)

    tf = get_font("bold", 20)
    draw.text((380, ty + 18), "SUBJECTS", font=tf, fill=(80, 25, 25), anchor="mm")
    draw.text((800, ty + 18), "THEORY (70/100)", font=tf, fill=(80, 25, 25), anchor="mm")
    draw.text((1075, ty + 18), "PRACTICAL", font=tf, fill=(80, 25, 25), anchor="mm")
    draw.text((1340, ty + 18), "TOTAL MARKS", font=tf, fill=(80, 25, 25), anchor="mm")

    hsc_subs = [
        ("PART I TAMIL", "091", "—", "091"),
        ("PART II ENGLISH", "086", "—", "086"),
        ("PHYSICS", "062", "030", "092"),
        ("CHEMISTRY", "058", "030", "088"),
        ("BIOLOGY", "064", "030", "094"),
        ("MATHEMATICS", "089", "—", "089"),
    ]

    row_y = ty + 65
    tot_score = 0
    for s_name, th, pr, tot in hsc_subs:
        tot_score += int(tot)
        draw.text((150, row_y + 10), s_name, font=get_font("bold", 19), fill=(20, 20, 20))
        draw.text((800, row_y + 10), th, font=get_font("mono_bold", 21), fill=(20, 20, 20), anchor="mm")
        draw.text((1075, row_y + 10), pr, font=get_font("mono_bold", 21), fill=(20, 20, 20), anchor="mm")
        draw.text((1340, row_y + 10), tot, font=get_font("mono_bold", 21), fill=(20, 20, 20), anchor="mm")
        draw.line((120, row_y + 42, 1480, row_y + 42), fill=(210, 210, 210), width=1)
        row_y += 44

    # Grand Total
    draw.line((120, ty + 420, 1480, ty + 420), fill=(80, 25, 25), width=2)
    draw.text((380, ty + 450), "GRAND TOTAL :", font=get_font("bold", 22), fill=(80, 25, 25), anchor="mm")
    draw.text((1340, ty + 450), f"{tot_score} / 600", font=get_font("bold", 26), fill=(10, 10, 10), anchor="mm")

    pct = f"{(tot_score / 6):.2f}%"
    draw.text((380, ty + 490), f"PERCENTAGE : {pct}    RESULT : PASS", font=get_font("bold", 20), fill=(20, 20, 20), anchor="mm")

    draw_circular_seal(draw, (300, 1860), radius=85, text="DGE HSC WING")
    draw.text((1250, 1850), "Sd/-", font=get_font("serif_bold", 24), fill=(30, 30, 30), anchor="mm")
    draw.text((1250, 1890), "SECRETARY, BOARD OF HIGHER SECONDARY EXAMINATIONS", font=get_font("bold", 18), fill=(30, 30, 30), anchor="mm")

    return img


def render_tn_community_cert(cohort: dict, cert_no: str, issue_date: str = "15-06-2026") -> Image.Image:
    """Renders authentic Tamil Nadu e-Sevai / Revenue Community Certificate with statutory clause."""
    img = Image.new("RGB", (1600, 2250), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((45, 45, 1555, 2205), outline=(40, 40, 40), width=4)

    # Header Emblem
    draw.ellipse((750, 80, 850, 180), outline=(20, 60, 20), width=3)
    draw.text((800, 130), "TN GOVT", font=get_font("bold", 14), fill=(20, 60, 20), anchor="mm")
    draw.text((800, 210), "GOVERNMENT OF TAMIL NADU", font=get_font("bold", 30), fill=(10, 10, 10), anchor="mm")
    draw.text((800, 250), "REVENUE ADMINISTRATION, DISASTER MANAGEMENT AND MITIGATION DEPARTMENT", font=get_font("bold", 20), fill=(30, 30, 30), anchor="mm")
    draw.text((800, 290), "சாதிச் சான்றிதழ் / COMMUNITY CERTIFICATE", font=get_font("bold", 26), fill=(15, 60, 15), anchor="mm")
    draw.line((120, 320, 1480, 320), fill=(40, 40, 40), width=2)

    # Top Details
    draw.text((120, 360), f"Certificate No: {cert_no}", font=get_font("mono_bold", 22), fill=(10, 10, 10))
    draw.text((1150, 360), f"Date of Issue: {issue_date}", font=get_font("bold", 20), fill=(10, 10, 10))

    # Statutory Clause
    name_str = cohort["alt_names"].get("community", cohort["student_name"])
    parent_str = cohort["parent_name"]
    comm_str = cohort["community"]
    cat_str = cohort["category"]
    taluk_str = cohort["taluk"]
    dist_str = cohort["district"]

    clause = (
        f"This is to certify that Selvan / Selvi {name_str} Son / Daughter of Thiru {parent_str} "
        f"residing at {taluk_str} Taluk of {dist_str} District in the State of Tamil Nadu "
        f"belongs to {comm_str} Community which is recognized as {cat_str} ({cat_str}) "
        f"as per G.O. (Ms.) No. 85, BC, MBC & Minorities Welfare Department.\n\n"
        f"It is also certified that Selvan / Selvi {name_str} does not belong to the persons/sections (Creamy Layer) "
        f"mentioned in Column 3 of the Schedule to the Government of India, Department of Personnel and Training O.M."
    )

    # Wrap and render clause
    words = clause.split()
    lines = []
    curr = []
    for w in words:
        if "\n\n" in w:
            parts = w.split("\n\n")
            curr.append(parts[0])
            lines.append(" ".join(curr))
            curr = [parts[1]]
        elif len(" ".join(curr + [w])) > 80:
            lines.append(" ".join(curr))
            curr = [w]
        else:
            curr.append(w)
    if curr:
        lines.append(" ".join(curr))

    cy = 450
    f_clause = get_font("serif", 24)
    for line in lines:
        draw.text((120, cy), line, font=f_clause, fill=(20, 20, 20))
        cy += 45

    # Structured metadata box
    by = cy + 60
    draw.rectangle((120, by, 1480, by + 400), outline=(100, 100, 100), width=1, fill=(250, 252, 250))
    draw.line((120, by + 50, 1480, by + 50), fill=(100, 100, 100), width=1)
    draw.text((800, by + 25), "CERTIFICATE DETAILS", font=get_font("bold", 20), fill=(20, 20, 20), anchor="mm")

    f_box = get_font("bold", 20)
    details = [
        ("APPLICANT NAME", name_str),
        ("FATHER / GUARDIAN NAME", parent_str),
        ("COMMUNITY", comm_str),
        ("CATEGORY", cat_str),
        ("DATE OF BIRTH", cohort["dob"]),
        ("TALUK & DISTRICT", f"{taluk_str}, {dist_str}"),
    ]
    dy = by + 75
    for lbl, val in details:
        draw.text((160, dy), f"{lbl} :", font=f_box, fill=(50, 50, 50))
        draw.text((550, dy), val, font=get_font("bold", 22), fill=(10, 10, 10))
        dy += 50

    # Digital Signature Block & Mock QR
    draw_redacted_qr(draw, (150, 1750, 350, 1950))

    sy = 1750
    draw.rectangle((950, sy, 1480, sy + 200), outline=(20, 80, 20), width=2, fill=(245, 252, 245))
    draw.text((1215, sy + 30), "DIGITALLY SIGNED DOCUMENT", font=get_font("bold", 18), fill=(20, 80, 20), anchor="mm")
    draw.text((1215, sy + 65), "Designation : TAHSILDAR", font=get_font("bold", 18), fill=(20, 20, 20), anchor="mm")
    draw.text((1215, sy + 95), f"Taluk : {taluk_str}", font=get_font("regular", 18), fill=(30, 30, 30), anchor="mm")
    draw.text((1215, sy + 125), f"District : {dist_str}", font=get_font("regular", 18), fill=(30, 30, 30), anchor="mm")
    draw.text((1215, sy + 155), f"Date : {issue_date}", font=get_font("mono", 16), fill=(50, 50, 50), anchor="mm")

    draw.text((800, 2140), "Government of Tamil Nadu — Revenue Administration e-Services", font=get_font("regular", 16), fill=(90, 90, 90), anchor="mm")
    return img


def render_tn_income_cert(cohort: dict, cert_no: str, issue_date: str = "15-06-2026") -> Image.Image:
    """Renders authentic Tamil Nadu e-District Income Certificate with validity clause."""
    img = Image.new("RGB", (1600, 2250), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((45, 45, 1555, 2205), outline=(40, 40, 40), width=4)

    draw.text((800, 140), "GOVERNMENT OF TAMIL NADU", font=get_font("bold", 30), fill=(10, 10, 10), anchor="mm")
    draw.text((800, 185), "REVENUE DEPARTMENT", font=get_font("bold", 24), fill=(30, 30, 30), anchor="mm")
    draw.text((800, 230), "வருமானச் சான்றிதழ் / INCOME CERTIFICATE", font=get_font("bold", 26), fill=(15, 60, 15), anchor="mm")
    draw.line((120, 265, 1480, 265), fill=(40, 40, 40), width=2)

    draw.text((120, 300), f"Certificate No: {cert_no}", font=get_font("mono_bold", 22), fill=(10, 10, 10))
    draw.text((1150, 300), f"Date: {issue_date}", font=get_font("bold", 20), fill=(10, 10, 10))

    name_str = cohort["alt_names"].get("income", cohort["student_name"])
    parent_str = cohort["parent_name"]
    inc_val = cohort["income"]
    taluk_str = cohort["taluk"]
    dist_str = cohort["district"]

    clause = (
        f"This is to certify that the Annual Family Income of Thiru / Tmt / Selvan {name_str} "
        f"Son / Daughter of Thiru {parent_str} residing at {taluk_str} Taluk of {dist_str} District "
        f"in the State of Tamil Nadu is Rs. {int(inc_val):,} (Rupees {inc_val} only) from all known sources.\n\n"
        f"This certificate is issued for the purpose of availing Educational Scholarship / Government Welfare Scheme "
        f"and is valid for ONE YEAR from the date of issue."
    )

    words = clause.split()
    lines = []
    curr = []
    for w in words:
        if "\n\n" in w:
            parts = w.split("\n\n")
            curr.append(parts[0])
            lines.append(" ".join(curr))
            curr = [parts[1]]
        elif len(" ".join(curr + [w])) > 80:
            lines.append(" ".join(curr))
            curr = [w]
        else:
            curr.append(w)
    if curr:
        lines.append(" ".join(curr))

    cy = 400
    f_clause = get_font("serif", 24)
    for line in lines:
        draw.text((120, cy), line, font=f_clause, fill=(20, 20, 20))
        cy += 45

    # Structured details
    by = cy + 60
    draw.rectangle((120, by, 1480, by + 350), outline=(100, 100, 100), width=1, fill=(252, 252, 250))
    draw.line((120, by + 50, 1480, by + 50), fill=(100, 100, 100), width=1)
    draw.text((800, by + 25), "INCOME PARTICULARS", font=get_font("bold", 20), fill=(20, 20, 20), anchor="mm")

    f_box = get_font("bold", 20)
    details = [
        ("NAME OF THE APPLICANT", name_str),
        ("FATHER'S / SPOUSE'S NAME", parent_str),
        ("ANNUAL INCOME", f"Rs. {int(inc_val):,}/-"),
        ("TALUK & DISTRICT", f"{taluk_str}, {dist_str}"),
        ("VALIDITY", "ONE YEAR FROM ISSUE DATE"),
    ]
    dy = by + 80
    for lbl, val in details:
        draw.text((160, dy), f"{lbl} :", font=f_box, fill=(50, 50, 50))
        draw.text((550, dy), val, font=get_font("bold", 22), fill=(10, 10, 10))
        dy += 50

    draw_redacted_qr(draw, (150, 1750, 350, 1950))

    sy = 1750
    draw.rectangle((950, sy, 1480, sy + 200), outline=(20, 80, 20), width=2, fill=(245, 252, 245))
    draw.text((1215, sy + 30), "DIGITALLY SIGNED", font=get_font("bold", 18), fill=(20, 80, 20), anchor="mm")
    draw.text((1215, sy + 65), "TAHSILDAR", font=get_font("bold", 18), fill=(20, 20, 20), anchor="mm")
    draw.text((1215, sy + 95), f"Taluk : {taluk_str}", font=get_font("regular", 18), fill=(30, 30, 30), anchor="mm")
    draw.text((1215, sy + 125), f"District : {dist_str}", font=get_font("regular", 18), fill=(30, 30, 30), anchor="mm")
    draw.text((1215, sy + 155), f"Date : {issue_date}", font=get_font("mono", 16), fill=(50, 50, 50), anchor="mm")

    return img


def render_cbse_marksheet(cohort: dict, roll_no: str, year: str = "2023") -> Image.Image:
    """Renders CBSE Secondary School Examination Marksheet layout."""
    img = Image.new("RGB", (1600, 2250), (250, 252, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((45, 45, 1555, 2205), outline=(30, 70, 120), width=6)

    draw.text((800, 120), "CENTRAL BOARD OF SECONDARY EDUCATION", font=get_font("bold", 34), fill=(25, 65, 115), anchor="mm")
    draw.text((800, 170), "MARKS STATEMENT", font=get_font("bold", 26), fill=(25, 65, 115), anchor="mm")
    draw.text((800, 215), f"SECONDARY SCHOOL EXAMINATION (CLASS X) {year}", font=get_font("bold", 22), fill=(40, 40, 40), anchor="mm")
    draw.line((100, 250, 1500, 250), fill=(30, 70, 120), width=3)

    f_lbl = get_font("bold", 21)
    f_val = get_font("bold", 23)
    y = 300

    draw.text((120, y), "ROLL NO :", font=f_lbl, fill=(30, 30, 30))
    draw.text((650, y), roll_no, font=get_font("mono_bold", 24), fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "CANDIDATE NAME :", font=f_lbl, fill=(30, 30, 30))
    draw.text((650, y), cohort["student_name"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "FATHER'S / GUARDIAN'S NAME :", font=f_lbl, fill=(30, 30, 30))
    draw.text((650, y), cohort["parent_name"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "DATE OF BIRTH :", font=f_lbl, fill=(30, 30, 30))
    draw.text((650, y), cohort["dob"], font=f_val, fill=(10, 10, 10))

    y += 50
    draw.text((120, y), "SCHOOL :", font=f_lbl, fill=(30, 30, 30))
    draw.text((650, y), cohort["school"], font=get_font("bold", 21), fill=(10, 10, 10))

    # CBSE Marks table
    ty = y + 80
    draw.rectangle((120, ty, 1480, ty + 450), outline=(30, 70, 120), width=2)
    draw.line((120, ty + 55, 1480, ty + 55), fill=(30, 70, 120), width=2)
    draw.line((350, ty, 350, ty + 450), fill=(30, 70, 120), width=1)
    draw.line((850, ty, 850, ty + 450), fill=(30, 70, 120), width=1)
    draw.line((1150, ty, 1150, ty + 450), fill=(30, 70, 120), width=1)

    tf = get_font("bold", 20)
    draw.text((235, ty + 18), "SUB CODE", font=tf, fill=(25, 65, 115), anchor="mm")
    draw.text((600, ty + 18), "SUBJECT NAME", font=tf, fill=(25, 65, 115), anchor="mm")
    draw.text((1000, ty + 18), "MARKS (100)", font=tf, fill=(25, 65, 115), anchor="mm")
    draw.text((1315, ty + 18), "GRADE", font=tf, fill=(25, 65, 115), anchor="mm")

    cbse_subs = [
        ("085", "HINDI COURSE-B", "086", "A2"),
        ("184", "ENGLISH LANG & LIT", "091", "A1"),
        ("041", "MATHEMATICS STANDARD", "095", "A1"),
        ("086", "SCIENCE", "088", "A2"),
        ("087", "SOCIAL SCIENCE", "090", "A1"),
    ]
    ry = ty + 65
    tot_score = 0
    for code, s_name, mrk, grd in cbse_subs:
        tot_score += int(mrk)
        draw.text((235, ry + 10), code, font=get_font("mono_bold", 20), fill=(20, 20, 20), anchor="mm")
        draw.text((370, ry + 10), s_name, font=get_font("bold", 20), fill=(20, 20, 20))
        draw.text((1000, ry + 10), mrk, font=get_font("mono_bold", 22), fill=(20, 20, 20), anchor="mm")
        draw.text((1315, ry + 10), grd, font=get_font("bold", 20), fill=(20, 20, 20), anchor="mm")
        draw.line((120, ry + 42, 1480, ry + 42), fill=(220, 220, 220), width=1)
        ry += 44

    draw.line((120, ty + 360, 1480, ty + 360), fill=(30, 70, 120), width=2)
    draw.text((600, ty + 400), "TOTAL MARKS :", font=get_font("bold", 22), fill=(30, 70, 120), anchor="mm")
    draw.text((1000, ty + 400), f"{tot_score} / 500", font=get_font("bold", 26), fill=(10, 10, 10), anchor="mm")
    draw.text((1315, ty + 400), f"PASS ({tot_score/5:.1f}%)", font=get_font("bold", 20), fill=(10, 10, 10), anchor="mm")

    draw.text((800, 2140), "CENTRAL BOARD OF SECONDARY EDUCATION, DELHI", font=get_font("bold", 18), fill=(70, 70, 70), anchor="mm")
    return img


# Degradation functions
def apply_perspective(img: Image.Image) -> Image.Image:
    """Simulates mobile camera desk photograph angle."""
    if cv2 is None:
        return img.rotate(2.5, resample=Image.Resampling.BICUBIC, fillcolor=(240, 238, 230))
    arr = np.array(img)
    h, w = arr.shape[:2]
    offset_x = random.randint(25, 55)
    offset_y = random.randint(15, 45)
    src = np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])
    dst = np.float32([[offset_x, offset_y], [w - 1 - offset_x, 0], [w - 1, h - 1], [0, h - 1 - offset_y]])
    matrix = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(arr, matrix, (w, h), borderValue=(240, 238, 230))
    return Image.fromarray(warped)


def apply_uneven_shadow(img: Image.Image) -> Image.Image:
    """Simulates hand/phone shadow falling across document."""
    shade = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(shade)
    d.polygon([(0, 0), (1100, 0), (600, 2250), (0, 2250)], fill=95)
    blurred_shade = shade.filter(ImageFilter.GaussianBlur(180))
    darkened = ImageEnhance.Brightness(img).enhance(0.45)
    return Image.composite(darkened, img, blurred_shade)


def apply_photocopy_contrast(img: Image.Image) -> Image.Image:
    """Simulates washed-out low contrast photocopy."""
    enh = ImageEnhance.Contrast(img).enhance(0.55)
    return ImageEnhance.Brightness(enh).enhance(1.15)


def apply_faint_printing(img: Image.Image) -> Image.Image:
    """Simulates dot-matrix or faded ribbon printing."""
    enh = ImageEnhance.Contrast(img).enhance(0.40)
    arr = np.asarray(enh).astype(np.int16) + np.random.normal(0, 12, np.asarray(img).shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def apply_stamp_overlap(img: Image.Image) -> Image.Image:
    """Overlaps an additional official purple ink seal directly touching text."""
    copy = img.copy()
    draw = ImageDraw.Draw(copy)
    draw_circular_seal(draw, (750, 480), radius=95, text="GOVT REVENUE DIV")
    return copy


def apply_severe_blur(img: Image.Image) -> Image.Image:
    """Severe optical blur (quarantine test case for safe NOT_DETECTED)."""
    return img.filter(ImageFilter.GaussianBlur(radius=2.2))


def generate_dataset():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)

    manifest_records = []
    image_count = 0

    print("Generating Real-World Validation Dataset...")

    # Document type specs: (type_id, renderer, cert_prefix, has_parent, has_income, has_community)
    doc_specs = [
        ("10th_marksheet", render_tn_sslc, "TN-SSLC", True, False, False),
        ("12th_marksheet", render_tn_hsc, "TN-HSC", True, False, False),
        ("community_certificate", render_tn_community_cert, "TN-52024", True, False, True),
        ("income_certificate", render_tn_income_cert, "TN-INC2026", True, True, False),
    ]

    # Degradation profiles to assign across the dataset
    degradations = [
        ("clean_scan", lambda x: x),
        ("mobile_perspective", apply_perspective),
        ("shadow_uneven", apply_uneven_shadow),
        ("low_contrast_photocopy", apply_photocopy_contrast),
        ("faint_printing", apply_faint_printing),
        ("stamp_overlap", apply_stamp_overlap),
        ("rotated_scan", lambda x: x.rotate(random.uniform(-3.5, 3.5), fillcolor=(250, 248, 240))),
    ]

    # Generate multi-document cohorts
    for cohort_idx, cohort in enumerate(COHORTS):
        c_id = cohort["cohort_id"]
        # Determine available doc types for this cohort (Anitha has only 1 document to test INSUFFICIENT DATA)
        active_specs = doc_specs if c_id != "COHORT_05_ANITHA_PARTIAL" else [doc_specs[0]]

        for dt_idx, (doc_type, renderer, prefix, has_parent, has_inc, has_comm) in enumerate(active_specs):
            cert_no = f"{prefix}-{cohort_idx + 1:02d}{dt_idx + 1:02d}88"
            reg_no = f"74{cohort_idx + 1:02d}{dt_idx + 1:04d}"

            # Base render
            base_img = renderer(cohort, reg_no, cert_no) if "marksheet" in doc_type else renderer(cohort, cert_no)

            # Generate both clean_scan and degraded variant for realistic comparison
            chosen_deg_name, deg_func = degradations[(cohort_idx + dt_idx) % (len(degradations) - 1) + 1]
            variants_to_generate = [("clean_scan", lambda x: x), (chosen_deg_name, deg_func)]

            for var_name, var_func in variants_to_generate:
                processed_img = var_func(base_img)
                img_filename = f"real_{cohort['cohort_id']}_{doc_type}_{var_name}.jpg"
                img_path = IMAGES_DIR / img_filename
                processed_img.save(img_path, "JPEG", quality=88)
                image_count += 1

                # Ground truth record
                gt_name = cohort["alt_names"].get("10th" if doc_type == "10th_marksheet" else "12th" if doc_type == "12th_marksheet" else "community" if doc_type == "community_certificate" else "income", cohort["student_name"])

                record = {
                    "id": f"REAL_VAL_{image_count:04d}",
                    "image_filename": img_filename,
                    "image_path": str(Path("datasets") / "real_validation" / "images" / img_filename).replace("\\", "/"),
                    "cohort_id": cohort["cohort_id"],
                    "document_type": doc_type,
                    "degradation": var_name,
                    "ground_truth": {
                        "studentName": gt_name,
                        "dateOfBirth": cohort["dob"],
                        "parentName": cohort["parent_name"] if has_parent else None,
                        "community": cohort["community"] if has_comm else None,
                        "category": cohort["category"] if has_comm else None,
                        "annualIncome": cohort["income"] if has_inc else None,
                        "certificateNumber": cert_no,
                        "registrationNumber": reg_no if "marksheet" in doc_type else None,
                        "schoolName": cohort["school"] if "marksheet" in doc_type else None,
                        "board": "Tamil Nadu State Board (SSLC)" if doc_type == "10th_marksheet" else "Tamil Nadu Higher Secondary (HSC)" if doc_type == "12th_marksheet" else None,
                        "passingYear": "2021" if doc_type == "10th_marksheet" else "2023" if doc_type == "12th_marksheet" else None,
                        "marks": "449/500" if doc_type == "10th_marksheet" else "540/600" if doc_type == "12th_marksheet" else None,
                        "percentage": "89.8%" if doc_type == "10th_marksheet" else "90.00%" if doc_type == "12th_marksheet" else None,
                        "issueDate": "15-06-2026",
                        "validity": "ONE YEAR" if doc_type == "income_certificate" else None,
                        "issuingAuthority": "Tahsildar" if "certificate" in doc_type else "Department of Government Examinations",
                    },
                "privacy": {
                    "synthetic_authorized": True,
                    "aadhaar_redacted": "XXXX-XXXX-1234",
                    "bank_redacted": "XXXX5678",
                    "contains_real_pii": False,
                },
                    "expected_cross_status": cohort["expected_cross_status"],
                }

                meta_file = METADATA_DIR / f"real_{cohort['cohort_id']}_{doc_type}_{var_name}.json"
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(record, f, indent=2)

                manifest_records.append(record)

    # Add CBSE layout samples
    cbse_cohort = COHORTS[0]
    for deg_name, deg_fn in [("clean", lambda x: x), ("perspective", apply_perspective)]:
        cbse_img = deg_fn(render_cbse_marksheet(cbse_cohort, "8319402"))
        cbse_fn = f"real_CBSE_10th_{deg_name}.jpg"
        cbse_img.save(IMAGES_DIR / cbse_fn, "JPEG", quality=88)
        image_count += 1
        rec = {
            "id": f"REAL_VAL_{image_count:04d}",
            "image_filename": cbse_fn,
            "image_path": str(Path("datasets") / "real_validation" / "images" / cbse_fn).replace("\\", "/"),
            "cohort_id": "CBSE_VALIDATION",
            "document_type": "10th_marksheet",
            "degradation": deg_name,
            "ground_truth": {
                "studentName": cbse_cohort["student_name"],
                "dateOfBirth": cbse_cohort["dob"],
                "parentName": cbse_cohort["parent_name"],
                "certificateNumber": "CBSE-2023-8319402",
                "registrationNumber": "8319402",
                "schoolName": cbse_cohort["school"],
                "board": "CBSE",
                "passingYear": "2023",
                "marks": "450/500",
                "percentage": "90.0%",
                "issueDate": "15-06-2026",
                "issuingAuthority": "Central Board of Secondary Education",
            },
            "privacy": {"synthetic_authorized": True, "contains_real_pii": False},
            "expected_cross_status": "CONSISTENT",
        }
        with open(METADATA_DIR / f"real_CBSE_10th_{deg_name}.json", "w", encoding="utf-8") as f:
            json.dump(rec, f, indent=2)
        manifest_records.append(rec)

    # Add 2 Severe Blur Quarantine Test Cases (Must produce NOT_DETECTED with zero hallucination)
    for q_idx, q_cohort in enumerate([COHORTS[0], COHORTS[1]]):
        q_base = render_tn_community_cert(q_cohort, f"TN-QUARANTINE-{q_idx+1}")
        q_blurred = apply_severe_blur(q_base)
        q_fn = f"real_QUARANTINE_blur_{q_cohort['cohort_id']}.jpg"
        q_blurred.save(IMAGES_DIR / q_fn, "JPEG", quality=85)
        image_count += 1
        rec = {
            "id": f"REAL_VAL_{image_count:04d}",
            "image_filename": q_fn,
            "image_path": str(Path("datasets") / "real_validation" / "images" / q_fn).replace("\\", "/"),
            "cohort_id": q_cohort["cohort_id"],
            "document_type": "community_certificate",
            "degradation": "severe_blur_quarantine",
            "ground_truth": {
                "studentName": q_cohort["student_name"],
                "dateOfBirth": q_cohort["dob"],
                "parentName": q_cohort["parent_name"],
                "certificateNumber": f"TN-QUARANTINE-{q_idx+1}",
                "community": q_cohort["community"],
                "category": q_cohort["category"],
            },
            "privacy": {"synthetic_authorized": True, "contains_real_pii": False},
            "expected_cross_status": "CONSISTENT",
            "is_quarantine_sample": True,
        }
        with open(METADATA_DIR / f"real_QUARANTINE_blur_{q_cohort['cohort_id']}.json", "w", encoding="utf-8") as f:
            json.dump(rec, f, indent=2)
        manifest_records.append(rec)

    # Write manifest real_validation.jsonl
    manifest_path = OUTPUT_DIR / "real_validation.jsonl"
    with open(manifest_path, "w", encoding="utf-8") as f:
        for r in manifest_records:
            f.write(json.dumps(r) + "\n")

    print(f"Generated {image_count} real-world validation certificates in: {OUTPUT_DIR}")
    print(f"Manifest written to: {manifest_path}")


if __name__ == "__main__":
    generate_dataset()
