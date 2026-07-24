import json
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import embeddings as emb
from app.services.groq_client import chat_completion, chat_completion_stream

router = APIRouter(prefix="/files/{file_id}/chat", tags=["chat"])


def _get_accessible_file(file_id: int, db: Session, current_user: models.User) -> models.FileDoc:
    """Allow access if user owns, is admin, or has a share entry."""
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if current_user.role == "Admin" or f.owner_id == current_user.id:
        return f
    share = db.query(models.FileShare).filter(
        models.FileShare.file_id == file_id,
        models.FileShare.user_id == current_user.id,
    ).first()
    if share:
        return f
    raise HTTPException(status_code=403, detail="Not authorized to access this file")


def _parse_groq_json(raw: str) -> dict:
    """Robust extraction of JSON from Groq response even if wrapped in markdown."""
    clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    # Try to extract with regex
    match = re.search(r'\{.*\}', clean, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {"answer": raw, "sources": []}


def _mmr_select(chunks, scores, top_k: int = 6, lambda_: float = 0.6) -> list:
    """
    Maximal Marginal Relevance — picks diverse top chunks to avoid
    sending 6 nearly-identical passages to the LLM.
    """
    if not chunks:
        return []
    import numpy as np
    vecs = np.stack([emb.get_chunk_vector(c.id, c.embedding) for c in chunks])
    selected_indices = []
    remaining = list(range(len(chunks)))

    for _ in range(min(top_k, len(chunks))):
        if not remaining:
            break
        if not selected_indices:
            best = max(remaining, key=lambda i: scores[i])
        else:
            sel_vecs = vecs[selected_indices]
            best = max(
                remaining,
                key=lambda i: lambda_ * scores[i]
                - (1 - lambda_) * float(np.max(sel_vecs @ vecs[i])),
            )
        selected_indices.append(best)
        remaining.remove(best)

    return [chunks[i] for i in selected_indices]


@router.get("/", response_model=list[schemas.ChatMessageOut])
def get_history(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_accessible_file(file_id, db, current_user)
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.file_id == file_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )


@router.post("/", response_model=schemas.ChatMessageOut)
def ask_question(
    file_id: int,
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    f = _get_accessible_file(file_id, db, current_user)

    # ── RAG: embed query, score chunks, MMR diversity select ──────────────
    query_vec = emb.embed_query(payload.question)
    chunks = db.query(models.Chunk).filter(models.Chunk.file_id == f.id).all()

    if chunks:
        import numpy as np
        matrix = np.stack([emb.get_chunk_vector(c.id, c.embedding) for c in chunks])
        scores = emb.batch_cosine_similarity(query_vec, matrix).tolist()
        top_chunks = _mmr_select(chunks, scores, top_k=6)
    else:
        top_chunks = []

    if top_chunks:
        context_lines = [f"[Source {i}]\n{c.content}" for i, c in enumerate(top_chunks)]
        context = "\n\n---\n\n".join(context_lines)
    else:
        context = f.text_content[:6000]

    # Save user message
    user_msg = models.ChatMessage(file_id=f.id, role="user", content=payload.question)
    db.add(user_msg)
    db.commit()

    system_prompt = (
        "You are AthenaIQ, a helpful assistant answering questions about a specific document. "
        "Only use the provided document context to answer. If the answer isn't in the context, "
        "say you couldn't find that in the document. Be concise and precise.\n"
        "Return a valid JSON object: "
        '{"answer": "Your detailed answer here.", "sources": [0, 1]} '
        "where 'sources' lists the [Source X] integers you used. Use empty list if none."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Document context:\n{context}\n\nQuestion: {payload.question}"},
    ]

    try:
        answer_raw = chat_completion(messages, max_tokens=1024)
        parsed = _parse_groq_json(answer_raw)
        answer_text = parsed.get("answer", answer_raw)
        source_indices = parsed.get("sources", [])

        cited_texts = []
        for idx in source_indices:
            try:
                if isinstance(idx, str):
                    m = re.search(r'\d+', idx)
                    idx = int(m.group()) if m else -1
                if isinstance(idx, int) and 0 <= idx < len(top_chunks):
                    cited_texts.append(top_chunks[idx].content)
            except Exception:
                pass

        final_content = json.dumps({"text": answer_text, "citations": cited_texts})
    except Exception:
        final_content = json.dumps({"text": "Sorry, I encountered an error generating a response.", "citations": []})

    assistant_msg = models.ChatMessage(file_id=f.id, role="assistant", content=final_content)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
