import re
import os
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, defer
import numpy as np

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import embeddings as emb

router = APIRouter(prefix="/search", tags=["search"])

# Fast model for search answers (instant response, ~10x faster than 70b)
SEARCH_ANSWER_MODEL = "llama-3.1-8b-instant"


def _keyword_score(words: list[str], content: str) -> float:
    """Simple TF-style keyword score: fraction of unique query words found in chunk."""
    if not words:
        return 0.0
    content_lower = content.lower()
    hits = sum(1 for w in words if w in content_lower)
    return hits / len(words)


@router.get("/", response_model=schemas.SearchResponse)
def semantic_search(
    q: str,
    file_id: Optional[int] = None,
    top_k: int = 8,
    mode: str = "hybrid",   # semantic | keyword | hybrid
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query_lower = q.lower()

    if current_user.role == "Admin":
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
            .options(defer(models.Chunk.embedding))
        )
    else:
        owned_ids = [r[0] for r in db.query(models.FileDoc.id).filter(
            models.FileDoc.owner_id == current_user.id).all()]
        shared_ids = [r[0] for r in db.query(models.FileShare.file_id).filter(
            models.FileShare.user_id == current_user.id).all()]
        allowed_ids = list(set(owned_ids + shared_ids))
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
            .options(defer(models.Chunk.embedding))
        )
        if allowed_ids:
            chunks_query = chunks_query.filter(models.FileDoc.id.in_(allowed_ids))
        else:
            chunks_query = chunks_query.filter(models.FileDoc.id == -1)

    if file_id:
        chunks_query = chunks_query.filter(models.FileDoc.id == file_id)

    rows = chunks_query.all()
    if not rows:
        return schemas.SearchResponse(results=[], answer=None,
                                      search_mode=mode, total_chunks_scanned=0)

    # ── 2. Build embedding matrix once (using in-memory cache) ────────────
    chunks, fdocs = zip(*rows)  # unzip

    # ── 3. Score based on mode ─────────────────────────────────────────────
    if mode in ("semantic", "hybrid"):
        query_vec = emb.embed_query(q)  # np.ndarray, already normalized
        # Get stacked matrix from cache (or db if missing)
        matrix = emb.get_vectors_for_chunks([c.id for c in chunks], db)
        semantic_scores = emb.batch_cosine_similarity(query_vec, matrix)
    else:
        semantic_scores = np.zeros(len(chunks))

    # Keyword scores
    if mode in ("keyword", "hybrid"):
        query_words = [w for w in re.split(r"\W+", query_lower) if len(w) > 2]
        keyword_scores = np.array([_keyword_score(query_words, c.content) for c in chunks])
    else:
        keyword_scores = np.zeros(len(chunks))

    # Combine scores
    alpha = 0.7 if mode == "hybrid" else (1.0 if mode == "semantic" else 0.0)
    final_scores = alpha * semantic_scores + (1.0 - alpha) * keyword_scores

    # Filename boost
    for i, fdoc in enumerate(fdocs):
        fname = os.path.splitext(fdoc.filename)[0].lower()
        if fname and fname in query_lower:
            final_scores[i] += 0.25

    # ── 4. Pick top-k ─────────────────────────────────────────────────────
    top_indices = np.argpartition(final_scores, -min(top_k, len(final_scores)))[-top_k:]
    top_indices = top_indices[np.argsort(final_scores[top_indices])[::-1]]

    results = [
        schemas.SearchResultItem(
            file_id=fdocs[i].id,
            filename=fdocs[i].filename,
            chunk_index=chunks[i].chunk_index,
            content=chunks[i].content,
            score=round(float(final_scores[i]), 4),
        )
        for i in top_indices
        if final_scores[i] > 0
    ]

    # ── 5. RAG answer using fast model ─────────────────────────────────────
    answer = None
    if results:
        context = ""
        for idx, r in enumerate(results[:5]):   # limit context to top-5
            context += f"[Doc {idx}: {r.filename}]\n{r.content}\n\n---\n\n"

        system_prompt = (
            "You are AthenaIQ, an advanced AI answering questions strictly based on the search results provided. "
            "Answer completely but concisely using ONLY the provided context. "
            "If the context lacks the answer, say 'I do not have enough information to answer that.' Do NOT invent facts.\n"
            "You MUST include citations in your answer when referencing facts, using the format [Doc X: filename]."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {q}"},
        ]
        try:
            from app.services.groq_client import chat_completion
            answer = chat_completion(messages, max_tokens=400, model_override=SEARCH_ANSWER_MODEL)
        except Exception as e:
            print("Groq Search Error:", e)
            answer = None

    # Log search
    try:
        db.add(models.SearchLog(
            user_id=current_user.id,
            query=q,
            search_mode=mode,
            result_count=len(results)
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        print("Log error:", e)

    return schemas.SearchResponse(
        results=results,
        answer=answer,
        search_mode=mode,
        total_chunks_scanned=len(rows),
    )
