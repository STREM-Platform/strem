"""AI race covers (#35): allowlisted accounts only, counted against the daily AI
limit, served at an unguessable public URL, exported and purged with the athlete."""

from __future__ import annotations

import asyncio
import uuid
from datetime import date

import pytest

from app.race.enrich import covers
from tests.support import TEST_SETTINGS, auth_header
from tests.test_race_os import FakeServices, ScriptedAI, mission, race_app

RACE = {
    "name": "Kodzha Kaya 75K",
    "sport": "trail_running",
    "location": "Bilka, Bulgaria",
    "race_date": "2027-04-24",
    "distance_km": 75,
    "elevation_gain_m": 4400,
}


def test_covers_are_allowlisted_metered_served_exported_and_purged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(TEST_SETTINGS, "openai_api_key", "sk-test")
    monkeypatch.setattr(TEST_SETTINGS, "cover_image_emails", "Founder@strem.app, other@x.io")
    monkeypatch.setattr(TEST_SETTINGS, "ai_daily_limit", 2)
    prompts: list[str] = []

    async def fake_generate(settings: object, prompt: str) -> bytes:
        prompts.append(prompt)
        return b"\xff\xd8jpeg-bytes"

    monkeypatch.setattr(covers, "generate", fake_generate)

    async def scenario() -> None:
        founder = auth_header(uuid.uuid4(), "founder@strem.app")
        stranger = auth_header(uuid.uuid4(), "someone@example.com")
        async with race_app(FakeServices(mission()), ScriptedAI()) as client:
            status = (await client.get("/v1/ai/race/status", headers=stranger)).json()
            assert status["cover_images"] is False
            refused = await client.post("/v1/ai/enrich/covers", headers=stranger, json=RACE)
            assert refused.status_code == 403
            assert refused.json()["code"] == "cover_generation_restricted"

            assert (await client.get("/v1/ai/race/status", headers=founder)).json()["cover_images"]
            made = await client.post("/v1/ai/enrich/covers", headers=founder, json=RACE)
            assert made.status_code == 201
            body = made.json()
            assert body["model"] == "gpt-image-2"
            assert body["path"] == f"/ai/enrich/covers/{body['id']}"
            assert "Kodzha Kaya 75K" in prompts[0] and "spring" in prompts[0]
            assert "No text" in prompts[0]

            # The image is public (an <img> sends no token) and cached for good.
            image = await client.get(f"/v1/{body['path'].lstrip('/')}")
            assert image.status_code == 200 and image.content == b"\xff\xd8jpeg-bytes"
            assert image.headers["content-type"] == "image/jpeg"
            assert "immutable" in image.headers["cache-control"]
            missing = await client.get(f"/v1/ai/enrich/covers/{uuid.uuid4()}")
            assert missing.status_code == 404

            # Each image spends from the daily AI limit.
            status = (await client.get("/v1/ai/race/status", headers=founder)).json()
            assert status["left_today"] == 1
            await client.post("/v1/ai/enrich/covers", headers=founder, json=RACE)
            capped = await client.post("/v1/ai/enrich/covers", headers=founder, json=RACE)
            assert capped.status_code == 429 and len(prompts) == 2

            exported = (await client.get("/v1/ai/race/data", headers=founder)).json()["covers"]
            assert len(exported) == 2 and exported[0]["prompt"] == prompts[0]
            await client.request(
                "DELETE",
                "/v1/ai/race/data",
                headers=founder,
                json={"confirmation": "FORGET MY RACE TEAM DATA"},
            )
            assert (await client.get("/v1/ai/race/data", headers=founder)).json()["covers"] == []
            gone = await client.get(f"/v1/{body['path'].lstrip('/')}")
            assert gone.status_code == 404

    asyncio.run(scenario())


def test_no_openai_key_means_no_covers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(TEST_SETTINGS, "openai_api_key", "")
    monkeypatch.setattr(TEST_SETTINGS, "cover_image_emails", "founder@strem.app")
    assert not covers.allowed(TEST_SETTINGS, "founder@strem.app")


def test_prompt_names_the_race_and_its_season_without_inventing_facts() -> None:
    prompt = covers.prompt_for(
        covers.CoverRequest(
            name="Plovdiv Run Marathon",
            sport="road_running",
            location="Plovdiv",
            race_date=date(2027, 4, 18),
        )
    )
    assert "Plovdiv Run Marathon, a road running race, at Plovdiv, held in spring." in prompt
    assert "climbing" not in prompt  # no elevation given, none claimed
