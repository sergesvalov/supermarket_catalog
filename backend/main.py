import os
import requests
import html
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
from typing import List, Optional
from datetime import datetime
from pydantic import field_validator
from sqlalchemy.orm import selectinload

# ===========================
# 1. МОДЕЛИ ДАННЫХ (БД)
# ===========================

class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

class PriceHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    price: float
    created_at: datetime = Field(default_factory=datetime.now)
    product: "Product" = Relationship(back_populates="history")

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    price: float
    weight: Optional[float] = Field(default=None)
    calories: Optional[float] = Field(default=None)
    quantity: Optional[int] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Связь с магазином
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")
    shop: Optional[Shop] = Relationship()
    
    # Связь с историей цен
    history: List[PriceHistory] = Relationship(
        back_populates="product", 
        sa_relationship_kwargs={"cascade": "all, delete", "lazy": "selectin"}
    )

    @field_validator('price', 'weight', 'calories', 'quantity')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

# --- НОВАЯ МОДЕЛЬ ДЛЯ СОЗДАНИЯ (DTO) ---
# Используется только для приема данных от фронтенда
class ShoppingListItemCreate(SQLModel):
    shopping_list_id: int
    product_id: int
    quantity: int = 1

# Основная модель БД
class ShoppingListItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shopping_list_id: int = Field(foreign_key="shoppinglist.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)
    is_bought: bool = Field(default=False)
    
    # Связь оставляем Optional, чтобы не мешала при сериализации, если не подгружена
    product: Optional[Product] = Relationship(default=None)

class ShoppingList(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    items: List[ShoppingListItem] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete"}
    )

class TelegramConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bot_token: str

class TelegramUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    chat_id: str

# Модель для публичного API
class CatalogExport(SQLModel):
    product: str
    price: float
    currency: str = "EUR"
    shop: Optional[str] = None
    updated_at: datetime

# ===========================
# 2. ИНИЦИАЛИЗАЦИЯ БД
# ===========================

os.makedirs("data", exist_ok=True)
sqlite_url = "sqlite:///data/database.db"
# Добавляем check_same_thread для SQLite
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(root_path="/api")

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

# ===========================
# 3. ФОНОВЫЕ ЗАДАЧИ
# ===========================

def send_telegram_task(bot_token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=10)
    except Exception as e:
        print(f"Ошибка фоновой отправки TG: {e}")

# ===========================
# 4. ЭНДПОИНТЫ
# ===========================

# --- Публичный каталог ---
@app.get("/catalog", response_model=List[CatalogExport])
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

# --- Магазины ---
@app.get("/shops", response_model=List[Shop])
def get_shops(session: Session = Depends(get_session)):
    return session.exec(select(Shop).order_by(Shop.name)).all()

@app.post("/shops", response_model=Shop)
def create_shop(shop: Shop, session: Session = Depends(get_session)):
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return shop

@app.delete("/shops/{shop_id}")
def delete_shop(shop_id: int, session: Session = Depends(get_session)):
    shop = session.get(Shop, shop_id)
    if shop:
        session.delete(shop)
        session.commit()
    return {"ok": True}

# --- Товары ---
@app.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    query = select(Product).options(
        selectinload(Product.shop), 
        selectinload(Product.history)
    ).order_by(Product.updated_at.desc())
    return session.exec(query).all()

@app.post("/products", response_model=Product)
def create_product(product: Product, session: Session = Depends(get_session)):
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

@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: Product, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    price_changed = abs(db_product.price - product_data.price) > 0.001
    
    for key, value in product_data.dict(exclude_unset=True).items():
        if key != 'id': setattr(db_product, key, value)
    
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

# --- Списки покупок ---
@app.get("/lists", response_model=List[ShoppingList])
def get_lists(session: Session = Depends(get_session)):
    return session.exec(select(ShoppingList).order_by(ShoppingList.created_at.desc())).all()

@app.get("/lists/{list_id}", response_model=ShoppingList)
def get_list(list_id: int, session: Session = Depends(get_session)):
    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    res = session.exec(query).first()
    if not res: raise HTTPException(status_code=404)
    return res

@app.post("/lists", response_model=ShoppingList)
def create_list(shopping_list: ShoppingList, session: Session = Depends(get_session)):
    session.add(shopping_list)
    session.commit()
    session.refresh(shopping_list)
    return shopping_list

@app.delete("/lists/{list_id}")
def delete_list(list_id: int, session: Session = Depends(get_session)):
    obj = session.get(ShoppingList, list_id)
    if obj:
        session.delete(obj)
        session.commit()
    return {"ok": True}

# ВАЖНОЕ ИЗМЕНЕНИЕ: Принимаем ShoppingListItemCreate, возвращаем ShoppingListItem
@app.post("/lists/items", response_model=ShoppingListItem)
def add_item_to_list(item_in: ShoppingListItemCreate, session: Session = Depends(get_session)):
    # Проверяем существование записи
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
        # Создаем модель БД из входных данных
        new_item = ShoppingListItem.from_orm(item_in)
        session.add(new_item)
        session.commit()
        session.refresh(new_item)
        return new_item

@app.patch("/lists/items/{item_id}")
def toggle_item(item_id: int, is_bought: bool, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if item:
        item.is_bought = is_bought
        session.add(item)
        session.commit()
    return {"ok": True}

@app.delete("/lists/items/{item_id}")
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ShoppingListItem, item_id)
    if item:
        session.delete(item)
        session.commit()
    return {"ok": True}

# --- Telegram Настройки ---
@app.get("/telegram/config", response_model=Optional[TelegramConfig])
def get_tg_config(session: Session = Depends(get_session)):
    return session.exec(select(TelegramConfig)).first()

@app.post("/telegram/config")
def save_tg_config(config: TelegramConfig, session: Session = Depends(get_session)):
    try:
        resp = requests.get(f"https://api.telegram.org/bot{config.bot_token}/getMe", timeout=5)
        if not resp.ok: raise Exception()
    except:
        raise HTTPException(status_code=400, detail="Неверный токен Telegram")

    existing = session.exec(select(TelegramConfig)).first()
    if existing:
        existing.bot_token = config.bot_token
        session.add(existing)
    else:
        session.add(config)
    session.commit()
    return {"ok": True}

@app.get("/telegram/users", response_model=List[TelegramUser])
def get_tg_users(session: Session = Depends(get_session)):
    return session.exec(select(TelegramUser)).all()

@app.post("/telegram/users")
def add_tg_user(user: TelegramUser, session: Session = Depends(get_session)):
    session.add(user)
    session.commit()
    return user

@app.delete("/telegram/users/{user_id}")
def del_tg_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(TelegramUser, user_id)
    if user:
        session.delete(user)
        session.commit()
    return {"ok": True}

@app.post("/telegram/send/{list_id}")
def send_to_tg(list_id: int, bg: BackgroundTasks, session: Session = Depends(get_session)):
    config = session.exec(select(TelegramConfig)).first()
    users = session.exec(select(TelegramUser)).all()
    if not config or not users: raise HTTPException(status_code=400, detail="Настройте бота и юзеров")

    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    sl = session.exec(query).first()
    
    if not sl:
        raise HTTPException(status_code=404, detail="Список не найден")

    title = html.escape(sl.name)
    msg = [f"🛒 <b>{title}</b>\n"]
    total = 0
    for i in sl.items:
        p = i.product
        if not p: continue
        
        total += (p.price * i.quantity)
        shop = f"({html.escape(p.shop.name)})" if p.shop else ""
        icon = "✅" if i.is_bought else "▫️"
        msg.append(f"{icon} <b>{html.escape(p.name)}</b> {shop}")
        msg.append(f"   {i.quantity} шт x {p.price:.2f} = {(p.price * i.quantity):.2f} €")
    
    msg.append(f"\n💰 <b>Итого: {total:.2f} €</b>")
    full_text = "\n".join(msg)

    for u in users:
        bg.add_task(send_telegram_task, config.bot_token, u.chat_id, full_text)
    
    return {"ok": True}