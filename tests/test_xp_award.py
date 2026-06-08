"""Unit tests for the award_xp progression engine (ledger, ranks, medals, events)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from app.events import InMemoryPublisher
from app.progression import AwardResult, award_xp, total_xp
from app.schemas.game import MedalType, UserRank
from app.schemas.xp import XPSource
from tests.support import user_app


def run(scenario: Callable[..., Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_award_writes_ledger_and_emits_xp_event() -> None:
    async def scenario(harness: object) -> None:
        sm = harness.sessionmaker  # type: ignore[attr-defined]
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with sm() as session:
            result = await award_xp(
                session,
                publisher,
                user_id=user_id,
                source=XPSource.STRENGTH_SESSION,
                amount=50,
                source_reference="session_1",
            )
            await session.commit()
            assert isinstance(result, AwardResult)
            assert result.new_total == 50
            assert await total_xp(session, user_id) == 50

        xp_events = publisher.of_type("user.xp_earned")
        assert len(xp_events) == 1
        assert xp_events[0]["version"] == 1
        assert xp_events[0]["xp_amount"] == 50
        assert xp_events[0]["source"] == "strength_session"
        assert xp_events[0]["new_total"] == 50

    run(scenario)


def test_xp_accumulates_and_never_decreases() -> None:
    async def scenario(harness: object) -> None:
        sm = harness.sessionmaker  # type: ignore[attr-defined]
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with sm() as session:
            await award_xp(
                session, publisher, user_id=user_id, source=XPSource.NUTRITION_DAY, amount=25
            )
            result = await award_xp(
                session, publisher, user_id=user_id, source=XPSource.TRIBE_CHECKIN, amount=20
            )
            await session.commit()
            assert result.new_total == 45

            try:
                await award_xp(
                    session, publisher, user_id=user_id, source=XPSource.NUTRITION_DAY, amount=0
                )
            except ValueError:
                pass
            else:
                raise AssertionError("award_xp must reject non-positive amounts")

    run(scenario)


def test_rank_up_boundary_emits_rank_event() -> None:
    async def scenario(harness: object) -> None:
        sm = harness.sessionmaker  # type: ignore[attr-defined]
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with sm() as session:
            # Initiate band is 0-999; cross into Builder (>=1000).
            below = await award_xp(
                session, publisher, user_id=user_id, source=XPSource.CHALLENGE_COMPLETE, amount=999
            )
            assert below.rank_changed is False
            assert below.new_rank == UserRank.INITIATE

            crossing = await award_xp(
                session, publisher, user_id=user_id, source=XPSource.NUTRITION_DAY, amount=25
            )
            await session.commit()
            assert crossing.rank_changed is True
            assert crossing.previous_rank == UserRank.INITIATE
            assert crossing.new_rank == UserRank.BUILDER

        rank_events = publisher.of_type("user.rank_achieved")
        assert len(rank_events) == 1
        assert rank_events[0]["new_rank"] == "Builder"
        assert rank_events[0]["previous_rank"] == "Initiate"

    run(scenario)


def test_first_strength_session_unlocks_first_iron_and_first_steps() -> None:
    async def scenario(harness: object) -> None:
        sm = harness.sessionmaker  # type: ignore[attr-defined]
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with sm() as session:
            result = await award_xp(
                session, publisher, user_id=user_id, source=XPSource.STRENGTH_SESSION, amount=50
            )
            await session.commit()
            assert MedalType.FIRST_IRON in result.newly_earned_medals
            assert MedalType.FIRST_STEPS in result.newly_earned_medals
            assert MedalType.FIRST_MILE not in result.newly_earned_medals

        medal_events = publisher.of_type("user.medal_earned")
        earned_types = {event["medal_type"] for event in medal_events}
        assert "first_iron" in earned_types
        assert "first_steps" in earned_types

    run(scenario)


def test_medals_are_not_awarded_twice() -> None:
    async def scenario(harness: object) -> None:
        sm = harness.sessionmaker  # type: ignore[attr-defined]
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with sm() as session:
            await award_xp(
                session, publisher, user_id=user_id, source=XPSource.STRENGTH_SESSION, amount=50
            )
            second = await award_xp(
                session, publisher, user_id=user_id, source=XPSource.STRENGTH_SESSION, amount=50
            )
            await session.commit()
            assert MedalType.FIRST_IRON not in second.newly_earned_medals

        # first_iron emitted exactly once across both awards
        first_iron = [
            event
            for event in publisher.of_type("user.medal_earned")
            if event["medal_type"] == "first_iron"
        ]
        assert len(first_iron) == 1

    run(scenario)
