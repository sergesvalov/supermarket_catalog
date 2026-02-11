
import requests
from sqlmodel import select
from models import Product
from sqlalchemy.ext.asyncio import AsyncSession

EXTERNAL_API_URL = "http://192.168.10.222:8010/products/"

def fetch_external_products():
    """
    Fetches products from the external FoodPlanner API.
    Returns list of products or raises exception on error.
    """
    response = None
    try:
        print(f"Fetching products from {EXTERNAL_API_URL}...")
        response = requests.get(EXTERNAL_API_URL, timeout=10)
        
        # Log response details for debugging
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {response.headers.get('content-type', 'unknown')}")
        
        response.raise_for_status()
        
        # Check if response has content before trying to parse JSON
        if not response.text:
            raise Exception("External API returned empty response")
        
        products = response.json()
        print(f"✅ Successfully fetched {len(products)} products")
        return products
    except requests.Timeout:
        raise Exception(f"Ошибка соединения с внешним API: Connection timeout")
    except requests.ConnectionError:
        raise Exception(f"Ошибка соединения с внешним API: Cannot connect to {EXTERNAL_API_URL}")
    except requests.HTTPError as e:
        error_msg = f"Ошибка HTTP от внешнего API: {e.response.status_code}"
        if e.response.text:
            error_msg += f"\nResponse: {e.response.text[:500]}"  # First 500 chars
        raise Exception(error_msg)
    except (ValueError, requests.exceptions.JSONDecodeError) as e:
        error_msg = f"Ошибка парсинга данных от внешнего API: {e}"
        if response and response.text:
            error_msg += f"\nReceived content (first 500 chars): {response.text[:500]}"
            error_msg += f"\nContent-Type: {response.headers.get('content-type', 'unknown')}"
        raise Exception(error_msg)
    except Exception as e:
        raise Exception(f"Неизвестная ошибка при обращении к API: {str(e)}")

async def import_products_from_service(session: AsyncSession) -> dict:
    """
    Fetches products from external service and updates existing or creates new ones.
    Returns a dict with statistics.
    """
    print(f"Attempting to fetch from {EXTERNAL_API_URL}...")
    external_products = fetch_external_products()
    print(f"Fetched {len(external_products)} products.")
    
    stats = {
        "fetched": len(external_products),
        "created": 0,
        "updated": 0,
        "skipped": 0
    }
    
    for ext_prod in external_products:
        try:
            # Validate required fields
            if not ext_prod.get('name') or ext_prod.get('price') is None:
                print(f"⚠️ Skipping product with missing required fields: {ext_prod}")
                stats["skipped"] += 1
                continue
            
            # Check if product already exists by name
            result = await session.execute(select(Product).where(Product.name == ext_prod['name']))
            existing_product = result.scalars().first()
            
            # Calculate weight/quantity
            weight = None
            quantity = None
            
            unit = ext_prod.get('unit', '')
            amount = ext_prod.get('amount', 1)
            weight_per_piece = ext_prod.get('weight_per_piece')
            
            if unit in ['kg', 'l']:
                # Convert to grams/ml
                weight = amount * 1000
            elif unit == 'pcs':
                quantity = int(amount)
                if weight_per_piece:
                     # Если есть вес одной штуки (в кг, судя по документации), переводим в граммы и умножаем
                     weight = quantity * (weight_per_piece * 1000)
            elif unit == 'g' or unit == 'ml':
                 weight = amount
            else:
                 # Fallback
                 quantity = 1

            if weight is None and quantity is None:
                 quantity = 1 # Default to 1 item if no weight/quantity info
            
            if existing_product:
                # Update existing product
                print(f"Updating existing product: {ext_prod['name']}")
                existing_product.price = ext_prod['price']
                existing_product.weight = weight
                existing_product.quantity = quantity
                existing_product.calories = ext_prod.get('calories')
                existing_product.proteins = ext_prod.get('proteins')
                existing_product.fats = ext_prod.get('fats')
                existing_product.carbs = ext_prod.get('carbs')
                existing_product.weight_per_piece = weight_per_piece
                stats["updated"] += 1
            else:
                # Create new product
                print(f"Creating new product: {ext_prod['name']}")
                new_product = Product(
                    name=ext_prod['name'],
                    price=ext_prod['price'],
                    category="продукты",  # Default category
                    weight=weight,
                    quantity=quantity,
                    calories=ext_prod.get('calories'),
                    proteins=ext_prod.get('proteins'),
                    fats=ext_prod.get('fats'),
                    carbs=ext_prod.get('carbs'),
                    weight_per_piece=weight_per_piece,
                )
                session.add(new_product)
                stats["created"] += 1
        except Exception as e:
            print(f"⚠️ Error importing {ext_prod.get('name', 'unknown')}: {e}")
            stats["skipped"] += 1
        
    await session.commit()
    return stats
