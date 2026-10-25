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
from typing import Any

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


async def import_plan(
    services: RaceServices, ai: RaceAI, mission_id: uuid.UUID, body: pi.PlanImportRequest
) -> dict[str, Any]:
    ctx = await load_context(services, mission_id)
    context = render(ctx)
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
        today=ctx.today,
        race_date=ctx.race_date,
        start_date=body.start_date,
        timezone=str(ctx.event.get("timezone") or "UTC"),
        sport=ctx.sport,
        title=str(ctx.event.get("name") or "your race"),
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
