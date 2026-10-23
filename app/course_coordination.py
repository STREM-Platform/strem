"""Durable mission/course erasure coordination. No cross-service DB access."""

import uuid
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from sqlalchemy import Boolean, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app import race_missions as missions
from app.config import Settings
from app.db import Base
from app.errors import AppError


class CourseState(Base):
    __tablename__ = "race_course_state"
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    generation: Mapped[int] = mapped_column(Integer, default=0)
    deletion_pending: Mapped[bool] = mapped_column(Boolean, default=False)


async def ensure_available(session: AsyncSession, user_id: uuid.UUID) -> None:
    state = await session.get(CourseState, user_id)
    if state is not None and state.deletion_pending:
        raise AppError(
            409, "mission_deletion_pending", "Retry mission data deletion to finish cleanup."
        )


class CoursePeer:
    def __init__(self, settings: Settings, token: str) -> None:
        self.settings, self.token = settings, token

    async def export(self) -> list[dict[str, object]]:
        result = await self._call("GET", "/v1/training/courses/data", self.token)
        try:
            value = result.json()["courses"]
            if not isinstance(value, list) or not all(isinstance(row, dict) for row in value):
                raise ValueError
            return value
        except (ValueError, KeyError, TypeError):
            raise AppError(
                503, "course_service_unavailable", "Course export is unavailable. Retry."
            ) from None

    async def purge(self, user_id: uuid.UUID, generation: int) -> None:
        now = datetime.now(UTC)
        authorization = jwt.encode(
            {
                "sub": str(user_id),
                "generation": generation,
                "purpose": "purge_race_courses",
                "aud": "strem-course-cleanup",
                "iat": now,
                "exp": now + timedelta(minutes=2),
            },
            self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
        )
        await self._call("POST", "/internal/race-course-data/purge", authorization)

    async def _call(self, method: str, path: str, token: str) -> httpx.Response:
        if not self.settings.course_storage_base_url:
            raise AppError(503, "course_service_unavailable", "Course data is unavailable. Retry.")
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.request(
                    method,
                    f"{self.settings.course_storage_base_url.rstrip('/')}{path}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            if response.status_code not in (200, 204):
                raise ValueError
            return response
        except (httpx.RequestError, ValueError):
            raise AppError(
                503, "course_service_unavailable", "Course data is unavailable. Retry."
            ) from None


async def delete_all(
    session: AsyncSession,
    user_id: uuid.UUID,
    peer: CoursePeer,
) -> None:
    await missions.lock_account(session, user_id)
    state = await session.get(CourseState, user_id)
    if state is None:
        # No course access ever issued. Account lock prevents a first access racing this deletion.
        await missions.delete_owned_data(session, user_id)
        return
    if not state.deletion_pending:
        state.generation += 1
        state.deletion_pending = True
    generation = state.generation
    await session.commit()  # Durable intent survives peer failure, disconnect or restart.
    await peer.purge(user_id, generation)
    await missions.lock_account(session, user_id)
    await session.refresh(state)
    if not state.deletion_pending or state.generation != generation:
        # A concurrent completion/new deletion must not erase newly created missions.
        await session.rollback()
        return
    await missions.delete_mission_rows(session, user_id)
    state.deletion_pending = False
    await session.commit()  # Retain only owner UUID + generation fence, no course/mission content.
