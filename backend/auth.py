from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import secrets
from urllib.parse import urlencode

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from db import mongodb
from models import LoginRequest, SignupRequest, TokenResponse, UserPublic, BasicOK
from pymongo.errors import DuplicateKeyError


try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    # dotenv not installed or failed to load; proceed without .env support
    pass

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_DAYS = int(os.getenv("JWT_EXP_DAYS", "7"))


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _create_token(sub: str, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(tz=timezone.utc)
    payload: Dict[str, Any] = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXP_DAYS)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def parse_authorization(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        return _decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _users():
    return mongodb.db["users"]


def _user_doc_to_public(doc: Dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=str(doc.get("_id")),
        email=doc.get("email"),
        name=doc.get("name"),
        role=doc.get("role", "user"),
    )


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest):
    users = _users()
    email = body.email.lower()

    exists = await users.find_one({"email": email})
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    doc = {
        "email": email,
        "name": body.name or email.split("@")[0],
        "role": body.role,
        "password_hash": _hash_password(body.password),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    try:
        res = await users.insert_one(doc)
    except DuplicateKeyError:
        # Race condition safety: unique index on email
        raise HTTPException(status_code=409, detail="Email already registered")
    uid = str(res.inserted_id)
    token = _create_token(uid, {"email": email, "role": body.role, "name": doc["name"]})
    return TokenResponse(token=token, user=_user_doc_to_public({"_id": ObjectId(uid), **doc}))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    users = _users()
    email = body.email.lower()
    user = await users.find_one({"email": email})
    if not user or not _verify_password(body.password, user.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    uid = str(user.get("_id"))
    token = _create_token(uid, {"email": user.get("email"), "role": user.get("role", "user"), "name": user.get("name")})
    return TokenResponse(token=token, user=_user_doc_to_public(user))


@router.get("/me")
async def me(authorization: Optional[str] = Header(default=None)) -> JSONResponse:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        claims = _decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return JSONResponse({"ok": True, "claims": claims})


# ------------------ Google OAuth 2.0 ------------------

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "913667938810-oq3ues92ipghbqqngtedinevcpknob5k.apps.googleusercontent.com",
)
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback"
)
FRONTEND_LOGIN_URL = os.getenv(
    "OAUTH_POST_LOGIN_REDIRECT", "http://localhost:5173/login"
)


@router.get("/google/start")
async def google_start(request: Request, next: Optional[str] = None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = secrets.token_urlsafe(16)
    # Build Google auth URL
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    resp = RedirectResponse(url=url, status_code=302)
    resp.set_cookie("oauth_state", state, httponly=True, samesite="lax", path="/")
    if next:
        resp.set_cookie("oauth_next", next, httponly=True, samesite="lax", path="/")
    return resp


@router.get("/google/callback")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    cookie_state = request.cookies.get("oauth_state")
    if not state or not cookie_state or state != cookie_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            tr = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            tr.raise_for_status()
            tokens = tr.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise HTTPException(status_code=400, detail="Failed to obtain access token")
            ur = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            ur.raise_for_status()
            info = ur.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"OAuth exchange failed: {e}")

    email = (info.get("email") or "").lower()
    name = info.get("name") or (email.split("@")[0] if email else "User")
    if not email:
        raise HTTPException(status_code=400, detail="Google profile missing email")

    try:
        users = _users()
        user = await users.find_one({"email": email})
        if not user:
            doc = {
                "email": email,
                "name": name,
                "role": "user",
                "auth_provider": "google",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            res = await users.insert_one(doc)
            uid = str(res.inserted_id)
        else:
            uid = str(user.get("_id"))
    except Exception:
        # Database unavailable
        raise HTTPException(status_code=503, detail="Database unavailable during login. Please try again.")

    token = _create_token(uid, {"email": email, "role": "user", "name": name})
    next_path = request.cookies.get("oauth_next") or "/scan"
    sep = "?" if ("?" not in FRONTEND_LOGIN_URL) else "&"
    redirect_url = f"{FRONTEND_LOGIN_URL}{sep}token={token}&next={next_path}"
    resp = RedirectResponse(url=redirect_url, status_code=302)
    resp.delete_cookie("oauth_state")
    resp.delete_cookie("oauth_next")
    return resp
