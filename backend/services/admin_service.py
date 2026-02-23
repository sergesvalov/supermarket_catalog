import json
import os
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select
from models import Product, Shop, PriceHistory
from config import settings
from core.exceptions import NotFoundError, BusinessLogicError

def _get_data_dir() -> str:
    db_url = settings.DATABASE_URL
    db_path = db_url.split("///")[-1]
    return str(Path(db_path).parent)

async def export_products_to_file(session: AsyncSession) -> dict:
    query = select(Product).options(
        selectinload(Product.shop),
        selectinload(Product.history)
    )
    result = await session.execute(query)
    products = result.scalars().all()

    export_data = []
    for p in products:
        item = {
            "name": p.name,
            "category": p.category,
            "price": p.price,
            "weight": p.weight,
            "weight_per_piece": p.weight_per_piece,
            "calories": p.calories,
            "proteins": p.proteins,
            "fats": p.fats,
            "carbs": p.carbs,
            "quantity": p.quantity,
            "shop_name": p.shop.name if p.shop else None,
            "shop_currency": p.shop.currency if p.shop else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "price_history": [
                {"price": h.price, "created_at": h.created_at.isoformat()}
                for h in (p.history or [])
            ]
        }
        export_data.append(item)

    data_dir = _get_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    filepath = os.path.join(data_dir, "products_export.json")
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    return {"message": f"Экспортировано {len(export_data)} товаров в {filepath}", "count": len(export_data)}


async def import_products_from_file_service(session: AsyncSession) -> dict:
    data_dir = _get_data_dir()
    filepath = os.path.join(data_dir, "products_export.json")

    if not os.path.exists(filepath):
        raise NotFoundError(f"Файл не найден: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        import_data = json.load(f)

    shops_result = await session.execute(select(Shop))
    shops_by_name = {s.name: s for s in shops_result.scalars().all()}

    products_result = await session.execute(select(Product))
    existing_names = {p.name for p in products_result.scalars().all()}

    created = 0
    skipped = 0

    for item in import_data:
        if item["name"] in existing_names:
            skipped += 1
            continue

        shop_id = None
        if item.get("shop_name"):
            if item["shop_name"] in shops_by_name:
                shop_id = shops_by_name[item["shop_name"]].id
            else:
                new_shop = Shop(name=item["shop_name"], currency=item.get("shop_currency", "EUR"))
                session.add(new_shop)
                await session.flush()
                shops_by_name[new_shop.name] = new_shop
                shop_id = new_shop.id

        product = Product(
            name=item["name"],
            category=item.get("category", "продукты"),
            price=item["price"],
            weight=item.get("weight"),
            weight_per_piece=item.get("weight_per_piece"),
            calories=item.get("calories"),
            proteins=item.get("proteins"),
            fats=item.get("fats"),
            carbs=item.get("carbs"),
            quantity=item.get("quantity"),
            shop_id=shop_id,
            updated_at=datetime.fromisoformat(item["updated_at"]) if item.get("updated_at") else datetime.now()
        )
        session.add(product)
        await session.flush()

        for h in item.get("price_history", []):
            ph = PriceHistory(
                product_id=product.id,
                price=h["price"],
                created_at=datetime.fromisoformat(h["created_at"]) if h.get("created_at") else datetime.now()
            )
            session.add(ph)

        existing_names.add(item["name"])
        created += 1

    await session.commit()
    return {
        "message": f"Импортировано: {created}, Пропущено (дубли): {skipped}",
        "created": created,
        "skipped": skipped
    }
