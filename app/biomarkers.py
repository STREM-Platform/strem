"""Biomarker intake + trend analysis (issue #63).

Users enter lab values; this module stores them and derives **trends** — the
direction of the latest reading vs the previous one, per marker. It never
interprets, flags, or diagnoses (A8); that framing lives in the agent, which
treats trends as decision-support for a conversation with a clinician.

Access is gated: a caller may only read or write biomarkers when they have both
(1) accepted the current Medical Disclaimer and (2) left the A7 "biomarkers"
source ON. Either being absent is a hard 403 — and revoking consent immediately
closes access again.
"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import agent_prefs
from app.errors import AppError
from app.legal import DocumentType, accepted_versions, required_version
from app.models import Biomarker
from app.schemas.biomarker import (
    Biomarker as BiomarkerSchema,
)
from app.schemas.biomarker import (
    BiomarkerCreate,
    BiomarkerList,
    BiomarkerTrend,
    BiomarkerType,
    TrendDirection,
)


async def require_biomarker_access(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Enforce the consent + Medical Disclaimer gate; raise 403 otherwise."""
    accepted = await accepted_versions(session, user_id)
    if accepted.get(DocumentType.MEDICAL) != required_version(DocumentType.MEDICAL):
        raise AppError(
            403,
            "medical_disclaimer_required",
            "Accept the current Medical Disclaimer before entering lab results.",
        )
    if not await agent_prefs.is_source_enabled(
        session, user_id, agent_prefs.BIOMARKER_SOURCE_ID
    ):
        raise AppError(
            403,
            "biomarker_consent_required",
            "Turn on the 'Lab & blood results' data source to use biomarkers.",
        )


async def create_biomarker(
    session: AsyncSession, user_id: uuid.UUID, body: BiomarkerCreate
) -> BiomarkerSchema:
    row = Biomarker(
        user_id=user_id,
        marker_type=body.marker_type.value,
        value=body.value,
        unit=body.unit,
        taken_at=body.taken_at,
        note=body.note,
    )
    session.add(row)
    await session.flush()
    return _to_schema(row)


def _to_schema(row: Biomarker) -> BiomarkerSchema:
    return BiomarkerSchema(
        id=row.id,
        marker_type=BiomarkerType(row.marker_type),
        value=row.value,
        unit=row.unit,
        taken_at=row.taken_at,
        note=row.note,
        created_at=row.created_at,
    )


def _direction(latest: float, previous: float) -> TrendDirection:
    if latest > previous:
        return TrendDirection.RISING
    if latest < previous:
        return TrendDirection.FALLING
    return TrendDirection.STABLE


def _build_trends(rows: list[Biomarker]) -> list[BiomarkerTrend]:
    """One trend per marker: latest value + direction vs the previous reading.

    Rows arrive newest-first. The trend is a neutral direction only — never an
    interpretation of whether a value is "good" or "bad".
    """
    by_marker: dict[str, list[Biomarker]] = {}
    for row in rows:
        by_marker.setdefault(row.marker_type, []).append(row)

    trends: list[BiomarkerTrend] = []
    for marker, marker_rows in by_marker.items():
        # marker_rows are newest-first (inherits the query order).
        latest = marker_rows[0]
        if len(marker_rows) >= 2:
            direction = _direction(latest.value, marker_rows[1].value)
        else:
            direction = TrendDirection.SINGLE
        trends.append(
            BiomarkerTrend(
                marker_type=BiomarkerType(marker),
                latest_value=latest.value,
                unit=latest.unit,
                direction=direction,
                reading_count=len(marker_rows),
                latest_taken_at=latest.taken_at,
            )
        )
    return trends


async def list_biomarkers(session: AsyncSession, user_id: uuid.UUID) -> BiomarkerList:
    rows = list(
        await session.scalars(
            select(Biomarker)
            .where(Biomarker.user_id == user_id)
            .order_by(Biomarker.taken_at.desc(), Biomarker.created_at.desc())
        )
    )
    return BiomarkerList(items=[_to_schema(r) for r in rows], trends=_build_trends(rows))


async def delete_biomarker(
    session: AsyncSession, user_id: uuid.UUID, biomarker_id: uuid.UUID
) -> None:
    row = await session.get(Biomarker, biomarker_id)
    if row is None or row.user_id != user_id:
        raise AppError(404, "not_found", "The requested biomarker does not exist.")
    await session.execute(delete(Biomarker).where(Biomarker.id == biomarker_id))
