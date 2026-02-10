import os
from sqlmodel import create_engine, SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Создаем папку для БД, если её нет
os.makedirs("data", exist_ok=True)

sqlite_url = "sqlite+aiosqlite:///data/database.db"

# check_same_thread=False нужен для SQLite
engine = create_async_engine(sqlite_url, echo=False)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all) # Для полного сброса
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session