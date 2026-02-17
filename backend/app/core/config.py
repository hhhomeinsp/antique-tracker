"""Application configuration"""
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./antique_tracker.db"
    
    # OpenAI
    openai_api_key: str = ""
    
    # eBay API (for market price research)
    ebay_app_id: str = ""  # Also called Client ID
    ebay_cert_id: str = ""  # Also called Client Secret (optional for Browse API)
    ebay_app_token: str = ""  # Pre-generated OAuth Application Token (alternative to app_id/cert_id)
    
    # Auth
    admin_email: str = "admin@hardysinteriors.com"
    admin_password: str = "changeme"
    jwt_secret: str = "hardys-interiors-secret-key-change-in-production"
    
    # App
    app_name: str = "Antique Tracker"
    debug: bool = False
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
