"""Plan changes pause for the athlete (ADR 0010, ai#58 phase 4): the review graph
stops at an interrupt; accept applies, adjust redrafts with the athlete's words
and pauses again, dismiss closes. Nothing touches the plan before accept."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from app.race.graph import review
from tests.support import auth_header
from tests.test_race_os import FakeServices, ScriptedAI, mission, race_app


def test_adjust_redrafts_with_the_athletes_words_then_accept_applies() -> None:
    async def scenario() -> None:
        m = mission(race_date=(datetime.now(UTC).date() + timedelta(weeks=12)).isoformat())
        fake, ai = FakeServices(m), ScriptedAI()
        headers = auth_header(uuid.uuid4())
        base = f"/v1/ai/race/{m['id']}"
        async with race_app(fake, ai) as client:
            await client.post(
                f"{base}/build", headers=headers, json={"layers": ["plan"], "use_ai": False}
            )
            version = fake.plan_doc["version"] if fake.plan_doc else None

            first = (
                await client.post(
                    f"{base}/adapt", headers=headers, json={"reason": "busy week at work"}
                )
            ).json()
            assert first["status"] == "pending" and first["summary"] == "Rest two days."
            assert fake.plan_doc and fake.plan_doc["version"] == version  # nothing applied yet
            saver = await review.checkpointer()
            state = await saver.aget_tuple(review.thread(first["id"]))
            assert state is not None  # the proposal's thread is paused at review

            adjusted = await client.post(
                f"{base}/proposals/{first['id']}/adjust",
                headers=headers,
                json={"note": "Keep the Saturday long run, cut the intervals instead"},
            )
            body = adjusted.json()
            assert adjusted.status_code == 200 and body["id"] == first["id"]
            assert body["status"] == "pending" and body["summary"] == "Adjusted as you asked."
            assert body["notes"] == ["Keep the Saturday long run, cut the intervals instead"]
            assert fake.plan_doc["version"] == version  # still nothing applied

            accepted = (
                await client.post(f"{base}/proposals/{first['id']}/accept", headers=headers)
            ).json()
            assert accepted["status"] == "accepted"
            assert fake.plan_doc["version"] == (version or 0) + 1
            again = await client.post(
                f"{base}/proposals/{first['id']}/adjust", headers=headers, json={"note": "one more"}
            )
            assert again.status_code == 409 and again.json()["code"] == "proposal_decided"

    asyncio.run(scenario())


def test_dismiss_closes_and_adjust_needs_the_ai() -> None:
    async def scenario() -> None:
        m = mission(race_date=(datetime.now(UTC).date() + timedelta(weeks=12)).isoformat())
        fake, ai = FakeServices(m), ScriptedAI()
        headers = auth_header(uuid.uuid4())
        base = f"/v1/ai/race/{m['id']}"
        async with race_app(fake, ai) as client:
            await client.post(
                f"{base}/build", headers=headers, json={"layers": ["plan"], "use_ai": False}
            )
            proposal = (
                await client.post(f"{base}/adapt", headers=headers, json={"reason": "travelling"})
            ).json()

            ai.fail = "AI offline"
            offline = await client.post(
                f"{base}/proposals/{proposal['id']}/adjust",
                headers=headers,
                json={"note": "less running"},
            )
            assert offline.status_code == 503 and offline.json()["code"] == "ai_unavailable"
            assert "AI offline" in offline.json()["message"]

            dismissed = (
                await client.post(f"{base}/proposals/{proposal['id']}/reject", headers=headers)
            ).json()
            assert dismissed["status"] == "rejected"
            pending = (await client.get(f"{base}/proposals?status=pending", headers=headers)).json()
            assert pending["items"] == []

    asyncio.run(scenario())
