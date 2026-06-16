import os
import re
import tempfile
import structlog
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

logger = structlog.get_logger()

pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"


def _ensure_image(file_path: str) -> str:
    """Convert PDF to image if needed. Returns path to an image file."""
    ext = file_path.rsplit(".", 1)[-1].lower()
    if ext != "pdf":
        return file_path

    images = convert_from_path(file_path, first_page=1, last_page=1, dpi=300)
    if not images:
        raise ValueError(f"Could not extract any page from PDF: {file_path}")

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    images[0].save(tmp.name, "PNG")
    logger.info("converted_pdf_to_image", original=file_path, converted=tmp.name)
    return tmp.name

DOC_TYPE_PATTERNS = {
    "AADHAAR": {
        "document_number": r"\d{4}\s?\d{4}\s?\d{4}",
    },
    "PAN": {
        "document_number": r"[A-Z]{5}[0-9]{4}[A-Z]",
    },
    "PASSPORT": {
        "document_number": r"[A-Z]\d{7}",
    },
    "DRIVING_LICENSE": {
        "document_number": r"[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}",
    },
}

DATE_PATTERN = r"\d{2}[/-]\d{2}[/-]\d{4}"
NAME_PATTERNS = [
    re.compile(r"(?:Name|नाम)\s*[:\-]?\s*([A-Za-z\s]+)", re.IGNORECASE),
    re.compile(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", re.MULTILINE),
]
ADDRESS_PATTERNS = [
    re.compile(
        r"(?:Address|पता)\s*[:\-]?\s*(.+?)(?:\n\d{6}|\Z)",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\d+\s+[A-Za-z\s,]+(?:Colony|Road|Street|Nagar|Marg|Bazaar|Market|Extension|Phase)\s*[,\n].*?\d{6}",
        re.IGNORECASE | re.DOTALL,
    ),
]


async def extract_document(file_path: str, doc_type: str) -> dict:
    logger.info("extracting_document", file_path=file_path, doc_type=doc_type)
    try:
        image_path = _ensure_image(file_path)
        img = cv2.imread(image_path)
        if img is None:
            pil_img = Image.open(image_path)
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.error("failed_to_read_image", error=str(e))
        return {
            "extracted_text": "",
            "fields": {
                "name": None,
                "dob": None,
                "document_number": None,
                "address": None,
            },
            "confidence": 0.0,
        }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

    custom_config = "--oem 3 --psm 6"
    extracted_text = pytesseract.image_to_string(gray, config=custom_config)

    fields: dict[str, str | None] = {
        "name": None,
        "dob": None,
        "document_number": None,
        "address": None,
    }

    doc_patterns = DOC_TYPE_PATTERNS.get(doc_type.upper(), {})
    doc_num_pattern = doc_patterns.get("document_number")
    if doc_num_pattern:
        match = re.search(doc_num_pattern, extracted_text)
        if match:
            fields["document_number"] = match.group(0).replace(" ", "")

    date_match = re.search(DATE_PATTERN, extracted_text)
    if date_match:
        fields["dob"] = date_match.group(0)

    for pat in NAME_PATTERNS:
        match = pat.search(extracted_text)
        if match:
            candidate = match.group(1).strip()
            if len(candidate) >= 3 and len(candidate) <= 60:
                fields["name"] = candidate
                break

    for pat in ADDRESS_PATTERNS:
        match = pat.search(extracted_text)
        if match:
            candidate = match.group(1) if pat.groups >= 1 else match.group(0)
            candidate = re.sub(r"\s+", " ", candidate).strip()
            if len(candidate) >= 10:
                fields["address"] = candidate
                break

    found = sum(1 for v in fields.values() if v is not None)
    total = len(fields)
    confidence = found / total if total > 0 else 0.0

    return {
        "extracted_text": extracted_text,
        "fields": fields,
        "confidence": round(confidence, 2),
    }


async def verify_face(selfie_path: str, document_photo_path: str) -> dict:
    logger.info(
        "verifying_face",
        selfie_path=selfie_path,
        document_photo_path=document_photo_path,
    )

    cascade_path = (
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    face_cascade = cv2.CascadeClassifier(cascade_path)

    def load_image(path: str) -> np.ndarray | None:
        try:
            image_path = _ensure_image(path)
            img = cv2.imread(image_path)
            if img is None:
                pil_img = Image.open(image_path)
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            return img
        except Exception as e:
            logger.error("failed_to_load_image", path=path, error=str(e))
            return None

    def detect_largest_face(img: np.ndarray):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50)
        )
        if len(faces) == 0:
            return None
        largest = max(faces, key=lambda r: r[2] * r[3])
        return largest

    selfie_img = load_image(selfie_path)
    doc_img = load_image(document_photo_path)

    if selfie_img is None or doc_img is None:
        return {
            "face_detected_selfie": False,
            "face_detected_document": False,
            "similarity": 0.0,
            "is_match": False,
        }

    selfie_face = detect_largest_face(selfie_img)
    doc_face = detect_largest_face(doc_img)

    selfie_detected = selfie_face is not None
    doc_detected = doc_face is not None

    if not selfie_detected or not doc_detected:
        return {
            "face_detected_selfie": selfie_detected,
            "face_detected_document": doc_detected,
            "similarity": 0.0,
            "is_match": False,
        }

    x1, y1, w1, h1 = selfie_face
    selfie_face_roi = cv2.resize(
        selfie_img[y1 : y1 + h1, x1 : x1 + w1], (100, 100)
    )

    x2, y2, w2, h2 = doc_face
    doc_face_roi = cv2.resize(
        doc_img[y2 : y2 + h2, x2 : x2 + w2], (100, 100)
    )

    selfie_hsv = cv2.cvtColor(selfie_face_roi, cv2.COLOR_BGR2HSV)
    doc_hsv = cv2.cvtColor(doc_face_roi, cv2.COLOR_BGR2HSV)

    hist_bins = [50, 60, 60]
    hist_ranges = [0, 180, 0, 256, 0, 256]
    channels = [0, 1, 2]

    hist1 = cv2.calcHist(
        [selfie_hsv], channels, None, hist_bins, hist_ranges
    )
    hist2 = cv2.calcHist([doc_hsv], channels, None, hist_bins, hist_ranges)

    cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

    similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    similarity = max(0.0, min(1.0, similarity))

    return {
        "face_detected_selfie": True,
        "face_detected_document": True,
        "similarity": round(similarity, 4),
        "is_match": similarity >= 0.5,
    }
