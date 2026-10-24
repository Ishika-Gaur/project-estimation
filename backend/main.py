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
import certifi

load_dotenv()

# ── Admin Credentials (loaded from environment variables) ────────────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@costifyai.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@1234")  # Fallback default if not configured
ADMIN_NAME     = os.getenv("ADMIN_NAME", "CostifyAI Admin")

if not os.getenv("ADMIN_PASSWORD"):
    print("[CostifyAI WARNING] ADMIN_PASSWORD environment variable is not explicitly set; defaulting to fallback password.")

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


# ── CORS Whitelist Configuration ──────────────────────────────────────────────
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://project-estimation-3ejl.onrender.com",
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [
    orig.strip().rstrip("/")
    for orig in env_origins.split(",")
    if orig.strip()
] if env_origins else DEFAULT_ALLOWED_ORIGINS


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "").rstrip("/")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

    # Log exception internally for debugging without exposing raw stack trace to clients
    print(f"[CostifyAI Server Error] {request.method} {request.url.path}: {exc}")

    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
        headers=headers,
    )

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Type", "Authorization"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_kwargs = {
    "serverSelectionTimeoutMS": int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000")),
}

# Enforce trusted root CA verification via certifi for TLS / Atlas connections
if "mongodb+srv://" in MONGO_URI or "tls=true" in MONGO_URI.lower() or "ssl=true" in MONGO_URI.lower():
    mongo_kwargs["tlsCAFile"] = certifi.where()

# Strictly verify TLS by default. Only allow override if explicitly configured for local development.
if os.getenv("MONGO_TLS_ALLOW_INVALID_CERTIFICATES", "false").lower() == "true":
    mongo_kwargs["tlsAllowInvalidCertificates"] = True
    print("[CostifyAI WARNING] Insecure MongoDB TLS validation is active via MONGO_TLS_ALLOW_INVALID_CERTIFICATES!")

client = AsyncIOMotorClient(MONGO_URI, **mongo_kwargs)
db = client.project_estimation

# Attach db to app state so routers can access it via request.app.state.db
app.state.db = db

# Include routers
app.include_router(auth_router)
app.include_router(estimate_router)
app.include_router(admin_router)
app.include_router(project_analysis_router)
app.include_router(market_rate_router)


async def init_db_indexes(database):
    """Ensure essential indexes exist for performance, fast aggregations, and unique constraints."""
    try:
        # 1. users: unique email prevents race condition on registration; created_at for admin sorting
        await database.users.create_index("email", unique=True)
        await database.users.create_index([("created_at", -1)])

        # 2. estimates: unique id; compound user_email + createdAt for fast history queries
        await database.estimates.create_index("id", unique=True)
        await database.estimates.create_index([("user_email", 1), ("createdAt", -1)])
        await database.estimates.create_index([("createdAt", -1)])
        await database.estimates.create_index([("created_at", -1)])
        await database.estimates.create_index([("project_category", 1)])
        await database.estimates.create_index([("complexity", 1)])

        # 3. project_analyses: unique id; compound user_email + createdAt for user audits
        await database.project_analyses.create_index("id", unique=True)
        await database.project_analyses.create_index([("user_email", 1), ("createdAt", -1)])

        # 4. market_rates: effective_from for latest snapshot lookups
        await database.market_rates.create_index([("effective_from", -1)])

        print("[CostifyAI] MongoDB indexes verified and initialized.")
    except Exception as exc:
        print(f"[CostifyAI] Warning: Could not initialize database indexes ({exc}).")


@app.on_event("startup")
async def startup_init():
    """Initialize database indexes, seed default admin, and start background workers."""
    # 1. Initialize MongoDB indexes
    await init_db_indexes(db)

    # 2. Auto-create admin account if it doesn't already exist
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

    # 3. Start the weekly market-rate updater in the background
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