"""Race history endpoints: the athlete's previous races, owned by the caller."""

import uuid

from fastapi import APIRouter, Response, status

from app import race_history as store
from app.deps import CurrentUserDep, SessionDep
from app.schemas.race_history import (
    RaceImport,
    RaceImportResult,
    RaceResult,
    RaceResultInput,
    RaceResultList,
)

router = APIRouter(prefix="/v1/users/me/races", tags=["race-history"])


@router.get("", response_model=RaceResultList)
async def list_races(current: CurrentUserDep, session: SessionDep) -> RaceResultList:
    return RaceResultList(items=await store.list_results(session, current.user_id))


@router.post("", response_model=RaceResult, status_code=status.HTTP_201_CREATED)
async def add_race(
    body: RaceResultInput, current: CurrentUserDep, session: SessionDep
) -> RaceResult:
    return await store.create_result(session, current.user_id, body)


@router.post("/import", response_model=RaceImportResult)
async def import_races(
    body: RaceImport, current: CurrentUserDep, session: SessionDep
) -> RaceImportResult:
    return await store.import_results(session, current.user_id, body.source, body.items)


@router.put("/{race_id}", response_model=RaceResult)
async def replace_race(
    race_id: uuid.UUID, body: RaceResultInput, current: CurrentUserDep, session: SessionDep
) -> RaceResult:
    return await store.replace_result(session, current.user_id, race_id, body)


@router.delete("/{race_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_race(race_id: uuid.UUID, current: CurrentUserDep, session: SessionDep) -> Response:
    await store.delete_result(session, current.user_id, race_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
