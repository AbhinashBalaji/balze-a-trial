import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.services import embeddings as emb
import json

def test():
    db = SessionLocal()
    import time
    try:
        user = db.query(models.User).first()
        if not user:
            print("No users found")
            return
        print(f"Testing with user: {user.email}")
        
        q = "test query"
        t0 = time.time()
        print("Embedding query...")
        query_vec = emb.embed_query(q)
        
        # Test new deferred loading
        from sqlalchemy.orm import defer
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
            .filter(models.FileDoc.owner_id == user.id)
            .options(defer(models.Chunk.embedding))
        )
        chunks = chunks_query.all()
        print(f"Found {len(chunks)} chunks in {time.time() - t0:.3f}s")
        
        t1 = time.time()
        c_list = [c.id for c, f in chunks]
        matrix = emb.get_vectors_for_chunks(c_list, db)
        semantic_scores = emb.batch_cosine_similarity(query_vec, matrix)
        print(f"Computed similarities in {time.time() - t1:.3f}s")
        
        if len(semantic_scores) > 0:
            print(f"Top score: {max(semantic_scores):.4f}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test()
