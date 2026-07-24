from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 - ensures models are registered on Base
from app.routers import auth, files, search, chat, summarize, translate, knowledge_graph, compare, users, rbac

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AthenaIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(files.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(summarize.router)
app.include_router(translate.router)
app.include_router(knowledge_graph.router)
app.include_router(compare.router)
app.include_router(users.router)
app.include_router(rbac.router)


@app.on_event("startup")
def startup_event():
    """Pre-load the embedding model so the first search is instant and seed db."""
    try:
        from app.services.embeddings import warmup
        warmup()
        print("SUCCESS: Embedding model warmed up.")
    except Exception as e:
        print(f"WARNING: Model warmup failed (non-fatal): {e}")
        
    try:
        import seed_rbac
        seed_rbac.seed_rbac()
    except Exception as e:
        print(f"WARNING: DB Seed failed: {e}")


@app.get("/")
def root():
    return {"status": "ok", "service": "AthenaIQ API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
