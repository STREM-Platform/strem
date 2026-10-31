"""Import the athlete's own plan (strem-mobile#118): AI first, with full context.

When the AI race team is available it reads every source — screenshots, PDFs,
CSV and pasted text — with the athlete's whole race context, so it understands
their shorthand; it then reviews the plan against everything it knows. The
deterministic parser is the offline fallback for CSV and text. Nothing is
saved until the athlete commits the reviewed draft.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.errors import AppError
from app.race import plan_import as pi
from app.race.ai.client import AIUnavailable, RaceAI, strict_schema
from app.race.ai.prompts import RACE_TEAM
from app.race.clients import RaceServices
from app.race.context import render
from app.race.service import load_context

REVIEW_RULES = (
    RACE_TEAM
    + "\n\nYou are reviewing the athlete's OWN plan, which they imported. Do not rewrite it. "
    "Using everything you know about the athlete, the race and the course, give at most five "
    "specific, evidence-based observations (what fits, what is risky, what is missing), one sentence each."
)
REVIEW_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "notes"],
    "additionalProperties": False,
}


def attachments(sources: list[pi.ImportSource]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for s in sources:
        if s.kind == "image":
            blocks.append(
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": s.media_type, "data": s.data_base64},
                }
            )
        elif s.kind == "pdf":
            blocks.append(
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": s.data_base64,
                    },
                }
            )
    return blocks


@dataclass
class Target:
    """What the imported plan is fitted to: one race, or the athlete with no race."""

    context: str
    today: date
    race_date: date | None
    timezone: str
    sport: str
    title: str


async def import_plan(
    services: RaceServices, ai: RaceAI, mission_id: uuid.UUID, body: pi.PlanImportRequest
) -> dict[str, Any]:
    ctx = await load_context(services, mission_id)
    target = Target(
        context=render(ctx),
        today=ctx.today,
        race_date=ctx.race_date,
        timezone=str(ctx.event.get("timezone") or "UTC"),
        sport=ctx.sport,
        title=str(ctx.event.get("name") or "your race"),
    )
    return await read_plan(ai, target, body)


async def import_athlete_plan(
    services: RaceServices, ai: RaceAI, body: pi.PlanImportRequest
) -> dict[str, Any]:
    """The athlete's own plan with no race attached (training-service#23)."""
    return await read_plan(ai, await athlete_target(services), body)


async def read_plan(ai: RaceAI, target: Target, body: pi.PlanImportRequest) -> dict[str, Any]:
    context = target.context
    visual = [s for s in body.sources if s.kind in ("image", "pdf")]
    texts = [s for s in body.sources if s.kind in ("csv", "text")]
    raw: pi.RawPlan | None = None
    parser: str = "text"
    model: str | None = None
    ai_reason: str | None = None

    status = ai.status()
    if status.available:
        text_part = "\n\n".join(f"--- {s.name or s.kind} ---\n{s.text}" for s in texts)
        prompt = "Transcribe this training plan into structured sessions."
        if text_part:
            prompt += f"\n\nPlan as text:\n{text_part}"
        try:
            result = await ai.complete_json(
                rules=pi.IMPORT_RULES,
                context=context,
                prompt=prompt,
                schema=strict_schema(pi.AIImportedPlan.model_json_schema()),
                max_tokens=32000,
                effort="medium",
                attachments=attachments(visual) or None,
            )
            raw = pi.from_ai(result)
            parser, model = "ai", ai.model
        except AIUnavailable as exc:
            ai_reason = exc.reason
        except ValueError:
            ai_reason = "The AI's reading of the plan did not validate."
    else:
        ai_reason = status.reason

    if raw is None:
        if visual and not texts:
            raise AppError(
                503,
                "ai_unavailable",
                f"Reading screenshots and PDFs needs the AI race team ({ai_reason}) "
                "Paste the plan as text or CSV to import it now.",
            )
        raw = pi.RawPlan()
        for s in texts:
            pi.parse_text(s.text or "", raw, csv_hint=s.kind == "csv")
        if visual:
            raw.unparsed.append(
                f"{len(visual)} image/PDF file(s) were skipped: reading them needs the AI race team."
            )
    if not raw.sessions:
        raise AppError(
            422,
            "plan_not_recognised",
            "No sessions were recognised. Check the file, or paste the plan as text.",
        )

    content, warnings = pi.normalize(
        raw,
        today=target.today,
        race_date=target.race_date,
        start_date=body.start_date,
        timezone=target.timezone,
        sport=target.sport,
        title=target.title,
    )

    review: dict[str, Any] | None = None
    if parser == "ai":
        try:
            answer = await ai.complete_json(
                rules=REVIEW_RULES,
                context=context,
                prompt="The athlete's imported plan:\n"
                + json.dumps(content["weeks"], default=str)[:60000],
                schema=REVIEW_SCHEMA,
                max_tokens=4000,
                effort="low",
            )
            review = {
                "summary": str(answer.get("summary", ""))[:600],
                "notes": [str(n)[:300] for n in answer.get("notes", [])][:5],
            }
        except AIUnavailable:
            review = None

    return {
        "content": content,
        "warnings": warnings,
        "unparsed": raw.unparsed[:30],
        "parser": parser,
        "model": model,
        "ai_reason": ai_reason,
        "review": review,
        "sessions": sum(len(w["sessions"]) for w in content["weeks"]),
    }


