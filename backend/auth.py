import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models import ForgotPasswordInput, LoginInput, SignupInput

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24
RESET_TOKEN_TTL_MINUTES = 30

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_users_collection():
    from main import db

    return db.users


async def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
    return {"id": payload["sub"], "email": payload["email"]}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupInput):
    users = get_users_collection()
    email = payload.email.strip().lower()

    if await users.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    result = await users.insert_one(
        {
            "name": payload.name.strip(),
            "email": email,
            "passwordHash": hash_password(payload.password),
            "createdAt": datetime.now(timezone.utc),
        }
    )

    user_id = str(result.inserted_id)
    return {
        "token": create_token(user_id, email),
        "user": {"id": user_id, "name": payload.name.strip(), "email": email},
    }


@router.post("/login")
async def login(payload: LoginInput):
    users = get_users_collection()
    email = payload.email.strip().lower()

    user = await users.find_one({"email": email})
    if user is None or not verify_password(payload.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    user_id = str(user["_id"])
    return {
        "token": create_token(user_id, email),
        "user": {"id": user_id, "name": user.get("name", ""), "email": email},
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordInput):
    """Issue a reset token. Email delivery is not wired up yet, so the token is
    only stored and logged; the response never reveals whether the email exists."""
    users = get_users_collection()
    email = payload.email.strip().lower()

    user = await users.find_one({"email": email})
    if user is not None:
        reset_token = secrets.token_urlsafe(32)
        await users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "resetToken": reset_token,
                    "resetTokenExpiresAt": datetime.now(timezone.utc)
                    + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
                }
            },
        )
        logger.info("Password reset token issued for %s (delivery not configured)", email)

    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.get("/me")
async def me(user=Depends(current_user)):
    return user
