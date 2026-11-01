"""Seasons with their own plans on the athlete's timeline (issue #18). All data is synthetic."""

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from app import athlete_plan as timeline
from tests.support import auth_header, training_app
from tests.test_athlete_plan import content, s, week

TODAY = datetime.now(UTC).date()
MONDAY = TODAY - timedelta(days=TODAY.weekday())


def season_body(name: str, start: date, end: date, focus: str = "base") -> dict[str, Any]:
    return {
        "name": name,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "focus": focus,
    }


def test_seasons_crud_plans_and_timeline(monkeypatch: pytest.MonkeyPatch) -> None:
    async def no_races(token: str, base_url: str) -> list[dict[str, Any]]:
        return []

    monkeypatch.setattr(timeline, "athlete_races", no_races)

    async def scenario() -> None:
        async with training_app() as h:
            headers = auth_header(uuid.uuid4())
            winter = await h.client.post(
                "/v1/training/seasons",
                headers=headers,
                json=season_body("Winter base", MONDAY, MONDAY + timedelta(weeks=2, days=6)),
            )
            assert winter.status_code == 201, winter.text
            winter_id = winter.json()["id"]
            summer_start = MONDAY + timedelta(weeks=3)
            summer = await h.client.post(
                "/v1/training/seasons",
                headers=headers,
                json=season_body(
                    "Summer racing", summer_start, summer_start + timedelta(weeks=8), "race_season"
                ),
            )
            assert summer.status_code == 201
            overlap = await h.client.post(
                "/v1/training/seasons",
                headers=headers,
                json=season_body("Clash", MONDAY + timedelta(weeks=2), MONDAY + timedelta(weeks=4)),
            )
            assert overlap.status_code == 409 and overlap.json()["code"] == "season_overlap"
            backwards = await h.client.post(
                "/v1/training/seasons",
                headers=headers,
                json=season_body("Bad", MONDAY, MONDAY - timedelta(days=1)),
            )
            assert backwards.status_code in (400, 422)

            plan = {
                "origin": "athlete",
                "content": content(
                    MONDAY,
                    None,
                    [
                        week(1, MONDAY, "base", [s("mon-swim", MONDAY, sport="swimming")]),
                        week(
                            2,
                            MONDAY + timedelta(weeks=1),
                            "base",
                            [s("tue-run", MONDAY + timedelta(weeks=1, days=1))],
                        ),
                    ],
                    "Winter base",
                ),
            }
            saved = await h.client.put(
                f"/v1/training/seasons/{winter_id}/plan", headers=headers, json=plan
            )
            assert saved.status_code == 200 and saved.json()["plan_version"] == 1

            # Own plan beyond the season fills weeks no season plan covers.
            own = {
                "origin": "athlete",
                "content": content(
                    MONDAY,
                    None,
                    [
                        week(1, MONDAY, "general", [s("own", MONDAY)]),
                        week(2, summer_start, "general", [s("own-later", summer_start)]),
                    ],
                ),
            }
            assert (
                await h.client.put(
                    "/v1/training/plan/base", headers={**headers, "If-Match": '"0"'}, json=own
                )
            ).status_code == 200

            composed = (await h.client.get("/v1/training/plan", headers=headers)).json()
            weeks = composed["content"]["weeks"]
            assert [(w["source"], w["start_date"]) for w in weeks] == [
                ("season", MONDAY.isoformat()),
                ("season", (MONDAY + timedelta(weeks=1)).isoformat()),
                ("base", summer_start.isoformat()),
            ]
            assert (
                weeks[0]["season_id"] == winter_id and weeks[2]["season_id"] == summer.json()["id"]
            )
            assert weeks[0]["sessions"][0]["id"] == f"s{uuid.UUID(winter_id).hex[:8]}-mon-swim"
            assert [x["name"] for x in composed["seasons"]] == ["Winter base", "Summer racing"]
            assert (
                composed["seasons"][0]["current"] is True
                and composed["seasons"][0]["has_plan"] is True
            )

            sid = weeks[0]["sessions"][0]["id"]
            patched = await h.client.patch(
                f"/v1/training/plan/sessions/{sid}", headers=headers, json={"status": "done"}
            )
            assert patched.status_code == 200
            items = (await h.client.get("/v1/training/seasons", headers=headers)).json()["items"]
            assert (
                items[0]["plan"]["weeks"][0]["sessions"][0]["status"] == "done"
                and items[0]["plan_version"] == 2
            )

            renamed = await h.client.patch(
                f"/v1/training/seasons/{winter_id}",
                headers=headers,
                json=season_body(
                    "Winter build", MONDAY, MONDAY + timedelta(weeks=2, days=6), "build"
                ),
            )
            assert renamed.json()["name"] == "Winter build"
            assert (
                await h.client.delete(f"/v1/training/seasons/{winter_id}/plan", headers=headers)
            ).json()["plan"] is None
            assert (
                await h.client.delete(f"/v1/training/seasons/{winter_id}", headers=headers)
            ).status_code == 204
            other = await h.client.delete(
                f"/v1/training/seasons/{summer.json()['id']}", headers=auth_header(uuid.uuid4())
            )
            assert other.status_code == 404

    asyncio.run(scenario())
