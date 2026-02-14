from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
from database import get_session
from models import Shop, ShopCreate, ShopUpdate

router = APIRouter(prefix="/shops", tags=["Shops"])

@router.get("", response_model=List[Shop])
async def get_shops(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Shop).order_by(Shop.name))
    return result.scalars().all()

@router.post("", response_model=Shop)
async def create_shop(shop_in: ShopCreate, session: AsyncSession = Depends(get_session)):
    shop = Shop.model_validate(shop_in)
    session.add(shop)
    await session.commit()
    await session.refresh(shop)
    return shop

@router.put("/{shop_id}", response_model=Shop)
async def update_shop(shop_id: int, shop_in: ShopUpdate, session: AsyncSession = Depends(get_session)):
    shop = await session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    update_data = shop_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(shop, key, value)
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