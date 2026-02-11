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
        
        # Миграция: добавляем колонку category, если её нет
        from sqlalchemy import text
        try:
            # Пытаемся выбрать категорию у первого товара (проверка существования колонки)
            await conn.execute(text("SELECT category FROM product LIMIT 1"))
        except Exception:
            print("Migrating DB: Adding 'category' column...")
            await conn.execute(text("ALTER TABLE product ADD COLUMN category VARCHAR DEFAULT 'продукты'"))

        # Миграция: добавляем колонки БЖУ, если их нет
        try:
            await conn.execute(text("SELECT proteins FROM product LIMIT 1"))
        except Exception:
            print("Migrating DB: Adding 'proteins', 'fats', 'carbs' columns...")
            await conn.execute(text("ALTER TABLE product ADD COLUMN proteins FLOAT"))
            await conn.execute(text("ALTER TABLE product ADD COLUMN fats FLOAT"))
            await conn.execute(text("ALTER TABLE product ADD COLUMN carbs FLOAT"))

        # Миграция: добавляем column weight_per_piece
        try:
             await conn.execute(text("SELECT weight_per_piece FROM product LIMIT 1"))
        except Exception:
             print("Migrating DB: Adding 'weight_per_piece' column...")
             await conn.execute(text("ALTER TABLE product ADD COLUMN weight_per_piece FLOAT"))

async def get_session():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session