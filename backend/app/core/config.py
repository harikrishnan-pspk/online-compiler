import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "CodeForge"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "codeforge-dev-secret-super-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Supports PostgreSQL or falls back seamlessly to SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./codeforge.db")
    
    # Sandbox execution constraints: configurable high timeout, not fixed 15s
    EXECUTION_TIMEOUT_SECONDS: int = int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "300"))
    MAX_CODE_SIZE_BYTES: int = 128 * 1024       # 128 KB
    MAX_OUTPUT_SIZE_BYTES: int = 512 * 1024     # 512 KB
    MAX_MEMORY_MB: int = 128                    # 128 MB
    
    # Optional external AI keys (OpenAI / Anthropic / Gemini)
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto")

settings = Settings()
