"""Athlete memory (ai#59): what the athlete tells the race team, kept.

After each chat turn an extractor turns durable statements ("my left knee hurts
on long descents", "I can only train before work") into memory items with their
source, date and confidence. A newer statement supersedes an older one. Active
items join the core context of every answer, and the athlete can see, correct
and delete each one; deleting removes it from future context immediately.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Float, String, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base
from app.race.ai.client import AIUnavailable, RaceAI

log = logging.getLogger(__name__)

KINDS = ("injury", "preference", "constraint", "goal", "lesson", "context", "other")
MAX_ACTIVE = 60


class AthleteMemory(Base):
    __tablename__ = "athlete_memory"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    kind: Mapped[str] = mapped_column(String(16))
    text: Mapped[str] = mapped_column(String(400))
    source: Mapped[str] = mapped_column(String(16))  # chat | athlete (edited by them)
    source_ref: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_date: Mapped[date] = mapped_column(Date)
    confidence: Mapped[float] = mapped_column(Float)
    superseded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def memory_out(row: AthleteMemory) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "kind": row.kind,
        "text": row.text,
        "source": row.source,
        "source_date": row.source_date.isoformat(),
        "confidence": round(row.confidence, 2),
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


async def active(db: AsyncSession, user_id: uuid.UUID) -> list[AthleteMemory]:
    rows = await db.scalars(
        select(AthleteMemory)
        .where(AthleteMemory.user_id == user_id, AthleteMemory.superseded_by.is_(None))
        .order_by(AthleteMemory.source_date.desc(), AthleteMemory.created_at.desc())
        .limit(MAX_ACTIVE)
    )
    return list(rows)


async def owned(db: AsyncSession, user_id: uuid.UUID, memory_id: uuid.UUID) -> AthleteMemory | None:
    row = await db.get(AthleteMemory, memory_id)
    return row if row is not None and row.user_id == user_id else None


async def correct(
    db: AsyncSession, row: AthleteMemory, text: str, kind: str | None
) -> AthleteMemory:
    """The athlete's own wording wins: full confidence, source `athlete`."""
    row.text = text.strip()[:400]
    if kind in KINDS:
        row.kind = kind
    row.source = "athlete"
    row.confidence = 1.0
    row.updated_at = datetime.now(UTC)
    await db.commit()
    return row


async def forget(db: AsyncSession, row: AthleteMemory) -> None:
    await db.delete(row)
    await db.commit()


async def purge(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(delete(AthleteMemory).where(AthleteMemory.user_id == user_id))


# ── Extraction ───────────────────────────────────────────────────────────────

EXTRACT_RULES = """You maintain the long-term memory of an endurance athlete's AI race team.
From the athlete's latest message, extract only durable facts worth remembering for weeks:
injuries and recurring pain, preferences (training time, food, gear), life constraints
(schedule, travel, family, work), goals and what matters to them, lessons from past races
or training, and stable context (where they train, their terrain, their kit).
Do not store one-off states (tired today, slept badly last night) — check-ins cover those —
questions, small talk, or anything the race team said. Write each item as one short
sentence in the third person ("Left knee hurts on long descents"). Use the athlete's facts
only; never infer medical conditions. If an item updates or contradicts an existing memory,
set `replaces` to that memory's id. Return no items when nothing durable was said."""

EXTRACT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {"type": "string", "enum": list(KINDS)},
                    "text": {"type": "string"},
                    "confidence": {"type": "number"},
                    "replaces": {"type": ["string", "null"]},
                },
                "required": ["kind", "text", "confidence", "replaces"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}


async def extract(
    ai: RaceAI,
    existing: list[AthleteMemory],
    message: str,
    previous_reply: str | None = None,
) -> list[dict[str, Any]]:
    """Durable facts in one athlete message (a model call, no database work, so it
    runs alongside the answer)."""
    if len(message.strip()) < 12 or not ai.status().available:
        return []
    known = "\n".join(f"{m.id}: [{m.kind}] {m.text}" for m in existing) or "(none yet)"
    prompt = (
        f"The race team had just said: {previous_reply[:800]}\n\n" if previous_reply else ""
    ) + f"The athlete's message:\n{message[:2000]}"
    try:
        result = await ai.complete_json(
            rules=EXTRACT_RULES,
            context=f"Existing memories:\n{known}",
            prompt=prompt,
            schema=EXTRACT_SCHEMA,
            max_tokens=800,
            effort="low",
        )
    except AIUnavailable as exc:
        log.info("memory extraction skipped: %s", exc.reason)
        return []
    return [i for i in (result.get("items") or [])[:5] if isinstance(i, dict)]


async def store_items(
    db: AsyncSession,
    user_id: uuid.UUID,
    existing: list[AthleteMemory],
    items: list[dict[str, Any]],
    *,
    source_ref: str | None = None,
    today: date | None = None,
) -> list[AthleteMemory]:
    """Save extracted items; an item that `replaces` an existing memory supersedes it."""
    by_id = {str(m.id): m for m in existing}
    now = datetime.now(UTC)
    stored: list[AthleteMemory] = []
    for item in items:
        text = str(item.get("text") or "").strip()
        if not text or item.get("kind") not in KINDS:
            continue
        if any(m.text.lower() == text.lower() for m in existing):
            continue
        row = AthleteMemory(
            user_id=user_id,
            kind=item["kind"],
            text=text[:400],
            source="chat",
            source_ref=source_ref,
            source_date=today or now.date(),
            confidence=max(0.0, min(1.0, float(item.get("confidence") or 0.7))),
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        await db.flush()
        old = by_id.get(str(item.get("replaces") or ""))
        if old is not None and old.user_id == user_id:
            old.superseded_by = row.id
        stored.append(row)
    return stored
