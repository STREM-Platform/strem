"""AI personalization of engine output, inside the engine's safety envelope.

The model tailors wording, priorities and athlete-specific items; numbers that
matter for safety stay bounded by the engine (fuel targets, load changes,
cutoff splits, deadlines). Anything the guardrails cannot reconcile reverts to
the engine's value.
"""

from __future__ import annotations

import json
import re
from datetime import date
from typing import Any

from app.race.ai.client import RaceAI, strict_schema
from app.race.ai.prompts import (
    BRIEF_PROMPT,
    RACE_TEAM,
    adapt_prompt,
    layer_prompt,
    plan_prompt,
)
from app.race.ai.schemas import AIAdaptation, AIBrief, AILayer, AIPlan

_SLUG = re.compile(r"[^a-z0-9_-]+")
_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def _slug(value: str, used: set[str]) -> str:
    base = _SLUG.sub("-", value.lower()).strip("-")[:56] or "item"
    candidate, n = base, 2
    while candidate in used:
        candidate, n = f"{base}-{n}", n + 1
    used.add(candidate)
    return candidate


_VALID_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _unique_id(proposed: str | None, fallback: str, used: set[str]) -> str:
    """Keep a model-proposed id when it is a valid, unused slug; else derive one."""
    if proposed and _VALID_ID.match(proposed) and proposed not in used:
        used.add(proposed)
        return proposed
    return _slug(fallback, used)


def _numbers(text: str) -> list[float]:
    return [float(x) for x in _NUMBER.findall(text or "")]


def _within(ai_value: str, engine_value: str, tolerance: float) -> bool:
    ai_nums, engine_nums = _numbers(ai_value), _numbers(engine_value)
    if not engine_nums:
        return True
    if not ai_nums:
        return False
    hi = max(engine_nums) * (1 + tolerance)
    lo = min(engine_nums) * (1 - tolerance)
    return all(lo <= value <= hi for value in ai_nums)


def _layer_from_ai(ai_layer: AILayer, today: date) -> dict[str, Any]:
    used_sections: set[str] = set()
    used_items: set[str] = set()
    sections = []
    for section in ai_layer.sections[:20]:
        items = []
        for item in section.items[:120]:
            due = item.due_date
            if due:
                try:
                    due = max(date.fromisoformat(due), today).isoformat()
                except ValueError:
                    due = None
            row: dict[str, Any] = {
                "id": _unique_id(item.id, item.title, used_items),
                "title": item.title[:160],
                "priority": item.priority,
            }
            for key in ("detail", "when", "quantity", "tag"):
                value = getattr(item, key)
                if value:
                    row[key] = str(value)[
                        : {"detail": 1200, "when": 80, "quantity": 60, "tag": 40}[key]
                    ]
            if due:
                row["due_date"] = due
            if item.values:
                row["values"] = {
                    v.key[:40]: (v.value[:200] if isinstance(v.value, str) else v.value)
                    for v in item.values[:16]
                    if v.key
                }
            items.append(row)
        sid = _unique_id(section.id, section.title, used_sections)
        sections.append(
            {
                "id": sid,
                "title": section.title[:120],
                "kind": section.kind,
                **({"description": section.description[:800]} if section.description else {}),
                **({"columns": section.columns[:12]} if section.columns else {}),
                "items": items,
            }
        )
    return {
        "headline": ai_layer.headline[:200],
        "summary": ai_layer.summary[:2400],
        "metrics": [
            {
                "label": m.label[:60],
                "value": m.value[:40],
                **({"unit": m.unit[:20]} if m.unit else {}),
                **({"note": m.note[:240]} if m.note else {}),
            }
            for m in ai_layer.metrics[:12]
        ],
        "sections": sections,
        "warnings": [w[:400] for w in ai_layer.warnings[:12]],
        "assumptions": [
            a[:400] for a in (ai_layer.assumptions + ai_layer.personalization_notes)[:16]
        ],
        "sources": [],
    }


