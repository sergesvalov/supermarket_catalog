from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Shop, ShopCreate

router = APIRouter(prefix="/shops", tags=["Shops"])

@router.get("", response_model=List[Shop])
def get_shops(session: Session = Depends(get_session)):
    return session.exec(select(Shop).order_by(Shop.name)).all()

@router.post("", response_model=Shop)
def create_shop(shop_in: ShopCreate, session: Session = Depends(get_session)):
    shop = Shop.from_orm(shop_in)
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return shop

@router.delete("/{shop_id}")
def delete_shop(shop_id: int, session: Session = Depends(get_session)):
    shop = session.get(Shop, shop_id)
    if shop:
        session.delete(shop)
        session.commit()
    return {"ok": True}