"""Configuration settings for the PharmaPOS server"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
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
    
    # CORS Configuration - Allow frontend on port 5173 (development) and production domains
    # Store as Optional[str] to allow comma-separated string from environment
    cors_origins_env: Optional[str] = Field(default=None, alias="CORS_ORIGINS")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True  # Allow both field name and alias
    )
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from environment variable or use defaults"""
        # Default development origins
        default_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5173/",
            "http://127.0.0.1:5173/"
        ]
        
        # Parse from environment variable if provided
        origins = []
        cors_env = self.cors_origins_env or os.getenv("CORS_ORIGINS", "")
        if cors_env:
            origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
        
        # Combine with defaults and remove duplicates
        combined = default_origins + origins
        seen = set()
        result = []
        for origin in combined:
            if origin not in seen:
                seen.add(origin)
                result.append(origin)
        
        return result
    
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
