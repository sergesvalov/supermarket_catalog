from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from database import get_session
from models import Product, ProductCreate, PriceHistory

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    query = select(Product).options(
        selectinload(Product.shop), 
        selectinload(Product.history)
    ).order_by(Product.updated_at.desc())
    return session.exec(query).all()

@router.post("", response_model=Product)
def create_product(product_in: ProductCreate, session: Session = Depends(get_session)):
    product = Product.from_orm(product_in)
    product.updated_at = datetime.now()
    session.add(product)
    session.commit()
    session.refresh(product)
    
    if product.shop_id:
        session.refresh(product, ["shop"])
    
    history = PriceHistory(product_id=product.id, price=product.price)
    session.add(history)
    session.commit()
    session.refresh(product, ["history"])
    return product

@router.put("/{product_id}", response_model=Product)
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