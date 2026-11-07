"""Race OS endpoints (`/v1/ai/race/...` and `/v1/ai/enrich/...`)."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.deps import BearerTokenDep, CurrentUserDep, SessionDep, SettingsDep
from app.errors import AppError
from app.race import importer, memory, service, store
from app.race.ai import budget
from app.race.ai.client import AIUnavailable
from app.race.clients import RaceServices
from app.race.enrich import covers
from app.race.enrich.geo import search_places
from app.race.enrich.media import search_media
from app.race.plan_import import PlanImportRequest

router = APIRouter(prefix="/v1/ai", tags=["race-os"])
RaceAIDep = budget.MeteredAIDep


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


class MemoryCorrection(BaseModel):
    text: str = Field(min_length=3, max_length=400)
    kind: str | None = None


class DeleteRaceTeamData(BaseModel):
    confirmation: str = Field(pattern="^FORGET MY RACE TEAM DATA$")


class AdjustRequest(BaseModel):
    note: str = Field(min_length=3, max_length=600)


class AdaptRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=600)


class ImportCommit(BaseModel):
    content: dict[str, Any]
    # Plans with no race can belong to a season (training#18).
    season_id: uuid.UUID | None = None


class SeasonBuild(BaseModel):
    use_ai: bool = True


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@router.get("/race/status")
async def race_ai_status(
    ai: RaceAIDep, current: CurrentUserDep, settings: SettingsDep
) -> dict[str, Any]:
    state = ai.status()
    meter = budget.current_meter()
    return {
        "available": state.available,
        "model": state.model,
        "reason": state.reason,
        "daily_limit": meter.limit if meter else 0,
        "left_today": meter.left if meter else None,
        "cover_images": covers.allowed(settings, current.email),
    }


@router.post("/race/{mission_id}/build")
async def build_mission(
    mission_id: uuid.UUID,
    body: BuildRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    kinds = [k for k in service.LAYERS if k in set(body.layers)]
    results = await service.build_layers(
        services, ai, db, current.user_id, mission_id, kinds, use_ai=body.use_ai
    )
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
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    results = await service.build_layers(
        services, ai, db, current.user_id, mission_id, [kind], use_ai=body.use_ai
    )
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


@router.get("/race/{mission_id}/cockpit")
async def cockpit(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    """One call per specialist and what changed — engine-built, works offline."""
    _no_store(response)
    return await service.cockpit(services, ai, db, current.user_id, mission_id)


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


@router.post("/race/plan/import")
async def import_athlete_plan(
    body: PlanImportRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    response: Response,
) -> dict[str, Any]:
    """Read the athlete's own plan with no race attached (training-service#23)."""
    _no_store(response)
    return await importer.import_athlete_plan(services, ai, body)


@router.post("/race/plan/import/commit")
async def commit_athlete_import(
    body: ImportCommit,
    current: CurrentUserDep,
    services: ServicesDep,
    response: Response,
) -> dict[str, Any]:
    """Save the reviewed draft as the athlete's plan outside any race."""
    _no_store(response)
    return await importer.commit_athlete_import(services, body.content, body.season_id)


@router.post("/race/seasons/{season_id}/build")
async def build_season(
    season_id: uuid.UUID,
    body: SeasonBuild,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    response: Response,
) -> dict[str, Any]:
    """The race team drafts this season's plan from the athlete's evidence (training#18)."""
    _no_store(response)
    return await importer.build_season(services, ai, season_id, use_ai=body.use_ai)


@router.post("/race/{mission_id}/plan/import")
async def import_plan(
    mission_id: uuid.UUID,
    body: PlanImportRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    response: Response,
) -> dict[str, Any]:
    """Read the athlete's own plan (screenshot, PDF, CSV, text) into a draft to review."""
    _no_store(response)
    return await importer.import_plan(services, ai, mission_id, body)


@router.post("/race/{mission_id}/plan/import/commit")
async def commit_import(
    mission_id: uuid.UUID,
    body: ImportCommit,
    current: CurrentUserDep,
    services: ServicesDep,
    response: Response,
) -> dict[str, Any]:
    """Save the reviewed draft as the athlete's plan."""
    _no_store(response)
    return await importer.commit_import(services, mission_id, body.content)


@router.get("/race/{mission_id}/proposals")
async def proposals(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    services: ServicesDep,
    db: SessionDep,
    response: Response,
    status: str | None = None,
) -> dict[str, Any]:
    """The race team's proposals for this race, newest first (`?status=pending`)."""
    _no_store(response)
    await services.mission(mission_id)
    return {"items": await service.list_proposals(db, current.user_id, mission_id, status)}


