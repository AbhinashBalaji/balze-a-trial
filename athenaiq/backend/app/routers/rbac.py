from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/rbac", tags=["rbac"])

@router.get("/roles", response_model=List[schemas.RoleOut])
def get_roles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Role).all()

@router.get("/departments", response_model=List[schemas.DepartmentOut])
def get_departments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Department).all()

@router.get("/permissions", response_model=List[schemas.PermissionOut])
def get_permissions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Permission).all()
