import os
from pypdf import PdfReader
import docx


def extract_text(filepath: str, filetype: str) -> str:
    filetype = filetype.lower()
    try:
        if filetype == "pdf":
            reader = PdfReader(filepath)
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        elif filetype in ("docx",):
            d = docx.Document(filepath)
            return "\n".join(p.text for p in d.paragraphs)
        elif filetype in ("txt", "md", "csv"):
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            return ""
    except Exception as e:
        return f"[Could not extract text: {e}]"


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
        if start <= 0:
            break
    return [c.strip() for c in chunks if c.strip()]
