from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None
    role: str = Field(default="user", pattern=r"^(user|itn|admin)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: str


class TokenResponse(BaseModel):
    ok: bool = True
    token: str
    user: UserPublic


class BasicOK(BaseModel):
    ok: bool = True

