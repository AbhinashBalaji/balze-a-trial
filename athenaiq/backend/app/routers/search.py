from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import embeddings as emb

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=schemas.SearchResponse)
def semantic_search(
    q: str,
    file_id: Optional[int] = None,
    top_k: int = 8,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query_vec = emb.embed_query(q)

    if current_user.role == "Admin":
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
        )
    else:
        accessible_file_ids = [f[0] for f in db.query(models.FileDoc.id).filter(models.FileDoc.owner_id == current_user.id).all()]
        shared_file_ids = [s[0] for s in db.query(models.FileShare.file_id).filter(models.FileShare.user_id == current_user.id).all()]
        allowed_ids = list(set(accessible_file_ids + shared_file_ids))
        
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
        )
        if allowed_ids:
            chunks_query = chunks_query.filter(models.FileDoc.id.in_(allowed_ids))
        else:
            # If no files are allowed, return empty
            chunks_query = chunks_query.filter(models.FileDoc.id == -1)
    if file_id:
        chunks_query = chunks_query.filter(models.FileDoc.id == file_id)

    import os
    query_lower = q.lower()
    scored = []
    for chunk, fdoc in chunks_query.all():
        score = emb.cosine_similarity(query_vec, emb.loads(chunk.embedding))
        
        filename_no_ext = os.path.splitext(fdoc.filename)[0].lower()
        if filename_no_ext and filename_no_ext in query_lower:
            score += 0.5
            
        scored.append((score, chunk, fdoc))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    results = [
        schemas.SearchResultItem(
            file_id=fdoc.id,
            filename=fdoc.filename,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            score=round(score, 4),
        )
        for score, chunk, fdoc in top
    ]

    answer = None
    if results:
        context = ""
        for score, chunk, fdoc in top:
            context += f"[Document: {fdoc.filename}]\n{chunk.content}\n\n---\n\n"
        
        system_prompt = (
            "You are AthenaIQ, an AI assistant answering questions based on the provided search results. "
            "Use the provided context to answer the user's question concisely. "
            "If the context does not contain the answer, say that you cannot find the answer in the documents. "
            "Do not invent information."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {q}"}
        ]
        try:
            from app.services.groq_client import chat_completion
            answer = chat_completion(messages)
        except Exception as e:
            print("Groq Error:", e)
            answer = "Sorry, I could not generate an answer at this time."

    return schemas.SearchResponse(results=results, answer=answer)
