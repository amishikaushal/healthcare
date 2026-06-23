#!/usr/bin/env python3
"""
RecoveryOS OCR Script
Called by Node.js as a child process.

Usage:
  python3 ocr_worker.py <input_file> <mime_type>

Output:
  Prints a JSON object to stdout:
  {"success": true, "text": "...extracted text..."}
  or
  {"success": false, "error": "..."}
"""

import sys
import os
import json
import re
import tempfile


def clean_medical_report(text: str) -> str:
    """
    Port of preprocess.py — cleans and normalises raw OCR text.
    """
    # 1. Noise removal
    noise_patterns = [
        r"Regd\. Office:.*", r"Corporate Identity.*",
        r"Tel:? \+[\d\s-]+",  r"Fax:? \+[\d\s-]+",
        r"The following table:", r"\""
    ]
    cleaned = text
    for pattern in noise_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # 2. OCR corrections
    corrections = {
        r"Simdmas": "Symptoms", r"fibere": "fever",
        r"antibotics": "antibiotics", r"Ibuprof\b": "Ibuprofen",
        r"Amoxicline": "Amoxicillin", r"ho3": "hours"
    }
    for pattern, replacement in corrections.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # 3. Semantic headers
    headers = ["Diagnosis", "Diagnostic", "Symptoms", "Prescription",
               "Treatment", "Next Appointment", "UHID", "History"]
    for header in headers:
        cleaned = re.sub(
            rf"^\s*({header})\b",
            r"[\1]",
            cleaned,
            flags=re.IGNORECASE | re.MULTILINE
        )

    # 4. Cleanup
    cleaned = re.sub(r"[|®¢©*»+]", "•", cleaned)
    cleaned = re.sub(r"^\s*e\s+", "• ", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.replace("[[", "[").replace("]]", "]")
    cleaned = re.sub(r"\n\s*\n", "\n", cleaned).strip()

    return cleaned


def detect_and_translate(text: str) -> str:
    """
    Detect language; if not English, translate via Google Translate
    (free unofficial endpoint — same as translate_utils.py).
    """
    try:
        from langdetect import detect
        lang = detect(text[:500])
    except Exception:
        lang = "en"

    if lang == "en":
        return text

    import requests
    MAX_CHARS = 4500
    chunks = [text[i:i + MAX_CHARS] for i in range(0, len(text), MAX_CHARS)]
    translated_parts = []
    url = "https://translate.googleapis.com/translate_a/single"

    for chunk in chunks:
        try:
            params = {"client": "gtx", "sl": lang, "tl": "en", "dt": "t", "q": chunk}
            resp   = requests.get(url, params=params, timeout=15)
            result = resp.json()
            translated_parts.append("".join([p[0] for p in result[0] if p[0]]))
        except Exception:
            translated_parts.append(chunk)

    return " ".join(translated_parts)


def enhance_image(pil_img):
    """
    Port of enhance_image_for_ocr() from main.py —
    grayscale + Otsu threshold + dilate/erode for max OCR accuracy.
    """
    import cv2
    import numpy as np
    from PIL import Image

    img  = np.array(pil_img)
    img  = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    _, processed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel    = np.ones((1, 1), np.uint8)
    processed = cv2.dilate(processed, kernel, iterations=1)
    processed = cv2.erode(processed, kernel, iterations=1)

    return Image.fromarray(processed)


def ocr_pdf(file_path: str) -> str:
    import pytesseract
    from pdf2image import convert_from_path

    # Tesseract binary location (Homebrew on Mac)
    pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

    pages     = convert_from_path(file_path, dpi=200)
    full_text = ""

    for page in pages:
        enhanced  = enhance_image(page)
        text      = pytesseract.image_to_string(enhanced, lang="eng+fra+spa")
        full_text += text + "\n"

    return full_text


def ocr_image(file_path: str) -> str:
    import pytesseract
    from PIL import Image

    pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

    img      = Image.open(file_path).convert("RGB")
    enhanced = enhance_image(img)
    return pytesseract.image_to_string(enhanced, lang="eng+fra+spa")


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: ocr_worker.py <file_path> <mime_type>"}))
        sys.exit(1)

    file_path = sys.argv[1]
    mime_type = sys.argv[2]

    if not os.path.exists(file_path):
        print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
        sys.exit(1)

    try:
        if mime_type == "application/pdf":
            raw_text = ocr_pdf(file_path)
        elif mime_type.startswith("image/"):
            raw_text = ocr_image(file_path)
        else:
            print(json.dumps({"success": False, "error": f"Unsupported mime type: {mime_type}"}))
            sys.exit(1)

        # Translate if needed
        translated = detect_and_translate(raw_text)

        # Clean and structure
        cleaned = clean_medical_report(translated)

        print(json.dumps({"success": True, "text": cleaned}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
