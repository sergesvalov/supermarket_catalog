import os
from sqlmodel import create_engine, SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from config import settings

# Создаем папку для БД, если её нет
os.makedirs("data", exist_ok=True)

sqlite_url = settings.DATABASE_URL

# check_same_thread=False нужен для SQLite
engine = create_async_engine(sqlite_url, echo=False)

async def init_db():
    # Database initialization is now handled by Alembic migrations
    # os.makedirs is already called at module level
    pass

async def get_session():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session