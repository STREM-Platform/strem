"""Skipped or missed training → a reviewed adjustment (ai#44). All data is synthetic."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from app.race import service
from app.race.ai.client import UnavailableAI
from app.race.context import RaceContext
from app.race.engine import adapt
from tests.support import auth_header
from tests.test_race_os import FakeServices, mission, race_app

DAY = date(2026, 11, 9)  # a Monday


def plan_with(sessions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "weeks": [
            {
                "index": 1,
                "start_date": DAY.isoformat(),
                "phase": "build",
                "focus": "x",
                "sessions": sessions,
            }
        ]
    }


def s(sid: str, offset: int, kind: str, minutes: int = 60, key: bool = False) -> dict[str, Any]:
    return {
        "id": sid,
        "date": (DAY + timedelta(days=offset)).isoformat(),
        "sport": "running",
        "kind": kind,
        "title": sid,
        "duration_minutes": minutes,
        "key": key,
        "status": "planned",
    }


def progress(*missed: tuple[str, int, str, bool]) -> dict[str, Any]:
    return {
        "sessions": [
            {
                "id": sid,
                "date": (DAY + timedelta(days=off)).isoformat(),
                "kind": kind,
                "key": key,
                "title": sid,
                "derived_status": "missed",
            }
            for sid, off, kind, key in missed
        ]
    }


UPCOMING = plan_with(
    [
        s("tue-tempo", 1, "tempo", key=True),
        s("thu-hills", 3, "hills"),
        s("wed-easy", 2, "easy", 50),
        s("sat-long", 5, "long", 150, key=True),
    ]
)


def test_one_missed_easy_session_changes_nothing() -> None:
    assert adapt.missed(UPCOMING, progress(("easy-1", -3, "easy", False)), DAY) is None


def test_two_missed_keep_one_quality_and_never_make_them_up() -> None:
    result = adapt.missed(
        UPCOMING, progress(("long-1", -2, "long", True), ("easy-2", -4, "easy", False)), DAY
    )
    assert result is not None and result["category"] == "missed"
    by_id = {c["session_id"]: c for c in result["changes"]}
    assert "tue-tempo" not in by_id  # the first quality session stays
    assert by_id["thu-hills"]["after"]["kind"] == "easy"  # the second one eases
    assert by_id["sat-long"]["after"]["duration_minutes"] == 135  # a missed long run → no jump
    assert all(
        c["after"].get("duration_minutes", 0) <= (c["before"].get("duration_minutes") or 0)
        for c in result["changes"]
    )
    assert result["trigger"]["missed"] == ["easy-2", "long-1"]


def test_three_missed_rebuild_the_rhythm() -> None:
    result = adapt.missed(
        UPCOMING,
        progress(("a", -1, "easy", False), ("b", -3, "tempo", True), ("c", -5, "easy", False)),
        DAY,
    )
    assert result is not None
    kinds = {c["session_id"]: c["after"]["kind"] for c in result["changes"]}
    assert kinds["tue-tempo"] == "easy" and kinds["thu-hills"] == "easy"
    assert "rebuilds the rhythm" in result["summary"]


def test_brief_offers_one_proposal_and_does_not_ask_again(monkeypatch: pytest.MonkeyPatch) -> None:
    async def no_conditions(ctx: RaceContext) -> None:
        return None

    monkeypatch.setattr(service, "conditions_for", no_conditions)
    today = datetime.now(UTC).date()

    class Services(FakeServices):
        async def progress(self, mission_id: uuid.UUID) -> dict[str, Any] | None:
            return {
                "sessions": [
                    {
                        "id": "m1",
                        "date": (today - timedelta(days=2)).isoformat(),
                        "kind": "long",
                        "key": True,
                        "title": "Long run",
                        "derived_status": "missed",
                    },
                    {
                        "id": "m2",
                        "date": (today - timedelta(days=3)).isoformat(),
                        "kind": "tempo",
                        "key": True,
                        "title": "Tempo",
                        "derived_status": "skipped",
                    },
                    {
                        "id": "m3",
                        "date": (today - timedelta(days=5)).isoformat(),
                        "kind": "easy",
                        "key": False,
                        "title": "Easy",
                        "derived_status": "missed",
                    },
                ]
            }

    m = mission(race_date=(today + timedelta(weeks=14)).isoformat())
    fake = Services(m)

    async def scenario() -> None:
        async with race_app(fake, UnavailableAI()) as client:
            headers = auth_header(uuid.uuid4())
            await client.post(
                f"/v1/ai/race/{m['id']}/build",
                headers=headers,
                json={"layers": ["plan"], "use_ai": False},
            )
            fake.plan_doc = {**(fake.plan_doc or {}), "version": 1}
            brief = (await client.get(f"/v1/ai/race/{m['id']}/brief", headers=headers)).json()
            proposal = brief["proposal"]
            assert (
                proposal["category"] == "missed"
                and proposal["status"] == "pending"
                and proposal["origin"] == "engine"
            )
            assert brief["actions"][0]["target"] == "proposal"
            again = (await client.get(f"/v1/ai/race/{m['id']}/brief", headers=headers)).json()
            assert (
                again["proposal"]["id"] == proposal["id"]
            )  # the same pending proposal, not a new one
            pending = (
                await client.get(f"/v1/ai/race/{m['id']}/proposals?status=pending", headers=headers)
            ).json()
            assert [p["id"] for p in pending["items"]] == [proposal["id"]]
            rejected = await client.post(
                f"/v1/ai/race/{m['id']}/proposals/{proposal['id']}/reject", headers=headers
            )
            assert rejected.status_code == 200
            after = (await client.get(f"/v1/ai/race/{m['id']}/brief", headers=headers)).json()
            assert "proposal" not in after  # decided once for these sessions

    asyncio.run(scenario())
