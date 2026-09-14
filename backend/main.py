import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
import os
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timezone

load_dotenv()

# ── Hardcoded Admin Credentials ───────────────────────────────────────────────
ADMIN_EMAIL    = "admin@CostifyAI.com"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NAME     = "CostifyAI Admin"

from auth import router as auth_router, limiter
from estimate_router import router as estimate_router
from admin_router import router as admin_router
from market_rate_router import router as market_rate_router
from market_rate_service import weekly_rate_updater
from project_analysis_router import router as project_analysis_router

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(PyMongoError)
async def mongo_error_handler(request: Request, exc: PyMongoError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database is unavailable. Check the MongoDB connection and try again."},
    )

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://project-estimation-3ejl.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(
    MONGO_URI,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000")),
)
db = client.project_estimation

# Attach db to app state so routers can access it via request.app.state.db
app.state.db = db

# Include routers
app.include_router(auth_router)
app.include_router(estimate_router)
app.include_router(admin_router)
app.include_router(project_analysis_router)
app.include_router(market_rate_router)


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
            print(f"[CostifyAI] Admin account created → {ADMIN_EMAIL}")
        else:
            # Always ensure the existing account has admin role
            await db.users.update_one(
                {"email": ADMIN_EMAIL.lower()},
                {"$set": {"role": "admin"}}
            )
            print(f"[CostifyAI] Admin account verified → {ADMIN_EMAIL}")
    except Exception as e:
        print(f"[CostifyAI] Warning: Could not seed admin on startup ({e}). Will retry on first request.")

    # Start the weekly market-rate updater in the background
    asyncio.create_task(weekly_rate_updater(db))
    print("[CostifyAI] Market-rate background updater started.")


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