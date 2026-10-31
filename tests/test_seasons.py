"""Season plans the race team drafts (training#18). All data is synthetic."""

from __future__ import annotations

import asyncio
import uuid
from datetime import date, timedelta
from typing import Any

from app.race.ai.client import UnavailableAI
from app.race.engine.season import build_season_plan
from tests.support import auth_header
from tests.test_race_os import FakeServices, mission, race_app

TODAY = date(2026, 11, 2)  # a Monday


def season(focus: str, weeks: int = 12) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "name": f"{focus} block",
        "start_date": TODAY.isoformat(),
        "end_date": (TODAY + timedelta(weeks=weeks, days=-1)).isoformat(),
        "focus": focus,
    }


def recent(hours: float) -> list[dict[str, Any]]:
    # Four complete weeks of synthetic sessions before TODAY.
    return [
        {
            "logged_at": f"{(TODAY - timedelta(days=d)).isoformat()}T07:00:00Z",
            "duration_minutes": int(hours * 60 / 2),
        }
        for d in range(1, 29, 3)
    ][:8]


def plan(focus: str, **kw: Any) -> dict[str, Any]:
    return build_season_plan(
        season(focus, **kw),
        today=TODAY,
        profile={"training_days_per_week": 5},
        sessions=recent(6),
        sport="trail_running",
        timezone="UTC",
    )


def hours(p: dict[str, Any]) -> list[float]:
    return [float(w["target_hours"]) for w in p["weeks"]]


def kinds(p: dict[str, Any]) -> set[str]:
    return {s["kind"] for w in p["weeks"] for s in w["sessions"]}


def test_focus_shapes_volume_quality_and_strength() -> None:
    base, build, off, rest = plan("base"), plan("build"), plan("off_season"), plan("recovery")
    assert len(base["weeks"]) == 12 and base["race_date"] is None
    assert hours(base)[-1] > hours(base)[0]  # base builds
    assert hours(base)[3] < hours(base)[2]  # a lighter fourth week
    assert "hills" in kinds(build) and "hills" not in kinds(base)
    assert "strength" in kinds(base) and "cross" in kinds(off)
    assert max(hours(rest)) < min(hours(base))
    ids = [s["id"] for w in base["weeks"] for s in w["sessions"]]
    assert len(ids) == len(set(ids))
    assert any("recorded last 4 weeks" in a for a in base["assumptions"])


def test_build_season_endpoint_saves_the_season_plan() -> None:
    target = season("base", weeks=8)
    target["start_date"] = date.today().isoformat()
    target["end_date"] = (date.today() + timedelta(weeks=8)).isoformat()

    class Services(FakeServices):
        saved: dict[str, Any] | None = None

        async def seasons(self) -> list[dict[str, Any]]:
            return [target]

        async def put_season_plan(
            self, season_id: uuid.UUID, body: dict[str, Any]
        ) -> dict[str, Any]:
            self.saved = body
            return {**target, "plan": body["content"], "plan_version": 1}

    fake = Services(mission())

    async def scenario() -> None:
        async with race_app(fake, UnavailableAI()) as client:
            headers = auth_header(uuid.uuid4())
            built = await client.post(
                f"/v1/ai/race/seasons/{target['id']}/build", headers=headers, json={}
            )
            assert built.status_code == 200, built.text
            body = built.json()
            assert body["origin"] == "engine" and "key" in (body["ai_reason"] or "")
            assert (
                fake.saved
                and fake.saved["content"]["race_date"] is None
                and fake.saved["content"]["phases"]
            )
            missing = await client.post(
                f"/v1/ai/race/seasons/{uuid.uuid4()}/build", headers=headers, json={}
            )
            assert missing.status_code == 404
            imported = await client.post(
                "/v1/ai/race/plan/import/commit",
                headers=headers,
                json={"content": fake.saved["content"], "season_id": target["id"]},
            )
            assert imported.status_code == 200 and fake.saved["origin"] == "athlete"

    asyncio.run(scenario())
