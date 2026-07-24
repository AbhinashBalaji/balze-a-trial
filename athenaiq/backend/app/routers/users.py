from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from app.database import get_db
from app.auth import get_current_admin_user
from app import models, schemas

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    users = db.query(models.User).all()
    # Map to the format expected by frontend
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.full_name or "Unknown",
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "joined_date": u.created_at.isoformat()
        })
    return {"users": result}


@router.post("/")
def create_user(payload: schemas.UserCreateAdmin, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    from app.auth import hash_password
    from app.email_utils import send_credentials_email
    
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        status="Active",
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    login_link = "http://localhost:5173/login"
    try:
        send_credentials_email(new_user.email, payload.password, login_link)
    except Exception as e:
        print(f"Failed to send credentials email: {e}")
        # Don't fail the user creation if email fails, but you could log it
        
    return {"message": "User created successfully"}


@router.post("/invite")
def invite_user(invite: schemas.InviteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    from app.email_utils import send_invitation_email
    from app.auth import hash_password
    import secrets
    import datetime
    
    existing = db.query(models.User).filter(models.User.email == invite.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    temp_pass = secrets.token_urlsafe(12)
    token = secrets.token_urlsafe(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    
    pending_user = models.User(
        email=invite.email,
        full_name=invite.full_name,
        hashed_password=hash_password(temp_pass),
        role=invite.role,
        status="Pending",
        invite_token=token,
        invite_token_expires=expires
    )
    db.add(pending_user)
    db.commit()

    activation_link = f"http://localhost:5173/accept-invite?token={token}"

    try:
        send_invitation_email(invite.email, activation_link)
    except Exception as e:
        db.delete(pending_user)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
        
    return {"message": f"Invitation sent to {invite.email}"}


@router.get("/invite/verify")
def verify_invite(token: str, db: Session = Depends(get_db)):
    import datetime
    user = db.query(models.User).filter(
        models.User.invite_token == token,
        models.User.status == "Pending"
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or already accepted token")
    if user.invite_token_expires and user.invite_token_expires < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")
        
    return {"message": "Token is valid", "email": user.email, "name": user.full_name}


@router.post("/invite/accept")
def accept_invite(payload: schemas.AcceptInviteRequest, db: Session = Depends(get_db)):
    import datetime
    from app.auth import hash_password
    
    user = db.query(models.User).filter(
        models.User.invite_token == payload.token,
        models.User.status == "Pending"
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    if user.invite_token_expires and user.invite_token_expires < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")
        
    user.hashed_password = hash_password(payload.password)
    user.status = "Active"
    user.invite_token = None
    user.invite_token_expires = None
    
    db.commit()
    return {"message": "Account activated successfully"}


@router.put("/{user_id}/status")
def update_status(user_id: int, payload: schemas.UserUpdateStatus, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.status = payload.status
    db.commit()
    return {"message": "Status updated"}


@router.put("/{user_id}/role")
def update_role(user_id: int, payload: schemas.UserUpdateRole, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user.role = payload.role
    db.commit()
    return {"message": "Role updated"}


@router.put("/{user_id}/reset-password")
def reset_password(user_id: int, payload: schemas.UserResetPassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    from app.auth import hash_password
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.put("/{user_id}")
def edit_user(user_id: int, payload: schemas.UserEdit, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.full_name = payload.full_name
    user.email = payload.email
    db.commit()
    return {"message": "User updated"}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
