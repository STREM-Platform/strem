"""Race Lab and plan builds as LangGraph subgraphs (ai#58 phase 5).

Each layer is one subgraph: the engine drafts, the AI personalises inside the
engine's guardrails, and the owning service validates and stores the result.
When no model is available, or its output does not pass validation, the engine
draft is what gets saved and the result says why (`origin: engine`, `ai_reason`).
The parent graph builds the plan first, then the other layers in parallel.
"""

from __future__ import annotations

import hashlib
import json
import operator
from collections.abc import Callable
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from app.errors import AppError
from app.race.ai.client import AIUnavailable, RaceAI
from app.race.ai.personalize import personalize_layer, personalize_plan
from app.race.clients import RaceServices
from app.race.context import RaceContext
from app.race.engine.fuel import build_fuel
from app.race.engine.gear import build_gear
from app.race.engine.logistics import build_logistics
from app.race.engine.plan import build_plan
from app.race.engine.strategy import build_strategy

LAYERS = ("plan", "fuel", "gear", "logistics", "strategy")
ENGINES: dict[str, Callable[[RaceContext], dict[str, Any]]] = {
    "plan": build_plan,
    "fuel": build_fuel,
    "gear": build_gear,
    "logistics": build_logistics,
    "strategy": build_strategy,
}


class LayerState(TypedDict, total=False):
    kind: str
    engine: dict[str, Any]
    content: dict[str, Any]
    origin: str
    model: str | None
    reason: str | None
    result: dict[str, Any]


class LayerTask(TypedDict):
    kind: str


class BuildState(TypedDict, total=False):
    kinds: list[str]
    results: Annotated[list[dict[str, Any]], operator.add]


def inputs_digest(ctx: RaceContext) -> str:
    relevant = {
        "mission": {k: ctx.mission.get(k) for k in ("version", "event", "goal", "preparation")},
        "weight": (ctx.profile or {}).get("weight_kg"),
        "course": [ctx.course.distance_km, ctx.course.ascent_m] if ctx.course else None,
        "races": len(ctx.races),
        "memory": [(m["id"], m["updated_at"]) for m in ctx.memories],
    }
    return hashlib.sha256(json.dumps(relevant, sort_keys=True, default=str).encode()).hexdigest()


def check_buildable(ctx: RaceContext, kinds: list[str]) -> None:
    unknown = [k for k in kinds if k not in LAYERS]
    if unknown or not kinds:
        raise AppError(404, "unknown_layer", f"Layers are: {', '.join(LAYERS)}.")
    if ctx.mission.get("state") != "active":
        raise AppError(409, "mission_not_active", "Only an active mission can be rebuilt.")


def layer_graph(
    services: RaceServices, ai: RaceAI, ctx: RaceContext, context_text: str, use_ai: bool
) -> Any:
    """draft (engine) → personalise (AI, when available) → save (owner validates)."""

    def draft(state: LayerState) -> LayerState:
        engine = ENGINES[state["kind"]](ctx)
        status = ai.status()
        reason = status.reason if use_ai and not status.available else None
        return {"engine": engine, "content": engine, "origin": "engine", "reason": reason}

    def after_draft(state: LayerState) -> str:
        return "personalise" if use_ai and ai.status().available else "save"

    async def personalise(state: LayerState) -> LayerState:
        kind, engine = state["kind"], state["engine"]
        try:
            content = (
                await personalize_plan(ai, context_text, engine, ctx.today)
                if kind == "plan"
                else await personalize_layer(ai, kind, context_text, engine, ctx.today)
            )
        except AIUnavailable as exc:
            return {"reason": exc.reason}
        except (ValueError, KeyError, TypeError):
            return {"reason": "The AI output did not pass validation; the engine plan was kept."}
        return {"content": content, "origin": "ai", "model": ai.model}

    async def put(kind: str, body: dict[str, Any]) -> dict[str, Any]:
        if kind == "plan":
            return await services.put_plan(ctx.mission_id, body)
        return await services.put_layer(ctx.mission_id, kind, body)

    async def save(state: LayerState) -> LayerState:
        kind, origin = state["kind"], state["origin"]
        model, reason = state.get("model"), state.get("reason")
        body = {
            "content": state["content"],
            "origin": origin,
            "model": model,
            "inputs_digest": inputs_digest(ctx),
        }
        try:
            stored = await put(kind, body)
        except AppError as exc:
            if origin != "ai" or exc.status_code not in (400, 422):
                raise
            # The owner rejected the AI document: keep the athlete whole with the engine one.
            origin, model = "engine", None
            reason = "The AI output was rejected by validation; the engine version was saved."
            fallback = {**body, "content": state["engine"], "origin": origin, "model": None}
            stored = await put(kind, fallback)
        return {
            "result": {
                "kind": kind,
                "origin": origin,
                "model": model,
                "version": stored.get("version"),
                "ai_reason": reason,
                "document": stored,
            }
        }

    graph = StateGraph(LayerState)
    graph.add_node("draft", draft)
    graph.add_node("personalise", personalise)
    graph.add_node("save", save)
    graph.add_edge(START, "draft")
    graph.add_conditional_edges("draft", after_draft, ["personalise", "save"])
    graph.add_edge("personalise", "save")
    graph.add_edge("save", END)
    return graph.compile()


def mission_graph(
    services: RaceServices, ai: RaceAI, ctx: RaceContext, context_text: str, use_ai: bool
) -> Any:
    """The plan first (the other layers read it), then the rest in parallel."""
    layer = layer_graph(services, ai, ctx, context_text, use_ai)

    async def build(kind: str) -> dict[str, Any]:
        out = await layer.ainvoke({"kind": kind})
        return dict(out["result"])

    async def plan(state: BuildState) -> BuildState:
        return {"results": [await build("plan")]}

    async def other(state: LayerTask) -> BuildState:
        kind = state["kind"]
        try:
            return {"results": [await build(kind)]}
        except AppError as exc:
            return {"results": [{"kind": kind, "error": exc.code, "message": exc.message}]}

    def fan_out(state: BuildState) -> list[Send] | str:
        others = [k for k in state["kinds"] if k != "plan"]
        return [Send("layer", {"kind": k}) for k in others] or END

    def start(state: BuildState) -> list[Send] | str:
        return "plan" if "plan" in state["kinds"] else fan_out(state)

    graph = StateGraph(BuildState)
    graph.add_node("plan", plan)
    graph.add_node("layer", other, input_schema=LayerTask)
    graph.add_conditional_edges(START, start, ["plan", "layer", END])
    graph.add_conditional_edges("plan", fan_out, ["layer", END])
    graph.add_edge("layer", END)
    return graph.compile()


async def run_builds(
    services: RaceServices,
    ai: RaceAI,
    ctx: RaceContext,
    kinds: list[str],
    *,
    use_ai: bool,
    context_text: str,
) -> list[dict[str, Any]]:
    check_buildable(ctx, kinds)
    out = await mission_graph(services, ai, ctx, context_text, use_ai).ainvoke(
        {"kinds": kinds, "results": []}
    )
    return sorted(out["results"], key=lambda r: LAYERS.index(r["kind"]))
