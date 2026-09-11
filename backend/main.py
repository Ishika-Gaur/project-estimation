from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timezone

load_dotenv()

# ── Hardcoded Admin Credentials ───────────────────────────────────────────────
ADMIN_EMAIL    = "admin@costlyai.com"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NAME     = "CostlyAI Admin"

from auth import router as auth_router, limiter
from estimate_router import router as estimate_router
from admin_router import router as admin_router

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.project_estimation

# Attach db to app state so routers can access it via request.app.state.db
app.state.db = db

# Include routers
app.include_router(auth_router)
app.include_router(estimate_router)
app.include_router(admin_router)


@app.on_event("startup")
async def seed_admin():
    """Auto-create the hardcoded admin account if it doesn't already exist."""
    try:
        from auth import hash_password
        existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
        if not existing:
            await db.users.insert_one({
                "name": ADMIN_NAME,
                "email": ADMIN_EMAIL.lower(),
                "password_hash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            })
            print(f"[CostlyAI] Admin account created → {ADMIN_EMAIL}")
        else:
            # Always ensure the existing account has admin role
            await db.users.update_one(
                {"email": ADMIN_EMAIL.lower()},
                {"$set": {"role": "admin"}}
            )
            print(f"[CostlyAI] Admin account verified → {ADMIN_EMAIL}")
    except Exception as e:
        print(f"[CostlyAI] Warning: Could not seed admin on startup ({e}). Will retry on first request.")


@app.get("/")
async def root():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/test-db")
async def test_db():
    try:
        await client.admin.command("ping")
        return {"db_status": "connected"}
    except Exception as e:
        return {"db_status": "failed", "error": str(e)}