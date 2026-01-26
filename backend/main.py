import os
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
from typing import List, Optional
from datetime import datetime
from pydantic import field_validator
from sqlalchemy.orm import selectinload

# --- 1. Модель Магазина ---
class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="Название магазина")

# --- 2. Модель Продукта ---
class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    price: float
    
    # Характеристики (Опциональные)
    weight: Optional[float] = Field(default=None, description="Вес в граммах")
    calories: Optional[float] = Field(default=None, description="Ккал на 100г")
    quantity: Optional[int] = Field(default=None, description="Количество штук в упаковке")
    
    updated_at: datetime = Field(default_factory=datetime.now)

    # Связь с магазином
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")
    shop: Optional[Shop] = Relationship()

    # Валидация: запрет отрицательных чисел
    @field_validator('price', 'weight', 'calories', 'quantity')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

# --- Настройка БД ---
os.makedirs("data", exist_ok=True)
sqlite_file_name = "data/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
# check_same_thread=False нужен для SQLite при работе с FastAPI
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# --- Приложение ---
app = FastAPI(root_path="/api")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ===========================
# Эндпоинты: МАГАЗИНЫ
# ===========================

@app.get("/shops", response_model=List[Shop])
def get_shops(session: Session = Depends(get_session)):
    return session.exec(select(Shop).order_by(Shop.name)).all()

@app.post("/shops", response_model=Shop)
def create_shop(shop: Shop, session: Session = Depends(get_session)):
    existing = session.exec(select(Shop).where(Shop.name == shop.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Магазин с таким именем уже есть")
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

# ===========================
# Эндпоинты: ТОВАРЫ
# ===========================

@app.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    # selectinload нужен, чтобы загрузить данные из связанной таблицы Shop
    query = select(Product).options(selectinload(Product.shop)).order_by(Product.updated_at.desc())
    return session.exec(query).all()

@app.post("/products", response_model=Product)
def create_product(product: Product, session: Session = Depends(get_session)):
    product.updated_at = datetime.now()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: Product, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Обновляем все поля
    db_product.name = product_data.name
    db_product.price = product_data.price
    db_product.weight = product_data.weight
    db_product.calories = product_data.calories
    db_product.quantity = product_data.quantity
    db_product.shop_id = product_data.shop_id
    db_product.updated_at = datetime.now()
    
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product