import pytest
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from main import app
from models import EstimateInput


class TestPlatformsFieldValidation:
    """Focused unit tests for EstimateInput.platforms validation."""

    def test_default_platforms_is_web(self):
        payload = EstimateInput(projectName="Test Project")
        assert payload.platforms == ["Web"]

    @pytest.mark.parametrize(
        "valid_platforms,expected",
        [
            (["Web"], ["Web"]),
            (["Web", "Android", "iOS"], ["Web", "Android", "iOS"]),
            (["  Web  ", "\tiOS\n"], ["Web", "iOS"]),
            (["Desktop", "Embedded"], ["Desktop", "Embedded"]),
            (["Cloud / API"], ["Cloud / API"]),
        ],
    )
    def test_valid_platforms_and_trimming(self, valid_platforms, expected):
        payload = EstimateInput(projectName="Test Project", platforms=valid_platforms)
        assert payload.platforms == expected

    @pytest.mark.parametrize(
        "empty_or_blank",
        [
            [],
            [""],
            ["   "],
            ["\t"],
            ["\n"],
            [" \t \n "],
        ],
    )
    def test_reject_empty_and_blank_entries(self, empty_or_blank):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", platforms=empty_or_blank)
        err_str = str(exc_info.value).lower()
        assert "empty" in err_str or "whitespace" in err_str

    @pytest.mark.parametrize(
        "mixed_entries",
        [
            ["Web", ""],
            ["", "Web"],
            ["Web", "   ", "iOS"],
            ["  ", "Android"],
        ],
    )
    def test_reject_mixed_valid_and_blank_entries(self, mixed_entries):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", platforms=mixed_entries)
        assert "empty or contain only whitespace" in str(exc_info.value)

    @pytest.mark.parametrize(
        "duplicate_platforms",
        [
            ["Web", "Web"],
            ["Web", "web"],
            ["Web", "WEB"],
            ["  Web  ", "web"],
            ["Android", "iOS", "android"],
            ["iOS", "ios", "IOS"],
        ],
    )
    def test_reject_duplicate_platforms_case_insensitive(self, duplicate_platforms):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", platforms=duplicate_platforms)
        assert "duplicate" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "non_string_val",
        [123, True, False, 45.6, None, {"platform": "Web"}, ["nested"]],
    )
    def test_reject_non_string_platform_items(self, non_string_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", platforms=["Web", non_string_val])
        assert "must be a string" in str(exc_info.value)

    @pytest.mark.parametrize(
        "non_list_val",
        ["Web", 123, True, {"platforms": "Web"}],
    )
    def test_reject_non_list_platforms(self, non_list_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", platforms=non_list_val)
        assert "must be a list" in str(exc_info.value)


@pytest.mark.asyncio
class TestPlatformsApiValidation:
    """Integration tests on /api/estimate verifying HTTP responses for platforms."""

    async def test_api_default_platform_applied_when_omitted(self, monkeypatch):
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
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["platforms"] == ["Web"]

    async def test_api_valid_platforms_trimmed_and_accepted(self, monkeypatch):
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
                    "platforms": ["  Web  ", " Android "],
                },
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["platforms"] == ["Web", "Android"]

    async def test_api_duplicate_platforms_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "platforms": ["Web", " web "],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("platforms" in err.get("loc", []) for err in errors)

    async def test_api_empty_platform_string_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "platforms": [""],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("platforms" in err.get("loc", []) for err in errors)

    async def test_api_whitespace_platform_string_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "platforms": ["   "],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("platforms" in err.get("loc", []) for err in errors)

    async def test_api_non_string_platform_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "platforms": [123],
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("platforms" in err.get("loc", []) for err in errors)

    async def test_api_non_list_platform_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={
                    "projectName": "Test Project",
                    "description": "Valid description",
                    "platforms": "Web",
                },
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("platforms" in err.get("loc", []) for err in errors)
