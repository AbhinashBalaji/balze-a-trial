import os
import re
from pypdf import PdfReader
import docx


def extract_text(filepath: str, filetype: str) -> str:
    filetype = filetype.lower()
    try:
        if filetype == "pdf":
            reader = PdfReader(filepath)
            return "\n\n".join((page.extract_text() or "") for page in reader.pages)
        elif filetype == "docx":
            d = docx.Document(filepath)
            return "\n\n".join(p.text for p in d.paragraphs if p.text.strip())
        elif filetype in ("txt", "md", "csv"):
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            return ""
    except Exception as e:
        return f"[Could not extract text: {e}]"


def chunk_text(text: str, max_chars: int = 900, overlap_chars: int = 120) -> list[str]:
    """
    Paragraph-aware chunker:
    1. Split on blank lines (paragraph boundaries).
    2. If a paragraph is bigger than max_chars, split further on sentences.
    3. Accumulate paragraphs into chunks up to max_chars, carrying over
       overlap_chars from the previous chunk for continuity.
    """
    text = text.strip()
    if not text:
        return []

    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    # Further split large paragraphs on sentence boundaries
    sentences: list[str] = []
    for para in paragraphs:
        if len(para) <= max_chars:
            sentences.append(para)
        else:
            # Split on sentence-ending punctuation
            parts = re.split(r'(?<=[.!?])\s+', para)
            sentences.extend(p.strip() for p in parts if p.strip())

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        if current_len + sent_len + 1 > max_chars and current:
            chunk_text_val = " ".join(current)
            chunks.append(chunk_text_val)
            # Carry overlap from end of chunk
            overlap_text = chunk_text_val[-overlap_chars:] if overlap_chars else ""
            current = [overlap_text, sent] if overlap_text else [sent]
            current_len = len(overlap_text) + sent_len + 1
        else:
            current.append(sent)
            current_len += sent_len + 1

    if current:
        chunks.append(" ".join(current))

    return [c.strip() for c in chunks if c.strip()]
