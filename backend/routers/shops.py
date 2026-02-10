from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
from database import get_session
from models import Shop, ShopCreate

router = APIRouter(prefix="/shops", tags=["Shops"])

@router.get("", response_model=List[Shop])
async def get_shops(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Shop).order_by(Shop.name))
    return result.scalars().all()

@router.post("", response_model=Shop)
async def create_shop(shop_in: ShopCreate, session: AsyncSession = Depends(get_session)):
    shop = Shop.from_orm(shop_in)
    session.add(shop)
    await session.commit()
    await session.refresh(shop)
    return shop

@router.delete("/{shop_id}")
async def delete_shop(shop_id: int, session: AsyncSession = Depends(get_session)):
    shop = await session.get(Shop, shop_id)
    if shop:
        await session.delete(shop)
        await session.commit()
    return {"ok": True}