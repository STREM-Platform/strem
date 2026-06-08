"""Password hashing, opaque refresh tokens, and JWT access tokens.

- Passwords: Argon2id via argon2-cffi. Plaintext is never stored or logged.
- Refresh tokens: opaque random strings (`rt_<hex>`); only their SHA-256 hash
  is persisted, so a database leak does not expose usable tokens.
- Access tokens: short-lived HS256 JWTs with `user_id` and `email` claims.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Return an Argon2id hash of the password."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when the password matches the stored hash."""
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def generate_refresh_token() -> tuple[str, str]:
    """Return a new opaque refresh token and its SHA-256 hash."""
    token = f"rt_{secrets.token_hex(32)}"
    return token, hash_refresh_token(token)


def hash_refresh_token(token: str) -> str:
    """Return the SHA-256 hex digest used to look up a refresh token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    *,
    user_id: uuid.UUID,
    email: str,
    secret: str,
    algorithm: str,
    expires_minutes: int,
) -> str:
    """Encode a short-lived access JWT carrying `user_id` and `email`."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str, *, secret: str, algorithm: str) -> dict[str, object]:
    """Decode and validate an access JWT, returning its claims.

    Raises `jwt.PyJWTError` (or a subclass) when the token is missing required
    claims, malformed, expired, or signed with the wrong key.
    """
    claims: dict[str, object] = jwt.decode(token, secret, algorithms=[algorithm])
    if "user_id" not in claims or "email" not in claims:
        raise jwt.InvalidTokenError("Token is missing required claims.")
    return claims
