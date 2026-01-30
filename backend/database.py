import os
from sqlmodel import create_engine, Session

# Создаем папку для БД, если её нет
os.makedirs("data", exist_ok=True)

sqlite_url = "sqlite:///data/database.db"

# check_same_thread=False нужен для SQLite при работе с FastAPI
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def get_session():
    with Session(engine) as session:
        yield session