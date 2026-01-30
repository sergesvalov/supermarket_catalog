from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship
from pydantic import field_validator

# --- Shop ---
class ShopBase(SQLModel):
    name: str = Field(index=True, unique=True)

class ShopCreate(ShopBase):
    pass

class Shop(ShopBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

# --- Product ---
class ProductBase(SQLModel):
    name: str
    price: float
    weight: Optional[float] = Field(default=None)
    calories: Optional[float] = Field(default=None)
    quantity: Optional[int] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id")

    @field_validator('price', 'weight', 'calories', 'quantity')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Значение не может быть отрицательным')
        return v

class ProductCreate(ProductBase):
    pass

class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    shop: Optional[Shop] = Relationship()
    history: List["PriceHistory"] = Relationship(
        back_populates="product", 
        sa_relationship_kwargs={"cascade": "all, delete", "lazy": "selectin"}
    )

# --- PriceHistory ---
class PriceHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    price: float
    created_at: datetime = Field(default_factory=datetime.now)
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
    
    product: Optional[Product] = Relationship(default=None)

# --- Shopping List ---
class ShoppingListBase(SQLModel):
    name: str

class ShoppingListCreate(ShoppingListBase):
    pass

class ShoppingList(ShoppingListBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    items: List[ShoppingListItem] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete"}
    )

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