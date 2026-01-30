from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from database import get_session
from models import ShoppingList, ShoppingListCreate, ShoppingListItem, ShoppingListItemCreate, Product

router = APIRouter(prefix="/lists", tags=["Shopping Lists"])

@router.get("", response_model=List[ShoppingList])
def get_lists(session: Session = Depends(get_session)):
    return session.exec(select(ShoppingList).order_by(ShoppingList.created_at.desc())).all()

@router.get("/{list_id}", response_model=ShoppingList)
def get_list(list_id: int, session: Session = Depends(get_session)):
    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    res = session.exec(query).first()
    if not res: raise HTTPException(status_code=404)
    return res

@router.post("", response_model=ShoppingList)
def create_list(list_in: ShoppingListCreate, session: Session = Depends(get_session)):
    shopping_list = ShoppingList.from_orm(list_in)
    session.add(shopping_list)
    session.commit()
    session.refresh(shopping_list)
    return shopping_list

@router.delete("/{list_id}")
def delete_list(list_id: int, session: Session = Depends(get_session)):
    obj = session.get(ShoppingList, list_id)
    if obj:
        session.delete(obj)
        session.commit()
    return {"ok": True}

@router.post("/items", response_model=ShoppingListItem)
def add_item_to_list(item_in: ShoppingListItemCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(ShoppingListItem).where(
        ShoppingListItem.shopping_list_id == item_in.shopping_list_id,
        ShoppingListItem.product_id == item_in.product_id
    )).first()
    
    if existing:
        existing.quantity += item_in.quantity
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    else:
        new_item = ShoppingListItem.from_orm(item_in)
        session.add(new_item)
        session.commit()
        session.refresh(new_item)
        return new_item

@router.patch("/items/{item_id}")
def toggle_item(item_id: int, is_bought: bool, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if item:
        item.is_bought = is_bought
        session.add(item)
        session.commit()
    return {"ok": True}

@router.delete("/items/{item_id}")
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if item:
        session.delete(item)
        session.commit()
    return {"ok": True}