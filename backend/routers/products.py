from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from database import get_session
from models import Product, ProductCreate, PriceHistory, ShoppingListItem, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
async def get_products(session: AsyncSession = Depends(get_session)):
    query = select(Product).options(
        selectinload(Product.shop), 
        selectinload(Product.history)
    ).order_by(Product.updated_at.desc())
    result = await session.execute(query)
    return result.scalars().all()

@router.post("", response_model=ProductResponse)
async def create_product(product_in: ProductCreate, session: AsyncSession = Depends(get_session)):
    product = Product.model_validate(product_in)
    product.updated_at = datetime.now()
    session.add(product)
    await session.commit()
    await session.refresh(product)
    
    # Load shop relationship if exists
    if product.shop_id:
        await session.refresh(product, ["shop"])
    
    # Create price history
    history = PriceHistory(product_id=product.id, price=product.price)
    session.add(history)
    await session.commit()
    
    # Reload with all relationships
    query = select(Product).where(Product.id == product.id).options(
        selectinload(Product.shop),
        selectinload(Product.history)
    )
    result = await session.execute(query)
    product_loaded = result.scalars().first()
    return product_loaded

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductCreate, session: AsyncSession = Depends(get_session)):
    db_product = await session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    price_changed = abs(db_product.price - product_data.price) > 0.001
    
    product_dict = product_data.model_dump(exclude_unset=True)
    for key, value in product_dict.items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.now()
    session.add(db_product)
    
    if price_changed:
        session.add(PriceHistory(product_id=product_id, price=product_data.price))
        
    await session.commit()
    await session.refresh(db_product)
    if db_product.shop_id:
        await session.refresh(db_product, ["shop"])
    # await session.refresh(db_product, ["history"]) # Refreshing list relation can be tricky, reloading is safer
    
    # Reload to ensure all relations
    query = select(Product).where(Product.id == product_id).options(
        selectinload(Product.shop), selectinload(Product.history)
    )
    result = await session.execute(query)
    return result.scalars().first()

@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, session: AsyncSession = Depends(get_session)):
    product = await session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Сначала удаляем записи из списков покупок
    statement = select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
    results = await session.execute(statement)
    for item in results.scalars().all():
        await session.delete(item)
        
    await session.delete(product)
    await session.commit()
    return None