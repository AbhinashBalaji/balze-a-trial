import json
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.groq_client import chat_completion

router = APIRouter(prefix="/compare", tags=["compare"])


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    return json.loads(raw)


@router.post("/", response_model=schemas.CompareResponse)
def compare_documents(
    payload: schemas.CompareRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    a = db.query(models.FileDoc).filter(models.FileDoc.id == payload.file_id_a).first()
    b = db.query(models.FileDoc).filter(models.FileDoc.id == payload.file_id_b).first()
    if not a or a.owner_id != current_user.id or not b or b.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="One or both files were not found")

    text_a = (a.text_content or "")[:8000]
    text_b = (b.text_content or "")[:8000]
    if not text_a.strip() or not text_b.strip():
        raise HTTPException(status_code=400, detail="Both files need extracted text before comparing")

    system_prompt = (
        "You compare two documents for a user. Respond with ONLY valid JSON, no "
        "markdown fences, matching exactly:\n"
        '{"similarities": "...", "differences": "...", "verdict": "..."}\n'
        "Use short paragraphs or bullet points (as plain text with '- ') inside each "
        "string. 'verdict' is a 1-2 sentence takeaway about how the documents relate."
    )
    user_prompt = (
        f"Document A ({a.filename}):\n{text_a}\n\n---\n\nDocument B ({b.filename}):\n{text_b}"
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    raw = chat_completion(messages, temperature=0.2, max_tokens=1800)
    try:
        data = _extract_json(raw)
        return schemas.CompareResponse(**data)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="The AI response could not be parsed. Please try again.",
        )
