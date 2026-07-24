import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.services import embeddings as emb
import json

def test():
    db = SessionLocal()
    try:
        user = db.query(models.User).first()
        if not user:
            print("No users found")
            return
        print(f"Testing with user: {user.email}")
        
        q = "test query"
        print("Embedding query...")
        query_vec = emb.embed_query(q)
        print(f"Query embedded, dim: {len(query_vec)}")
        
        chunks_query = (
            db.query(models.Chunk, models.FileDoc)
            .join(models.FileDoc, models.Chunk.file_id == models.FileDoc.id)
            .filter(models.FileDoc.owner_id == user.id)
        )
        chunks = chunks_query.all()
        print(f"Found {len(chunks)} chunks for user")
        
        scored = []
        for chunk, fdoc in chunks:
            try:
                vec = emb.loads(chunk.embedding)
                score = emb.cosine_similarity(query_vec, vec)
                scored.append((score, chunk, fdoc))
            except Exception as e:
                print(f"Error scoring chunk {chunk.id}: {e}")
        
        scored.sort(key=lambda x: x[0], reverse=True)
        print("Scoring successful.")
        if scored:
            print(f"Top score: {scored[0][0]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test()
