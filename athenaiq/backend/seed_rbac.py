import sqlite3
import os
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import Role, Permission, RolePermission, Department, User, FileDoc, UserRole

def alter_tables():
    db_path = "./athenaiq.db"
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add columns to users if they don't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id)")
    except sqlite3.OperationalError as e:
        pass # Column already exists

    # Add columns to files if they don't exist
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN department_id INTEGER REFERENCES departments(id)")
        cursor.execute("ALTER TABLE files ADD COLUMN visibility VARCHAR DEFAULT 'Internal'")
        cursor.execute("ALTER TABLE files ADD COLUMN classification VARCHAR DEFAULT 'General'")
    except sqlite3.OperationalError as e:
        pass

    conn.commit()
    conn.close()


def seed_rbac():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    from app.config import settings
    if settings.database_url.startswith("sqlite"):
        print("Altering existing tables if needed...")
        alter_tables()

    db: Session = SessionLocal()

    # Seed Departments
    deps = ["Admin", "HR", "Finance", "Legal", "Engineering", "Sales"]
    for d in deps:
        if not db.query(Department).filter(Department.department_name == d).first():
            db.add(Department(department_name=d))
    
    # Seed Permissions
    perms = [
        "view_all_documents", "upload_documents", "delete_documents", 
        "manage_users", "manage_roles", "manage_departments", 
        "view_analytics", "view_audit_logs", "system_settings",
        "search_hr", "search_finance", "search_legal", "search_department"
    ]
    for p in perms:
        if not db.query(Permission).filter(Permission.permission_name == p).first():
            db.add(Permission(permission_name=p))
            
    db.commit()

    # Define Roles and their Permissions
    role_defs = {
        "Super Admin": perms, # All permissions
        "Admin": ["upload_documents", "manage_departments", "view_analytics", "view_all_documents", "manage_users"],
        "HR": ["upload_documents", "search_hr", "search_department"],
        "Finance": ["upload_documents", "search_finance", "search_department"],
        "Legal": ["upload_documents", "search_legal", "search_department"],
        "Manager": ["upload_documents", "search_department"],
        "Employee": ["search_department"],
        "Guest": []
    }

    for role_name, role_perms in role_defs.items():
        role = db.query(Role).filter(Role.role_name == role_name).first()
        if not role:
            role = Role(role_name=role_name, description=f"{role_name} role")
            db.add(role)
            db.commit()
            db.refresh(role)
        
        # Assign permissions
        for p_name in role_perms:
            perm = db.query(Permission).filter(Permission.permission_name == p_name).first()
            if perm:
                rp = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not rp:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
    
    db.commit()

    # Migrate existing users
    super_admin_role = db.query(Role).filter(Role.role_name == "Super Admin").first()
    admin_role = db.query(Role).filter(Role.role_name == "Admin").first()
    employee_role = db.query(Role).filter(Role.role_name == "Employee").first()
    
    users = db.query(User).all()
    for u in users:
        # Assign department if none
        if not u.department_id:
            eng_dep = db.query(Department).filter(Department.department_name == "Engineering").first()
            u.department_id = eng_dep.id
        
        # Assign relational role based on old string role
        if not db.query(UserRole).filter(UserRole.user_id == u.id).first():
            target_role = super_admin_role if u.role == "Admin" else employee_role
            db.add(UserRole(user_id=u.id, role_id=target_role.id))
            
    # Update existing files visibility
    files = db.query(FileDoc).all()
    for f in files:
        if not f.visibility:
            f.visibility = "Internal"
        if not f.classification:
            f.classification = "General"
            
    db.commit()
    db.close()
    print("RBAC Database Seeding Complete!")

if __name__ == "__main__":
    seed_rbac()
