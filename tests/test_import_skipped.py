import pytest
from unittest.mock import MagicMock, patch
from backend.import_service import import_products_from_service
from backend.models import Product

# Mock data with products missing required fields
MOCK_API_WITH_INVALID = [
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
        # Missing price - should be skipped
        "name": "Banana",
        "unit": "pcs",
        "amount": 5,
        "calories": 89,
        "id": 2
    },
    {
        # Missing name - should be skipped
        "price": 0.99,
        "unit": "l",
        "amount": 1,
        "id": 3
    }
]

@pytest.mark.asyncio
async def test_import_products_skip_invalid():
    """Test that products with missing required fields are skipped"""
    with patch('backend.import_service.requests.get') as mock_get:
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_API_WITH_INVALID
        mock_get.return_value = mock_response

        # Mock the database session
        mock_session = MagicMock()
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
        assert stats["fetched"] == 3
        assert stats["created"] == 1  # Only Apple
        assert stats["updated"] == 0
        assert stats["skipped"] == 2  # Banana (no price) and unnamed product
        assert len(added_products) == 1
        
        # Check that only Apple was added
        assert added_products[0].name == "Apple"

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(test_import_products_skip_invalid())
        print("Test passed!")
    except AssertionError as e:
        print(f"Test failed: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
