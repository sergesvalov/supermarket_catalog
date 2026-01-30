from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from database import get_session
from models import Product, CatalogExport

router = APIRouter(prefix="/catalog", tags=["Public Catalog"])

@router.get("", response_model=List[CatalogExport])
def get_catalog(session: Session = Depends(get_session)):
    products = session.exec(select(Product).options(selectinload(Product.shop))).all()
    return [
        CatalogExport(
            product=p.name, 
            price=p.price, 
            shop=p.shop.name if p.shop else None, 
            updated_at=p.updated_at
        ) for p in products
    ]