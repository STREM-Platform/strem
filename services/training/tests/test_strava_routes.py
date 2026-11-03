"""Strava routes as race courses (issue #19). No network: a stub provider."""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.errors import AppError
from app.integrations.providers import TokenSet, _strava_route
from tests.support import StubProvider, auth_header, training_app
from tests.test_courses import GPX
from tests.test_plans import allow


@dataclass
class StravaWithRoutes(StubProvider):
    rejected: bool = False
    asked: list[str] = field(default_factory=list)

    async def routes(self, access_token: str) -> list[dict[str, Any]]:
        if self.rejected:
            raise AppError(
                400, "provider_rejected", "Strava did not accept the connection — connect again."
            )
        return [
            {
                "id": "123",
                "name": "Synthetic Ridge Loop",
                "distance_km": 21.4,
                "elevation_gain_m": 1180,
                "kind": "run",
                "private": True,
                "updated_at": None,
            }
        ]

    async def route_gpx(self, access_token: str, route_id: str) -> bytes:
        self.asked.append(route_id)
        return GPX


def test_route_rows_are_normalized() -> None:
    row = _strava_route(
        {
            "id": 987,
            "id_str": "987",
            "name": "Loop",
            "distance": 21400.0,
            "elevation_gain": 1180.4,
            "type": 2,
            "private": True,
        }
    )
    assert row == {
        "id": "987",
        "name": "Loop",
        "distance_km": 21.4,
        "elevation_gain_m": 1180,
        "kind": "run",
        "private": True,
        "updated_at": None,
    }
    assert _strava_route({"id": None}) is None


def test_list_routes_and_attach_one_as_the_course() -> None:
    provider = StravaWithRoutes(id="strava", tokens=TokenSet(access_token="acc", refresh_token="r"))

    async def scenario() -> None:
        async with training_app(providers={"strava": provider}) as h:
            owner, mission = uuid.uuid4(), uuid.uuid4()
            headers = auth_header(owner)
            allow(h, owner, mission)
            missing = await h.client.get("/v1/integrations/strava/routes", headers=headers)
            assert missing.status_code == 404 and missing.json()["code"] == "not_connected"
            connected = await h.client.post(
                "/v1/integrations/strava/connect",
                headers=headers,
                json={"code": "c", "redirect_uri": "strem://cb"},
            )
            assert connected.status_code == 201
            routes = (await h.client.get("/v1/integrations/strava/routes", headers=headers)).json()[
                "items"
            ]
            assert routes[0]["name"] == "Synthetic Ridge Loop"
            attached = await h.client.post(
                f"/v1/training/missions/{mission}/course/from-strava",
                headers={**headers, "If-Match": '"0"'},
                json={"route_id": "123"},
            )
            assert attached.status_code == 200, attached.text
            body = attached.json()
            assert (
                body["source"] == "strava_route"
                and body["source_url"] == "https://www.strava.com/routes/123"
            )
            assert provider.asked == ["123"] and attached.headers["etag"] == '"1"'
            bad = await h.client.post(
                f"/v1/training/missions/{mission}/course/from-strava",
                headers={**headers, "If-Match": '"1"'},
                json={"route_id": "../x"},
            )
            assert bad.status_code in (400, 422)
            provider.rejected = True
            scope = await h.client.get("/v1/integrations/strava/routes", headers=headers)
            assert scope.status_code == 403 and scope.json()["code"] == "strava_scope_missing"

    asyncio.run(scenario())
