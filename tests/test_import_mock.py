import pytest
from unittest.mock import MagicMock, patch
from backend.import_service import import_products_from_service
from backend.models import Product

# Mock data based on the new API docs
MOCK_API_RESPONSE = [
    {
        "name": "Apple",
        "price": 1.5,
        "unit": "kg",
        "amount": 1,
        "calories": 52,
        "proteins": 0.3,
        "fats": 0.2,
        "carbs": 14,
        "weight_per_piece": 0.15,
        "id": 1
    },
    {
        "name": "Banana",
        "price": 0.99,
        "unit": "pcs",
        "amount": 5,
        "calories": 89,
        "proteins": 1.1,
        "fats": 0.3,
        "carbs": 23,
        "weight_per_piece": 0.12, # 120g per piece
        "id": 2
    }
]

@pytest.mark.asyncio
async def test_import_products_logic():
    # Mock the requests.get call
    with patch('backend.import_service.requests.get') as mock_get:
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_API_RESPONSE
        mock_get.return_value = mock_response

        # Mock the database session
        mock_session = MagicMock()
        # Mock the execute result to return None (no existing product)
        mock_result = MagicMock()
        mock_result.scalars().first.return_value = None
        mock_session.execute.return_value = mock_result
        
        # Capture added products
        added_products = []
        def add_side_effect(product):
            added_products.append(product)
        mock_session.add.side_effect = add_side_effect

        # Run the import function
        stats = await import_products_from_service(mock_session)

        # Assertions
        assert stats["fetched"] == 2
        assert stats["imported"] == 2
        assert len(added_products) == 2

        # Check Apple
        apple = next(p for p in added_products if p.name == "Apple")
        assert apple.weight_per_piece == 0.15
        assert apple.weight == 1000 # 1kg in grams

        # Check Banana (pcs with weight_per_piece)
        banana = next(p for p in added_products if p.name == "Banana")
        assert banana.weight_per_piece == 0.12
        assert banana.quantity == 5
        # Weight should be quantity * weight_per_piece * 1000
        # 5 * 0.12 * 1000 = 600g
        assert banana.weight == 600 

if __name__ == "__main__":
    import asyncio
    # Simple runner if pytest is not available/configured easily
    try:
        asyncio.run(test_import_products_logic())
        print("Test passed!")
    except AssertionError as e:
        print(f"Test failed: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
