from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import embeddings as emb
from app.services.groq_client import chat_completion

router = APIRouter(prefix="/files/{file_id}/chat", tags=["chat"])


def _get_owned_file(file_id: int, db: Session, current_user: models.User) -> models.FileDoc:
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f or f.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")
    return f


@router.get("/", response_model=list[schemas.ChatMessageOut])
def get_history(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _get_owned_file(file_id, db, current_user)
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
    f = _get_owned_file(file_id, db, current_user)

    # Retrieve the most relevant chunks for this question (RAG)
    query_vec = emb.embed_query(payload.question)
    chunks = db.query(models.Chunk).filter(models.Chunk.file_id == f.id).all()
    scored = sorted(
        chunks,
        key=lambda c: emb.cosine_similarity(query_vec, emb.loads(c.embedding)),
        reverse=True,
    )
    top_chunks = scored[:6]
    
    if top_chunks:
        context_lines = []
        for i, c in enumerate(top_chunks):
            context_lines.append(f"[Source {i}]\n{c.content}")
        context = "\n\n---\n\n".join(context_lines)
    else:
        context = f.text_content[:6000]

    # Save the user's question
    user_msg = models.ChatMessage(file_id=f.id, role="user", content=payload.question)
    db.add(user_msg)
    db.commit()

    system_prompt = (
        "You are AthenaIQ, a helpful assistant answering questions about a specific document. "
        "Only use the provided document context to answer. If the answer isn't in the context, "
        "say you couldn't find that in the document. Be concise and precise.\n"
        "You MUST return your response as a valid JSON object in the exact following format: "
        '{"answer": "Your detailed answer here.", "sources": [0, 1]} '
        "where 'sources' is a list of the [Source X] integers you used to form your answer. If no sources used, return empty list."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Document context:\n{context}\n\nQuestion: {payload.question}"},
    ]
    
    try:
        import json
        answer_raw = chat_completion(messages)
        clean_json = answer_raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean_json)
        answer_text = parsed.get("answer", answer_raw)
        source_indices = parsed.get("sources", [])
        
        cited_texts = []
        for idx in source_indices:
            try:
                if isinstance(idx, str):
                    import re
                    match = re.search(r'\d+', idx)
                    if match:
                        idx = int(match.group())
                
                if isinstance(idx, int) and 0 <= idx < len(top_chunks):
                    cited_texts.append(top_chunks[idx].content)
            except Exception:
                pass
        
        final_content = json.dumps({"text": answer_text, "citations": cited_texts})
    except Exception as e:
        import json
        final_content = json.dumps({"text": answer_raw if 'answer_raw' in locals() else "Sorry, I encountered an error.", "citations": []})

    assistant_msg = models.ChatMessage(file_id=f.id, role="assistant", content=final_content)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
