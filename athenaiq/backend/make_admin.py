import sqlite3
import sys
import os

def make_admin(email: str):
    db_path = os.path.join(os.path.dirname(__file__), "athenaiq.db")
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check if user exists
    c.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    
    if not user:
        print(f"User with email '{email}' not found.")
        print("Please register the user first.")
        conn.close()
        return

    # Update role to Admin
    c.execute("UPDATE users SET role = 'Admin' WHERE email = ?", (email,))
    conn.commit()
    
    print(f"Success! User '{email}' has been promoted to Admin.")
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <user_email>")
        sys.exit(1)
        
    email_to_promote = sys.argv[1]
    make_admin(email_to_promote)
