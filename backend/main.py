from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import products, shops, lists, telegram, catalog, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    await init_db()
    yield
    # Shutdown: Clean up resources if needed

app = FastAPI(root_path="/api", lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(products.router)
app.include_router(shops.router)
app.include_router(lists.router)
app.include_router(telegram.router)
app.include_router(catalog.router)
app.include_router(admin.router)