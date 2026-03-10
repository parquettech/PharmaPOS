"""Configuration settings for the PharmaPOS server"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: Optional[str] = None
    
    # Server Configuration
    port: int = 3000
    environment: str = "development"
    
    # CORS Configuration - Allow frontend on port 5173
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5173/",
        "http://127.0.0.1:5173/"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Check if .env file exists and has required values
        if not os.path.exists(".env"):
            pass  # .env file not found - silent check
        elif not self.supabase_url or not self.supabase_anon_key:
            pass  # Supabase credentials not found - silent check


# Global settings instance
try:
    settings = Settings()
except Exception as e:
    print(f"[ERROR] Error loading settings: {e}")
    raise
