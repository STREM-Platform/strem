"""The XP progression engine: the append-only ledger, rank derivation, and
medal unlocks, plus the progression events they emit.

`award_xp` is the single internal entry point (consumed by the domain-event
consumers in strem-user-service#5). It appends to the ledger, recomputes the
total, derives the rank, detects medal unlocks, and publishes
`user.xp_earned` / `user.rank_achieved` / `user.medal_earned` per the shared
event schemas. It flushes but does not commit — the caller owns the transaction
so XP awards stay atomic with idempotency bookkeeping.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import EventPublisher
from app.medals import detect_earned_medals
from app.models import MedalRecord, XPLedgerEntry
from app.ranks import rank_for_total_xp
from app.schemas.game import MEDAL_TITLES, MedalType, UserRank
from app.schemas.profile import EarnedMedal
from app.schemas.xp import XPSource


@dataclass
class AwardResult:
    """The outcome of an `award_xp` call."""

    entry_id: uuid.UUID
    xp_amount: int
    new_total: int
    previous_rank: UserRank
    new_rank: UserRank
    rank_changed: bool
    newly_earned_medals: list[MedalType] = field(default_factory=list)


async def total_xp(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Return the user's cumulative XP from the ledger (0 if none)."""
    result = await session.scalar(
        select(func.coalesce(func.sum(XPLedgerEntry.xp_amount), 0)).where(
            XPLedgerEntry.user_id == user_id
        )
    )
    return int(result or 0)


async def active_medals(session: AsyncSession, user_id: uuid.UUID) -> list[EarnedMedal]:
    """Return the user's earned medals as contract `EarnedMedal` objects."""
    rows = (
        await session.scalars(
            select(MedalRecord)
            .where(MedalRecord.user_id == user_id)
            .order_by(MedalRecord.earned_at)
        )
    ).all()
    medals: list[EarnedMedal] = []
    for row in rows:
        medal_type = MedalType(row.medal_type)
        medals.append(
            EarnedMedal(
                medal_type=medal_type,
                title=MEDAL_TITLES[medal_type],
                earned_at=row.earned_at,
            )
        )
    return medals


async def _earned_medal_types(session: AsyncSession, user_id: uuid.UUID) -> set[MedalType]:
    rows = (
        await session.scalars(
            select(MedalRecord.medal_type).where(MedalRecord.user_id == user_id)
        )
    ).all()
    return {MedalType(value) for value in rows}


async def _ledger_signals(session: AsyncSession, user_id: uuid.UUID) -> list[tuple[str, datetime]]:
    rows = (
        await session.scalars(
            select(XPLedgerEntry).where(XPLedgerEntry.user_id == user_id)
        )
    ).all()
    return [(row.source, row.earned_at) for row in rows]


async def award_xp(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    source: XPSource,
    amount: int,
    source_reference: str | None = None,
    onboarding_completed: bool = False,
    earned_at: datetime | None = None,
) -> AwardResult:
    """Append an XP award, recompute rank, unlock medals, and emit events."""
    if amount < 1:
        raise ValueError("XP awards must be positive — XP never decreases.")

    moment = earned_at or datetime.now(UTC)
    previous_total = await total_xp(session, user_id)
    new_total = previous_total + amount

    entry = XPLedgerEntry(
        user_id=user_id,
        xp_amount=amount,
        source=source.value,
        source_reference=source_reference,
        new_total=new_total,
        earned_at=moment,
    )
    session.add(entry)
    await session.flush()

    await publisher.publish(
        "user.xp_earned",
        {
            "version": 1,
            "user_id": str(user_id),
            "xp_amount": amount,
            "source": source.value,
            "new_total": new_total,
            "earned_at": moment.isoformat(),
        },
    )

    previous_rank = rank_for_total_xp(previous_total)
    new_rank = rank_for_total_xp(new_total)
    rank_changed = new_rank != previous_rank
    if rank_changed:
        await publisher.publish(
            "user.rank_achieved",
            {
                "version": 1,
                "user_id": str(user_id),
                "new_rank": new_rank.value,
                "previous_rank": previous_rank.value,
                "achieved_at": moment.isoformat(),
            },
        )

    signals = [(src, ts.date()) for src, ts in await _ledger_signals(session, user_id)]
    candidate_medals = detect_earned_medals(
        sources_with_dates=signals, onboarding_completed=onboarding_completed
    )
    already = await _earned_medal_types(session, user_id)
    newly_earned = sorted(candidate_medals - already, key=lambda m: m.value)

    for medal in newly_earned:
        session.add(MedalRecord(user_id=user_id, medal_type=medal.value, earned_at=moment))
        await session.flush()
        await publisher.publish(
            "user.medal_earned",
            {
                "version": 1,
                "user_id": str(user_id),
                "medal_type": medal.value,
                "earned_at": moment.isoformat(),
            },
        )

    return AwardResult(
        entry_id=entry.id,
        xp_amount=amount,
        new_total=new_total,
        previous_rank=previous_rank,
        new_rank=new_rank,
        rank_changed=rank_changed,
        newly_earned_medals=newly_earned,
    )
