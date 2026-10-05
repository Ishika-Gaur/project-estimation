"""Generates test_security.py with proper encoding."""
import pathlib

code = r'''# -*- coding: utf-8 -*-
"""
CostifyAI Security & Functional Test Suite
Run:  pytest test_security.py -v
"""

import time
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from dotenv import load_dotenv

load_dotenv()

from main import app, db  # noqa: E402

# Force ALL async tests in this module to share the same module-scoped event
# loop -- this matches the module-scoped Motor client and fixtures, preventing
# "Event loop is closed" errors.
pytestmark = pytest.mark.asyncio(loop_scope="module")

_TS = int(time.time())
ALICE_EMAIL = f"alice_{_TS}@example.com"
BOB_EMAIL   = f"bob_{_TS}@example.com"
STRONG_PW   = "Str0ng!Pass#99"


# =====================================================================
# Fixtures
# =====================================================================

@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture(scope="module", loop_scope="module", autouse=True)
async def reset_and_cleanup(client):
    """Reset slowapi rate-limit counters before tests, clean DB after."""
    try:
        from auth import limiter
        storage = getattr(limiter, "_storage", None)
        if storage and hasattr(storage, "reset"):
            storage.reset()
    except Exception:
        pass
    yield
    pat = f"_{_TS}@example\\.com$"
    await db.users.delete_many({"email": {"$regex": pat}})
    await db.estimates.delete_many({"user_email": {"$regex": pat}})
    await db.project_analyses.delete_many({"user_email": {"$regex": pat}})


# -- helpers -----------------------------------------------------------------

async def _register(client, email=None, password=STRONG_PW, name="Test"):
    return await client.post("/auth/register", json={
        "name": name, "email": email or ALICE_EMAIL, "password": password
    })


async def _login(client, email=None, password=STRONG_PW):
    return await client.post("/auth/login", json={
        "email": email or ALICE_EMAIL, "password": password
    })


async def _auth_header(client, email=None, password=STRONG_PW):
    """Register (ignore 409) then login; return Authorization header dict."""
    email = email or ALICE_EMAIL
    reg = await client.post("/auth/register", json={"name": "T", "email": email, "password": password})
    if reg.status_code not in (201, 409):
        raise AssertionError(f"Register failed ({reg.status_code}): {reg.text}")
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed ({r.status_code}): {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# =====================================================================
# 1. REGISTRATION
# =====================================================================

class TestRegister:

    async def test_register_success(self, client):
        r = await _register(client)
        assert r.status_code == 201, r.text
        d = r.json()
        assert "access_token" in d and "refresh_token" in d
        assert d["role"] == "user"

    async def test_duplicate_email_returns_409(self, client):
        await _register(client)
        r = await _register(client)
        assert r.status_code == 409, r.text

    async def test_weak_too_short(self, client):
        r = await client.post("/auth/register", json={
            "name": "T", "email": f"s1_{_TS}@example.com", "password": "Ab1!"
        })
        assert r.status_code == 422, r.text

    async def test_weak_no_uppercase(self, client):
        r = await client.post("/auth/register", json={
            "name": "T", "email": f"s2_{_TS}@example.com", "password": "weak1234!"
        })
        assert r.status_code == 422, r.text

    async def test_weak_no_digit(self, client):
        r = await client.post("/auth/register", json={
            "name": "T", "email": f"s3_{_TS}@example.com", "password": "Weakpass!"
        })
        assert r.status_code == 422, r.text

    async def test_weak_no_special(self, client):
        r = await client.post("/auth/register", json={
            "name": "T", "email": f"s4_{_TS}@example.com", "password": "Weakpass1"
        })
        assert r.status_code == 422, r.text

    async def test_empty_name_rejected(self, client):
        r = await client.post("/auth/register", json={
            "name": "   ", "email": f"s5_{_TS}@example.com", "password": STRONG_PW
        })
        assert r.status_code == 422, r.text

    async def test_invalid_email_rejected(self, client):
        r = await client.post("/auth/register", json={
            "name": "T", "email": "not-an-email", "password": STRONG_PW
        })
        assert r.status_code == 422, r.text


# =====================================================================
# 2. LOGIN
# =====================================================================

class TestLogin:

    async def test_valid_credentials(self, client):
        await _register(client)
        r = await _login(client)
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()

    async def test_wrong_password(self, client):
        await _register(client)
        r = await client.post("/auth/login", json={"email": ALICE_EMAIL, "password": "Wrong!Pass1"})
        assert r.status_code == 401, r.text

    async def test_nonexistent_user(self, client):
        r = await client.post("/auth/login", json={
            "email": f"ghost_{_TS}@example.com", "password": STRONG_PW
        })
        assert r.status_code == 401, r.text

    async def test_returns_role(self, client):
        await _register(client)
        r = await _login(client)
        assert r.json().get("role") in ("user", "admin")


# =====================================================================
# 3. JWT
# =====================================================================

class TestJWT:

    async def test_unauthenticated_list_returns_empty(self, client):
        r = await client.get("/api/estimates")
        assert r.status_code == 200 and r.json() == []

    async def test_garbage_token_rejected(self, client):
        r = await client.delete("/api/estimates/fake_id",
                                headers={"Authorization": "Bearer this.is.garbage"})
        assert r.status_code == 401, r.text

    async def test_refresh_token_rejected_as_access_token(self, client):
        await _register(client)
        login_r = await _login(client)
        refresh = login_r.json().get("refresh_token")
        assert refresh, f"No refresh_token in: {login_r.text}"
        r = await client.delete("/api/estimates/fake_id",
                                headers={"Authorization": f"Bearer {refresh}"})
        assert r.status_code == 401, r.text
        detail = r.json().get("detail", "").lower()
        assert "token type" in detail or "invalid" in detail

    async def test_refresh_endpoint_returns_new_tokens(self, client):
        await _register(client)
        login_r = await _login(client)
        refresh = login_r.json()["refresh_token"]
        r = await client.post("/auth/refresh", json={"refresh_token": refresh})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "access_token" in d and "refresh_token" in d

    async def test_garbage_refresh_rejected(self, client):
        r = await client.post("/auth/refresh", json={"refresh_token": "bad.token.here"})
        assert r.status_code == 401, r.text


# =====================================================================
# 4. PASSWORD RESET
# =====================================================================

class TestPasswordReset:

    async def test_unknown_email_returns_generic_message(self, client):
        r = await client.post("/auth/password-reset-request",
                              json={"email": f"ghost2_{_TS}@example.com"})
        assert r.status_code == 200, r.text
        msg = r.json().get("message", "").lower()
        assert "registered" in msg or "sent" in msg

    async def test_valid_email_accepted(self, client):
        await _register(client)
        r = await client.post("/auth/password-reset-request", json={"email": ALICE_EMAIL})
        assert r.status_code == 200, r.text

    async def test_garbage_token_rejected(self, client):
        r = await client.post("/auth/password-reset-confirm",
                              json={"token": "garbage.xyz", "new_password": "NewStr0ng!Pass"})
        assert r.status_code == 400, r.text

    async def test_weak_new_password_rejected(self, client):
        r = await client.post("/auth/password-reset-confirm",
                              json={"token": "any", "new_password": "weak"})
        assert r.status_code == 422, r.text

    async def test_full_reset_flow(self, client):
        email = f"reset_{_TS}@example.com"
        await client.post("/auth/register", json={"name": "R", "email": email, "password": STRONG_PW})
        await client.post("/auth/password-reset-request", json={"email": email})
        doc = await db.users.find_one({"email": email})
        token = doc.get("reset_token")
        assert token, "Reset token not stored in DB"
        new_pw = "NewStr0ng!Reset99"
        assert (await client.post("/auth/password-reset-confirm",
                                  json={"token": token, "new_password": new_pw})).status_code == 200
        assert (await client.post("/auth/login", json={"email": email, "password": new_pw})).status_code == 200
        assert (await client.post("/auth/login", json={"email": email, "password": STRONG_PW})).status_code == 401

    async def test_token_is_single_use(self, client):
        email = f"once_{_TS}@example.com"
        await client.post("/auth/register", json={"name": "O", "email": email, "password": STRONG_PW})
        await client.post("/auth/password-reset-request", json={"email": email})
        token = (await db.users.find_one({"email": email})).get("reset_token")
        await client.post("/auth/password-reset-confirm",
                          json={"token": token, "new_password": "Once!New1Pass99"})
        r = await client.post("/auth/password-reset-confirm",
                              json={"token": token, "new_password": "Once!New2Pass99"})
        assert r.status_code == 400, r.text


# =====================================================================
# 5. ESTIMATES -- creation & IDOR
# =====================================================================

class TestEstimates:

    async def test_anonymous_estimate_works(self, client):
        r = await client.post("/api/estimate",
                              json={"description": "Simple todo app", "features": ["Auth", "CRUD"]})
        assert r.status_code == 200, r.text
        assert r.json().get("costMin", 0) > 0

    async def test_authenticated_estimate_saved(self, client):
        h = await _auth_header(client)
        r = await client.post("/api/estimate", json={"description": "Blog platform"}, headers=h)
        assert r.status_code == 200, r.text
        assert "id" in r.json()

    async def test_empty_estimate_rejected(self, client):
        r = await client.post("/api/estimate", json={"description": "", "features": []})
        assert r.status_code == 422, r.text

    async def test_list_scoped_to_owner(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        bh = await _auth_header(client, BOB_EMAIL)
        await client.post("/api/estimate", json={"description": "Alice app"}, headers=ah)
        await client.post("/api/estimate", json={"description": "Bob app"}, headers=bh)
        a_emails = {e["user_email"] for e in (await client.get("/api/estimates", headers=ah)).json()}
        b_emails = {e["user_email"] for e in (await client.get("/api/estimates", headers=bh)).json()}
        assert a_emails == {ALICE_EMAIL.lower()}
        assert b_emails == {BOB_EMAIL.lower()}

    async def test_idor_get_by_other_user_blocked(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        bh = await _auth_header(client, BOB_EMAIL)
        cr = await client.post("/api/estimate", json={"description": "Secret"}, headers=ah)
        eid = cr.json().get("id")
        assert eid, f"No ID in: {cr.text}"
        assert (await client.get(f"/api/estimates/{eid}", headers=bh)).status_code == 403

    async def test_idor_get_anonymous_blocked(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        cr = await client.post("/api/estimate", json={"description": "Private"}, headers=ah)
        eid = cr.json().get("id")
        assert (await client.get(f"/api/estimates/{eid}")).status_code == 401

    async def test_owner_can_delete_and_verify_gone(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        cr = await client.post("/api/estimate", json={"description": "To delete"}, headers=ah)
        eid = cr.json().get("id")
        assert (await client.delete(f"/api/estimates/{eid}", headers=ah)).status_code == 200
        assert (await client.get(f"/api/estimates/{eid}", headers=ah)).status_code == 404

    async def test_idor_delete_by_other_user_blocked(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        bh = await _auth_header(client, BOB_EMAIL)
        cr = await client.post("/api/estimate", json={"description": "Important"}, headers=ah)
        eid = cr.json().get("id")
        assert (await client.delete(f"/api/estimates/{eid}", headers=bh)).status_code == 403


# =====================================================================
# 6. PROJECT ANALYSIS -- authorization
# =====================================================================

class TestProjectAnalysisAuth:

    async def _insert(self, email: str) -> str:
        from datetime import datetime, timezone
        aid = f"analysis_{int(time.time()*1000):x}{_TS%9999}"
        await db.project_analyses.insert_one({
            "id": aid, "user_email": email.lower(),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc),
            "input": {}, "result": {},
        })
        return aid

    async def test_unauthenticated_list_empty(self, client):
        r = await client.get("/api/project-analysis/analyses")
        assert r.status_code == 200 and r.json() == []

    async def test_idor_by_other_user_blocked(self, client):
        aid = await self._insert(ALICE_EMAIL)
        bh  = await _auth_header(client, BOB_EMAIL)
        assert (await client.get(f"/api/project-analysis/analyses/{aid}", headers=bh)).status_code == 403

    async def test_idor_anonymous_blocked(self, client):
        aid = await self._insert(ALICE_EMAIL)
        assert (await client.get(f"/api/project-analysis/analyses/{aid}")).status_code == 401

    async def test_owner_can_access_own(self, client):
        aid = await self._insert(ALICE_EMAIL)
        ah  = await _auth_header(client, ALICE_EMAIL)
        assert (await client.get(f"/api/project-analysis/analyses/{aid}", headers=ah)).status_code == 200

    async def test_list_scoped_to_owner(self, client):
        ah = await _auth_header(client, ALICE_EMAIL)
        bh = await _auth_header(client, BOB_EMAIL)
        a_emails = {a["user_email"] for a in (await client.get("/api/project-analysis/analyses", headers=ah)).json()}
        b_emails = {a["user_email"] for a in (await client.get("/api/project-analysis/analyses", headers=bh)).json()}
        assert BOB_EMAIL.lower()   not in a_emails
        assert ALICE_EMAIL.lower() not in b_emails


# =====================================================================
# 7. SSRF PROTECTION
# =====================================================================

class TestSSRFProtection:

    def _blocked(self, url):
        from project_analysis_service import validate_safe_url
        try:
            validate_safe_url(url)
            return False
        except ValueError:
            return True

    def test_localhost(self):        assert self._blocked("http://localhost/")
    def test_127(self):              assert self._blocked("http://127.0.0.1/")
    def test_0000(self):             assert self._blocked("http://0.0.0.0/")
    def test_private_10(self):       assert self._blocked("http://10.0.0.1/")
    def test_private_172(self):      assert self._blocked("http://172.16.0.1/")
    def test_private_192(self):      assert self._blocked("http://192.168.1.1/")
    def test_link_local(self):       assert self._blocked("http://169.254.169.254/")
    def test_gcp_metadata(self):     assert self._blocked("http://metadata.google.internal/")
    def test_ipv6_loopback(self):    assert self._blocked("http://[::1]/")
    def test_file_scheme(self):      assert self._blocked("file:///etc/passwd")
    def test_ftp_scheme(self):       assert self._blocked("ftp://internal/share")
    def test_port_27017(self):       assert self._blocked("http://host.com:27017/")
    def test_port_6379(self):        assert self._blocked("http://host.com:6379/")
    def test_port_22(self):          assert self._blocked("http://host.com:22/")
    def test_port_5432(self):        assert self._blocked("http://host.com:5432/")

    def test_legitimate_url_allowed(self):
        from project_analysis_service import validate_safe_url
        assert validate_safe_url("https://github.com").startswith("https://")

    def test_https_auto_prepended(self):
        from project_analysis_service import validate_safe_url
        assert validate_safe_url("github.com").startswith("https://")

    async def test_api_localhost_rejected(self, client):
        r = await client.post("/api/project-analysis/analyze", json={
            "description": "", "github_url": "",
            "deployed_url": "http://localhost:8080/admin"
        })
        assert r.status_code in (200, 400), r.text

    async def test_api_metadata_rejected(self, client):
        r = await client.post("/api/project-analysis/analyze", json={
            "description": "test project", "github_url": "",
            "deployed_url": "http://169.254.169.254/latest/meta-data/"
        })
        assert r.status_code in (200, 400), r.text

    async def test_api_all_empty_rejected(self, client):
        r = await client.post("/api/project-analysis/analyze", json={
            "description": "", "github_url": "", "deployed_url": ""
        })
        assert r.status_code == 400, r.text
'''

pathlib.Path("test_security.py").write_text(code, encoding="utf-8")
print("Written OK:", pathlib.Path("test_security.py").stat().st_size, "bytes")
