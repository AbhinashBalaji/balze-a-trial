from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.groq_client import chat_completion

router = APIRouter(prefix="/files/{file_id}/translate", tags=["translate"])


@router.post("/", response_model=schemas.TranslateResponse)
def translate(
    file_id: int,
    payload: schemas.TranslateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f or f.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    text = (f.text_content or "")[:15000]
    if not text.strip():
        raise HTTPException(status_code=400, detail="This file has no extracted text yet")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional translator. Translate the user's document into "
                f"{payload.target_language}. Preserve the original meaning, tone, and "
                "paragraph structure. Output only the translation, nothing else."
            ),
        },
        {"role": "user", "content": text},
    ]
    translated = chat_completion(messages, max_tokens=4000)
    return schemas.TranslateResponse(translated_text=translated)
