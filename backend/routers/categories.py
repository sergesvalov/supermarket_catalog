from fastapi import APIRouter, Depends
from core.exceptions import NotFoundError, BusinessLogicError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List

from database import get_session
from models import Category

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[Category])
async def get_categories(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Category))
    return result.scalars().all()

@router.post("", response_model=Category)
async def create_category(category: Category, session: AsyncSession = Depends(get_session)):
    # Check if a category with the same name exists
    existing = await session.execute(select(Category).where(Category.name == category.name))
    if existing.scalars().first():
        raise BusinessLogicError("Категория с таким именем уже существует")
    
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category

@router.put("/{category_id}", response_model=Category)
async def update_category(category_id: int, updated_category: Category, session: AsyncSession = Depends(get_session)):
    category = await session.get(Category, category_id)
    if not category:
        raise NotFoundError("Категория не найдена")
    
    # Check if new name conflicts
    if updated_category.name != category.name:
        existing = await session.execute(select(Category).where(Category.name == updated_category.name))
        if existing.scalars().first():
            raise BusinessLogicError("Категория с таким именем уже существует")

    category.name = updated_category.name
    category.color_class = updated_category.color_class
    
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(category_id: int, session: AsyncSession = Depends(get_session)):
    category = await session.get(Category, category_id)
    if not category:
        raise NotFoundError("Категория не найдена")
    
    await session.delete(category)
    await session.commit()
    return {"ok": True}
