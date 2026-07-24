import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

url = "http://localhost:8000/auth/register/"
payload = {
    "email": "testagent@athenaiq.local",
    "password": "Password123!",
    "full_name": "Test Agent"
}

resp = requests.post(url, json=payload)
print("Register:", resp.status_code, resp.text)
