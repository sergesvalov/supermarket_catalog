from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Optional
from database import get_session
from models import TelegramConfig, TelegramUser
from pydantic import BaseModel
from services.telegram_service import get_tg_config_service, save_tg_config_service, send_to_tg_service, send_report_to_tg_service

router = APIRouter(prefix="/telegram", tags=["Telegram"])

class ReportPayload(BaseModel):
    text: str



@router.get("/config", response_model=Optional[TelegramConfig])
async def get_tg_config(session: AsyncSession = Depends(get_session)):
    return await get_tg_config_service(session)

@router.post("/config")
async def save_tg_config(config: TelegramConfig, session: AsyncSession = Depends(get_session)):
    return await save_tg_config_service(config, session)

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
    return await send_to_tg_service(list_id, bg, session)

@router.post("/send_report")
async def send_report_to_tg(payload: ReportPayload, bg: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    return await send_report_to_tg_service(payload.text, bg, session)