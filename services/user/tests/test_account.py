"""Account deletion (auth#7): missions (with their coordinated course cleanup),
profiles and every other user-keyed row of the caller go; nobody else's do."""

import asyncio
import uuid

from sqlalchemy import select

from app.config import get_settings
from app.models import AthleteProfile, UserProfile
from app.routers.race_missions import get_course_peer
from tests.support import TEST_SETTINGS, user_app
from tests.test_course_coordination import Peer
from tests.test_race_missions import PAYLOAD, headers

CONFIRM = {"confirmation": "DELETE MY ACCOUNT"}


def test_delete_account_erases_the_callers_rows_only() -> None:
    async def scenario() -> None:
        async with user_app() as h:
            peer = Peer()
            peer.fail = False
            h.app.dependency_overrides[get_course_peer] = lambda: peer
            h.app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS.model_copy(
                update={"course_storage_base_url": "http://training"}
            )
            me, other = uuid.uuid4(), uuid.uuid4()
            for user in (me, other):
                assert (
                    await h.client.get("/v1/users/me", headers=headers(user))
                ).status_code == 200
                created = await h.client.post(
                    "/v1/race-missions", headers=headers(user), json=PAYLOAD
                )
                assert created.status_code == 201
                profile = await h.client.put(
                    "/v1/users/me/athlete-profile", headers=headers(user), json={"weight_kg": 70}
                )
                assert profile.status_code == 200

            refused = await h.client.request(
                "DELETE", "/v1/users/me", headers=headers(me), json={"confirmation": "no"}
            )
            assert refused.status_code in (400, 422)
            gone = await h.client.request(
                "DELETE", "/v1/users/me", headers=headers(me), json=CONFIRM
            )
            assert gone.status_code == 204

            async with h.sessionmaker() as session:
                assert await session.get(UserProfile, me) is None
                assert await session.get(UserProfile, other) is not None
                owners = (await session.scalars(select(AthleteProfile.user_id))).all()
                assert owners == [other]
            mine = await h.client.get("/v1/race-missions", headers=headers(me))
            theirs = await h.client.get("/v1/race-missions", headers=headers(other))
            assert mine.json()["items"] == [] and len(theirs.json()["items"]) == 1

            again = await h.client.request(
                "DELETE", "/v1/users/me", headers=headers(me), json=CONFIRM
            )
            assert again.status_code == 204

    asyncio.run(scenario())
