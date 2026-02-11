from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///data/database.db"
    EXTERNAL_API_URL: str = "http://192.168.10.222:8000/products/"
    
    class Config:
        env_file = ".env"

settings = Settings()
