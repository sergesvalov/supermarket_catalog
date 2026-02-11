from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from database import get_session
from models import AppConfig

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/config", response_model=AppConfig)
async def get_config(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
        await session.commit()
        await session.refresh(config)
    return config

@router.post("/config", response_model=AppConfig)
async def update_config(config_in: AppConfig, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
    
    config.currency = config_in.currency
    session.add(config)
    await session.commit()
    await session.refresh(config)
    return config

@router.post("/import")
async def import_products_endpoint(session: AsyncSession = Depends(get_session)):
    from import_service import import_products_from_service
    count = await import_products_from_service(session)
    return {"message": f"Импортировано {count} товаров", "count": count}
