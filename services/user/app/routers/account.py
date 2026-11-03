"""Account deletion (auth#7): every user-service row the athlete owns.

Race missions go first through the coordinated deletion (courses and plans in
the training service are erased behind the same fence), then every other table
keyed by the athlete. Called by the app before the auth account is deleted.
Idempotent: deleting an empty account succeeds.
"""

from typing import Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete

from app.course_coordination import delete_all
from app.db import Base
from app.deps import CurrentUserDep, SessionDep
from app.models import UserProfile
from app.routers.race_missions import CoursePeerDep

router = APIRouter(prefix="/v1", tags=["account"])


class DeleteAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmation: Literal["DELETE MY ACCOUNT"]


@router.delete("/users/me", status_code=204)
async def delete_account(
    body: DeleteAccount, current: CurrentUserDep, session: SessionDep, peer: CoursePeerDep
) -> Response:
    await delete_all(session, current.user_id, peer)
    # Children first, so foreign keys never block a delete.
    for table in reversed(Base.metadata.sorted_tables):
        if "user_id" in table.c:
            await session.execute(delete(table).where(table.c.user_id == current.user_id))
    await session.execute(delete(UserProfile).where(UserProfile.id == current.user_id))
    await session.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
