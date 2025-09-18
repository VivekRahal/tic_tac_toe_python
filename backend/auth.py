from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse

from db import mongodb
from models import LoginRequest, SignupRequest, TokenResponse, UserPublic, BasicOK
from pymongo.errors import DuplicateKeyError


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


@router.get("/me", response_model=BasicOK)
async def me(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        _ = _decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return BasicOK()
