from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from database import get_session
from models import Product, ProductCreate, PriceHistory, ShoppingListItem, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
def get_products(session: Session = Depends(get_session)):
    query = select(Product).options(
        selectinload(Product.shop), 
        selectinload(Product.history)
    ).order_by(Product.updated_at.desc())
    return session.exec(query).all()

@router.post("", response_model=ProductResponse)
def create_product(product_in: ProductCreate, session: Session = Depends(get_session)):
    product = Product.from_orm(product_in)
    product.updated_at = datetime.now()
    session.add(product)
    session.commit()
    session.refresh(product)
    
    # Load shop relationship if exists
    if product.shop_id:
        session.refresh(product, ["shop"])
    
    # Create price history
    history = PriceHistory(product_id=product.id, price=product.price)
    session.add(history)
    session.commit()
    
    # Reload with all relationships
    query = select(Product).where(Product.id == product.id).options(
        selectinload(Product.shop),
        selectinload(Product.history)
    )
    result = session.exec(query).first()
    print(f"DEBUG: Returning product {result.id}, shop_id={result.shop_id}, shop object={result.shop}")
    return result

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_data: ProductCreate, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    price_changed = abs(db_product.price - product_data.price) > 0.001
    
    product_dict = product_data.dict(exclude_unset=True)
    for key, value in product_dict.items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.now()
    session.add(db_product)
    
    if price_changed:
        session.add(PriceHistory(product_id=product_id, price=product_data.price))
        
    session.commit()
    session.refresh(db_product)
    if db_product.shop_id:
        session.refresh(db_product, ["shop"])
    session.refresh(db_product, ["history"])
    return db_product

@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Сначала удаляем записи из списков покупок, чтобы избежать FK constraint error
    # (если в БД не настроен ON DELETE CASCADE)
    statement = select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
    results = session.exec(statement)
    for item in results:
        session.delete(item)
        
    session.delete(product)
    session.commit()
    return None