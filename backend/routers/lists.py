from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
from database import get_session
from models import ShoppingList, ShoppingListCreate, ShoppingListItem, ShoppingListItemCreate, Product, ShoppingListResponse, ShoppingListItemResponse

router = APIRouter(prefix="/lists", tags=["Shopping Lists"])

@router.get("", response_model=List[ShoppingListResponse])
async def get_lists(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ShoppingList).order_by(ShoppingList.created_at.desc()))
    return result.scalars().all()

@router.get("/{list_id}", response_model=ShoppingListResponse)
async def get_list(list_id: int, session: AsyncSession = Depends(get_session)):
    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    result = await session.execute(query)
    res = result.scalars().first()
    if not res: raise HTTPException(status_code=404)
    return res

@router.post("", response_model=ShoppingListResponse)
async def create_list(list_in: ShoppingListCreate, session: AsyncSession = Depends(get_session)):
    shopping_list = ShoppingList.from_orm(list_in)
    session.add(shopping_list)
    await session.commit()
    await session.refresh(shopping_list)
    return shopping_list

@router.delete("/{list_id}")
async def delete_list(list_id: int, session: AsyncSession = Depends(get_session)):
    obj = await session.get(ShoppingList, list_id)
    if obj:
        await session.delete(obj)
        await session.commit()
    return {"ok": True}

@router.post("/items", response_model=ShoppingListItemResponse)
async def add_item_to_list(item_in: ShoppingListItemCreate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ShoppingListItem).where(
        ShoppingListItem.shopping_list_id == item_in.shopping_list_id,
        ShoppingListItem.product_id == item_in.product_id
    ))
    existing = result.scalars().first()
    
    if existing:
        existing.quantity += item_in.quantity
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        # await session.refresh(existing, ["product"])
        
        # Reload to include product relation
        res = await session.execute(
            select(ShoppingListItem).where(ShoppingListItem.id == existing.id).options(selectinload(ShoppingListItem.product))
        )
        return res.scalars().first()
    else:
        new_item = ShoppingListItem.from_orm(item_in)
        session.add(new_item)
        await session.commit()
        await session.refresh(new_item)
        
        # Reload to include product relation
        res = await session.execute(
            select(ShoppingListItem).where(ShoppingListItem.id == new_item.id).options(selectinload(ShoppingListItem.product))
        )
        return res.scalars().first()

@router.patch("/items/{item_id}")
async def toggle_item(item_id: int, is_bought: bool, session: AsyncSession = Depends(get_session)):
    item = await session.get(ShoppingListItem, item_id)
    if item:
        item.is_bought = is_bought
        session.add(item)
        await session.commit()
    return {"ok": True}

@router.delete("/items/{item_id}")
async def delete_item(item_id: int, session: AsyncSession = Depends(get_session)):
    item = await session.get(ShoppingListItem, item_id)
    if item:
        await session.delete(item)
        await session.commit()
    return {"ok": True}