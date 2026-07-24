import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import settings
from app.services.extract import extract_text, chunk_text
from app.services import embeddings as emb

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_TYPES = {"pdf", "docx", "txt", "md", "csv"}


def process_file(file_id: int):
    """Runs after upload: extract text, chunk it, embed it, store it."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
        if not f:
            return
        text = extract_text(f.filepath, f.filetype)
        f.text_content = text
        chunks = chunk_text(text)
        if chunks:
            vectors = emb.embed_texts(chunks)
            for idx, (content, vector) in enumerate(zip(chunks, vectors)):
                db.add(models.Chunk(
                    file_id=f.id, chunk_index=idx, content=content, embedding=emb.dumps(vector)
                ))
        f.status = "ready"
        db.commit()
    except Exception as e:
        f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
        if f:
            f.status = "error"
            f.text_content = f"Error processing file: {e}"
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=schemas.FileOut)
def upload_file(
    background_tasks: BackgroundTasks,
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ext = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    safe_name = f"{uuid.uuid4().hex}_{upload.filename}"
    dest_path = os.path.join(settings.upload_dir, safe_name)
    with open(dest_path, "wb") as buf:
        shutil.copyfileobj(upload.file, buf)

    size = os.path.getsize(dest_path)

    doc = models.FileDoc(
        owner_id=current_user.id,
        filename=upload.filename,
        filepath=dest_path,
        filetype=ext,
        filesize=size,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_file, doc.id)
    return doc


@router.get("/", response_model=list[schemas.FileOut])
def list_files(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "Admin":
        return db.query(models.FileDoc).order_by(models.FileDoc.created_at.desc()).all()
    else:
        return (
            db.query(models.FileDoc)
            .outerjoin(models.FileShare)
            .filter(
                or_(
                    models.FileDoc.owner_id == current_user.id,
                    models.FileShare.user_id == current_user.id
                )
            )
            .order_by(models.FileDoc.created_at.desc())
            .all()
        )


def _get_owned_file(file_id: int, db: Session, current_user: models.User) -> models.FileDoc:
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    
    if current_user.role == "Admin":
        return f
    if f.owner_id == current_user.id:
        return f
        
    share = db.query(models.FileShare).filter(
        models.FileShare.file_id == file_id,
        models.FileShare.user_id == current_user.id
    ).first()
    if share:
        return f
        
    raise HTTPException(status_code=403, detail="Not authorized to access this file")


@router.get("/{file_id}", response_model=schemas.FileDetailOut)
def get_file(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return _get_owned_file(file_id, db, current_user)


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    f = _get_owned_file(file_id, db, current_user)
    if os.path.exists(f.filepath):
        os.remove(f.filepath)
    db.delete(f)
    db.commit()
    return {"ok": True}


@router.get("/{file_id}/dashboard")
def file_dashboard(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Lightweight, useful stats for the Dashboard page - no extra LLM calls."""
    f = _get_owned_file(file_id, db, current_user)
    words = f.text_content.split() if f.text_content else []
    chunk_count = db.query(models.Chunk).filter(models.Chunk.file_id == f.id).count()
    return {
        "word_count": len(words),
        "character_count": len(f.text_content or ""),
        "chunk_count": chunk_count,
        "status": f.status,
        "filetype": f.filetype,
        "filesize": f.filesize,
    }


# --- Sharing Endpoints ---

from app.auth import get_current_admin_user

@router.get("/{file_id}/shares", response_model=list[schemas.FileShareOut])
def get_file_shares(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    return db.query(models.FileShare).filter(models.FileShare.file_id == file_id).all()

@router.post("/{file_id}/shares", response_model=schemas.FileShareOut)
def share_file(file_id: int, payload: schemas.FileShareCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    f = db.query(models.FileDoc).filter(models.FileDoc.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
        
    existing = db.query(models.FileShare).filter(
        models.FileShare.file_id == file_id,
        models.FileShare.user_id == payload.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has access")
        
    share = models.FileShare(
        file_id=file_id,
        user_id=payload.user_id,
        permission=payload.permission
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return share

@router.put("/shares/{share_id}", response_model=schemas.FileShareOut)
def update_share(share_id: int, payload: schemas.FileShareUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    share = db.query(models.FileShare).filter(models.FileShare.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
        
    share.permission = payload.permission
    db.commit()
    db.refresh(share)
    return share

@router.delete("/shares/{share_id}")
def revoke_share(share_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    share = db.query(models.FileShare).filter(models.FileShare.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
        
    db.delete(share)
    db.commit()
    return {"message": "Access revoked"}
