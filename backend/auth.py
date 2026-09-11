from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from datetime import datetime, timedelta, timezone
from jose import jwt
from jose.exceptions import JWTError
import bcrypt
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import UserRegister, UserLogin, Token, PasswordResetRequest, PasswordResetConfirm, RefreshToken

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# ── Password hashing (using bcrypt directly — passlib 1.7 is incompatible with bcrypt ≥4.0) ──
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT ───────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))  # 30 days

def create_access_token(data: dict, expire_minutes: int = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Routes ────────────────────────────────────────────────────────────────────
from fastapi import Request  # noqa: E402 — imported here to use db from app state

def configured_admin_emails() -> set[str]:
    return {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise JWTError
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.") from exc

    user = await request.app.state.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    return user


async def require_admin(user=Depends(get_current_user)):
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


async def get_optional_user(user=Depends(get_current_user)):
    return user


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(payload: UserRegister, request: Request):
    db = request.app.state.db

    # Check duplicate email
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": "admin" if payload.email.lower() in configured_admin_emails() else "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)

    access_token = create_access_token(
        {"sub": payload.email.lower(), "name": payload.name.strip(), "role": user_doc["role"]}
    )
    refresh_token = create_refresh_token(
        {"sub": payload.email.lower(), "name": payload.name.strip(), "role": user_doc["role"]}
    )
    
    # Store refresh token in database
    await db.users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"refresh_token": refresh_token}}
    )
    
    return Token(access_token=access_token, refresh_token=refresh_token, role=user_doc["role"])


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(payload: UserLogin, request: Request):
    db = request.app.state.db

    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    role = "admin" if user["email"] in configured_admin_emails() else user.get("role", "user")
    if role != user.get("role", "user"):
        await request.app.state.db.users.update_one(
            {"_id": user["_id"]}, {"$set": {"role": role}}
        )
    
    access_token = create_access_token(
        {"sub": user["email"], "name": user.get("name", ""), "role": role}
    )
    refresh_token = create_refresh_token(
        {"sub": user["email"], "name": user.get("name", ""), "role": role}
    )
    
    # Update refresh token in database
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": refresh_token}}
    )
    
    return Token(access_token=access_token, refresh_token=refresh_token, role=role)


@router.post("/password-reset-request")
@limiter.limit("3/hour")
async def password_reset_request(payload: PasswordResetRequest, request: Request):
    db = request.app.state.db
    user = await db.users.find_one({"email": payload.email.lower()})
    
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If the email exists, a reset link has been sent."}
    
    # Generate reset token (valid for 1 hour)
    reset_token = create_access_token(
        {"sub": user["email"], "type": "password_reset"},
        expire_minutes=60
    )
    
    # Store reset token in user document
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expires": datetime.now(timezone.utc) + timedelta(hours=1)}}
    )
    
    # In production, send email with reset link
    # For now, return the token (for testing purposes)
    return {
        "message": "Password reset link sent to email",
        "reset_token": reset_token  # Remove this in production
    }


@router.post("/password-reset-confirm")
async def password_reset_confirm(payload: PasswordResetConfirm, request: Request):
    db = request.app.state.db
    
    try:
        # Verify reset token
        token_payload = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if token_payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token type."
            )
        
        email = token_payload.get("sub")
        user = await db.users.find_one({"email": email.lower()})
        
        if not user or user.get("reset_token") != payload.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token."
            )
        
        # Check if token is expired
        if user.get("reset_token_expires") and user["reset_token_expires"] < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired."
            )
        
        # Update password
        new_hash = hash_password(payload.new_password)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password_hash": new_hash},
                "$unset": {"reset_token": "", "reset_token_expires": ""}
            }
        )
        
        return {"message": "Password reset successfully. Please login with your new password."}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token."
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(payload: RefreshToken, request: Request):
    db = request.app.state.db
    
    try:
        # Verify refresh token
        token_payload = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if token_payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type."
            )
        
        email = token_payload.get("sub")
        user = await db.users.find_one({"email": email.lower()})
        
        if not user or user.get("refresh_token") != payload.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )
        
        # Generate new tokens
        role = user.get("role", "user")
        new_access_token = create_access_token(
            {"sub": user["email"], "name": user.get("name", ""), "role": role}
        )
        new_refresh_token = create_refresh_token(
            {"sub": user["email"], "name": user.get("name", ""), "role": role}
        )
        
        # Update refresh token in database
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"refresh_token": new_refresh_token}}
        )
        
        return Token(access_token=new_access_token, refresh_token=new_refresh_token, role=role)
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token."
        )
