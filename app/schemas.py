"""Pydantic request/response models mirroring contracts/auth/openapi.yml."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=40)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class AuthIdentity(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    display_name: str | None = None
    created_at: datetime


class AuthSession(BaseModel):
    user: AuthIdentity
    tokens: TokenPair
