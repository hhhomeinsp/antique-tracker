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
    
    # App
    app_name: str = "Antique Tracker"
    debug: bool = False
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