@router.post("/race/{mission_id}/proposals/{proposal_id}/adjust")
async def adjust(
    mission_id: uuid.UUID,
    proposal_id: uuid.UUID,
    body: AdjustRequest,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    """The athlete's words back to the race team: a new draft that again waits for review."""
    _no_store(response)
    return await service.adjust_proposal(
        services, ai, db, current.user_id, mission_id, proposal_id, body.note.strip()
    )


@router.post("/race/{mission_id}/proposals/{proposal_id}/{decision}")
async def decide(
    mission_id: uuid.UUID,
    proposal_id: uuid.UUID,
    decision: str,
    current: CurrentUserDep,
    services: ServicesDep,
    ai: RaceAIDep,
    db: SessionDep,
    response: Response,
) -> dict[str, Any]:
    if decision not in ("accept", "reject"):
        raise AppError(404, "unknown_decision", "Use accept, reject or adjust.")
    _no_store(response)
    return await service.decide_proposal(
        services, db, current.user_id, mission_id, proposal_id, decision == "accept", ai
    )


@router.get("/race/memory")
async def list_memory(
    current: CurrentUserDep, db: SessionDep, response: Response
) -> dict[str, Any]:
    """What the race team remembers about the athlete (ai#59), newest first."""
    _no_store(response)
    return {"items": [memory.memory_out(m) for m in await memory.active(db, current.user_id)]}


@router.patch("/race/memory/{memory_id}")
async def correct_memory(
    memory_id: uuid.UUID, body: MemoryCorrection, current: CurrentUserDep, db: SessionDep
) -> dict[str, Any]:
    row = await memory.owned(db, current.user_id, memory_id)
    if row is None:
        raise AppError(404, "memory_not_found", "That memory no longer exists.")
    return memory.memory_out(await memory.correct(db, row, body.text, body.kind))


@router.delete("/race/memory/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def forget_memory(memory_id: uuid.UUID, current: CurrentUserDep, db: SessionDep) -> Response:
    row = await memory.owned(db, current.user_id, memory_id)
    if row is not None:
        await memory.forget(db, row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/race/data")
async def export_race_team_data(
    current: CurrentUserDep, db: SessionDep, response: Response
) -> dict[str, Any]:
    """Everything the race team holds about the athlete: memory, chat, briefs, proposals."""
    _no_store(response)
    rows = await db.scalars(
        select(memory.AthleteMemory)
        .where(memory.AthleteMemory.user_id == current.user_id)
        .order_by(memory.AthleteMemory.created_at)
    )
    return {
        "memory": [memory.memory_out(m) for m in rows],
        **await store.export_user(db, current.user_id),
    }


@router.delete("/race/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_race_team_data(
    body: DeleteRaceTeamData, current: CurrentUserDep, db: SessionDep
) -> Response:
    await memory.purge(db, current.user_id)
    await store.purge_user(db, current.user_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"Cache-Control": "no-store"})


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


@router.post("/enrich/covers", status_code=status.HTTP_201_CREATED)
async def generate_cover(
    body: covers.CoverRequest,
    current: CurrentUserDep,
    settings: SettingsDep,
    db: SessionDep,
    _ai: RaceAIDep,  # applies the athlete's daily AI limit to this request
) -> dict[str, Any]:
    """Paint a cover for this race with the image model (#35), allowlisted accounts only."""
    if not covers.allowed(settings, current.email):
        raise AppError(
            403, "cover_generation_restricted", "AI race covers aren't enabled for your account."
        )
    try:
        budget.spend()
    except AIUnavailable as exc:
        raise AppError(429, "ai_limit_reached", str(exc)) from exc
    prompt = covers.prompt_for(body)
    try:
        data = await covers.generate(settings, prompt)
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise AppError(
            502, "cover_generation_failed", "The image model didn't return a cover. Retry."
        ) from exc
    cover = covers.new_cover(current.user_id, settings, prompt, data)
    db.add(cover)
    await db.commit()
    return {"id": str(cover.id), "path": f"/ai/enrich/covers/{cover.id}", "model": cover.model}


@router.get("/enrich/covers/{cover_id}")
async def cover_image(cover_id: uuid.UUID, db: SessionDep) -> Response:
    """The image itself. Public like any cover photo; the id is unguessable."""
    row = await db.get(covers.GeneratedCover, cover_id)
    if row is None:
        raise AppError(404, "not_found", "No such cover.")
    return Response(
        content=row.data,
        media_type=row.media_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
