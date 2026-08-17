import pytest
from unittest.mock import AsyncMock, patch


@pytest.fixture(autouse=True)
def mock_lifecycle_db():
    """Prevent tests from requiring a live MongoDB instance."""
    with patch("app.database.connect_db", AsyncMock()):
        with patch("app.database.close_db", AsyncMock()):
            with patch("app.repositories.indexes.ensure_indexes", AsyncMock()):
                yield
