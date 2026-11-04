"""Account deletion (auth#7): every training row of the caller goes, nobody else's."""

import asyncio
import uuid

from tests.support import auth_header, training_app

CONFIRM = {"confirmation": "DELETE MY ACCOUNT"}


def test_delete_account_removes_only_the_callers_training_data() -> None:
    async def scenario() -> None:
        async with training_app() as harness:
            client = harness.client
            me, other = auth_header(uuid.uuid4()), auth_header(uuid.uuid4())
            for headers in (me, other):
                logged = await client.post(
                    "/v1/training/sessions",
                    headers=headers,
                    json={"session_type": "running", "duration_minutes": 40},
                )
                assert logged.status_code == 201
                checkin = await client.put(
                    "/v1/training/checkins",
                    headers=headers,
                    json={"day": "2026-11-03", "energy": 4},
                )
                assert checkin.status_code in (200, 201)

            refused = await client.request(
                "DELETE", "/v1/training/account", headers=me, json={"confirmation": "yes"}
            )
            assert refused.status_code in (400, 422)

            gone = await client.request("DELETE", "/v1/training/account", headers=me, json=CONFIRM)
            assert gone.status_code == 204
            mine = (await client.get("/v1/training/sessions", headers=me)).json()
            theirs = (await client.get("/v1/training/sessions", headers=other)).json()
            assert mine["items"] == [] and len(theirs["items"]) == 1
            assert (await client.get("/v1/training/checkins", headers=me)).json()["items"] == []

            again = await client.request("DELETE", "/v1/training/account", headers=me, json=CONFIRM)
            assert again.status_code == 204

    asyncio.run(scenario())
