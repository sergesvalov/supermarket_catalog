
import requests
from sqlmodel import select
from models import Product
from sqlalchemy.ext.asyncio import AsyncSession

EXTERNAL_API_URL = "http://192.168.10.222:8010/products/"

def fetch_external_products():
    try:
        response = requests.get(EXTERNAL_API_URL, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching products: {e}")
        return []

async def import_products_from_service(session: AsyncSession) -> int:
    """
    Fetches products from external service and saves new ones to the database.
    Returns the number of products imported.
    """
    external_products = fetch_external_products()
    imported_count = 0
    
    for ext_prod in external_products:
        # Check if product already exists by name
        result = await session.execute(select(Product).where(Product.name == ext_prod['name']))
        existing_product = result.scalars().first()
        
        if existing_product:
            await session.refresh(existing_product) # Ensure we have the latest state, though not strictly needed for skipping
            continue
            
        # Default values
        category = "продукты"
        
        # Calculate weight/quantity
        weight = None
        quantity = None
        
        unit = ext_prod.get('unit', '')
        amount = ext_prod.get('amount', 1)
        # weight_per_piece = ext_prod.get('weight_per_piece') # Currently unused but available
        
        if unit in ['kg', 'l']:
            # Convert to grams/ml
            weight = amount * 1000
        elif unit == 'pcs':
            quantity = int(amount)
        elif unit == 'g' or unit == 'ml':
             weight = amount
        else:
             # Fallback
             quantity = 1

        if weight is None and quantity is None:
             quantity = 1 # Default to 1 item if no weight/quantity info
        
        new_product = Product(
            name=ext_prod['name'],
            price=ext_prod['price'],
            category=category,
            weight=weight,
            quantity=quantity,
            calories=ext_prod.get('calories'),
            proteins=ext_prod.get('proteins'),
            fats=ext_prod.get('fats'),
            carbs=ext_prod.get('carbs'),
            # shop_id is None by default
        )
        
        session.add(new_product)
        imported_count += 1
        
    await session.commit()
    return imported_count
