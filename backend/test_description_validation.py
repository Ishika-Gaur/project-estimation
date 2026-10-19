import pytest
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from main import app
from models import EstimateInput, MAX_DESCRIPTION_LENGTH


class TestDescriptionFieldValidation:
    """Focused unit tests for EstimateInput.description validation."""

    def test_normal_description(self):
        desc = "A full-featured e-commerce platform with Stripe checkout and product search."
        payload = EstimateInput(projectName="Test Project", description=desc)
        assert payload.description == desc

    def test_description_trimmed(self):
        payload = EstimateInput(
            projectName="Test Project",
            description="   A healthcare CRM with tele-consultations   ",
        )
        assert payload.description == "A healthcare CRM with tele-consultations"

    def test_empty_description_allowed_on_model(self):
        payload = EstimateInput(projectName="Test Project", description="", features=["Auth"])
        assert payload.description == ""

    def test_none_description_normalized_to_empty(self):
        payload = EstimateInput(projectName="Test Project", description=None, features=["Auth"])
        assert payload.description == ""

    def test_maximum_allowed_length(self):
        desc = "a" * MAX_DESCRIPTION_LENGTH
        payload = EstimateInput(projectName="Test Project", description=desc)
        assert len(payload.description) == MAX_DESCRIPTION_LENGTH

    @pytest.mark.parametrize(
        "over_limit_length",
        [
            MAX_DESCRIPTION_LENGTH + 1,
            6000,
            10000,
        ],
    )
    def test_reject_over_limit_description(self, over_limit_length):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(
                projectName="Test Project",
                description="a" * over_limit_length,
            )
        assert f"must not exceed {MAX_DESCRIPTION_LENGTH:,} characters" in str(exc_info.value)

    @pytest.mark.parametrize(
        "invalid_type",
        [123, True, False, 45.6, ["description"], {"desc": "text"}],
    )
    def test_reject_invalid_input_types(self, invalid_type):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", description=invalid_type)
        assert "must be a string" in str(exc_info.value)


@pytest.mark.asyncio
class TestDescriptionApiValidation:
    """Integration tests on /api/estimate verifying HTTP responses for description."""

    async def test_api_normal_description_accepted(self, monkeypatch):
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
                    "description": "  A SaaS application for task tracking  ",
                    "features": ["Auth"],
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["description"] == "A SaaS application for task tracking"

    async def test_api_empty_description_with_valid_features_accepted(self, monkeypatch):
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
                    "description": "",
                    "features": ["Real-time Chat", "File Upload"],
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["description"] == ""

    async def test_api_empty_description_with_no_features_rejected(self):
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

    async def test_api_maximum_allowed_length_accepted(self, monkeypatch):
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
                    "description": "a" * MAX_DESCRIPTION_LENGTH,
                    "features": ["Auth"],
                },
            )
            assert res.status_code == 200, res.text
            assert len(res.json()["input"]["description"]) == MAX_DESCRIPTION_LENGTH

    async def test_api_over_limit_description_rejected(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "a" * 10000,
                    "features": ["Auth"],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("description" in err.get("loc", []) for err in errors)

    async def test_api_invalid_input_type_rejected(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": 12345,
                    "features": ["Auth"],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("description" in err.get("loc", []) for err in errors)
