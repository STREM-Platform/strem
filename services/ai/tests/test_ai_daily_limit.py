"""Daily AI limit per athlete (#8): past it the race engine carries on, the app
says why, other athletes are unaffected, and the count joins export and purge."""

from __future__ import annotations

import asyncio
import uuid

import pytest

from app.race.ai.budget import LIMIT_REASON
from tests.support import TEST_SETTINGS, auth_header
from tests.test_race_os import FakeServices, ScriptedAI, mission, race_app


def test_the_daily_limit_turns_the_ai_off_for_that_athlete_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(TEST_SETTINGS, "ai_daily_limit", 3)

    async def scenario() -> None:
        m = mission()
        headers = auth_header(uuid.uuid4())
        chat = f"/v1/ai/race/{m['id']}/chat"
        async with race_app(FakeServices(m), ScriptedAI()) as client:
            fresh = (await client.get("/v1/ai/race/status", headers=headers)).json()
            assert fresh["available"] and fresh["daily_limit"] == 3 and fresh["left_today"] == 3

            answered = 0
            while (await client.get("/v1/ai/race/status", headers=headers)).json()["available"]:
                reply = await client.post(chat, headers=headers, json={"message": "Pacing?"})
                answered += reply.json()["available"]
                assert answered <= 3
            assert answered >= 1

            capped = await client.post(chat, headers=headers, json={"message": "And fuel?"})
            assert capped.json() == {"available": False, "reason": LIMIT_REASON, "message": None}
            status = (await client.get("/v1/ai/race/status", headers=headers)).json()
            assert status["left_today"] == 0 and status["reason"] == LIMIT_REASON

            # Another athlete still has the whole day's allowance.
            other = auth_header(uuid.uuid4())
            mine = (await client.get("/v1/ai/race/status", headers=other)).json()
            assert mine["available"] and mine["left_today"] == 3

            usage = (await client.get("/v1/ai/race/data", headers=headers)).json()["ai_usage"]
            assert len(usage) == 1 and usage[0]["calls"] == 3

            await client.request(
                "DELETE",
                "/v1/ai/race/data",
                headers=headers,
                json={"confirmation": "FORGET MY RACE TEAM DATA"},
            )
            after = (await client.get("/v1/ai/race/data", headers=headers)).json()
            assert after["ai_usage"] == []

    asyncio.run(scenario())


def test_zero_means_no_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(TEST_SETTINGS, "ai_daily_limit", 0)

    async def scenario() -> None:
        m = mission()
        headers = auth_header(uuid.uuid4())
        async with race_app(FakeServices(m), ScriptedAI()) as client:
            for _ in range(3):
                reply = await client.post(
                    f"/v1/ai/race/{m['id']}/chat", headers=headers, json={"message": "Pacing?"}
                )
                assert reply.json()["available"]
            status = (await client.get("/v1/ai/race/status", headers=headers)).json()
            assert status["daily_limit"] == 0 and status["left_today"] is None
            assert (await client.get("/v1/ai/race/data", headers=headers)).json()["ai_usage"] == []

    asyncio.run(scenario())
