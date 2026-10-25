import asyncio
import uuid

from app.config import get_settings
from app.course_coordination import CoursePeer, CourseState
from app.errors import AppError
from app.routers.race_missions import get_course_peer
from tests.support import TEST_SETTINGS, user_app
from tests.test_race_missions import PAYLOAD, headers


class Peer(CoursePeer):
    fail = True
    generations: list[int]

    def __init__(self) -> None:
        super().__init__(TEST_SETTINGS, "test")
        self.generations = []

    async def purge(self, user_id: uuid.UUID, generation: int) -> None:
        self.generations.append(generation)
        if self.fail:
            raise AppError(503, "course_service_unavailable", "Retry cleanup")

    async def export(self) -> list[dict[str, object]]:
        return [{"content_base64": "test-export"}]


def test_durable_retryable_cleanup_blocks_writes_and_exports_until_complete() -> None:
    async def scenario() -> None:
        async with user_app() as h:
            peer = Peer()
            h.app.dependency_overrides[get_course_peer] = lambda: peer
            h.app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS.model_copy(
                update={"course_storage_base_url": "http://training"}
            )
            owner = uuid.uuid4()
            auth = headers(owner)
            created = await h.client.post("/v1/race-missions", headers=auth, json=PAYLOAD)
            path = f"/v1/race-missions/{created.json()['id']}/course-access"
            assert (await h.client.get(path, headers=headers(uuid.uuid4()))).status_code == 404
            assert (await h.client.get(path, headers=auth)).json() == {
                "generation": 0,
                "state": "active",
            }
            exported = await h.client.get("/v1/race-missions/data", headers=auth)
            assert exported.json()["courses"] == [{"content_base64": "test-export"}]
            deletion = {"confirmation": "DELETE MY RACE MISSIONS"}
            failed = await h.client.request(
                "DELETE", "/v1/race-missions/data", headers=auth, json=deletion
            )
            assert failed.status_code == 503
            async with h.sessionmaker() as session:
                state = await session.get(CourseState, owner)
                assert state and state.deletion_pending and state.generation == 1
            assert (await h.client.get(path, headers=auth)).status_code == 409
            assert (await h.client.get("/v1/race-missions/data", headers=auth)).status_code == 409
            assert (
                await h.client.post("/v1/race-missions", headers=auth, json=PAYLOAD)
            ).status_code == 409
            # The original mission remains until downstream erasure is confirmed.
            assert (await h.client.get("/v1/race-missions/active", headers=auth)).status_code == 200
            peer.fail = False
            done = await h.client.request(
                "DELETE", "/v1/race-missions/data", headers=auth, json=deletion
            )
            assert done.status_code == 204
            assert peer.generations == [1, 1]
            assert (await h.client.get("/v1/race-missions/active", headers=auth)).status_code == 404
            next_mission = await h.client.post("/v1/race-missions", headers=auth, json=PAYLOAD)
            next_path = f"/v1/race-missions/{next_mission.json()['id']}/course-access"
            assert (await h.client.get(next_path, headers=auth)).json()["generation"] == 1

    asyncio.run(scenario())