async def commit_import(
    services: RaceServices, mission_id: uuid.UUID, content: dict[str, Any]
) -> dict[str, Any]:
    """Save the reviewed draft as the athlete's plan (origin athlete)."""
    await services.mission(mission_id)
    return await services.put_plan(
        mission_id, {"content": content, "origin": "athlete", "model": None}
    )


async def commit_athlete_import(services: RaceServices, content: dict[str, Any]) -> dict[str, Any]:
    """Save the reviewed draft as the athlete's plan outside any race."""
    return await services.put_base_plan({"content": content, "origin": "athlete", "model": None})


async def athlete_target(services: RaceServices) -> Target:
    """Context for a plan with no race: who the athlete is, what they do, what is ahead."""
    user = await services.user() or {}
    profile = await services.athlete_profile() or {}
    try:
        missions = await services.missions()
    except AppError:
        missions = []  # races are optional context here
    sessions = await services.sessions(limit=80)
    timezone = str(user.get("timezone") or "UTC")
    try:
        today = datetime.now(ZoneInfo(timezone)).date()
    except (ZoneInfoNotFoundError, ValueError):
        timezone, today = "UTC", datetime.now(UTC).date()
    upcoming = sorted(
        (
            m
            for m in missions
            if m.get("state") == "active"
            and str((m.get("event") or {}).get("race_date", "")) >= today.isoformat()
        ),
        key=lambda m: str(m["event"]["race_date"]),
    )
    lines = [f"TODAY: {today.isoformat()}", "", "## ATHLETE [athlete]"]
    for key in (
        "experience",
        "weekly_hours",
        "weekly_km",
        "longest_km",
        "weight_kg",
        "primary_sport",
        "notes",
    ):
        if profile.get(key) not in (None, "", []):
            lines.append(f"- {key.replace('_', ' ')}: {profile[key]}")
    lines += ["", "## UPCOMING RACES [athlete]"]
    if upcoming:
        for m in upcoming[:6]:
            event, goal = m.get("event") or {}, m.get("goal") or {}
            lines.append(
                f"- {event.get('name')} · {event.get('race_date')} · {event.get('sport')} · "
                f"{event.get('distance_km') or '?'} km · priority {goal.get('priority', 'A')}"
            )
    else:
        lines.append("- none: this plan is the athlete's own training outside any race")
    lines += ["", "## RECENT TRAINING [recorded]"]
    if sessions:
        for s in sessions[:20]:
            lines.append(
                f"- {str(s.get('logged_at', ''))[:10]} {s.get('session_type')} "
                f"{s.get('duration_minutes')} min {s.get('distance_km') or ''}".rstrip()
            )
    else:
        lines.append("- no logged or imported sessions yet")
    sport = (
        str((upcoming[0].get("event") or {}).get("sport"))
        if upcoming
        else str(profile.get("primary_sport") or "running")
    )
    return Target(
        context="\n".join(lines),
        today=today,
        race_date=None,
        timezone=timezone,
        sport=sport,
        title="your own training",
    )
