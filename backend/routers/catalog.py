from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from typing import List
from database import get_session
from models import Product, CatalogExport, AppConfig

router = APIRouter(prefix="/catalog", tags=["Public Catalog"])

@router.get("", response_model=List[CatalogExport])
async def get_catalog(session: AsyncSession = Depends(get_session)):
    # Get currency from config
    config_result = await session.execute(select(AppConfig))
    config = config_result.scalars().first()
    currency = config.currency if config else "EUR"
    
    result = await session.execute(select(Product).options(selectinload(Product.shop)))
    products = result.scalars().all()
    return [
        CatalogExport(
            product=p.name, 
            price=p.price,
            currency=currency,
            shop=p.shop.name if p.shop else None, 
            updated_at=p.updated_at
        ) for p in products
    ]