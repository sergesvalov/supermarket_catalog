from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from database import get_session
from models import AppConfig
from services import admin_service
from async_lru import alru_cache

router = APIRouter(prefix="/admin", tags=["Admin"])

@alru_cache(maxsize=1)
async def _get_app_config_cached(session: AsyncSession):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
        await session.commit()
        await session.refresh(config)
    return config

@router.get("/config", response_model=AppConfig)
async def get_config(session: AsyncSession = Depends(get_session)):
    return await _get_app_config_cached(session)

@router.post("/config", response_model=AppConfig)
async def update_config(config_in: AppConfig, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
    
    config.currency = config_in.currency
    config.usd_rate = config_in.usd_rate
    config.rub_rate = config_in.rub_rate
    session.add(config)
    await session.commit()
    await session.refresh(config)
    _get_app_config_cached.cache_clear()
    return config

@router.post("/export")
async def export_products(session: AsyncSession = Depends(get_session)):
    """Export all products with shops and price history to a JSON file."""
    return await admin_service.export_products_to_file(session)

@router.post("/import-file")
async def import_products_from_file(session: AsyncSession = Depends(get_session)):
    """Import products from the JSON export file."""
    return await admin_service.import_products_from_file_service(session)

@router.post("/import")
async def import_products_endpoint(session: AsyncSession = Depends(get_session)):
    from import_service import import_products_from_service
    stats = await import_products_from_service(session)
    return {
        "message": f"Создано: {stats['created']}, Обновлено: {stats['updated']}, Пропущено: {stats['skipped']}",
        "created": stats["created"],
        "updated": stats["updated"],
        "skipped": stats["skipped"]
    }

