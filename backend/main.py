from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import products, shops, lists, telegram, catalog, admin

from alembic.config import Config
from alembic import command

import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations on startup
    # Must run in executor to avoid conflict with uvicorn's loop vs alembic's asyncio.run()
    alembic_cfg = Config("alembic.ini")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")
    
    yield
    # Shutdown: Clean up resources if needed

from config import settings

# ... imports ...

app = FastAPI(root_path="/api", lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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