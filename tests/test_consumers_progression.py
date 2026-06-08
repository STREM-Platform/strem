"""Tests for mission/challenge/streak XP consumers (strem-user-service#6)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

from app.consumers import (
    CHALLENGE_COMPLETED_STREAM,
    MISSION_COMPLETED_STREAM,
    TRAINING_STREAM,
    handle_event,
)
from app.events import InMemoryPublisher
from app.progression import award_xp, total_xp
from app.schemas.xp import XPSource
from tests.support import Harness, user_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def _mission_event(user_id: uuid.UUID, xp_reward: int) -> dict[str, object]:
    return {
        "version": 1,
        "user_id": str(user_id),
        "mission_id": str(uuid.uuid4()),
        "xp_reward": xp_reward,
        "completed_at": "2026-06-07T19:30:00+00:00",
    }


def _training_event(user_id: uuid.UUID) -> dict[str, object]:
    return {
        "version": 1,
        "user_id": str(user_id),
        "session_type": "strength",
        "duration_minutes": 45,
        "logged_at": "2026-06-07T18:00:00+00:00",
    }


def test_mission_completed_awards_mission_xp() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with harness.sessionmaker() as session:
            applied = await handle_event(
                session,
                publisher,
                stream=MISSION_COMPLETED_STREAM,
                message_id="m-1",
                payload=_mission_event(user_id, 120),
            )
            assert applied is True
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 120

        xp_events = publisher.of_type("user.xp_earned")
        assert any(e["source"] == "mission_complete" and e["xp_amount"] == 120 for e in xp_events)

    run(scenario)


def test_mission_xp_is_clamped_to_range() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with harness.sessionmaker() as session:
            await handle_event(
                session,
                publisher,
                stream=MISSION_COMPLETED_STREAM,
                message_id="m-2",
                payload=_mission_event(user_id, 9999),  # out of range
            )
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 150  # clamped to max

    run(scenario)


def test_challenge_completed_distributes_xp_to_participants() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        members = [uuid.uuid4() for _ in range(3)]
        payload = {
            "version": 1,
            "tribe_id": str(uuid.uuid4()),
            "challenge_id": str(uuid.uuid4()),
            "participant_user_ids": [str(m) for m in members],
            "completed_at": "2026-06-21T12:00:00+00:00",
        }
        async with harness.sessionmaker() as session:
            await handle_event(
                session,
                publisher,
                stream=CHALLENGE_COMPLETED_STREAM,
                message_id="c-1",
                payload=payload,
            )
        async with harness.sessionmaker() as session:
            for member in members:
                assert await total_xp(session, member) == 100  # 300 pool / 3 members

        challenge_events = [
            e for e in publisher.of_type("user.xp_earned") if e["source"] == "challenge_complete"
        ]
        assert len(challenge_events) == 3

    run(scenario)


def test_redelivery_does_not_double_award() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        payload = _mission_event(user_id, 100)
        async with harness.sessionmaker() as session:
            first = await handle_event(
                session,
                publisher,
                stream=MISSION_COMPLETED_STREAM,
                message_id="dup",
                payload=payload,
            )
        async with harness.sessionmaker() as session:
            second = await handle_event(
                session,
                publisher,
                stream=MISSION_COMPLETED_STREAM,
                message_id="dup",
                payload=payload,
            )
        assert first is True
        assert second is False
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 100

    run(scenario)


async def _seed_consecutive_days(harness: Harness, user_id: uuid.UUID, days: int) -> None:
    """Award one strength session on each of `days` consecutive days ending yesterday."""
    base = datetime.now(UTC) - timedelta(days=days)
    async with harness.sessionmaker() as session:
        for offset in range(days):
            await award_xp(
                session,
                InMemoryPublisher(),
                user_id=user_id,
                source=XPSource.STRENGTH_SESSION,
                amount=50,
                earned_at=base + timedelta(days=offset),
            )
        await session.commit()


def test_seven_day_streak_awards_bonus_once() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        await _seed_consecutive_days(harness, user_id, 6)  # 6 prior days
        async with harness.sessionmaker() as session:
            await handle_event(
                session, publisher, stream=TRAINING_STREAM, message_id="t-1",
                payload=_training_event(user_id),
            )  # today -> 7 consecutive

        streaks = [
            e for e in publisher.of_type("user.xp_earned") if e["source"] == "streak_7_day"
        ]
        assert len(streaks) == 1
        assert streaks[0]["xp_amount"] == 200

        # a further day does not re-award the 7-day streak
        publisher.events.clear()
        await _seed_consecutive_days(harness, user_id, 1)
        async with harness.sessionmaker() as session:
            await handle_event(
                session, publisher, stream=TRAINING_STREAM, message_id="t-2",
                payload=_training_event(user_id),
            )
        reawarded = [
            e for e in publisher.of_type("user.xp_earned") if e["source"] == "streak_7_day"
        ]
        assert reawarded == []

    run(scenario)


def test_thirty_day_streak_awards_bonus() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        await _seed_consecutive_days(harness, user_id, 29)
        async with harness.sessionmaker() as session:
            await handle_event(
                session, publisher, stream=TRAINING_STREAM, message_id="t-30",
                payload=_training_event(user_id),
            )  # today -> 30 consecutive

        sources = {e["source"] for e in publisher.of_type("user.xp_earned")}
        assert "streak_30_day" in sources
        thirty = [e for e in publisher.of_type("user.xp_earned") if e["source"] == "streak_30_day"]
        assert thirty[0]["xp_amount"] == 1000

    run(scenario)
