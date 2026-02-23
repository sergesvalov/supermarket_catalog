from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from database import get_session
from models import ProductCreate, ProductResponse
from services import product_service

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
async def get_products(session: AsyncSession = Depends(get_session)):
    return await product_service.get_all_products(session)
@router.post("", response_model=ProductResponse)
async def create_product(product_in: ProductCreate, session: AsyncSession = Depends(get_session)):
    return await product_service.create_product(product_in, session)

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductCreate, session: AsyncSession = Depends(get_session)):
    return await product_service.update_product(product_id, product_data, session)

@router.delete("/{product_id}", status_code=204)
@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, session: AsyncSession = Depends(get_session)):
    await product_service.delete_product(product_id, session)
    return None