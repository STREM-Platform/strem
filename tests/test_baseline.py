"""PR-baseline seeding (#61): the athlete-baseline PRs become an e1RM floor so an
experienced athlete's first logged lift below a known PR isn't a false PR."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from app.autoregulation import estimated_1rm
from app.baseline import baseline_e1rm_map
from tests.support import Harness, auth_header, training_app


def run_with(
    scenario: Callable[[Harness], Awaitable[None]],
    *,
    pr_baseline: dict[str, float] | None = None,
) -> None:
    async def _inner() -> None:
        async with training_app(pr_baseline=pr_baseline) as harness:
            await scenario(harness)

    asyncio.run(_inner())


# ── pure mapping ──────────────────────────────────────────────────────────────


def test_baseline_e1rm_map_picks_best_and_skips_non_lifts() -> None:
    records: list[dict[str, Any]] = [
        {"exercise": "Back Squat", "weight_kg": 140, "reps": 1},
        {"exercise": "back squat", "weight_kg": 120, "reps": 5},  # case-folded, higher e1RM
        {"exercise": "5k run", "time": "21:30"},  # no weight → skipped
        {"exercise": "", "weight_kg": 100},  # no name → skipped
    ]
    mapping = baseline_e1rm_map(records)
    assert set(mapping) == {"back squat"}
    assert mapping["back squat"] == max(estimated_1rm(1, 140.0), estimated_1rm(5, 120.0))


# ── seeded PR detection ───────────────────────────────────────────────────────


async def _session_with_set(
    harness: Harness, headers: dict[str, str], *, exercise: str, reps: int, kg: float
) -> str:
    created = await harness.client.post(
        "/v1/training/sessions",
        headers=headers,
        json={"session_type": "strength", "duration_minutes": 50},
    )
    sid = str(created.json()["id"])
    await harness.client.post(
        f"/v1/training/sessions/{sid}/sets",
        headers=headers,
        json={"exercise": exercise, "set_index": 0, "reps": reps, "kg": kg},
    )
    return sid


def test_seeded_baseline_suppresses_false_first_pr() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        # 100kg × 5 ≈ 116.7 e1RM — below the seeded 140kg × 1 ≈ 144.7 floor.
        sid = await _session_with_set(harness, headers, exercise="Back Squat", reps=5, kg=100)
        finished = await harness.client.post(f"/v1/training/sessions/{sid}/finish", headers=headers)
        assert finished.status_code == 200
        assert finished.json()["prs_detected"] == []
        assert harness.publisher.of_type("training.pr_detected") == []

    run_with(scenario, pr_baseline={"back squat": estimated_1rm(1, 140.0)})


def test_logged_lift_above_baseline_is_a_real_pr() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        # 150kg × 3 = 165 e1RM — beats the seeded 140kg × 1 floor.
        sid = await _session_with_set(harness, headers, exercise="Back Squat", reps=3, kg=150)
        finished = await harness.client.post(f"/v1/training/sessions/{sid}/finish", headers=headers)
        prs = finished.json()["prs_detected"]
        assert len(prs) == 1
        assert prs[0]["exercise"] == "Back Squat"
        assert len(harness.publisher.of_type("training.pr_detected")) == 1

    run_with(scenario, pr_baseline={"back squat": estimated_1rm(1, 140.0)})
