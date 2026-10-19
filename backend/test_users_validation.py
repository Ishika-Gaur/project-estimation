import pytest
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from main import app
from models import EstimateInput, MAX_USERS


class TestUsersFieldValidation:
    """Focused unit tests for EstimateInput users field validation."""

    def test_default_users_value(self):
        """Preserve current valid default."""
        payload = EstimateInput(projectName="Test Project")
        assert payload.users == "1,000–10,000"

    @pytest.mark.parametrize(
        "valid_val",
        [
            # Frontend canonical ranges
            "1,000–10,000",
            "100–1,000",
            "Less than 100",
            "10,000+",
            # Variations with hyphen, without commas, or whitespace
            "1,000-10,000",
            "100-1,000",
            "1000-10000",
            "100-1000",
            "10000+",
            "less than 100",
            "< 100",
            "> 10000",
            " 1,000–10,000 ",
            # Valid arbitrary ranges within bounds
            "500-1000",
            "500–1000",
            "1,000 - 5,000",
            "100 to 1,000",
            # Positive integers and numeric strings within bounds
            500,
            "500",
            1,
            "1",
            0,
            "0",
            1000,
            "1,000",
            10000,
            "10,000",
            MAX_USERS,
            f"{MAX_USERS:,}",
        ],
    )
    def test_valid_users_inputs(self, valid_val):
        payload = EstimateInput(projectName="Test Project", users=valid_val)
        assert payload.users is not None

    @pytest.mark.parametrize(
        "negative_val",
        [-5, "-5", -1, "-1", "-100", "-1,000", "- 5"],
    )
    def test_reject_negative_numbers(self, negative_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", users=negative_val)
        assert "negative" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "bool_val",
        [True, False, "true", "false", "True", "False"],
    )
    def test_reject_booleans(self, bool_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", users=bool_val)
        assert "boolean" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "invalid_str",
        ["abc", "xyz", "", "   ", "500users", "users500", "about 500", "NaN", "Infinity", "-Infinity"],
    )
    def test_reject_invalid_strings(self, invalid_str):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", users=invalid_str)
        assert "users" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "decimal_val",
        [5.5, "5.5", 10.0, "10.0", 0.5, "1,000.50", "10.5-20.5"],
    )
    def test_reject_decimals(self, decimal_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", users=decimal_val)
        assert "decimal" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "large_val",
        [
            1000000,
            "1000000",
            "1,000,000",
            100001,
            "100,001",
            10000000,
            "100-1000000",
            "1,000,000+",
        ],
    )
    def test_reject_values_exceeding_maximum(self, large_val):
        with pytest.raises(ValidationError) as exc_info:
            EstimateInput(projectName="Test Project", users=large_val)
        assert "exceeds" in str(exc_info.value).lower() or "limit" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "unusual_format",
        [
            "1e6",
            "1e3",
            "0x10",
            "0b10",
            "--5",
            "++5",
            "+-5",
            "1..000",
            "1,,000",
            "1000-500",  # inverted range min > max
            "500-500",   # empty range
        ],
    )
    def test_reject_unusual_numeric_formats(self, unusual_format):
        with pytest.raises(ValidationError):
            EstimateInput(projectName="Test Project", users=unusual_format)


@pytest.mark.asyncio
class TestEstimateApiUsersValidation:
    """Integration tests verifying HTTP 422 returned on /api/estimate."""

    async def test_invalid_users_negative_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": "-5"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    async def test_invalid_users_non_numeric_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": "abc"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    async def test_invalid_users_extremely_large_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": "1000000"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    async def test_invalid_users_boolean_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": True},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    async def test_invalid_users_decimal_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": 5.5},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    async def test_invalid_users_unusual_format_returns_422(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project", "users": "1e6"},
            )
            assert res.status_code == 422
            errors = res.json().get("detail", [])
            assert any("users" in err.get("loc", []) for err in errors)

    @pytest.mark.parametrize(
        "valid_val,expected_in_input",
        [
            ("1,000–10,000", "1,000–10,000"),
            ("100–1,000", "100–1,000"),
            ("Less than 100", "Less than 100"),
            ("10,000+", "10,000+"),
            ("100-1000", "100-1000"),
            (500, "500"),
        ],
    )
    async def test_valid_users_accepted_on_api(self, monkeypatch, valid_val, expected_in_input):
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
                json={"projectName": "Test Project", "description": "Test Project", "users": valid_val},
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["input"]["users"] == expected_in_input

    async def test_default_users_preserved_on_api(self, monkeypatch):
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
            # Users field completely omitted, valid projectName provided
            res = await client.post(
                "/api/estimate",
                json={"projectName": "Test Project", "description": "Test Project"},
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["input"]["users"] == "1,000–10,000"


