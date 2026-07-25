import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app import models
from app.firebase import initialize_firebase

# ensure firebase is initialized
initialize_firebase()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        email = decoded_token.get("email")
        if not email:
            raise credentials_exception
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Auto-create user on first valid Firebase login
        user = models.User(
            email=email,
            full_name=decoded_token.get("name", ""),
            hashed_password="FIREBASE_AUTH_DUMMY",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Auto-elevate admin account if needed
    if email in ["admin@athenaiq.com", "abhinashbala301@gmail.com"]:
        user.role = "Admin"
        super_admin_role = db.query(models.Role).filter(models.Role.role_name == "Super Admin").first()
        if super_admin_role:
            has_admin = any(ur.role_id == super_admin_role.id for ur in user.roles)
            if not has_admin:
                db.add(models.UserRole(user_id=user.id, role_id=super_admin_role.id))
        db.commit()

    return user


def get_current_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    is_admin = False
    for user_role in current_user.roles:
        if user_role.role and user_role.role.role_name in ["Admin", "Super Admin"]:
            is_admin = True
            break
            
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can access this resource"
        )
    return current_user

def require_permissions(required_permissions: list[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        user_perms = set()
        for ur in current_user.roles:
            if ur.role:
                for rp in ur.role.permissions:
                    if rp.permission:
                        user_perms.add(rp.permission.permission_name)
                
        for req_perm in required_permissions:
            if req_perm not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {req_perm}"
                )
        return current_user
    return role_checker
