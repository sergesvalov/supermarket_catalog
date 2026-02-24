from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship
from pydantic import field_validator

# --- Category ---
class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    color_class: str = Field(default="bg-primary")

ALLOWED_CURRENCIES = ["EUR", "USD", "RUB"]

def check_currency(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in ALLOWED_CURRENCIES:
        raise ValueError(f'Currency must be one of {ALLOWED_CURRENCIES}')
    return v

class ShopBase(SQLModel):
    name: str = Field(index=True, unique=True)
    currency: str = Field(default="EUR")

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        return check_currency(v)

class ShopCreate(ShopBase):
    pass

class ShopUpdate(SQLModel):
    name: Optional[str] = None
    currency: Optional[str] = None

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        return check_currency(v)

class Shop(ShopBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

# --- Product ---
class ProductBase(SQLModel):
    name: str = Field(index=True)
    category: str = Field(default="продукты", index=True)
    price: float = Field(index=True)
    weight: Optional[float] = Field(default=None)
    weight_per_piece: Optional[float] = Field(default=None)
    calories: Optional[float] = Field(default=None)
    proteins: Optional[float] = Field(default=None)
    fats: Optional[float] = Field(default=None)
    carbs: Optional[float] = Field(default=None)
    quantity: Optional[int] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")

    @field_validator('price', 'weight', 'calories', 'quantity', 'proteins', 'fats', 'carbs')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

class ProductCreate(ProductBase):
    pass

class Product(ProductBase, table=True):
    model_config = {"from_attributes": True}
    
    id: Optional[int] = Field(default=None, primary_key=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Исправлено: убран default=None, так как Relationship() его не поддерживает
    shop: Optional[Shop] = Relationship()
    
    history: List["PriceHistory"] = Relationship(
        back_populates="product", 
        sa_relationship_kwargs={"cascade": "all, delete", "lazy": "selectin"}
    )

# Response model that includes relationships
class ProductResponse(ProductBase):
    id: int
    updated_at: datetime
    shop: Optional[Shop] = None
    history: List["PriceHistory"] = []

# --- PriceHistory ---
class PriceHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    product: Product = Relationship(back_populates="history")

# --- Shopping List Item ---
class ShoppingListItemBase(SQLModel):
    shopping_list_id: int = Field(foreign_key="shoppinglist.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)

class ShoppingListItemCreate(ShoppingListItemBase):
    pass

class ShoppingListItem(ShoppingListItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    is_bought: bool = Field(default=False)
    
    # 🛑 ИСПРАВЛЕНИЕ ЗДЕСЬ:
    # Было: product: Optional[Product] = Relationship(default=None)
    # Стало:
    product: Optional[Product] = Relationship()

# Response model for list item
class ShoppingListItemResponse(ShoppingListItemBase):
    id: int
    is_bought: bool
    product: Optional[ProductResponse] = None

# --- Shopping List ---
class ShoppingListBase(SQLModel):
    name: str

class ShoppingListCreate(ShoppingListBase):
    pass

class ShoppingList(ShoppingListBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    items: List[ShoppingListItem] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete"}
    )

# Response model for shopping list
class ShoppingListResponse(ShoppingListBase):
    id: int
    created_at: datetime
    items: List[ShoppingListItemResponse] = []

# --- Telegram ---
class TelegramConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bot_token: str

class TelegramUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    chat_id: str

# --- API Catalog Export ---
class CatalogExport(SQLModel):
    product: str
    price: float
    currency: str = "EUR"
    shop: Optional[str] = None
    updated_at: datetime

# --- App Configuration ---
class AppConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    currency: str = Field(default="EUR")
    usd_rate: float = Field(default=0)
    rub_rate: float = Field(default=0)
    
    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        return check_currency(v)