def apply_layer_guardrails(kind: str, engine: dict[str, Any], ai: dict[str, Any]) -> dict[str, Any]:
    result = dict(ai)
    # 1. Safety warnings from the engine are never dropped.
    warnings = list(result.get("warnings") or [])
    for warning in engine.get("warnings") or []:
        if warning not in warnings:
            warnings.append(warning)
    result["warnings"] = warnings[:12]
    # 2. Key metrics stay within tolerance of the engine (fuel/strategy numbers).
    engine_metrics = {m["label"].lower(): m for m in engine.get("metrics") or []}
    tolerance = 0.3 if kind == "fuel" else 0.15
    metrics = []
    seen = set()
    for metric in result.get("metrics") or []:
        label = metric["label"].lower()
        base = engine_metrics.get(label)
        if (
            base
            and kind in ("fuel", "strategy")
            and not _within(metric["value"], base["value"], tolerance)
        ):
            metric = {**base, "note": metric.get("note") or base.get("note")}
        metrics.append({k: v for k, v in metric.items() if v is not None})
        seen.add(label)
    for label, base in engine_metrics.items():
        if label not in seen and kind in ("fuel", "strategy"):
            metrics.append(base)
    result["metrics"] = metrics[:12]
    # 3. Engine table values (intake per hour, pacing splits) are authoritative.
    engine_items = {
        item["id"]: item
        for section in engine.get("sections") or []
        for item in section.get("items") or []
    }
    ai_ids = {
        item["id"]
        for section in result.get("sections") or []
        for item in section.get("items") or []
    }
    for section in result.get("sections") or []:
        for item in section.get("items") or []:
            base = engine_items.get(item["id"])
            if base and base.get("values") and kind in ("fuel", "strategy"):
                item["values"] = base["values"]
    # 4. Critical engine items cannot silently disappear.
    for section in engine.get("sections") or []:
        missing = [
            i
            for i in section.get("items") or []
            if i.get("priority") == "critical" and i["id"] not in ai_ids
        ]
        if not missing:
            continue
        target = next((s for s in result["sections"] if s["id"] == section["id"]), None)
        if target is None:
            target = {k: v for k, v in section.items() if k != "items"} | {"items": []}
            result["sections"].append(target)
        target["items"].extend(missing)
    result["sources"] = [
        "STREM race engine baseline",
        "Personalized by the AI race team from your context",
    ]
    return result


async def personalize_layer(
    ai: RaceAI, kind: str, context: str, engine: dict[str, Any], today: date
) -> dict[str, Any]:
    raw = await ai.complete_json(
        rules=RACE_TEAM,
        context=context,
        prompt=layer_prompt(kind, json.dumps(engine, ensure_ascii=False)),
        schema=strict_schema(AILayer.model_json_schema()),
        max_tokens=16000,
        effort="medium",
    )
    layer = _layer_from_ai(AILayer.model_validate(raw), today)
    return apply_layer_guardrails(kind, engine, layer)


def _plan_view(plan: dict[str, Any]) -> dict[str, Any]:
    """A compact plan for the prompt: weeks with session essentials."""
    return {
        "headline": plan.get("headline"),
        "start_date": plan.get("start_date"),
        "race_date": plan.get("race_date"),
        "phases": plan.get("phases"),
        "weeks": [
            {
                "index": w["index"],
                "phase": w["phase"],
                "focus": w["focus"],
                "target_hours": w.get("target_hours"),
                "sessions": [
                    {
                        k: s.get(k)
                        for k in (
                            "id",
                            "date",
                            "sport",
                            "kind",
                            "title",
                            "duration_minutes",
                            "distance_km",
                            "elevation_m",
                            "intensity",
                            "key",
                        )
                        if s.get(k) is not None
                    }
                    for s in w.get("sessions") or []
                    if s.get("kind") != "rest"
                ],
            }
            for w in plan.get("weeks") or []
        ],
    }


def _bounded(
    value: float | int | None, base: float | int | None, tolerance: float
) -> float | int | None:
    if value is None or base is None:
        return base
    lo, hi = base * (1 - tolerance), base * (1 + tolerance)
    clamped = min(max(value, lo), hi)
    return type(base)(round(clamped, 1)) if isinstance(base, float) else int(round(clamped))


