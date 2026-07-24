import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

url = "http://localhost:8000/auth/register"

# Admin user
admin_payload = {
    "email": "admin@athenaiq.com",
    "password": "AdminPassword123!",
    "full_name": "System Admin"
}
resp_admin = requests.post(url, json=admin_payload)
print("Admin Register:", resp_admin.status_code, resp_admin.text)

# Regular user
user_payload = {
    "email": "user@athenaiq.com",
    "password": "UserPassword123!",
    "full_name": "Standard User"
}
resp_user = requests.post(url, json=user_payload)
print("User Register:", resp_user.status_code, resp_user.text)

# Make admin
if resp_admin.status_code in (200, 400): # 400 means already exists
    import subprocess
    subprocess.run([sys.executable, "make_admin.py", "admin@athenaiq.com"])
