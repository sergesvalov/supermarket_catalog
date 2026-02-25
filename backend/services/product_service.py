from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional
from models import Product, ProductCreate, PriceHistory, ShoppingListItem
from core.exceptions import NotFoundError
from fastapi_pagination.ext.sqlmodel import paginate

async def get_all_products(
    session: AsyncSession,
    search: Optional[str] = None,
    shop_id: Optional[int] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = 'date'
):
    query = select(Product).options(
        selectinload(Product.shop),
        selectinload(Product.history)
    )

    if search:
        query = query.where(func.lower(Product.name).contains(func.lower(search)))
    
    if shop_id is not None:
        query = query.where(Product.shop_id == shop_id)
        
    if category is not None:
        query = query.where(Product.category == category)
        
    if sort_by == 'price':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'name':
        query = query.order_by(Product.name.asc())
    else: # date
        query = query.order_by(Product.updated_at.desc())
        
    return await paginate(session, query)

async def create_product(product_in: ProductCreate, session: AsyncSession) -> Product:
    product = Product.model_validate(product_in)
    product.updated_at = datetime.now(timezone.utc)
    session.add(product)
    await session.commit()
    await session.refresh(product)
    
    if product.shop_id:
        await session.refresh(product, ["shop"])
    
    # Create initial price history
    history = PriceHistory(product_id=product.id, price=product.price)
    session.add(history)
    await session.commit()
    
    # Reload with relationships
    query = select(Product).where(Product.id == product.id).options(
        selectinload(Product.shop),
        selectinload(Product.history)
    )
    result = await session.execute(query)
    return result.scalars().first()

async def update_product(product_id: int, product_data: ProductCreate, session: AsyncSession) -> Product:
    db_product = await session.get(Product, product_id)
    if not db_product:
        raise NotFoundError("Товар не найден")
    
    price_changed = abs(db_product.price - product_data.price) > 0.001
    
    product_dict = product_data.model_dump(exclude_unset=True)
    for key, value in product_dict.items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.now(timezone.utc)
    session.add(db_product)
    
    if price_changed:
        session.add(PriceHistory(product_id=product_id, price=product_data.price))
        
    await session.commit()
    await session.refresh(db_product)
    if db_product.shop_id:
        await session.refresh(db_product, ["shop"])
    
    query = select(Product).where(Product.id == product_id).options(
        selectinload(Product.shop), selectinload(Product.history)
    )
    result = await session.execute(query)
    return result.scalars().first()

async def delete_product(product_id: int, session: AsyncSession):
    product = await session.get(Product, product_id)
    if not product:
        raise NotFoundError("Товар не найден")
    
    # Delete from shopping lists first
    statement = select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
    results = await session.execute(statement)
    for item in results.scalars().all():
        await session.delete(item)
        
    await session.delete(product)
    await session.commit()
