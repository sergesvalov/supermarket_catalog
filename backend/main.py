import os
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select
from typing import List, Optional
from datetime import datetime

# --- Модель ---
class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(description="Название продукта")
    shop_name: str = Field(description="Магазин")
    price: float = Field(description="Цена в Евро (€)")
    # Новые необязательные поля
    weight: Optional[float] = Field(default=None, description="Вес в граммах")
    calories: Optional[float] = Field(default=None, description="Ккал на 100г")
    
    updated_at: datetime = Field(default_factory=datetime.now)

# --- БД ---
os.makedirs("data", exist_ok=True)
sqlite_file_name = "data/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

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

@app.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    return session.exec(select(Product).order_by(Product.updated_at.desc())).all()

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
    db_product.shop_name = product_data.shop_name
    db_product.price = product_data.price
    db_product.weight = product_data.weight     # Обновляем вес
    db_product.calories = product_data.calories # Обновляем калории
    db_product.updated_at = datetime.now()
    
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product