#!/usr/bin/env bash
set -euo pipefail
if command -v pdftotext >/dev/null && command -v pdftoppm >/dev/null && command -v pdfinfo >/dev/null && command -v tesseract >/dev/null && tesseract --list-langs 2>/dev/null | grep -q '^ita$'; then
  printf 'Lettura PDF e OCR italiano già disponibili.\n'
  exit 0
fi
if ! command -v apt-get >/dev/null; then
  printf 'Installa Poppler e Tesseract con il modello italiano tramite il gestore pacchetti del server.\n' >&2
  exit 1
fi
if [ "$(id -u)" -eq 0 ]; then
  apt-get update
  apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-ita
else
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-ita
fi
