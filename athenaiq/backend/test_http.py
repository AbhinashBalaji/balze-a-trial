import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.auth import create_access_token

access_token = create_access_token(data={"sub": "1"})

headers = {
    "Authorization": f"Bearer {access_token}"
}

print("Testing summarize endpoint via HTTP...")
try:
    resp = requests.post("http://localhost:8000/files/1/summarize/", json={"mode": "brief"}, headers=headers)
    print("Status:", resp.status_code)
    print("Response:", resp.text)
except Exception as e:
    print("Error:", e)

print("Testing knowledge graph endpoint via HTTP...")
try:
    resp = requests.post("http://localhost:8000/files/1/knowledge-graph/", headers=headers)
    print("Status:", resp.status_code)
    print("Response:", resp.text)
except Exception as e:
    print("Error:", e)
