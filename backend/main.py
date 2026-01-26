import os
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
from typing import List, Optional
from datetime import datetime
from pydantic import field_validator
from sqlalchemy.orm import selectinload

# ===========================
# 1. МОДЕЛИ ДАННЫХ
# ===========================

class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="Название магазина")

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    price: float
    weight: Optional[float] = Field(default=None)
    calories: Optional[float] = Field(default=None)
    quantity: Optional[int] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.now)

    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")
    shop: Optional[Shop] = Relationship()

    @field_validator('price', 'weight', 'calories', 'quantity')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

# --- НОВОЕ: Списки покупок ---

class ShoppingList(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Каскадное удаление: удалили список -> удалились пункты
    items: List["ShoppingListItem"] = Relationship(back_populates="shopping_list", sa_relationship_kwargs={"cascade": "all, delete"})

class ShoppingListItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shopping_list_id: int = Field(foreign_key="shoppinglist.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)
    is_bought: bool = Field(default=False)

    shopping_list: ShoppingList = Relationship(back_populates="items")
    product: Product = Relationship()

# ===========================
# 2. НАСТРОЙКА БД
# ===========================
os.makedirs("data", exist_ok=True)
sqlite_file_name = "data/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(root_path="/api")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ===========================
# 3. API ЭНДПОИНТЫ
# ===========================

# --- Магазины ---
@app.get("/shops", response_model=List[Shop])
def get_shops(session: Session = Depends(get_session)):
    return session.exec(select(Shop).order_by(Shop.name)).all()

@app.post("/shops", response_model=Shop)
def create_shop(shop: Shop, session: Session = Depends(get_session)):
    existing = session.exec(select(Shop).where(Shop.name == shop.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Магазин уже существует")
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return shop

@app.delete("/shops/{shop_id}")
def delete_shop(shop_id: int, session: Session = Depends(get_session)):
    shop = session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    session.delete(shop)
    session.commit()
    return {"ok": True}

# --- Товары ---
@app.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    query = select(Product).options(selectinload(Product.shop)).order_by(Product.updated_at.desc())
    return session.exec(query).all()

@app.post("/products", response_model=Product)
def create_product(product: Product, session: Session = Depends(get_session)):
    product.updated_at = datetime.now()
    session.add(product)
    session.commit()
    session.refresh(product)
    if product.shop_id: session.refresh(product, ["shop"])
    return product

@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: Product, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    for key, value in product_data.dict(exclude_unset=True).items():
        if key != 'id': setattr(db_product, key, value)
    
    db_product.updated_at = datetime.now()
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    if db_product.shop_id: session.refresh(db_product, ["shop"])
    return db_product

# --- Списки покупок ---
@app.get("/lists", response_model=List[ShoppingList])
def get_lists(session: Session = Depends(get_session)):
    return session.exec(select(ShoppingList).order_by(ShoppingList.created_at.desc())).all()

@app.get("/lists/{list_id}", response_model=ShoppingList)
def get_list_details(list_id: int, session: Session = Depends(get_session)):
    # Глубокая загрузка: Список -> Пункты -> Товар -> Магазин
    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    obj = session.exec(query).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Список не найден")
    return obj

@app.post("/lists", response_model=ShoppingList)
def create_list(shopping_list: ShoppingList, session: Session = Depends(get_session)):
    shopping_list.created_at = datetime.now()
    session.add(shopping_list)
    session.commit()
    session.refresh(shopping_list)
    return shopping_list

@app.delete("/lists/{list_id}")
def delete_list(list_id: int, session: Session = Depends(get_session)):
    obj = session.get(ShoppingList, list_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Список не найден")
    session.delete(obj)
    session.commit()
    return {"ok": True}

# --- Пункты списка ---
@app.post("/lists/items", response_model=ShoppingListItem)
def add_item_to_list(item: ShoppingListItem, session: Session = Depends(get_session)):
    # Если товар уже в списке — увеличиваем кол-во
    existing = session.exec(
        select(ShoppingListItem)
        .where(ShoppingListItem.shopping_list_id == item.shopping_list_id)
        .where(ShoppingListItem.product_id == item.product_id)
    ).first()

    if existing:
        existing.quantity += item.quantity
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.patch("/lists/items/{item_id}")
def update_item_status(item_id: int, is_bought: bool, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    item.is_bought = is_bought
    session.add(item)
    session.commit()
    return {"ok": True}

@app.delete("/lists/items/{item_id}")
def remove_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if item:
        session.delete(item)
        session.commit()
    return {"ok": True}