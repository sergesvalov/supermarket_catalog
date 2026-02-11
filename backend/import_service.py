
import requests
from sqlmodel import select
from models import Product
from sqlalchemy.ext.asyncio import AsyncSession

EXTERNAL_API_URL = "http://192.168.10.222:8000/products/"

def fetch_external_products():
    # First, check what's available on the server
    base_url = "http://192.168.10.222:8000"
    
    print(f"\n🔍 DIAGNOSTIC: Checking what's available on {base_url}")
    print("=" * 60)
    
    # Check root path
    try:
        response = requests.get(base_url, timeout=5)
        print(f"Root path ({base_url}): {response.status_code}")
        if response.status_code == 200:
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Response: {response.text[:300]}")
    except Exception as e:
        print(f"Root path error: {e}")
    
    # Check /docs (FastAPI Swagger)
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        print(f"\n/docs endpoint: {response.status_code}")
        if response.status_code == 200:
            print("✅ Swagger docs available at /docs")
    except Exception as e:
        print(f"/docs error: {e}")
    
    print("=" * 60)
    print("\n🔍 Trying product endpoints...")
    
    # Try different possible API endpoints
    possible_urls = [
        f"{base_url}/products/",
        f"{base_url}/products",
        f"{base_url}/api/products/",
        f"{base_url}/api/products",
    ]
    
    for url in possible_urls:
        try:
            print(f"\nTrying: {url}")
            response = requests.get(url, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"Content-Type: {response.headers.get('content-type')}")
                print(f"Response length: {len(response.content)} bytes")
                print(f"Response preview: {response.text[:200]}")
                
                # Try to parse JSON
                try:
                    data = response.json()
                    print(f"✅ SUCCESS! Found working endpoint: {url}")
                    print(f"Successfully parsed JSON with {len(data)} items")
                    return data
                except ValueError as json_err:
                    print(f"❌ JSON parsing error: {json_err}")
                    continue
            else:
                print(f"❌ Got {response.status_code}")
                if response.status_code == 404:
                    print(f"Response: {response.text[:100]}")
                
        except requests.RequestException as e:
            print(f"❌ Request error: {e}")
            continue
    
    print(f"\n❌ All endpoints failed.")
    print(f"\n💡 Возможные причины:")
    print(f"  1. API не развернут на {base_url}")
    print(f"  2. Используется другой порт (не 8000)")
    print(f"  3. Эндпоинт имеет другое название")
    print(f"  4. Требуется авторизация")
    print(f"\nПопробуйте открыть в браузере: {base_url}/docs")
    return []

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
        "errors": []
    }
    
    for ext_prod in external_products:
        try:
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
            print(f"Error importing {ext_prod.get('name', 'unknown')}: {e}")
            stats["errors"].append(str(e))
        
    await session.commit()
    return stats
