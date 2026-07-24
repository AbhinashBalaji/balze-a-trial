import json
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.groq_client import chat_completion

router = APIRouter(prefix="/files/{file_id}/knowledge-graph", tags=["knowledge-graph"])


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    return json.loads(raw)


@router.post("/", response_model=schemas.KnowledgeGraphResponse)
def build_knowledge_graph(
    file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if current_user.role != "Admin" and f.owner_id != current_user.id:
        share = db.query(models.FileShare).filter(
            models.FileShare.file_id == file_id,
            models.FileShare.user_id == current_user.id
        ).first()
        if not share:
            raise HTTPException(status_code=403, detail="Not authorized to access this file")

    text = (f.text_content or "")[:12000]
    if not text.strip():
        raise HTTPException(status_code=400, detail="This file has no extracted text yet")

    system_prompt = (
        "You extract knowledge graphs from documents. Identify the key entities "
        "(people, organizations, concepts, places, dates, products) and the "
        "relationships between them. Respond with ONLY valid JSON, no prose, no "
        "markdown fences, matching exactly this shape:\n"
        '{"nodes": [{"id": "n1", "label": "Entity Name", "type": "person|org|concept|place|date|other"}], '
        '"edges": [{"source": "n1", "target": "n2", "relation": "short relation label"}]}\n'
        "Limit to at most 18 nodes and 25 edges, focusing on the most important entities."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text},
    ]
    raw = chat_completion(messages, temperature=0.1, max_tokens=2000)
    try:
        data = _extract_json(raw)
        return schemas.KnowledgeGraphResponse(**data)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="The AI response could not be parsed into a knowledge graph. Please try again.",
        )
