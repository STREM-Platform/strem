"""Encryption for provider OAuth tokens at rest (A3).

Tokens are sealed with Fernet (AES-128-CBC + HMAC) using the key in
``Settings.integrations_encryption_key``. We never persist a provider token in
plaintext; without a configured key, connecting a source is refused.
"""

from __future__ import annotations

from cryptography.fernet import Fernet

from app.config import Settings
from app.errors import AppError


class TokenCipher:
    """Seals and opens provider tokens with a Fernet key."""

    def __init__(self, key: str) -> None:
        self._fernet = Fernet(key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, token: str) -> str:
        return self._fernet.decrypt(token.encode()).decode()


def get_token_cipher(settings: Settings) -> TokenCipher:
    """Build the cipher, or 503 when no encryption key is configured."""
    if not settings.integrations_encryption_key:
        raise AppError(
            503,
            "integrations_unconfigured",
            "Connecting sources is unavailable — no encryption key is configured.",
        )
    return TokenCipher(settings.integrations_encryption_key)
