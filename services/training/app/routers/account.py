"""Account deletion (auth#7): every training row the athlete owns.

Called by the app before the account itself is deleted in the auth service.
Idempotent: deleting an empty account succeeds.
"""

from typing import Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete

from app.db import Base
from app.deps import CurrentUserDep, SessionDep

router = APIRouter(prefix="/v1", tags=["account"])


class DeleteAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmation: Literal["DELETE MY ACCOUNT"]


@router.delete("/training/account", status_code=204)
async def delete_account(
    body: DeleteAccount, current: CurrentUserDep, session: SessionDep
) -> Response:
    # Children first, so foreign keys never block a delete.
    for table in reversed(Base.metadata.sorted_tables):
        if "user_id" in table.c:
            await session.execute(delete(table).where(table.c.user_id == current.user_id))
    await session.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
