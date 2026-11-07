"""AI-generated race covers (#35): OpenAI's image model paints the race.

Restricted while it is new: only accounts listed in `COVER_IMAGE_EMAILS` may
generate, and every image counts against the athlete's daily AI limit (#8).
Images live in this service and are served at an unguessable URL, so the app
can show them like any other cover. They are labelled AI-generated, never as a
photo of the event.
"""

from __future__ import annotations

import base64
import uuid
from datetime import UTC, date, datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.config import Settings
from app.db import Base
from app.race.enrich.http import USER_AGENT, _verify

MEDIA_TYPE = "image/jpeg"
SIZE = "1536x1024"  # landscape, crops well into the hero card


class GeneratedCover(Base):
    __tablename__ = "generated_covers"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    model: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(Text)
    media_type: Mapped[str] = mapped_column(String(40))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CoverRequest(BaseModel):
    """What the app knows about the race when the athlete asks for a cover."""

    name: str = Field(min_length=2, max_length=160)
    sport: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=160)
    race_date: date | None = None
    distance_km: float | None = Field(default=None, gt=0, le=10000)
    elevation_gain_m: int | None = Field(default=None, ge=0, le=100000)
    description: str | None = Field(default=None, max_length=1000)


def allowed(settings: Settings, email: str) -> bool:
    """Generation is on for this account: an OpenAI key and an allowlisted email."""
    emails = {e.strip().lower() for e in settings.cover_image_emails.split(",") if e.strip()}
    return bool(settings.openai_api_key) and email.strip().lower() in emails


SEASONS = {
    12: "winter",
    1: "winter",
    2: "late winter",
    3: "early spring",
    4: "spring",
    5: "late spring",
    6: "early summer",
    7: "summer",
    8: "late summer",
    9: "early autumn",
    10: "autumn",
    11: "late autumn",
}


def prompt_for(race: CoverRequest) -> str:
    sport = (race.sport or "endurance").replace("_", " ")
    facts = [f"{race.name}, a {sport} race"]
    if race.distance_km:
        facts.append(f"{race.distance_km:g} km")
    if race.elevation_gain_m:
        facts.append(f"{race.elevation_gain_m} m of climbing")
    if race.location:
        facts.append(f"at {race.location}")
    season = SEASONS[race.race_date.month] if race.race_date else None
    lines = [
        "Editorial sports photograph used as the cover of an athlete's race plan.",
        "The race: " + ", ".join(facts) + (f", held in {season}." if season else "."),
    ]
    if race.description:
        lines.append(f"About the course: {race.description}")
    lines += [
        "If you know this race, show the landscape and terrain it is known for; otherwise "
        "show what this place really looks like"
        + (f" in {season}" if season else "")
        + ", with a few athletes small in the frame, seen from behind or far away.",
        "Photorealistic, natural light, wide composition with calm sky or space at the top.",
        "No text, letters, numbers, logos, race bibs, brands or watermarks.",
    ]
    return "\n".join(lines)


async def generate(settings: Settings, prompt: str) -> bytes:
    """One image from the Images API, as JPEG bytes. Raises httpx errors."""
    async with httpx.AsyncClient(
        timeout=180, headers={"User-Agent": USER_AGENT}, verify=_verify()
    ) as client:
        response = await client.post(
            f"{settings.openai_base_url.rstrip('/')}/images/generations",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": settings.openai_image_model,
                "prompt": prompt,
                "size": SIZE,
                "quality": "medium",
                "output_format": "jpeg",
                "output_compression": 85,
                "n": 1,
            },
        )
    response.raise_for_status()
    body: dict[str, Any] = response.json()
    return base64.b64decode(body["data"][0]["b64_json"])


def new_cover(user_id: uuid.UUID, settings: Settings, prompt: str, data: bytes) -> GeneratedCover:
    return GeneratedCover(
        user_id=user_id,
        model=settings.openai_image_model,
        prompt=prompt,
        media_type=MEDIA_TYPE,
        data=data,
        created_at=datetime.now(UTC),
    )
