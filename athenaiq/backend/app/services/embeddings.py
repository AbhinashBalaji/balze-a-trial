import json
import numpy as np

_model = None

# In-memory cache: chunk_id -> np.ndarray (float32)
_embedding_cache: dict[int, np.ndarray] = {}


def get_model():
    """Lazy-load the embedding model so the server boots fast and the
    ~80MB model is only downloaded the first time it's actually needed."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def warmup():
    """Pre-load the model at startup so the first search isn't slow."""
    get_model()


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def embed_query(text: str) -> np.ndarray:
    """Returns a normalized float32 numpy array (not a list)."""
    model = get_model()
    return model.encode([text], normalize_embeddings=True)[0].astype(np.float32)


def get_vectors_for_chunks(chunk_ids: list[int], db) -> np.ndarray:
    """Return a stacked numpy matrix of embeddings for the given chunk IDs.
    Uses the in-memory cache, and bulk-fetches any missing ones from the DB."""
    if not chunk_ids:
        dim = get_model().get_sentence_embedding_dimension()
        return np.empty((0, dim), dtype=np.float32)
        
    missing_ids = [cid for cid in chunk_ids if cid not in _embedding_cache]
    if missing_ids:
        # Import here to avoid circular imports if any
        from app.models import Chunk
        # Bulk query only the missing ones
        missing_rows = db.query(Chunk.id, Chunk.embedding).filter(Chunk.id.in_(missing_ids)).all()
        for row in missing_rows:
            _embedding_cache[row.id] = np.array(json.loads(row.embedding), dtype=np.float32)
            
    # Stack and return matrix for all requested IDs
    # (If a chunk ID somehow doesn't exist, we use a zero vector to avoid crashing)
    vecs = []
    dim = get_model().get_sentence_embedding_dimension()
    for cid in chunk_ids:
        vec = _embedding_cache.get(cid)
        if vec is None:
            vec = np.zeros(dim, dtype=np.float32)
        vecs.append(vec)
    return np.stack(vecs)


def invalidate_cache(chunk_ids: list[int] | None = None):
    """Call this when chunks are deleted/updated. Pass None to clear all."""
    global _embedding_cache
    if chunk_ids is None:
        _embedding_cache = {}
    else:
        for cid in chunk_ids:
            _embedding_cache.pop(cid, None)


def batch_cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Vectorized cosine similarity between a query vector and a matrix of row vectors.
    All inputs must already be L2-normalized (which sentence-transformers guarantees).
    Returns a 1-D array of scores — shape (n_chunks,).
    """
    # Since both query and chunk vectors are unit-normalized, dot product == cosine sim
    return matrix @ query_vec


def cosine_similarity(a, b) -> float:
    """Legacy scalar version kept for compatibility."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def dumps(vec) -> str:
    return json.dumps(vec if isinstance(vec, list) else vec.tolist())


def loads(s: str) -> list[float]:
    return json.loads(s)

