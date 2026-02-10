import requests
import html
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from database import get_session
from models import TelegramConfig, TelegramUser, ShoppingList, ShoppingListItem, Product

router = APIRouter(prefix="/telegram", tags=["Telegram"])

# Хелпер для фоновой задачи (остается синхронным, так как requests синхронный, 
# и BackgroundTasks запускает его в thread pool, что нормально для блокирующих операций)
def send_telegram_task(bot_token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=10)
    except Exception as e:
        print(f"Ошибка фоновой отправки TG: {e}")

@router.get("/config", response_model=Optional[TelegramConfig])
async def get_tg_config(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TelegramConfig))
    return result.scalars().first()

@router.post("/config")
async def save_tg_config(config: TelegramConfig, session: AsyncSession = Depends(get_session)):
    # Проверку токена можно оставить синхронной или вынести в thread pool, но requests быстрый
    # Лучше использовать httpx для async, но ради одной проверки не будем тянуть новую зависимость
    try:
        resp = requests.get(f"https://api.telegram.org/bot{config.bot_token}/getMe", timeout=5)
        if not resp.ok: raise Exception()
    except:
        raise HTTPException(status_code=400, detail="Неверный токен Telegram")

    result = await session.execute(select(TelegramConfig))
    existing = result.scalars().first()
    
    if existing:
        existing.bot_token = config.bot_token
        session.add(existing)
    else:
        session.add(config)
    await session.commit()
    return {"ok": True}

@router.get("/users", response_model=List[TelegramUser])
async def get_tg_users(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TelegramUser))
    return result.scalars().all()

@router.post("/users")
async def add_tg_user(user: TelegramUser, session: AsyncSession = Depends(get_session)):
    session.add(user)
    await session.commit()
    return user

@router.delete("/users/{user_id}")
async def del_tg_user(user_id: int, session: AsyncSession = Depends(get_session)):
    user = await session.get(TelegramUser, user_id)
    if user:
        await session.delete(user)
        await session.commit()
    return {"ok": True}

@router.post("/send/{list_id}")
async def send_to_tg(list_id: int, bg: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    res_conf = await session.execute(select(TelegramConfig))
    config = res_conf.scalars().first()
    
    res_users = await session.execute(select(TelegramUser))
    users = res_users.scalars().all()
    
    if not config or not users: raise HTTPException(status_code=400, detail="Настройте бота и юзеров")

    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    res_sl = await session.execute(query)
    sl = res_sl.scalars().first()
    
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