import json
import numpy as np
from functools import lru_cache

_model = None


def get_model():
    """Lazy-load the embedding model so the server boots fast and the
    ~80MB model is only downloaded the first time it's actually needed."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def embed_query(text: str) -> list[float]:
    model = get_model()
    return model.encode([text], normalize_embeddings=True)[0].tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def dumps(vec: list[float]) -> str:
    return json.dumps(vec)


def loads(s: str) -> list[float]:
    return json.loads(s)
