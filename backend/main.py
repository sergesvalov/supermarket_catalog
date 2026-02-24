import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command

from config import settings
from routers import products, shops, lists, telegram, catalog, admin, categories
from core.exceptions import AppError, app_error_handler
from fastapi_pagination import add_pagination


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations on startup (in executor to avoid blocking the event loop)
    alembic_cfg = Config("alembic.ini")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")

    yield


app = FastAPI(root_path="/api", lifespan=lifespan)

# Allow CORS for frontend
# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register global error handler
app.add_exception_handler(AppError, app_error_handler)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Подключаем роутеры
app.include_router(products.router)
app.include_router(shops.router)
app.include_router(lists.router)
app.include_router(telegram.router)
app.include_router(catalog.router)
app.include_router(admin.router)
app.include_router(categories.router)

add_pagination(app)