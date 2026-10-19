import pytest
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from main import app
from models import EstimateInput, MAX_PROJECT_NAME_LENGTH


class TestProjectNameFieldValidation:
    """Focused unit tests for EstimateInput.projectName validation."""

    @pytest.mark.parametrize(
        "valid_name",
        [
            "AI-Powered CRM",
            "Untitled Project",
            "Costify 2.0",
            "123 App",
            "Project (MVP) - Web & Mobile!",
            "a" * MAX_PROJECT_NAME_LENGTH,
        ],
    )
    def test_valid_project_names(self, valid_name):
        payload = EstimateInput(projectName=valid_name)
        assert payload.projectName == valid_name.strip()

    @pytest.mark.parametrize(
        "raw_name,expected_trimmed",
        [
            ("   AI CRM   ", "AI CRM"),
            ("\tMy Project\n", "My Project"),
            ("  Untitled Project  ", "Untitled Project"),
        ],
    )
    def test_whitespace_trimmed(self, raw_name, expected_trimmed):
        payload = EstimateInput(projectName=raw_name)
        assert payload.projectName == expected_trimmed

    def test_reject_missing_project_name(self):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(description="Project without a title")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("projectName",) for e in errors)

    def test_reject_null_project_name(self):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName=None)
        errors = exc_info.value.errors()
        assert any("projectName" in str(e["loc"]) for e in errors)

    @pytest.mark.parametrize(
        "blank_val",
        ["", "   ", "\t", "\n", " \t \n "],
    )
    def test_reject_blank_names(self, blank_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName=blank_val)
        assert "empty or whitespace-only" in str(exc_info.value)

    @pytest.mark.parametrize(
        "long_name",
        [
            "a" * (MAX_PROJECT_NAME_LENGTH + 1),
            "a" * 1000,
        ],
    )
    def test_reject_excessive_length(self, long_name):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName=long_name)
        assert f"must not exceed {MAX_PROJECT_NAME_LENGTH} characters" in str(exc_info.value)

    @pytest.mark.parametrize(
        "special_only",
        [
            "!@#$%^&*()",
            "---",
            "...",
            " !@# ",
            "___",
            ";;;",
        ],
    )
    def test_reject_special_characters_only(self, special_only):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName=special_only)
        assert "must contain at least one alphanumeric character" in str(exc_info.value)

    @pytest.mark.parametrize(
        "invalid_type",
        [True, False, 123, 45.6, [], {}],
    )
    def test_reject_non_string_types(self, invalid_type):
        with pytest.raises(ValidationError):
            EstimateInput(projectName=invalid_type)


@pytest.mark.asyncio
class TestProjectNameApiValidation:
    """Integration tests verifying HTTP responses on /api/estimate for projectName."""

    async def test_api_missing_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"description": "Test App with no projectName"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_null_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": None, "description": "Test App"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_empty_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "", "description": "Test App"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_whitespace_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "   ", "description": "Test App"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_excessive_length_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "a" * 1000, "description": "Test App"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_special_chars_only_project_name_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "!@#$%^&*()", "description": "Test App"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("projectName" in err.get("loc", []) for err in errors)

    async def test_api_valid_project_name_trimmed_and_accepted(self, monkeypatch):
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
                json={"projectName": "   AI-Powered CRM   ", "description": "Test App"},
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["projectName"] == "AI-Powered CRM"

    async def test_api_frontend_default_accepted(self, monkeypatch):
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
                json={"projectName": "Untitled Project", "description": "Test App"},
            )
            assert res.status_code == 200, res.text
            assert res.json()["input"]["projectName"] == "Untitled Project"
