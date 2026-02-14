from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select
from database import get_session
from models import AppConfig, Product, Shop, PriceHistory
from config import settings
import json
import os
from datetime import datetime
from pathlib import Path

router = APIRouter(prefix="/admin", tags=["Admin"])

def _get_data_dir():
    """Get the data directory from DATABASE_URL (same dir as the db file)."""
    db_url = settings.DATABASE_URL
    # Extract path: sqlite+aiosqlite:///data/database.db -> data/
    db_path = db_url.split("///")[-1]
    return str(Path(db_path).parent)

@router.get("/config", response_model=AppConfig)
async def get_config(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
        await session.commit()
        await session.refresh(config)
    return config

@router.post("/config", response_model=AppConfig)
async def update_config(config_in: AppConfig, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppConfig))
    config = result.scalars().first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
    
    config.currency = config_in.currency
    config.usd_rate = config_in.usd_rate
    config.rub_rate = config_in.rub_rate
    session.add(config)
    await session.commit()
    await session.refresh(config)
    return config

@router.post("/export")
async def export_products(session: AsyncSession = Depends(get_session)):
    """Export all products with shops and price history to a JSON file."""
    try:
        # Load products with relationships
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import-file")
async def import_products_from_file(session: AsyncSession = Depends(get_session)):
    """Import products from the JSON export file."""
    try:
        data_dir = _get_data_dir()
        filepath = os.path.join(data_dir, "products_export.json")

        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail=f"Файл не найден: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            import_data = json.load(f)

        # Cache existing shops
        shops_result = await session.execute(select(Shop))
        shops_by_name = {s.name: s for s in shops_result.scalars().all()}

        # Cache existing products
        products_result = await session.execute(select(Product))
        existing_names = {p.name for p in products_result.scalars().all()}

        created = 0
        skipped = 0

        for item in import_data:
            if item["name"] in existing_names:
                skipped += 1
                continue

            # Resolve or create shop
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

            # Restore price history
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_products_endpoint(session: AsyncSession = Depends(get_session)):
    from import_service import import_products_from_service
    try:
        stats = await import_products_from_service(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "message": f"Создано: {stats['created']}, Обновлено: {stats['updated']}, Пропущено: {stats['skipped']}",
        "created": stats["created"],
        "updated": stats["updated"],
        "skipped": stats["skipped"]
    }

