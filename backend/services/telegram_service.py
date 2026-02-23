import requests
import html
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from models import TelegramConfig, TelegramUser, ShoppingList, ShoppingListItem, Product
from core.exceptions import BusinessLogicError, NotFoundError

def send_telegram_task(bot_token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=10)
    except Exception as e:
        print(f"Ошибка фоновой отправки TG: {e}")

async def get_tg_config_service(session: AsyncSession) -> Optional[TelegramConfig]:
    result = await session.execute(select(TelegramConfig))
    return result.scalars().first()

async def save_tg_config_service(config: TelegramConfig, session: AsyncSession) -> dict:
    try:
        resp = requests.get(f"https://api.telegram.org/bot{config.bot_token}/getMe", timeout=5)
        if not resp.ok: raise Exception()
    except Exception:
        raise BusinessLogicError("Неверный токен Telegram")

    result = await session.execute(select(TelegramConfig))
    existing = result.scalars().first()
    
    if existing:
        existing.bot_token = config.bot_token
        session.add(existing)
    else:
        session.add(config)
    await session.commit()
    return {"ok": True}

async def send_to_tg_service(list_id: int, bg: BackgroundTasks, session: AsyncSession) -> dict:
    res_conf = await session.execute(select(TelegramConfig))
    config = res_conf.scalars().first()
    
    res_users = await session.execute(select(TelegramUser))
    users = res_users.scalars().all()
    
    if not config or not users:
        raise BusinessLogicError("Настройте бота и юзеров")

    query = select(ShoppingList).where(ShoppingList.id == list_id).options(
        selectinload(ShoppingList.items).selectinload(ShoppingListItem.product).selectinload(Product.shop)
    )
    res_sl = await session.execute(query)
    sl = res_sl.scalars().first()
    
    if not sl:
        raise NotFoundError("Список не найден")

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

async def send_report_to_tg_service(text: str, bg: BackgroundTasks, session: AsyncSession) -> dict:
    res_conf = await session.execute(select(TelegramConfig))
    config = res_conf.scalars().first()
    
    res_users = await session.execute(select(TelegramUser))
    users = res_users.scalars().all()
    
    if not config or not users:
        raise BusinessLogicError("Настройте бота и юзеров")

    for u in users:
        bg.add_task(send_telegram_task, config.bot_token, u.chat_id, text)
    
    return {"ok": True}
