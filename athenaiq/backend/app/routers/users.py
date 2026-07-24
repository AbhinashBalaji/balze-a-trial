from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime
import secrets

from app.database import get_db
from app.auth import get_current_admin_user
from app import models, schemas
from firebase_admin import auth as firebase_auth
from app.email_utils import send_credentials_email, send_invitation_email

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    users = db.query(models.User).all()
    # Map to the format expected by frontend
    result = []
    for u in users:
        role_names = [ur.role.role_name for ur in u.roles if ur.role]
        role_display = role_names[0] if role_names else "User"
        
        result.append({
            "id": u.id,
            "name": u.full_name or "Unknown",
            "email": u.email,
            "role": role_display,
            "role_id": u.roles[0].role_id if u.roles else None,
            "department": u.department.department_name if u.department else "None",
            "department_id": u.department_id,
            "status": u.status,
            "joined_date": u.created_at.isoformat()
        })
    return {"users": result}


@router.post("/")
def create_user(payload: schemas.UserCreateAdmin, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists in db")
    
    try:
        firebase_auth.create_user(
            email=payload.email,
            password=payload.password,
            display_name=payload.full_name
        )
    except Exception as e:
        if "already exists" in str(e).lower() or "email-already-exists" in str(e):
            pass # ignore if they already exist in firebase
        else:
            raise HTTPException(status_code=400, detail=f"Firebase Error: {str(e)}")
            
    new_user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password="FIREBASE_AUTH",
        department_id=payload.department_id,
        status="Active",
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    user_role = models.UserRole(user_id=new_user.id, role_id=payload.role_id)
    db.add(user_role)
    db.commit()
    
    login_link = "http://localhost:5173/login"
    try:
        send_credentials_email(new_user.email, payload.password, login_link)
    except Exception as e:
        print(f"Failed to send credentials email: {e}")
        
    return {"message": "User created successfully"}


@router.post("/invite")
def invite_user(invite: schemas.InviteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    existing = db.query(models.User).filter(models.User.email == invite.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    temp_pass = secrets.token_urlsafe(12)
    token = secrets.token_urlsafe(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    
    try:
        firebase_auth.create_user(
            email=invite.email,
            password=temp_pass,
            display_name=invite.full_name
        )
    except Exception as e:
        if "already exists" not in str(e).lower() and "email-already-exists" not in str(e):
            raise HTTPException(status_code=400, detail=f"Firebase Error: {str(e)}")

    pending_user = models.User(
        email=invite.email,
        full_name=invite.full_name,
        hashed_password="FIREBASE_AUTH",
        department_id=invite.department_id,
        status="Pending",
        invite_token=token,
        invite_token_expires=expires
    )
    db.add(pending_user)
    db.commit()
    db.refresh(pending_user)

    user_role = models.UserRole(user_id=pending_user.id, role_id=invite.role_id)
    db.add(user_role)
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
    user = db.query(models.User).filter(
        models.User.invite_token == payload.token,
        models.User.status == "Pending"
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    if user.invite_token_expires and user.invite_token_expires < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")
        
    try:
        fb_user = firebase_auth.get_user_by_email(user.email)
        firebase_auth.update_user(fb_user.uid, password=payload.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Firebase Error: {str(e)}")
        
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
    
    try:
        fb_user = firebase_auth.get_user_by_email(user.email)
        firebase_auth.update_user(fb_user.uid, disabled=(payload.status != "Active"))
    except:
        pass
        
    return {"message": "Status updated"}


@router.put("/{user_id}/role")
def update_role(user_id: int, payload: schemas.UserUpdateRole, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    db.query(models.UserRole).filter(models.UserRole.user_id == user_id).delete()
    new_role = models.UserRole(user_id=user_id, role_id=payload.role_id)
    db.add(new_role)
    db.commit()
    return {"message": "Role updated"}


@router.put("/{user_id}/reset-password")
def reset_password(user_id: int, payload: schemas.UserResetPassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        fb_user = firebase_auth.get_user_by_email(user.email)
        firebase_auth.update_user(fb_user.uid, password=payload.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Firebase Error: {str(e)}")
        
    db.commit()
    return {"message": "Password reset successfully"}


@router.put("/{user_id}")
def edit_user(user_id: int, payload: schemas.UserEdit, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        fb_user = firebase_auth.get_user_by_email(user.email)
        firebase_auth.update_user(fb_user.uid, email=payload.email, display_name=payload.full_name)
    except:
        pass
        
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
    
    try:
        fb_user = firebase_auth.get_user_by_email(user.email)
        firebase_auth.delete_user(fb_user.uid)
    except:
        pass
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
