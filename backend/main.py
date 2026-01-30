from fastapi import FastAPI
from sqlmodel import SQLModel

# Импорт базы и роутеров
from database import engine
from routers import products, shops, lists, telegram, catalog

app = FastAPI(root_path="/api")

@app.on_event("startup")
def on_startup():
    # Создаем таблицы при старте
    SQLModel.metadata.create_all(engine)

# Подключаем роутеры
app.include_router(products.router)
app.include_router(shops.router)
app.include_router(lists.router)
app.include_router(telegram.router)
app.include_router(catalog.router)