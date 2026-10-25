"""Race OS endpoints (`/v1/ai/race/...` and `/v1/ai/enrich/...`)."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field

from app.deps import BearerTokenDep, CurrentUserDep, SessionDep
from app.race import service, store
from app.race.ai.client import RaceAI, get_race_ai
from app.race.clients import RaceServices
from app.race.enrich.geo import search_places
from app.race.enrich.media import search_media

router = APIRouter(prefix="/v1/ai", tags=["race-os"])
RaceAIDep = Annotated[RaceAI, Depends(get_race_ai)]


def get_race_services(token: BearerTokenDep) -> RaceServices:
    return RaceServices.for_token(token)


ServicesDep = Annotated[RaceServices, Depends(get_race_services)]


class BuildRequest(BaseModel):
    layers: list[str] = Field(default_factory=lambda: list(service.LAYERS), max_length=5)
    use_ai: bool = True


class LayerBuildRequest(BaseModel):
    use_ai: bool = True


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AdaptRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=600)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@router.get("/race/status")
async def race_ai_status(ai: RaceAIDep, current: CurrentUserDep) -> dict[str, Any]:
    state = ai.status()
    return {"available": state.available, "model": state.model, "reason": state.reason}


@router.post("/race/{mission_id}/build")
async def build_mission(
    mission_id: uuid.UUID,
    body: BuildRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    response: Response,
) -> dict[str, Any]:
    kinds = [k for k in service.LAYERS if k in set(body.layers)]
    results = await service.build_layers(services, ai, mission_id, kinds, use_ai=body.use_ai)
    state = ai.status()
    _no_store(response)
    return {
        "results": results,
        "ai": {"available": state.available, "model": state.model, "reason": state.reason},
    }


@router.post("/race/{mission_id}/layers/{kind}/build")
async def build_one(
    mission_id: uuid.UUID,
    kind: str,
    body: LayerBuildRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    response: Response,
) -> dict[str, Any]:
    results = await service.build_layers(services, ai, mission_id, [kind], use_ai=body.use_ai)
    _no_store(response)
    return results[0]


@router.get("/race/{mission_id}/brief")
async def brief(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
    refresh: bool = False,
) -> dict[str, Any]:
    _no_store(response)
    return await service.daily_brief(services, ai, db, current.user_id, mission_id, refresh=refresh)


@router.get("/race/{mission_id}/knowledge")
async def knowledge(
    mission_id: uuid.UUID, current: CurrentUserDep, services: ServicesDep, response: Response
) -> dict[str, Any]:
    _no_store(response)
    return await service.knowledge(services, mission_id)


@router.get("/race/{mission_id}/conditions")
async def conditions(
    mission_id: uuid.UUID, current: CurrentUserDep, services: ServicesDep, response: Response
) -> dict[str, Any]:
    ctx = await service.load_context(services, mission_id)
    _no_store(response)
    return {"conditions": ctx.conditions}


@router.get("/race/{mission_id}/chat")
async def chat_history(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    await services.mission(mission_id)  # ownership check through the owning service
    rows = await store.history(db, current.user_id, mission_id, limit=100)
    state = ai.status()
    _no_store(response)
    return {
        "items": [
            {
                "id": str(row.id),
                "role": row.role,
                "content": row.content,
                "model": row.model,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
        "ai": {"available": state.available, "model": state.model, "reason": state.reason},
    }


@router.post("/race/{mission_id}/chat")
async def chat(
    mission_id: uuid.UUID,
    body: ChatRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    _no_store(response)
    return await service.chat(services, ai, db, current.user_id, mission_id, body.message.strip())


@router.delete("/race/{mission_id}/chat", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat(
    mission_id: uuid.UUID, current: CurrentUserDep, services: ServicesDep, db: SessionDep
) -> Response:
    await services.mission(mission_id)
    await store.clear_history(db, current.user_id, mission_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/race/{mission_id}/adapt")
async def adapt(
    mission_id: uuid.UUID,
    body: AdaptRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    _no_store(response)
    return await service.propose_adaptation(
        services, ai, db, current.user_id, mission_id, body.reason.strip()
    )


@router.post("/race/{mission_id}/proposals/{proposal_id}/{decision}")
async def decide(
    mission_id: uuid.UUID,
    proposal_id: uuid.UUID,
    decision: str,
    current: CurrentUserDep,
    services: ServicesDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    if decision not in ("accept", "reject"):
        from app.errors import AppError

        raise AppError(404, "unknown_decision", "Use accept or reject.")
    _no_store(response)
    return await service.decide_proposal(
        services, db, current.user_id, mission_id, proposal_id, decision == "accept"
    )


@router.post("/race/history/import-strava")
async def import_strava(current: CurrentUserDep, services: ServicesDep) -> dict[str, Any]:
    return await service.import_strava_races(services)


@router.get("/enrich/places")
async def places(
    current: CurrentUserDep, q: Annotated[str, Query(min_length=2, max_length=120)]
) -> dict[str, Any]:
    return {"items": await search_places(q)}


@router.get("/enrich/photos")
async def photos(
    current: CurrentUserDep,
    event: Annotated[str | None, Query(max_length=160)] = None,
    location: Annotated[str | None, Query(max_length=160)] = None,
    sport: Annotated[str | None, Query(max_length=40)] = None,
) -> dict[str, Any]:
    return {"items": await search_media(event, location, sport)}
