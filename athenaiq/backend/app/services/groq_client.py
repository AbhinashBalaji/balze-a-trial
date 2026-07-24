"""
Thin wrapper around the Groq chat-completions API (OpenAI-compatible).
Docs: https://console.groq.com/docs/quickstart
"""
import requests
from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def chat_completion(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 2048,
    model_override: str | None = None,
) -> str:
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )

    model = model_override or settings.groq_model

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def chat_completion_stream(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 2048,
    model_override: str | None = None,
):
    import json
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set.")

    model = model_override or settings.groq_model
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    with requests.post(GROQ_URL, headers=headers, json=payload, stream=True, timeout=60) as resp:
        if resp.status_code != 200:
            raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text}")
        for line in resp.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data: '):
                    data_str = decoded[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data_str)
                        content = chunk['choices'][0].get('delta', {}).get('content', '')
                        if content:
                            yield content
                    except Exception:
                        pass
