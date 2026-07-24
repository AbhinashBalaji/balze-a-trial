import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./athenaiq.db")
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")

    smtp_host: str | None = None
    smtp_port: str | None = None
    smtp_username: str | None = None
    smtp_password: str | None = None
    
    email_provider: str = os.getenv("EMAIL_PROVIDER", "smtp")
    resend_api_key: str | None = os.getenv("RESEND_API_KEY")
    email_from: str = os.getenv("EMAIL_FROM", "Security Team <security@athenaiq.com>")
    firebase_api_key: str | None = os.getenv("FIREBASE_API_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)
