import datetime
import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

def _require_admin(current_user: models.User):
    if current_user.role not in ["Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to access Audit Logs")

@router.get("/logs", response_model=schemas.PaginatedAuditLogs)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    department: Optional[str] = None,
    module: Optional[str] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    _require_admin(current_user)
    
    query = db.query(models.AuditLog)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.AuditLog.username.ilike(search_filter)) |
            (models.AuditLog.email.ilike(search_filter)) |
            (models.AuditLog.action.ilike(search_filter)) |
            (models.AuditLog.document_name.ilike(search_filter))
        )
        
    if role and role != "All":
        query = query.filter(models.AuditLog.role == role)
    if department and department != "All":
        query = query.filter(models.AuditLog.department == department)
    if module and module != "All":
        query = query.filter(models.AuditLog.module == module)
    if action and action != "All":
        query = query.filter(models.AuditLog.action == action)
    if status and status != "All":
        query = query.filter(models.AuditLog.status == status)
        
    if start_date:
        try:
            start_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(models.AuditLog.timestamp >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(models.AuditLog.timestamp <= end_dt)
        except ValueError:
            pass

    total = query.count()
    logs = query.order_by(desc(models.AuditLog.timestamp)).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": logs,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/export")
def export_audit_logs(
    format: str = Query("csv", regex="^(csv)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    search: Optional[str] = None,
    role: Optional[str] = None,
    department: Optional[str] = None,
    module: Optional[str] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    _require_admin(current_user)
    
    query = db.query(models.AuditLog)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.AuditLog.username.ilike(search_filter)) |
            (models.AuditLog.email.ilike(search_filter)) |
            (models.AuditLog.action.ilike(search_filter)) |
            (models.AuditLog.document_name.ilike(search_filter))
        )
        
    if role and role != "All":
        query = query.filter(models.AuditLog.role == role)
    if department and department != "All":
        query = query.filter(models.AuditLog.department == department)
    if module and module != "All":
        query = query.filter(models.AuditLog.module == module)
    if action and action != "All":
        query = query.filter(models.AuditLog.action == action)
    if status and status != "All":
        query = query.filter(models.AuditLog.status == status)
        
    if start_date:
        try:
            start_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(models.AuditLog.timestamp >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(models.AuditLog.timestamp <= end_dt)
        except ValueError:
            pass

    logs = query.order_by(desc(models.AuditLog.timestamp)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp", "User", "Email", "Role", "Department", "Action", "Module", 
        "Document", "Status", "IP Address", "Browser", "OS", "Device", "Endpoint"
    ])
    
    for log in logs:
        writer.writerow([
            log.id, 
            log.timestamp.isoformat(), 
            log.username, 
            log.email, 
            log.role, 
            log.department, 
            log.action, 
            log.module, 
            log.document_name, 
            log.status, 
            log.ip_address, 
            log.browser, 
            log.operating_system, 
            log.device_type, 
            log.api_endpoint
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
    )


@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    _require_admin(current_user)
    
    today = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    logins_today = db.query(models.AuditLog).filter(
        models.AuditLog.action == "User Login",
        models.AuditLog.timestamp >= today
    ).count()
    
    failed_logins = db.query(models.AuditLog).filter(
        models.AuditLog.action == "User Login",
        models.AuditLog.status == "Failed",
        models.AuditLog.timestamp >= today
    ).count()
    
    uploads_today = db.query(models.AuditLog).filter(
        models.AuditLog.action == "Upload Document",
        models.AuditLog.timestamp >= today
    ).count()
    
    searches_today = db.query(models.AuditLog).filter(
        models.AuditLog.action == "Semantic Search",
        models.AuditLog.timestamp >= today
    ).count()
    
    return {
        "logins_today": logins_today,
        "failed_logins": failed_logins,
        "uploads_today": uploads_today,
        "searches_today": searches_today
    }


@router.get("/alerts", response_model=List[schemas.SecurityAlertOut])
def get_security_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    _require_admin(current_user)
    return db.query(models.SecurityAlert).filter(
        models.SecurityAlert.is_resolved == False
    ).order_by(desc(models.SecurityAlert.created_at)).all()
