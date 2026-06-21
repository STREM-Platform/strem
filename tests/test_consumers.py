"""Tests for the domain-event consumers (mapping, awarding, idempotency)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from app.consumers import (
    DUEL_COMPLETED_STREAM,
    NUTRITION_STREAM,
    TRAINING_STREAM,
    TRIBE_STREAM,
    MalformedEventError,
    handle_event,
)
from app.events import InMemoryPublisher
from app.progression import total_xp
from tests.support import Harness, user_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def _training_event(user_id: uuid.UUID, session_type: str) -> dict[str, object]:
    return {
        "version": 1,
        "user_id": str(user_id),
        "session_type": session_type,
        "duration_minutes": 45,
        "logged_at": "2026-06-07T18:05:00+00:00",
    }


def test_training_event_awards_mapped_xp() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with harness.sessionmaker() as session:
            applied = await handle_event(
                session,
                publisher,
                stream=TRAINING_STREAM,
                message_id="1-0",
                payload=_training_event(user_id, "strength"),
            )
            assert applied is True
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 50  # strength_session

        xp_events = publisher.of_type("user.xp_earned")
        assert len(xp_events) == 1
        assert xp_events[0]["source"] == "strength_session"

    run(scenario)


def test_event_xp_weights_per_session_type() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        cases = {"strength": 50, "running": 40, "mobility": 30}
        for index, (session_type, expected) in enumerate(cases.items()):
            user_id = uuid.uuid4()
            async with harness.sessionmaker() as session:
                await handle_event(
                    session,
                    publisher,
                    stream=TRAINING_STREAM,
                    message_id=f"{index}-0",
                    payload=_training_event(user_id, session_type),
                )
            async with harness.sessionmaker() as session:
                assert await total_xp(session, user_id) == expected

    run(scenario)


def test_nutrition_and_tribe_events_award_xp() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with harness.sessionmaker() as session:
            await handle_event(
                session,
                publisher,
                stream=NUTRITION_STREAM,
                message_id="n-0",
                payload={"version": 1, "user_id": str(user_id), "date": "2026-06-07",
                         "targets_met": True, "logged_at": "2026-06-07T21:00:00+00:00"},
            )
            await handle_event(
                session,
                publisher,
                stream=TRIBE_STREAM,
                message_id="t-0",
                payload={"version": 1, "user_id": str(user_id),
                         "logged_at": "2026-06-07T21:30:00+00:00"},
            )
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 45  # 25 nutrition + 20 tribe

    run(scenario)


def test_redelivery_is_a_no_op() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        payload = _training_event(user_id, "running")

        async with harness.sessionmaker() as session:
            first = await handle_event(
                session, publisher, stream=TRAINING_STREAM, message_id="dup-1", payload=payload
            )
        async with harness.sessionmaker() as session:
            second = await handle_event(
                session, publisher, stream=TRAINING_STREAM, message_id="dup-1", payload=payload
            )

        assert first is True
        assert second is False  # deduped
        async with harness.sessionmaker() as session:
            assert await total_xp(session, user_id) == 40  # awarded once
        assert len(publisher.of_type("user.xp_earned")) == 1

    run(scenario)


def test_malformed_event_raises() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        async with harness.sessionmaker() as session:
            try:
                await handle_event(
                    session,
                    publisher,
                    stream=TRAINING_STREAM,
                    message_id="bad-0",
                    payload={"version": 1, "user_id": str(uuid.uuid4()),
                             "session_type": "yoga", "logged_at": "2026-06-07T00:00:00+00:00"},
                )
            except MalformedEventError:
                return
        raise AssertionError("expected MalformedEventError for unknown session_type")

    run(scenario)


def _duel_completed_event(
    challenger: uuid.UUID, opponent: uuid.UUID, winner: uuid.UUID | None
) -> dict[str, object]:
    return {
        "version": 1,
        "duel_id": str(uuid.uuid4()),
        "tribe_id": str(uuid.uuid4()),
        "challenger_id": str(challenger),
        "opponent_id": str(opponent),
        "metric": "total_xp",
        "challenger_score": 80,
        "opponent_score": 40,
        "winner_id": str(winner) if winner is not None else None,
        "completed_at": "2026-06-21T12:00:00+00:00",
    }


def test_duel_awards_effort_xp_to_both_with_winner_bonus() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        challenger = uuid.uuid4()
        opponent = uuid.uuid4()
        async with harness.sessionmaker() as session:
            applied = await handle_event(
                session,
                publisher,
                stream=DUEL_COMPLETED_STREAM,
                message_id="d-0",
                payload=_duel_completed_event(challenger, opponent, winner=challenger),
            )
            assert applied is True
        async with harness.sessionmaker() as session:
            # Loser still earns effort XP (no shame); winner gets the bonus.
            assert await total_xp(session, opponent) == 100
            assert await total_xp(session, challenger) == 150
        xp_events = publisher.of_type("user.xp_earned")
        assert {e["source"] for e in xp_events} == {"challenge_complete"}

    run(scenario)


def test_duel_tie_awards_equal_effort_xp() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        challenger = uuid.uuid4()
        opponent = uuid.uuid4()
        async with harness.sessionmaker() as session:
            await handle_event(
                session,
                publisher,
                stream=DUEL_COMPLETED_STREAM,
                message_id="d-tie",
                payload=_duel_completed_event(challenger, opponent, winner=None),
            )
        async with harness.sessionmaker() as session:
            assert await total_xp(session, challenger) == 100
            assert await total_xp(session, opponent) == 100

    run(scenario)


def test_duel_redelivery_is_a_no_op() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        challenger = uuid.uuid4()
        opponent = uuid.uuid4()
        payload = _duel_completed_event(challenger, opponent, winner=opponent)
        async with harness.sessionmaker() as session:
            first = await handle_event(
                session, publisher, stream=DUEL_COMPLETED_STREAM, message_id="dup", payload=payload
            )
        async with harness.sessionmaker() as session:
            second = await handle_event(
                session, publisher, stream=DUEL_COMPLETED_STREAM, message_id="dup", payload=payload
            )
        assert first is True
        assert second is False
        async with harness.sessionmaker() as session:
            assert await total_xp(session, opponent) == 150  # awarded once

    run(scenario)


def test_event_triggers_medal_and_rank_side_effects() -> None:
    async def scenario(harness: Harness) -> None:
        publisher = InMemoryPublisher()
        user_id = uuid.uuid4()
        async with harness.sessionmaker() as session:
            await handle_event(
                session,
                publisher,
                stream=TRAINING_STREAM,
                message_id="m-0",
                payload=_training_event(user_id, "strength"),
            )
        medal_types = {e["medal_type"] for e in publisher.of_type("user.medal_earned")}
        assert "first_iron" in medal_types
        assert "first_steps" in medal_types

    run(scenario)
