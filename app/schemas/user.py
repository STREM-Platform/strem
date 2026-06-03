"""User profile schema.

`strem-user-service` is the source of truth for profile and personalization
data (see `strem-docs/architecture/service-map.md`). Authentication identity
lives in `strem-auth-service`; `id` here equals the auth `user_id`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class UserProfile(BaseModel):
    """Core user profile record."""

    id: uuid.UUID
    username: str
    email: str
    identity_goal: str
    created_at: datetime
