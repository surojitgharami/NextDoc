"""Configuration management using Pydantic BaseSettings"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, Union


class Settings(BaseSettings):
    """Application settings and environment variables"""
    
    # App Configuration
    APP_NAME: str = "AI Doctor 3.0"
    APP_VERSION: str = "3.2.0"
    DEBUG: bool = False
    
    # MongoDB Configuration
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "ai_doctor_db"
    
    # PostgreSQL Auth Database
    DATABASE_URL: Optional[str] = None
    
    # JWT Authentication (Custom Auth)
    JWT_SECRET: Optional[str] = None
    ADMIN_EMAIL: str = "admin@healthchatai.com"
    ADMIN_PASSWORD: Optional[str] = None
    ADMIN_NAME: str = "System Admin"
    
    # Custom AI Endpoint (Lightning.AI / Colab Ngrok / HuggingFace Inference)
    CUSTOM_API_URL: str = "https://8000-dep-01kp3b7ttnbmqnpmpv7xpz0z59-d.cloudspaces.litng.ai"
    LIGHTNING_API_KEY: Optional[str] = None   # Bearer token from Lightning Deployments → Settings
    
    # Voice Service Configuration
    OPENAI_API_KEY: Optional[str] = None
    VOICE_REMOTE_URL: str = "https://unjestingly-tariffless-rozanne.ngrok-free.dev/"
    COQUI_REMOTE_URL: Optional[str] = None
    AI_REPLY_URL: str = "http://localhost:8000/api/v1/chat/message"
    AI_AUTH_TOKEN: Optional[str] = None
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: Union[list, str] = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Session Configuration
    SESSION_TIMEOUT_MINUTES: int = 60
    MAX_CHAT_HISTORY: int = 100
    
    # Email Configuration
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@aidoctor.com"
    FRONTEND_URL: str = "http://localhost:5000"
    
    # Razorpay Configuration
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
