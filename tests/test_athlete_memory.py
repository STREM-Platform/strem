"""Athlete memory (ADR 0010, ai#59): what the athlete says is kept, used, editable
and deletable, and the race team's records join export and purge."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from app.race.context import core_lines
from tests.support import auth_header
from tests.test_race_os import FakeServices, ScriptedAI, ctx_for, mission, race_app


def test_what_the_athlete_says_is_remembered_used_corrected_and_forgotten() -> None:
    async def scenario() -> None:
        m = mission(race_date=(datetime.now(UTC).date() + timedelta(weeks=12)).isoformat())
        fake, ai = FakeServices(m), ScriptedAI()
        headers = auth_header(uuid.uuid4())
        chat = f"/v1/ai/race/{m['id']}/chat"
        async with race_app(fake, ai) as client:
            said = "My left knee has hurt on long descents since last year."
            reply = (await client.post(chat, headers=headers, json={"message": said})).json()
            assert reply["available"]
            items = (await client.get("/v1/ai/race/memory", headers=headers)).json()["items"]
            assert [(i["kind"], i["text"], i["source"]) for i in items] == [
                ("injury", "Left knee hurts on long descents", "chat")
            ]

            # Small talk adds nothing; the same fact is not stored twice.
            await client.post(chat, headers=headers, json={"message": "Thanks, that helps a lot!"})
            await client.post(
                chat, headers=headers, json={"message": "Again: the knee on descents."}
            )
            assert (
                len((await client.get("/v1/ai/race/memory", headers=headers)).json()["items"]) == 1
            )

            memory_id = items[0]["id"]
            fixed = await client.patch(
                f"/v1/ai/race/memory/{memory_id}",
                headers=headers,
                json={"text": "Left knee (IT band) hurts after 90 minutes of downhill"},
            )
            assert fixed.json()["source"] == "athlete" and fixed.json()["confidence"] == 1.0

            # Another athlete can neither see nor change it.
            stranger = auth_header(uuid.uuid4())
            assert (await client.get("/v1/ai/race/memory", headers=stranger)).json()["items"] == []
            hijack = await client.patch(
                f"/v1/ai/race/memory/{memory_id}", headers=stranger, json={"text": "nope nope"}
            )
            assert hijack.status_code == 404

            exported = (await client.get("/v1/ai/race/data", headers=headers)).json()
            assert exported["memory"][0]["text"].startswith("Left knee (IT band)")
            assert len(exported["chat"]) == 6 and exported["briefs"] == []

            gone = await client.delete(f"/v1/ai/race/memory/{memory_id}", headers=headers)
            assert gone.status_code == 204
            assert (await client.get("/v1/ai/race/memory", headers=headers)).json()["items"] == []

            refused = await client.request(
                "DELETE", "/v1/ai/race/data", headers=headers, json={"confirmation": "yes"}
            )
            assert refused.status_code == 400  # validation errors are 400 here
            purged = await client.request(
                "DELETE",
                "/v1/ai/race/data",
                headers=headers,
                json={"confirmation": "FORGET MY RACE TEAM DATA"},
            )
            assert purged.status_code == 204
            empty = (await client.get("/v1/ai/race/data", headers=headers)).json()
            assert empty == {"memory": [], "chat": [], "briefs": [], "proposals": []}

    asyncio.run(scenario())


def test_memories_join_the_always_on_context() -> None:
    ctx = ctx_for(
        mission(),
        memories=[
            {
                "kind": "constraint",
                "text": "Can only train before 7:00 on weekdays",
                "source": "chat",
                "source_date": "2026-10-20",
            },
        ],
    )
    text = "\n".join(core_lines(ctx))
    assert "ATHLETE MEMORY" in text
    assert "- [constraint] Can only train before 7:00 on weekdays (from chat, 2026-10-20)" in text
