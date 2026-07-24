import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app import models
from app.services.groq_client import chat_completion

db = SessionLocal()
file_doc = db.query(models.FileDoc).first()
if not file_doc:
    print("No files found in DB")
    sys.exit(1)

print(f"Found file: {file_doc.filename}, extracted text length: {len(file_doc.text_content or '')}")

text = (file_doc.text_content or "")[:20000]
instruction = "Write a brief summary of this document in 3-5 sentences, capturing only the most important points."
messages = [
    {"role": "system", "content": "You are AthenaIQ, an expert document summarizer."},
    {"role": "user", "content": f"{instruction}\n\nDocument:\n{text}"},
]

try:
    print("Sending to Groq...")
    result = chat_completion(messages, max_tokens=1500)
    print("SUCCESS! Result:")
    print(result)
except Exception as e:
    print("ERROR:", e)
