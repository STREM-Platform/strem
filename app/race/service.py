"""Race OS orchestration: context -> engine -> (AI) -> owning service.

Every build returns who produced the result (`origin`: engine or ai) and, when
the AI could not be used, the honest reason. Nothing is written as `ai` unless
the model actually produced it.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppError
from app.race import store
from app.race.ai.client import AIUnavailable, RaceAI
from app.race.ai.personalize import (
    ai_adapt,
    ai_brief,
    personalize_layer,
    personalize_plan,
)
from app.race.ai.prompts import RACE_TEAM
from app.race.clients import RaceServices
from app.race.context import RaceContext, assemble, render
from app.race.engine import adapt as engine_adapt
from app.race.engine.brief import build_brief
from app.race.engine.fuel import build_fuel
from app.race.engine.gear import build_gear
from app.race.engine.logistics import build_logistics
from app.race.engine.plan import build_plan
from app.race.engine.strategy import build_strategy
from app.race.enrich.conditions import race_conditions

LAYERS = ("plan", "fuel", "gear", "logistics", "strategy")
ENGINES = {
    "plan": build_plan,
    "fuel": build_fuel,
    "gear": build_gear,
    "logistics": build_logistics,
    "strategy": build_strategy,
}


async def conditions_for(ctx: RaceContext) -> dict[str, Any] | None:
    event = ctx.event
    high = ctx.course.highest_m if ctx.course else None
    return await race_conditions(
        event.get("latitude"), event.get("longitude"), ctx.race_date, ctx.today, high
    )


async def load_context(services: RaceServices, mission_id: uuid.UUID) -> RaceContext:
    return await assemble(services, mission_id, conditions=conditions_for)


def inputs_digest(ctx: RaceContext) -> str:
    relevant = {
        "mission": {k: ctx.mission.get(k) for k in ("version", "event", "goal", "preparation")},
        "weight": (ctx.profile or {}).get("weight_kg"),
        "course": [ctx.course.distance_km, ctx.course.ascent_m] if ctx.course else None,
        "races": len(ctx.races),
    }
    return hashlib.sha256(json.dumps(relevant, sort_keys=True, default=str).encode()).hexdigest()


async def build_layer(
    services: RaceServices,
    ai: RaceAI,
    ctx: RaceContext,
    kind: str,
    *,
    use_ai: bool = True,
    context_text: str | None = None,
) -> dict[str, Any]:
    if kind not in LAYERS:
        raise AppError(404, "unknown_layer", f"Layers are: {', '.join(LAYERS)}.")
    if ctx.mission.get("state") != "active":
        raise AppError(409, "mission_not_active", "Only an active mission can be rebuilt.")
    engine = ENGINES[kind](ctx)
    origin, model, reason = "engine", None, None
    content = engine
    status = ai.status()
    if use_ai and status.available:
        text = context_text or render(ctx)
        try:
            if kind == "plan":
                content = await personalize_plan(ai, text, engine, ctx.today)
            else:
                content = await personalize_layer(ai, kind, text, engine, ctx.today)
            origin, model = "ai", ai.model
        except AIUnavailable as exc:
            reason = exc.reason
        except (ValueError, KeyError, TypeError):
            reason = "The AI output did not pass validation; the engine plan was kept."
    elif use_ai:
        reason = status.reason
    body = {
        "content": content,
        "origin": origin,
        "model": model,
        "inputs_digest": inputs_digest(ctx),
    }
    try:
        stored = (
            await services.put_plan(ctx.mission_id, body)
            if kind == "plan"
            else await services.put_layer(ctx.mission_id, kind, body)
        )
    except AppError as exc:
        if origin == "ai" and exc.status_code in (400, 422):
            # The owner rejected the AI document: keep the athlete whole with the engine one.
            body = {**body, "content": engine, "origin": "engine", "model": None}
            reason = "The AI output was rejected by validation; the engine version was saved."
            stored = (
                await services.put_plan(ctx.mission_id, body)
                if kind == "plan"
                else await services.put_layer(ctx.mission_id, kind, body)
            )
            origin, model = "engine", None
        else:
            raise
    return {
        "kind": kind,
        "origin": origin,
        "model": model,
        "version": stored.get("version"),
        "ai_reason": reason,
        "document": stored,
    }


async def build_layers(
    services: RaceServices,
    ai: RaceAI,
    mission_id: uuid.UUID,
    kinds: list[str],
    *,
    use_ai: bool = True,
) -> list[dict[str, Any]]:
    ctx = await load_context(services, mission_id)
    text = render(ctx)
    results: list[dict[str, Any]] = []
    if "plan" in kinds:
        results.append(
            await build_layer(services, ai, ctx, "plan", use_ai=use_ai, context_text=text)
        )
    others = [k for k in kinds if k != "plan"]
    built = await asyncio.gather(
        *(build_layer(services, ai, ctx, k, use_ai=use_ai, context_text=text) for k in others),
        return_exceptions=True,
    )
    for kind, result in zip(others, built, strict=False):
        if isinstance(result, BaseException):
            if isinstance(result, AppError):
                results.append({"kind": kind, "error": result.code, "message": result.message})
                continue
            raise result
        results.append(result)
    return results


def _brief_digest(ctx: RaceContext) -> str:
    relevant = {
        "today": ctx.today.isoformat(),
        "plan": (ctx.plan or {}).get("version"),
        "totals": (ctx.progress or {}).get("totals"),
        "checkin": ctx.checkins[0] if ctx.checkins else None,
        "layers": {k: v.get("version") for k, v in ctx.layers.items()},
        "mission": ctx.mission.get("version"),
        "sessions": [s.get("id") for s in ctx.sessions[:3]],
    }
    return hashlib.sha256(json.dumps(relevant, sort_keys=True, default=str).encode()).hexdigest()


async def daily_brief(
    services: RaceServices,
    ai: RaceAI,
    db: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    *,
    refresh: bool = False,
) -> dict[str, Any]:
    ctx = await load_context(services, mission_id)
    engine = build_brief(ctx)
    digest = _brief_digest(ctx)
    if not refresh:
        cached = await store.cached_brief(db, user_id, mission_id, ctx.today, digest)
        if cached is not None:
            return {
                **cached.content,
                "origin": cached.origin,
                "model": cached.model,
                "ai_reason": None,
            }
    status = ai.status()
    if not status.available:
        return {
            **engine,
            "origin": "engine",
            "model": None,
            "ai_reason": status.reason,
            "conditions": ctx.conditions,
        }
    try:
        brief = await ai_brief(ai, render(ctx), engine)
    except AIUnavailable as exc:
        return {
            **engine,
            "origin": "engine",
            "model": None,
            "ai_reason": exc.reason,
            "conditions": ctx.conditions,
        }
    except (ValueError, KeyError, TypeError):
        return {
            **engine,
            "origin": "engine",
            "model": None,
            "ai_reason": "AI brief failed validation.",
            "conditions": ctx.conditions,
        }
    brief["conditions"] = ctx.conditions
    await store.save_brief(db, user_id, mission_id, ctx.today, digest, "ai", ai.model, brief)
    return {**brief, "origin": "ai", "model": ai.model, "ai_reason": None}


async def chat(
    services: RaceServices,
    ai: RaceAI,
    db: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    message: str,
) -> dict[str, Any]:
    status = ai.status()
    if not status.available:
        return {"available": False, "reason": status.reason, "message": None}
    ctx = await load_context(services, mission_id)
    past = await store.history(db, user_id, mission_id, limit=20)
    turns = [
        {"role": row.role, "content": row.content}
        for row in past
        if row.role in ("user", "assistant")
    ]
    turns.append({"role": "user", "content": message})
    try:
        answer = await ai.complete_text(rules=RACE_TEAM, context=render(ctx), messages=turns)
    except AIUnavailable as exc:
        return {"available": False, "reason": exc.reason, "message": None}
    asked = datetime.now(UTC)
    await store.add_message(db, user_id, mission_id, "user", message, created_at=asked)
    reply = await store.add_message(
        db,
        user_id,
        mission_id,
        "assistant",
        answer,
        ai.model,
        created_at=asked + timedelta(milliseconds=1),
    )
    await db.commit()
    return {
        "available": True,
        "reason": None,
        "message": {
            "id": str(reply.id),
            "role": "assistant",
            "content": reply.content,
            "model": reply.model,
            "created_at": reply.created_at.isoformat(),
        },
    }


def _guard_ai_changes(window: list[dict[str, Any]], adaptation: Any) -> list[dict[str, Any]]:
    by_id = {s["id"]: s for s in window}
    changes = []
    for change in adaptation.changes:
        session = by_id.get(change.session_id)
        if session is None or session["kind"] == "race":
            continue
        before = {
            k: session.get(k)
            for k in ("title", "duration_minutes", "distance_km", "intensity", "kind")
        }
        if change.change in ("rest", "remove"):
            after = {"title": "Rest", "duration_minutes": 0, "kind": "rest", "intensity": "rest"}
        else:
            after = dict(before)
            if change.title:
                after["title"] = change.title[:120]
            if change.intensity:
                after["intensity"] = change.intensity
            base = session.get("duration_minutes") or 0
            if change.duration_minutes is not None and base:
                after["duration_minutes"] = int(min(change.duration_minutes, base * 1.1))
            base_km = session.get("distance_km")
            if change.distance_km is not None and base_km:
                after["distance_km"] = round(min(change.distance_km, base_km * 1.1), 1)
        changes.append(
            {
                "session_id": session["id"],
                "date": session["date"],
                "change": change.change,
                "before": before,
                "after": after,
                "reason": change.reason[:300],
            }
        )
    return changes


async def propose_adaptation(
    services: RaceServices,
    ai: RaceAI,
    db: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    reason: str,
) -> dict[str, Any]:
    ctx = await load_context(services, mission_id)
    if not ctx.plan:
        raise AppError(409, "plan_missing", "Build the training plan before adapting it.")
    plan = ctx.plan["content"]
    proposal = engine_adapt.adapt(plan, reason, ctx.today)
    origin, model, ai_reason = "engine", None, None
    status = ai.status()
    if status.available:
        window = engine_adapt.window(plan, ctx.today)
        try:
            adaptation = await ai_adapt(ai, render(ctx), reason, window)
            changes = _guard_ai_changes(window, adaptation)
            proposal = {
                "category": proposal["category"],
                "summary": adaptation.summary[:800],
                "safety_note": adaptation.safety_note or proposal.get("safety_note"),
                "changes": changes,
            }
            origin, model = "ai", ai.model
        except AIUnavailable as exc:
            ai_reason = exc.reason
        except (ValueError, KeyError, TypeError):
            ai_reason = "The AI proposal failed validation; showing the engine's proposal."
    else:
        ai_reason = status.reason
    row = store.RaceProposal(
        user_id=user_id,
        mission_id=mission_id,
        status="pending",
        origin=origin,
        model=model,
        plan_version=ctx.plan.get("version"),
        content={**proposal, "reason": reason},
        created_at=datetime.now(UTC),
    )
    db.add(row)
    await db.commit()
    return proposal_out(row, ai_reason)


def proposal_out(row: store.RaceProposal, ai_reason: str | None = None) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "status": row.status,
        "origin": row.origin,
        "model": row.model,
        "plan_version": row.plan_version,
        "ai_reason": ai_reason,
        "created_at": row.created_at.isoformat(),
        **row.content,
    }


async def decide_proposal(
    services: RaceServices,
    db: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    proposal_id: uuid.UUID,
    accept: bool,
) -> dict[str, Any]:
    row = await db.get(store.RaceProposal, proposal_id)
    if row is None or row.user_id != user_id or row.mission_id != mission_id:
        raise AppError(404, "proposal_not_found", "Proposal not found.")
    if row.status != "pending":
        raise AppError(409, "proposal_decided", f"This proposal was already {row.status}.")
    if accept:
        plan = await services.plan(mission_id)
        if plan is None:
            raise AppError(409, "plan_missing", "The plan no longer exists.")
        if plan.get("version") != row.plan_version:
            row.status = "expired"
            await db.commit()
            raise AppError(
                409, "proposal_stale", "The plan changed since this proposal; ask again."
            )
        content = engine_adapt.apply_changes(plan["content"], row.content.get("changes") or [])
        await services.put_plan(
            mission_id,
            {
                "content": content,
                "origin": row.origin,
                "model": row.model,
                "inputs_digest": plan.get("inputs_digest"),
            },
        )
    row.status = "accepted" if accept else "rejected"
    row.decided_at = datetime.now(UTC)
    await db.commit()
    return proposal_out(row)


async def knowledge(services: RaceServices, mission_id: uuid.UUID) -> dict[str, Any]:
    """What the race team can see — the athlete's view of their own context."""
    ctx = await load_context(services, mission_id)
    weeks = ctx.evidence_weeks()
    return {
        "mission": {"name": ctx.event.get("name"), "version": ctx.mission.get("version")},
        "sources": [{"label": s.get("label"), "last": s.get("last")} for s in ctx.sources],
        "recent_sessions": sum((w.get("volume") or {}).get("sessions", 0) for w in weeks),
        "recent_hours": round(sum((w.get("volume") or {}).get("hours", 0) for w in weeks), 1),
        "races_in_history": len(ctx.races),
        "race_activities_found": len(ctx.race_sessions),
        "checkins_recent": len(ctx.checkins),
        "has_course": ctx.course is not None,
        "has_profile": bool((ctx.profile or {}).get("is_started")),
        "has_weight": ctx.weight_kg is not None,
        "plan": {"version": ctx.plan.get("version"), "origin": ctx.plan.get("origin")}
        if ctx.plan
        else None,
        "layers": {
            k: {"version": v.get("version"), "origin": v.get("origin")}
            for k, v in ctx.layers.items()
        },
        "conditions": ctx.conditions,
        "missing": [
            label
            for present, label in (
                (bool(ctx.sources) or bool(ctx.sessions), "Connected sources or logged sessions"),
                (ctx.course is not None, "Course GPX"),
                (ctx.weight_kg is not None, "Body weight (for fueling grams)"),
                (bool(ctx.races), "Race history"),
                (bool(ctx.prep), "Preparation intake (availability, current volume)"),
                (ctx.event.get("latitude") is not None, "Race location (for conditions)"),
            )
            if not present
        ],
    }


