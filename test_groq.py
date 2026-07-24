import os
import requests

api_key = os.environ.get("GROQ_API_KEY", "your-groq-api-key-here")
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}
payload = {
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
}
resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.text)
