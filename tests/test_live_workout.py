"""Tests for live-workout sets, autoregulation, PR detection (D1/D2)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from app.autoregulation import autoregulate, estimated_1rm, is_pr
from tests.support import Harness, auth_header, training_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with training_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


async def _new_session(harness: Harness, headers: dict[str, str]) -> str:
    created = await harness.client.post(
        "/v1/training/sessions",
        headers=headers,
        json={"session_type": "strength", "duration_minutes": 50},
    )
    assert created.status_code == 201
    return str(created.json()["id"])


# ── pure autoregulation ──────────────────────────────────────────────────────


def test_autoregulate_hard_rpe_adds_rest_holds_load() -> None:
    t = autoregulate(9, base_rest_s=90, base_load_kg=100.0)
    assert t.rest_s == 135
    assert t.load_kg == 100.0


def test_autoregulate_easy_rpe_cuts_rest_adds_load() -> None:
    t = autoregulate(6, base_rest_s=90, base_load_kg=100.0)
    assert t.rest_s == 60
    assert t.load_kg == 102.5


def test_autoregulate_floors_rest_at_45() -> None:
    assert autoregulate(5, base_rest_s=60, base_load_kg=80.0).rest_s == 45


def test_autoregulate_no_rpe_holds() -> None:
    t = autoregulate(None, base_rest_s=90, base_load_kg=80.0)
    assert t.rest_s == 90
    assert t.load_kg == 80.0


def test_estimated_1rm_and_is_pr() -> None:
    assert estimated_1rm(5, 100.0) == round(100 * (1 + 5 / 30), 2)
    assert is_pr(120.0, None) is True
    assert is_pr(120.0, 119.0) is True
    assert is_pr(120.0, 120.0) is False


# ── set logging ──────────────────────────────────────────────────────────────


def test_log_set_returns_autoregulated_target() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        sid = await _new_session(harness, headers)
        res = await harness.client.post(
            f"/v1/training/sessions/{sid}/sets",
            headers=headers,
            json={"exercise": "Back Squat", "set_index": 0, "reps": 5, "kg": 100, "rpe": 9},
        )
        assert res.status_code == 201
        body = res.json()
        assert body["set"]["exercise"] == "Back Squat"
        assert body["set"]["rest_s"] == 135
        assert body["next_target"]["rest_s"] == 135
        assert body["next_target"]["load_kg"] == 100.0

    run(scenario)


def test_log_set_on_other_users_session_is_404() -> None:
    async def scenario(harness: Harness) -> None:
        owner = auth_header(uuid.uuid4())
        sid = await _new_session(harness, owner)
        other = auth_header(uuid.uuid4())
        res = await harness.client.post(
            f"/v1/training/sessions/{sid}/sets",
            headers=other,
            json={"exercise": "Bench", "set_index": 0, "reps": 5, "kg": 80},
        )
        assert res.status_code == 404

    run(scenario)


# ── PR detection on finish ───────────────────────────────────────────────────


def test_finish_detects_first_pr_and_publishes() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        sid = await _new_session(harness, headers)
        await harness.client.post(
            f"/v1/training/sessions/{sid}/sets",
            headers=headers,
            json={"exercise": "Deadlift", "set_index": 0, "reps": 3, "kg": 180, "rpe": 8},
        )
        finished = await harness.client.post(
            f"/v1/training/sessions/{sid}/finish", headers=headers
        )
        assert finished.status_code == 200
        prs = finished.json()["prs_detected"]
        assert len(prs) == 1
        assert prs[0]["exercise"] == "Deadlift"
        assert prs[0]["kg"] == 180

        events = harness.publisher.of_type("training.pr_detected")
        assert len(events) == 1
        assert events[0]["exercise"] == "Deadlift"
        assert events[0]["version"] == 1
        assert events[0]["user_id"] == str(uuid.UUID(prs[0]["user_id"]))

    run(scenario)


def test_finish_does_not_flag_when_history_not_beaten() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        # First session sets the record at 180kg x3.
        sid1 = await _new_session(harness, headers)
        await harness.client.post(
            f"/v1/training/sessions/{sid1}/sets",
            headers=headers,
            json={"exercise": "Deadlift", "set_index": 0, "reps": 3, "kg": 180},
        )
        await harness.client.post(f"/v1/training/sessions/{sid1}/finish", headers=headers)

        # Second session, lighter — no PR.
        sid2 = await _new_session(harness, headers)
        await harness.client.post(
            f"/v1/training/sessions/{sid2}/sets",
            headers=headers,
            json={"exercise": "Deadlift", "set_index": 0, "reps": 3, "kg": 170},
        )
        finished = await harness.client.post(
            f"/v1/training/sessions/{sid2}/finish", headers=headers
        )
        assert finished.json()["prs_detected"] == []
        assert len(harness.publisher.of_type("training.pr_detected")) == 1  # only the first

    run(scenario)


def test_prs_endpoint_lists_records() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        sid = await _new_session(harness, headers)
        for ex, kg in (("Squat", 140), ("Bench", 100)):
            await harness.client.post(
                f"/v1/training/sessions/{sid}/sets",
                headers=headers,
                json={"exercise": ex, "set_index": 0, "reps": 5, "kg": kg},
            )
        await harness.client.post(f"/v1/training/sessions/{sid}/finish", headers=headers)

        prs = await harness.client.get("/v1/training/prs", headers=headers)
        assert prs.status_code == 200
        body = prs.json()
        assert body["pagination"]["total"] == 2
        assert {p["exercise"] for p in body["items"]} == {"Squat", "Bench"}

    run(scenario)


def test_live_workout_endpoints_require_auth() -> None:
    async def scenario(harness: Harness) -> None:
        sid = uuid.uuid4()
        assert (
            await harness.client.post(
                f"/v1/training/sessions/{sid}/sets",
                json={"exercise": "X", "set_index": 0, "reps": 5, "kg": 80},
            )
        ).status_code == 401
        assert (await harness.client.get("/v1/training/prs")).status_code == 401

    run(scenario)
