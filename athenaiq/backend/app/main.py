from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 - ensures models are registered on Base
from app.routers import auth, files, search, chat, summarize, translate, knowledge_graph, compare, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AthenaIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
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


@app.get("/")
def root():
    return {"status": "ok", "service": "AthenaIQ API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
