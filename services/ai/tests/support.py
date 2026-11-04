"""Shared test settings and an access-token helper for the race-team tests."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from langgraph.checkpoint.memory import InMemorySaver

from app.config import Settings
from app.race.graph import review

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    user_service_base_url="http://user.test/v1",
)
# Review threads live in memory in tests, not in Postgres.
review._checkpointer = InMemorySaver()


def auth_header(user_id: uuid.UUID, email: str = "alex@strem.app") -> dict[str, str]:
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "user_id": str(user_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=15)).timestamp()),
        },
        TEST_SETTINGS.jwt_secret,
        algorithm=TEST_SETTINGS.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}