STRAVA_SPORT = {
    "trail_running": "trail_running",
    "running": "road_running",
    "cycling": "cycling",
    "swimming": "swimming",
    "hiking": "hiking",
    "skiing": "nordic_skiing",
    "rowing": "rowing",
}


async def import_strava_races(services: RaceServices) -> dict[str, Any]:
    sessions = await services.race_sessions()
    items = []
    for s in sessions:
        if s.get("source") != "strava":
            continue
        day = str(s.get("logged_at", ""))[:10]
        try:
            date.fromisoformat(day)
        except ValueError:
            continue
        items.append(
            {
                "external_id": str(s["id"]),
                "name": (s.get("title") or f"Race on {day}")[:160],
                "race_date": day,
                "sport": STRAVA_SPORT.get(str(s.get("session_type")), "custom"),
                "distance_km": s.get("distance_km") or None,
                "elevation_gain_m": s.get("elevation_m") or None,
                "finish_minutes": s.get("elapsed_minutes") or s.get("duration_minutes"),
                "status": "finished",
            }
        )
    if not items:
        return {"created": 0, "updated": 0, "found": 0}
    result = await services.import_races(items[:200]) or {}
    return {
        "created": result.get("created", 0),
        "updated": result.get("updated", 0),
        "found": len(items),
    }
