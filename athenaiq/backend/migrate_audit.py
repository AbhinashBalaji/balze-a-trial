import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "athenaiq.db")

def migrate():
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Drop old audit_logs table (since schema changed drastically and we want a clean slate for the Enterprise module)
    try:
        cursor.execute("DROP TABLE IF EXISTS audit_logs")
    except Exception as e:
        print(e)
    
    conn.commit()
    conn.close()
    
    print("Dropped old audit_logs table.")

    # Re-create tables via SQLAlchemy
    from app.database import engine
    from app.models import Base
    import app.models # to ensure they are registered
    Base.metadata.create_all(bind=engine)
    print("Created new audit_logs and security_alerts tables.")

if __name__ == "__main__":
    migrate()
