"""Mission endpoints implementing contracts/ai/openapi.yml (`/v1`)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app import missions
from app.deps import (
    BearerTokenDep,
    ContextProviderDep,
    CurrentUserDep,
    PublisherDep,
    SessionDep,
)
from app.schemas import Mission, MissionGenerationResult, MissionList, MissionPage, Pagination

router = APIRouter(prefix="/v1", tags=["missions"])


@router.get("/ai/missions/active", response_model=MissionList)
async def list_active_missions(current: CurrentUserDep, session: SessionDep) -> MissionList:
    return MissionList(items=await missions.list_active(session, user_id=current.user_id))


@router.get("/ai/missions/history", response_model=MissionPage)
async def list_mission_history(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MissionPage:
    items, total = await missions.list_history(
        session, user_id=current.user_id, limit=limit, offset=offset
    )
    return MissionPage(items=items, pagination=Pagination(limit=limit, offset=offset, total=total))


@router.post(
    "/ai/missions/generate",
    status_code=status.HTTP_201_CREATED,
    response_model=MissionGenerationResult,
)
async def generate_weekly_missions(
    current: CurrentUserDep,
    session: SessionDep,
    publisher: PublisherDep,
    provider: ContextProviderDep,
    token: BearerTokenDep,
) -> MissionGenerationResult:
    bundle = await provider.for_user(str(current.user_id), token)
    result = await missions.generate(session, publisher, user_id=current.user_id, bundle=bundle)
    await session.commit()
    return result


@router.get("/ai/missions/{mission_id}", response_model=Mission)
async def get_mission(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep
) -> Mission:
    return await missions.get(session, user_id=current.user_id, mission_id=mission_id)


@router.post("/ai/missions/{mission_id}/complete", response_model=Mission)
async def complete_mission(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, publisher: PublisherDep
) -> Mission:
    result = await missions.complete(
        session, publisher, user_id=current.user_id, mission_id=mission_id
    )
    await session.commit()
    return result


@router.post("/ai/missions/{mission_id}/skip", response_model=Mission)
async def skip_mission(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, publisher: PublisherDep
) -> Mission:
    result = await missions.skip(session, publisher, user_id=current.user_id, mission_id=mission_id)
    await session.commit()
    return result


@router.post("/ai/missions/{mission_id}/expire", response_model=Mission)
async def expire_mission(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, publisher: PublisherDep
) -> Mission:
    result = await missions.expire(
        session, publisher, user_id=current.user_id, mission_id=mission_id
    )
    await session.commit()
    return result
