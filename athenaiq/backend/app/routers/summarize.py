from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.groq_client import chat_completion

router = APIRouter(prefix="/files/{file_id}/summarize", tags=["summarize"])


@router.post("/", response_model=schemas.FileDetailOut)
def summarize(
    file_id: int,
    payload: schemas.SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    # Allow owner, admin, or shared user
    if current_user.role != "Admin" and f.owner_id != current_user.id:
        share = db.query(models.FileShare).filter(
            models.FileShare.file_id == file_id,
            models.FileShare.user_id == current_user.id
        ).first()
        if not share:
            raise HTTPException(status_code=403, detail="Not authorized to access this file")

    text = (f.text_content or "")[:20000]  # keep prompt within a safe size
    if not text.strip():
        raise HTTPException(status_code=400, detail="This file has no extracted text yet")

    if payload.mode == "detailed":
        if f.summary_detailed:
            return f
        instruction = (
            "Write a thorough, well-structured summary of this document. Use short "
            "headings and bullet points where useful. Cover all key sections, "
            "arguments, findings, and conclusions."
        )
    else:
        if f.summary_brief:
            return f
        instruction = (
            "Write a brief summary of this document in 3-5 sentences, capturing "
            "only the most important points."
        )

    messages = [
        {"role": "system", "content": "You are AthenaIQ, an expert document summarizer."},
        {"role": "user", "content": f"{instruction}\n\nDocument:\n{text}"},
    ]
    result = chat_completion(messages, max_tokens=1500)

    if payload.mode == "detailed":
        f.summary_detailed = result
    else:
        f.summary_brief = result
    db.commit()
    db.refresh(f)
    return f
