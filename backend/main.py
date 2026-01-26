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
# 1. МОДЕЛИ ДАННЫХ
# ===========================

class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="Название магазина")

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

    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")
    shop: Optional[Shop] = Relationship()
    
    history: List[PriceHistory] = Relationship(back_populates="product", sa_relationship_kwargs={"cascade": "all, delete"})

    @field_validator('price', 'weight', 'calories', 'quantity')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

class ShoppingListItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shopping_list_id: int = Field(foreign_key="shoppinglist.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)
    is_bought: bool = Field(default=False)
    product: Product = Relationship()

class ShoppingList(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    items: List[ShoppingListItem] = Relationship(sa_relationship_kwargs={"cascade": "all, delete"})

class TelegramConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bot_token: str = Field(description="Токен бота")

class TelegramUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    chat_id: str

# --- НОВОЕ: Модель для экспорта каталога (без лишних ID) ---
class CatalogExport(SQLModel):
    product: str
    price: float
    currency: str = "EUR"
    shop: Optional[str] = None
    updated_at: datetime

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
# 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ===========================

def send_telegram_message_task(bot_token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=10)
    except Exception as e:
        print(f"Ошибка отправки в Telegram ({chat_id}): {e}")

# ===========================
# 4. ЭНДПОИНТЫ
# ===========================

# --- НОВОЕ: Публичный каталог цен ---
@app.get("/catalog", response_model=List[CatalogExport])
def get_public_catalog(session: Session = Depends(get_session)):
    """
    Возвращает упрощенный список всех товаров с актуальными ценами.
    Удобно для интеграции с внешними сервисами.
    """
    # Загружаем товары вместе с магазинами
    query = select(Product).options(selectinload(Product.shop))
    products = session.exec(query).all()
    
    # Преобразуем в упрощенный формат
    result = []
    for p in products:
        result.append(CatalogExport(
            product=p.name,
            price=p.price,
            shop=p.shop.name if p.shop else None,
            updated_at=p.updated_at
        ))
    
    return result

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
    
    history_entry = PriceHistory(product_id=product.id, price=product.price)
    session.add(history_entry)
    session.commit()
    
    if product.shop_id: session.refresh(product, ["shop"])
    session.refresh(product, ["history"])
    return product

@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: Product, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    old_price = db_product.price
    new_price = product_data.price
    price_changed = abs(old_price - new_price) > 0.001

    for key, value in product_data.dict(exclude_unset=True).items():
        if key != 'id': setattr(db_product, key, value)
    
    db_product.updated_at = datetime.now()
    session.add(db_product)
    
    if price_changed:
        history_entry = PriceHistory(product_id=product_id, price=new_price)
        session.add(history_entry)
        
    session.commit()
    session.refresh(db_product)
    
    if db_product.shop_id: session.refresh(db_product, ["shop"])
    session.refresh(db_product, ["history"])
    return db_product

# --- Списки покупок ---
@app.get("/lists", response_model=List[ShoppingList])
def get_lists(session: Session = Depends(get_session)):
    return session.exec(select(ShoppingList).order_by(ShoppingList.created_at.desc())).all()

@app.get("/lists/{list_id}", response_model=ShoppingList)
def get_list_details(list_id: int, session: Session = Depends(get_session)):
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

# --- TELEGRAM ---

@app.get("/telegram/config", response_model=Optional[TelegramConfig])
def get_telegram_config(session: Session = Depends(get_session)):
    return session.exec(select(TelegramConfig)).first()

@app.post("/telegram/config", response_model=TelegramConfig)
def save_telegram_config(config: TelegramConfig, session: Session = Depends(get_session)):
    try:
        test_url = f"https://api.telegram.org/bot{config.bot_token}/getMe"
        resp = requests.get(test_url, timeout=5)
        if not resp.ok:
            raise HTTPException(status_code=400, detail="Токен невалиден")
    except requests.RequestException:
        raise HTTPException(status_code=400, detail="Ошибка сети при проверке токена")

    existing = session.exec(select(TelegramConfig)).first()
    if existing:
        existing.bot_token = config.bot_token
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    
    session.add(config)
    session.commit()
    session.refresh(config)
    return config

@app.get("/telegram/users", response_model=List[TelegramUser])
def get_telegram_users(session: Session = Depends(get_session)):
    return session.exec(select(TelegramUser)).all()

@app.post("/telegram/users", response_model=TelegramUser)
def create_telegram_user(user: TelegramUser, session: Session = Depends(get_session)):
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.delete("/telegram/users/{user_id}")
def delete_telegram_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(TelegramUser, user_id)
    if user:
        session.delete(user)
        session.commit()
    return {"ok": True}

@app.post("/telegram/send/{list_id}")
def send_list_to_telegram(
    list_id: int, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session)
):
    config = session.exec(select(TelegramConfig)).first()
    if not config or not config.bot_token:
        raise HTTPException(status_code=400, detail="Бот не настроен")
    
    users = session.exec(select(TelegramUser)).all()
    if not users:
        raise HTTPException(status_code=400, detail="Нет получателей")

    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    shopping_list = session.exec(query).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Список не найден")

    safe_list_name = html.escape(shopping_list.name)
    lines = [f"🛒 <b>{safe_list_name}</b>\n"]
    total = 0.0
    
    for item in shopping_list.items:
        status = "✅" if item.is_bought else "▫️"
        p = item.product
        sum_item = p.price * item.quantity
        total += sum_item
        
        safe_prod_name = html.escape(p.name)
        shop_part = f"({html.escape(p.shop.name)})" if p.shop else ""
        lines.append(f"{status} <b>{safe_prod_name}</b> {shop_part}")
        lines.append(f"   {item.quantity} шт x {p.price:.2f} = {sum_item:.2f} €")
    
    lines.append(f"\n💰 <b>Итого: {total:.2f} €</b>")
    message_text = "\n".join(lines)

    for user in users:
        background_tasks.add_task(send_telegram_message_task, config.bot_token, user.chat_id, message_text)

    return {"ok": True, "detail": "Отправка запущена"}