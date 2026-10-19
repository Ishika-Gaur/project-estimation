import pytest
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from main import app
from models import EstimateInput


class TestFeaturesFieldValidation:
    """Focused unit tests for EstimateInput.features validation."""

    def test_default_features_is_empty_list(self):
        payload = EstimateInput(projectName="Test Project")
        assert payload.features == []

    def test_empty_list_valid(self):
        payload = EstimateInput(projectName="Test Project", features=[])
        assert payload.features == []

    def test_valid_features_trimmed(self):
        payload = EstimateInput(
            projectName="Test Project",
            features=["  Authentication  ", "\tPayment Gateway\n", " Real-time Chat "],
        )
        assert payload.features == ["Authentication", "Payment Gateway", "Real-time Chat"]

    @pytest.mark.parametrize(
        "blank_item",
        ["", "   ", "\t", "\n", " \t \n "],
    )
    def test_reject_blank_strings(self, blank_item):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", features=[blank_item])
        assert "empty or contain only whitespace" in str(exc_info.value)

    @pytest.mark.parametrize(
        "mixed_features",
        [
            ["Auth", ""],
            ["", "Auth"],
            ["Auth", "   ", "Payments"],
            ["  ", "Search"],
        ],
    )
    def test_reject_mixed_valid_and_blank_entries(self, mixed_features):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", features=mixed_features)
        assert "empty or contain only whitespace" in str(exc_info.value)

    @pytest.mark.parametrize(
        "non_string_item",
        [123, True, False, 45.6, None, {"key": "val"}, ["nested"]],
    )
    def test_reject_non_string_values(self, non_string_item):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", features=["Auth", non_string_item])
        assert "must be a string" in str(exc_info.value)

    @pytest.mark.parametrize(
        "invalid_features_type",
        ["not a list", 123, True, {"features": "Auth"}],
    )
    def test_reject_non_list_features(self, invalid_features_type):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", features=invalid_features_type)
        assert "must be a list" in str(exc_info.value)


@pytest.mark.asyncio
class TestFeaturesApiValidation:
    """Integration tests on /api/estimate verifying HTTP responses for features."""

    async def test_api_empty_string_feature_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "features": [""],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("features" in err.get("loc", []) for err in errors)

    async def test_api_whitespace_only_feature_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "features": ["   "],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("features" in err.get("loc", []) for err in errors)

    async def test_api_mixed_valid_and_blank_features_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "features": ["Auth", "   "],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("features" in err.get("loc", []) for err in errors)

    async def test_api_non_string_feature_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "features": [123],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("features" in err.get("loc", []) for err in errors)

    async def test_api_valid_features_trimmed_and_accepted(self, monkeypatch):
        from unittest.mock import AsyncMock, MagicMock
        mock_analysis = MagicMock()
        mock_analysis.model_dump.return_value = {
            "project_category": "Web Application",
            "features": {"mvp": [], "advanced": [], "optional": []},
            "work_scope": {},
            "pricing": {"typical": 15000, "budget": 12000, "premium": 19500},
            "timeline": {"weeks": 2, "hours": 40},
            "technology": [],
            "complexity": {"level": "Medium"},
            "summary": "Summary",
        }
        monkeypatch.setattr("estimate_router.analyze_project", AsyncMock(return_value=mock_analysis))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "features": ["  Authentication  ", " Payment Gateway "],
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["features"] == ["Authentication", "Payment Gateway"]

    async def test_api_empty_features_list_with_valid_description_accepted(self, monkeypatch):
        from unittest.mock import AsyncMock, MagicMock
        mock_analysis = MagicMock()
        mock_analysis.model_dump.return_value = {
            "project_category": "Web Application",
            "features": {"mvp": [], "advanced": [], "optional": []},
            "work_scope": {},
            "pricing": {"typical": 15000, "budget": 12000, "premium": 19500},
            "timeline": {"weeks": 2, "hours": 40},
            "technology": [],
            "complexity": {"level": "Medium"},
            "summary": "Summary",
        }
        monkeypatch.setattr("estimate_router.analyze_project", AsyncMock(return_value=mock_analysis))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "A comprehensive SaaS project description",
                    "features": [],
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["features"] == []

    async def test_api_empty_description_and_empty_features_rejected(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "",
                    "features": [],
                },
            )
            assert res.status_code == 422
            assert "Describe the project or add at least one feature" in res.text
