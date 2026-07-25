from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import requests
import datetime
import secrets
import hashlib
from firebase_admin import auth as firebase_admin_auth

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import settings
from app.email_utils import send_otp_email
from app.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

@router.post("/login")
def login(payload: schemas.OTPLoginRequest, request: Request, db: Session = Depends(get_db)):
    if not settings.firebase_api_key:
        raise HTTPException(status_code=500, detail="Firebase API Key is not configured on the backend.")

    # 1. Verify credentials using Firebase REST API
    verify_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={settings.firebase_api_key}"
    resp = requests.post(verify_url, json={
        "email": payload.email,
        "password": payload.password,
        "returnSecureToken": True
    })

    if resp.status_code != 200:
        error_msg = resp.json().get("error", {}).get("message", "Invalid credentials")
        log_audit_event(db, "User Login", "Authentication", "Failed", email=payload.email, description=error_msg, request=request)
        raise HTTPException(status_code=401, detail=error_msg)
    
    # 2. Get user by email in our DB
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        # If valid in Firebase but not in DB, auto-create them like get_current_user does
        user = models.User(
            email=payload.email,
            full_name=resp.json().get("displayName", ""),
            hashed_password="FIREBASE_AUTH_DUMMY",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Auto-elevate admin account if needed
    if payload.email in ["admin@athenaiq.com", "abhinashbala301@gmail.com"]:
        super_admin_role = db.query(models.Role).filter(models.Role.role_name == "Super Admin").first()
        if super_admin_role:
            has_admin = any(ur.role_id == super_admin_role.id for ur in user.roles)
            if not has_admin:
                db.add(models.UserRole(user_id=user.id, role_id=super_admin_role.id))
                db.commit()

    # 3. Generate OTP
    otp = str(secrets.randbelow(1000000)).zfill(6)
    otp_hash = _hash_otp(otp)

    # Invalidate previous unexpired OTPs for this user
    db.query(models.OTPVerification).filter(
        models.OTPVerification.user_id == user.id,
        models.OTPVerification.used == False
    ).update({"used": True})

    # Save new OTP
    verification = models.OTPVerification(
        user_id=user.id,
        otp_hash=otp_hash,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    )
    db.add(verification)
    db.commit()

    # 4. Send email
    try:
        send_otp_email(user.email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

    return {"message": "OTP sent"}


@router.post("/verify-otp")
def verify_otp(payload: schemas.VerifyOTPRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    verification = db.query(models.OTPVerification).filter(
        models.OTPVerification.user_id == user.id,
        models.OTPVerification.used == False,
        models.OTPVerification.expires_at > datetime.datetime.utcnow()
    ).order_by(models.OTPVerification.created_at.desc()).first()

    if not verification:
        raise HTTPException(status_code=400, detail="No valid OTP found")

    if verification.attempts_remaining <= 0:
        verification.used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum attempts reached. Please request a new OTP.")

    if verification.otp_hash != _hash_otp(payload.otp):
        verification.attempts_remaining -= 1
        db.commit()
        log_audit_event(db, "OTP Verification", "Authentication", "Failed", user=user, description="Invalid OTP", request=request)
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # OTP is valid
    verification.used = True
    db.commit()

    try:
        fb_user = firebase_admin_auth.get_user_by_email(user.email)
        custom_token_bytes = firebase_admin_auth.create_custom_token(fb_user.uid)
        custom_token = custom_token_bytes.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase Error: {str(e)}")

    log_audit_event(db, "User Login", "Authentication", "Success", user=user, description="Logged in via OTP", request=request)
    return {"token": custom_token}


@router.post("/resend-otp")
def resend_otp(payload: schemas.ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Invalidate old ones
    db.query(models.OTPVerification).filter(
        models.OTPVerification.user_id == user.id,
        models.OTPVerification.used == False
    ).update({"used": True})

    otp = str(secrets.randbelow(1000000)).zfill(6)
    
    verification = models.OTPVerification(
        user_id=user.id,
        otp_hash=_hash_otp(otp),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    )
    db.add(verification)
    db.commit()

    try:
        send_otp_email(user.email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to resend OTP email")

    return {"message": "OTP resent"}

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password requirement satisfied"}
