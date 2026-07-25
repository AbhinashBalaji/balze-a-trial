import datetime
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import SessionLocal
from app import models
import jwt
from app.config import settings

def parse_user_agent(ua_string: str):
    browser = "Unknown"
    os_name = "Unknown"
    device_type = "Desktop"
    
    if not ua_string:
        return browser, os_name, device_type
        
    ua_lower = ua_string.lower()
    
    if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        device_type = "Mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "Tablet"
        
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "mac" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
        
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "edg" in ua_lower:
        browser = "Edge"
        
    return browser, os_name, device_type

def log_audit_event(
    db, action, module, status, user=None, email=None, description=None, request: Request = None
):
    ip_address = None
    browser = None
    os_name = None
    device_type = None

    if request:
        ua = request.headers.get("user-agent", "")
        browser, os_name, device_type = parse_user_agent(ua)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0]
        else:
            ip_address = request.client.host if request.client else None

    username = user.full_name or user.email if user else None
    email_val = user.email if user else email
    role = user.role if user else None
    department_name = user.department.department_name if user and user.department else None

    log_entry = models.AuditLog(
        user_id=user.id if user else None,
        username=username,
        email=email_val,
        role=role,
        department=department_name,
        action=action,
        module=module,
        description=description,
        status=status,
        ip_address=ip_address,
        browser=browser,
        operating_system=os_name,
        device_type=device_type,
        request_method=request.method if request else None,
        api_endpoint=request.url.path if request else None
    )
    db.add(log_entry)
    db.commit()

    if action == "User Login" and status == "Failed":
        ten_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        failed_count = db.query(models.AuditLog).filter(
            models.AuditLog.ip_address == ip_address,
            models.AuditLog.action == "User Login",
            models.AuditLog.status == "Failed",
            models.AuditLog.timestamp >= ten_mins_ago
        ).count()
        
        if failed_count >= 5:
            existing = db.query(models.SecurityAlert).filter(
                models.SecurityAlert.description.like(f"%{ip_address}%"),
                models.SecurityAlert.is_resolved == False
            ).first()
            if not existing:
                alert = models.SecurityAlert(
                    user_id=user.id if user else None,
                    alert_type="Failed Logins",
                    description=f"Multiple failed login attempts from IP {ip_address}",
                    severity="High"
                )
                db.add(alert)
                db.commit()

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Don't log OPTIONS requests or static/health
        if request.method == "OPTIONS" or request.url.path in ["/health", "/"]:
            return response
            
        user_id = None
        username = None
        email = None
        role = None
        department_name = None
        
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
                user_id_str = payload.get("sub")
                if user_id_str and user_id_str.isdigit():
                    user_id = int(user_id_str)
            except Exception:
                pass
                
        db = SessionLocal()
        try:
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    username = user.full_name or user.email
                    email = user.email
                    role = user.role
                    if user.department:
                        department_name = user.department.department_name
            
            path = request.url.path
            method = request.method
            action = f"{method} {path}"
            module = "System"
            status = "Success" if response.status_code < 400 else "Failed"
            
            if path.startswith("/auth/login") or path.startswith("/auth/verify"):
                pass # Handled explicitly in auth.py
            elif path.startswith("/files"):
                module = "Documents"
                if method == "POST" and "upload" in path:
                    action = "Upload Document"
                elif method == "DELETE":
                    action = "Delete Document"
                elif method == "PUT" and "content" in path:
                    action = "Edit Document"
                elif method == "POST" and "share" in path:
                    action = "Share Document"
            elif path.startswith("/chat"):
                module = "AI Features"
                action = "AI Chat Query"
            elif path.startswith("/search"):
                module = "AI Features"
                action = "Semantic Search"
            elif path.startswith("/summarize"):
                module = "AI Features"
                action = "Summary Generated"
            elif path.startswith("/translate"):
                module = "AI Features"
                action = "Translation Generated"
            elif path.startswith("/graph"):
                module = "AI Features"
                action = "Knowledge Graph Generated"
            elif path.startswith("/compare"):
                module = "AI Features"
                action = "Compare Documents"
            elif path.startswith("/users"):
                module = "User Management"
                if method == "POST":
                    action = "User Created"
                elif method == "PUT":
                    action = "User Updated"
                elif method == "DELETE":
                    action = "User Deleted"
            elif path.startswith("/rbac"):
                module = "User Management"
                action = "Role/Permission Changed"

            ua = request.headers.get("user-agent", "")
            browser, os_name, device_type = parse_user_agent(ua)
            
            # For render, x-forwarded-for might have the real IP
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                ip_address = forwarded.split(",")[0]
            else:
                ip_address = request.client.host if request.client else None
            
            log_entry = models.AuditLog(
                user_id=user_id,
                username=username,
                email=email,
                role=role,
                department=department_name,
                action=action,
                module=module,
                description=f"HTTP {response.status_code} on {path}",
                status=status,
                ip_address=ip_address,
                browser=browser,
                operating_system=os_name,
                device_type=device_type,
                request_method=method,
                api_endpoint=path
            )
            
            db.add(log_entry)
            db.commit()
            
            # Security Alerts logic for Delete Document
            if action == "Delete Document" and status == "Success":
                five_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
                del_count = db.query(models.AuditLog).filter(
                    models.AuditLog.user_id == user_id,
                    models.AuditLog.action == "Delete Document",
                    models.AuditLog.timestamp >= five_mins_ago
                ).count()
                
                if del_count >= 5:
                    existing = db.query(models.SecurityAlert).filter(
                        models.SecurityAlert.user_id == user_id,
                        models.SecurityAlert.alert_type == "Mass Deletion",
                        models.SecurityAlert.is_resolved == False
                    ).first()
                    if not existing:
                        alert = models.SecurityAlert(
                            user_id=user_id,
                            alert_type="Mass Deletion",
                            description=f"User deleted {del_count} documents in a short time.",
                            severity="Critical"
                        )
                        db.add(alert)
                        db.commit()

        except Exception as e:
            print("Audit Log Error:", e)
        finally:
            db.close()
            
        return response
