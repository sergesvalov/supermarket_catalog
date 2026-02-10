from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import AppConfig

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/config", response_model=AppConfig)
def get_config(session: Session = Depends(get_session)):
    config = session.exec(select(AppConfig)).first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
        session.commit()
        session.refresh(config)
    return config

@router.post("/config", response_model=AppConfig)
def update_config(config_in: AppConfig, session: Session = Depends(get_session)):
    config = session.exec(select(AppConfig)).first()
    if not config:
        config = AppConfig(currency="EUR")
        session.add(config)
    
    config.currency = config_in.currency
    session.add(config)
    session.commit()
    session.refresh(config)
    return config