def apply_plan_edits(engine: dict[str, Any], ai_plan: AIPlan, today: date) -> dict[str, Any]:
    plan: dict[str, Any] = json.loads(json.dumps(engine))
    plan["headline"] = ai_plan.headline[:200] or plan["headline"]
    plan["summary"] = ai_plan.summary[:2400] or plan["summary"]
    if ai_plan.principles:
        plan["principles"] = [p[:400] for p in ai_plan.principles[:10]]
    plan["warnings"] = (
        list(engine.get("warnings") or [])
        + [w[:400] for w in ai_plan.warnings if w not in engine.get("warnings", [])]
    )[:12]
    plan["assumptions"] = (
        list(engine.get("assumptions") or []) + [a[:400] for a in ai_plan.assumptions]
    )[:16]
    notes = {n.index: n for n in ai_plan.week_notes}
    edits = {e.id: e for e in ai_plan.session_edits}
    for week in plan["weeks"]:
        note = notes.get(week["index"])
        if note and note.focus:
            week["focus"] = note.focus[:240]
        if note and note.notes:
            week["notes"] = note.notes[:600]
        for session in week["sessions"]:
            edit = edits.get(session["id"])
            if not edit or session["date"] < today.isoformat():
                continue
            for key, limit in (
                ("title", 120),
                ("purpose", 600),
                ("fueling", 300),
                ("terrain", 120),
            ):
                value = getattr(edit, key)
                if value:
                    session[key] = value[:limit]
            if edit.structure:
                session["structure"] = [step[:200] for step in edit.structure[:12]]
            if session["kind"] == "race":
                continue
            if edit.duration_minutes is not None and session.get("duration_minutes"):
                session["duration_minutes"] = _bounded(
                    edit.duration_minutes, session["duration_minutes"], 0.25
                )
            if edit.distance_km is not None and session.get("distance_km"):
                session["distance_km"] = _bounded(edit.distance_km, session["distance_km"], 0.25)
            if edit.elevation_m is not None and session.get("elevation_m"):
                session["elevation_m"] = _bounded(edit.elevation_m, session["elevation_m"], 0.4)
    return plan


async def personalize_plan(
    ai: RaceAI, context: str, engine: dict[str, Any], today: date
) -> dict[str, Any]:
    raw = await ai.complete_json(
        rules=RACE_TEAM,
        context=context,
        prompt=plan_prompt(json.dumps(_plan_view(engine), ensure_ascii=False)),
        schema=strict_schema(AIPlan.model_json_schema()),
        max_tokens=24000,
        effort="medium",
    )
    return apply_plan_edits(engine, AIPlan.model_validate(raw), today)


async def ai_brief(ai: RaceAI, context: str, engine_brief: dict[str, Any]) -> dict[str, Any]:
    raw = await ai.complete_json(
        rules=RACE_TEAM,
        context=context,
        prompt=BRIEF_PROMPT.format(brief=json.dumps(engine_brief, ensure_ascii=False)),
        schema=strict_schema(AIBrief.model_json_schema()),
        max_tokens=4000,
        effort="low",
    )
    brief = AIBrief.model_validate(raw)
    return {
        **engine_brief,
        "headline": brief.headline[:200],
        "message": brief.message[:1200],
        "evidence": [e.model_dump() for e in brief.evidence[:6]],
        "risks": [r.model_dump() for r in brief.risks[:5]],
        "actions": [a.model_dump() for a in brief.actions[:5]],
    }


async def ai_adapt(
    ai: RaceAI, context: str, reason: str, window: list[dict[str, Any]]
) -> AIAdaptation:
    raw = await ai.complete_json(
        rules=RACE_TEAM,
        context=context,
        prompt=adapt_prompt(reason, json.dumps(window, ensure_ascii=False)),
        schema=strict_schema(AIAdaptation.model_json_schema()),
        max_tokens=8000,
        effort="medium",
    )
    return AIAdaptation.model_validate(raw)
