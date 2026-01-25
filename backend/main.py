import os
from fastapi import FastAPI, Depends
from sqlmodel import Field, Session, SQLModel, create_engine, select
from typing import List, Optional
from datetime import datetime

# --- Модель ---
class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    shop_name: str
    price: float
    updated_at: datetime = Field(default_factory=datetime.now)

# --- БД в папке data (для Docker volume) ---
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
app = FastAPI(root_path="/api") # Важно: API будет жить за префиксом /api

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