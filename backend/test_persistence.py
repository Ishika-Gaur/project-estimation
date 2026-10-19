import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from main import app
from auth import get_optional_user

pytestmark = pytest.mark.asyncio(loop_scope="module")


@pytest.fixture
def mock_ai_analysis():
    mock = MagicMock()
    mock.model_dump.return_value = {
        "project_category": "Web Application",
        "features": {"mvp": [], "advanced": [], "optional": []},
        "work_scope": {},
        "pricing": {"typical": 15000, "budget": 12000, "premium": 19500},
        "timeline": {"weeks": 2, "hours": 40},
        "technology": [],
        "complexity": {"level": "Medium"},
        "summary": "Summary",
    }
    return mock


class TestEstimatePersistence:
    """Focused tests for estimate creation persistence and error handling."""

    async def test_guest_estimate_success_no_db_insert(self, monkeypatch, mock_ai_analysis):
        """Guest estimates succeed without attempting database insertion."""
        monkeypatch.setattr("estimate_router.analyze_project", AsyncMock(return_value=mock_ai_analysis))
        mock_db = MagicMock()
        mock_insert = AsyncMock()
        mock_db.estimates.insert_one = mock_insert
        monkeypatch.setattr(app.state, "db", mock_db)

        app.dependency_overrides[get_optional_user] = lambda: None
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
                res = await client.post(
                    "/api/estimate",
                    json={
                        "projectName": "Guest App",
                        "description": "A web project created by a guest",
                    },
                )
                assert res.status_code == 200, res.text
                data = res.json()
                assert data["user_email"] is None
                assert data["input"]["projectName"] == "Guest App"
                mock_insert.assert_not_called()
        finally:
            app.dependency_overrides.pop(get_optional_user, None)

    async def test_authenticated_estimate_success_persisted(self, monkeypatch, mock_ai_analysis):
        """Authenticated estimates are persisted to the database and return 200."""
        user_email = "developer@example.com"
        monkeypatch.setattr("estimate_router.analyze_project", AsyncMock(return_value=mock_ai_analysis))
        mock_db = MagicMock()
        mock_insert = AsyncMock()
        mock_db.estimates.insert_one = mock_insert
        monkeypatch.setattr(app.state, "db", mock_db)

        app.dependency_overrides[get_optional_user] = lambda: {
            "email": user_email,
            "name": "Dev",
            "role": "user",
        }
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
                res = await client.post(
                    "/api/estimate",
                    json={
                        "projectName": "Auth App",
                        "description": "A web project created by a logged-in user",
                    },
                )
                assert res.status_code == 200, res.text
                data = res.json()
                assert data["user_email"] == user_email
                assert data["input"]["projectName"] == "Auth App"
                mock_insert.assert_called_once()
                inserted_doc = mock_insert.call_args[0][0]
                assert inserted_doc["user_email"] == user_email
        finally:
            app.dependency_overrides.pop(get_optional_user, None)

    async def test_authenticated_estimate_db_failure_returns_500_safe_message(self, monkeypatch, mock_ai_analysis):
        """Database insertion failure for authenticated users returns HTTP 500 without leaking credentials."""
        user_email = "developer@example.com"
        monkeypatch.setattr("estimate_router.analyze_project", AsyncMock(return_value=mock_ai_analysis))
        mock_db = MagicMock()
        sensitive_db_error = Exception(
            "MongoNetworkError: connection failed to mongodb://root:s3cr3t_p@ss@db.internal:27017"
        )
        mock_insert = AsyncMock(side_effect=sensitive_db_error)
        mock_db.estimates.insert_one = mock_insert
        monkeypatch.setattr(app.state, "db", mock_db)

        app.dependency_overrides[get_optional_user] = lambda: {
            "email": user_email,
            "name": "Dev",
            "role": "user",
        }
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
                res = await client.post(
                    "/api/estimate",
                    json={
                        "projectName": "Failing App",
                        "description": "Testing DB persistence failure",
                    },
                )
                assert res.status_code == 500
                data = res.json()
                assert data.get("detail") == "Failed to save estimate."
                # Ensure no credentials or connection strings leaked in response
                assert "mongodb://" not in res.text
                assert "s3cr3t" not in res.text
                mock_insert.assert_called_once()
        finally:
            app.dependency_overrides.pop(get_optional_user, None)
