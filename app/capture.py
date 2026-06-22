"""Photo & voice capture (D3/D4/D6): parse an upload into a confirmable result.

Capture never writes anything on its own. An upload is *parsed* into a structured
estimate the user reviews; the write happens only when they confirm ("Log it"),
which records a ``logCapture`` agent action (B3) and POSTs to the owning service.

Parsing goes through a ``CaptureProvider`` so the vision/transcription client is
swappable and stubbable in tests. The keyless ``FallbackCaptureProvider`` is
deliberately honest: it returns clearly-labelled estimates and never fabricates
exact macros or sets (A8 faked-progress rule). The production Anthropic-vision
provider is a drop-in (see ``get_capture_provider``).
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass, field
from typing import Protocol

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.agent.llm import build_model
from app.config import Settings, get_settings
from app.safety import check_guardrails

logger = logging.getLogger("strem-ai-orchestrator")

ESTIMATE_NOTE = "Estimate — review before logging. Nothing is saved until you confirm."
NO_VISION_NOTE = (
    "Couldn't read this automatically yet — enter the details and confirm to log. "
    "Nothing was saved."
)


@dataclass(frozen=True)
class WorkoutItem:
    name: str
    detail: str
    note: str


@dataclass(frozen=True)
class WorkoutCapture:
    title: str
    items: list[WorkoutItem] = field(default_factory=list)
    note: str = ESTIMATE_NOTE


@dataclass(frozen=True)
class MealCapture:
    title: str
    cal: int
    p: int
    c: int
    f: int
    note: str = ESTIMATE_NOTE


@dataclass(frozen=True)
class VoiceCapture:
    title: str
    detail: str
    note: str = ESTIMATE_NOTE


class CaptureProvider(Protocol):
    """Parses an upload into a structured, *unconfirmed* capture result."""

    async def parse_workout(self, image: bytes, content_type: str) -> WorkoutCapture: ...

    async def parse_meal(self, image: bytes, content_type: str) -> MealCapture: ...

    async def parse_voice(self, audio: bytes, content_type: str) -> VoiceCapture: ...


class FallbackCaptureProvider:
    """Keyless, honest provider — never invents data.

    Without a vision/speech model it cannot read the upload, so it returns an
    empty, clearly-labelled result that prompts the user to fill in the details.
    This is intentional: a fabricated macro count or set list would violate the
    no-faked-progress guardrail.
    """

    async def parse_workout(self, image: bytes, content_type: str) -> WorkoutCapture:
        return WorkoutCapture(title="Scanned workout", items=[], note=NO_VISION_NOTE)

    async def parse_meal(self, image: bytes, content_type: str) -> MealCapture:
        return MealCapture(title="Scanned meal", cal=0, p=0, c=0, f=0, note=NO_VISION_NOTE)

    async def parse_voice(self, audio: bytes, content_type: str) -> VoiceCapture:
        return VoiceCapture(title="Voice note", detail="", note=NO_VISION_NOTE)


# ── Production vision provider (#67) — Claude multimodal ──────────────────────


class _VisionWorkoutItem(BaseModel):
    name: str = Field(description="Exercise name, e.g. Back Squat.")
    detail: str = Field(description="Sets x reps and load/effort, e.g. '4 x 8 @ 80kg'.")


class _VisionWorkout(BaseModel):
    title: str = Field(description="A short session title, e.g. 'Upper Push'.")
    items: list[_VisionWorkoutItem] = Field(default_factory=list)


class _VisionMeal(BaseModel):
    title: str = Field(description="What the meal is, e.g. 'Chicken & rice'.")
    cal: int = Field(ge=0, description="Estimated calories.")
    protein_g: int = Field(ge=0)
    carbs_g: int = Field(ge=0)
    fat_g: int = Field(ge=0)


_WORKOUT_PROMPT = (
    "Read this photo of a workout (a whiteboard, app screenshot, or written log) and "
    "extract the exercises with their sets x reps and load. If you cannot read it "
    "confidently, return an empty item list — never invent exercises or numbers."
)
_MEAL_PROMPT = (
    "Estimate the macros of the meal in this photo: calories, and protein/carbs/fat in "
    "grams. These are estimates the user will confirm — be reasonable, and if you truly "
    "cannot tell, return zeros rather than guessing wildly."
)


class AnthropicCaptureProvider:
    """Claude multimodal vision for photo->sets and photo->macros (#67).

    Defensive: any failure (or an unreadable image) degrades to the honest
    fallback rather than fabricating (A8). Voice transcription has no Anthropic
    model, so it stays on the fallback.
    """

    def __init__(self, model: BaseChatModel) -> None:
        self._model = model
        self._fallback = FallbackCaptureProvider()

    async def _vision(
        self, schema: type[BaseModel], prompt: str, image: bytes, content_type: str
    ) -> BaseModel:
        data_uri = f"data:{content_type};base64,{base64.b64encode(image).decode()}"
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_uri}},
            ]
        )
        result = await self._model.with_structured_output(schema).ainvoke([message])
        assert isinstance(result, BaseModel)
        return result

    async def parse_workout(self, image: bytes, content_type: str) -> WorkoutCapture:
        try:
            result = await self._vision(_VisionWorkout, _WORKOUT_PROMPT, image, content_type)
            assert isinstance(result, _VisionWorkout)
            items = [
                WorkoutItem(name=i.name, detail=i.detail, note="")
                for i in result.items
                if i.name.strip()
            ]
        except Exception:  # noqa: BLE001 - any vision/parse failure degrades, never fabricates
            logger.warning("vision parse_workout failed; using honest fallback", exc_info=True)
            return await self._fallback.parse_workout(image, content_type)
        if not items:
            return await self._fallback.parse_workout(image, content_type)
        return WorkoutCapture(title=result.title or "Scanned workout", items=items)

    async def parse_meal(self, image: bytes, content_type: str) -> MealCapture:
        try:
            result = await self._vision(_VisionMeal, _MEAL_PROMPT, image, content_type)
            assert isinstance(result, _VisionMeal)
        except Exception:  # noqa: BLE001 - any vision/parse failure degrades, never fabricates
            logger.warning("vision parse_meal failed; using honest fallback", exc_info=True)
            return await self._fallback.parse_meal(image, content_type)
        return MealCapture(
            title=result.title or "Scanned meal",
            cal=result.cal,
            p=result.protein_g,
            c=result.carbs_g,
            f=result.fat_g,
        )

    async def parse_voice(self, audio: bytes, content_type: str) -> VoiceCapture:
        # No Anthropic speech-to-text — stay honest (the fallback prompts manual entry).
        return await self._fallback.parse_voice(audio, content_type)


def _sanitize(note: str) -> str:
    """Drop any guardrail-violating copy a model might emit from a note."""
    return ESTIMATE_NOTE if check_guardrails(note) else note


def sanitize_workout(capture: WorkoutCapture) -> WorkoutCapture:
    return WorkoutCapture(
        title=capture.title,
        items=[
            WorkoutItem(name=i.name, detail=i.detail, note=_sanitize(i.note))
            for i in capture.items
        ],
        note=_sanitize(capture.note),
    )


def sanitize_meal(capture: MealCapture) -> MealCapture:
    return MealCapture(
        title=capture.title,
        cal=max(0, capture.cal),
        p=max(0, capture.p),
        c=max(0, capture.c),
        f=max(0, capture.f),
        note=_sanitize(capture.note),
    )


def sanitize_voice(capture: VoiceCapture) -> VoiceCapture:
    return VoiceCapture(
        title=capture.title, detail=capture.detail, note=_sanitize(capture.note)
    )


_provider: CaptureProvider | None = None


def get_capture_provider() -> CaptureProvider:
    """FastAPI dependency — the configured capture provider (tests override)."""
    global _provider
    if _provider is None:
        _provider = build_capture_provider()
    return _provider


def build_capture_provider(settings: Settings | None = None) -> CaptureProvider:
    """Claude multimodal vision when an API key is set; the honest fallback (no
    fabrication) when keyless, on parse failure, or for voice."""
    settings = settings or get_settings()
    if settings.anthropic_api_key:
        return AnthropicCaptureProvider(build_model(settings))
    return FallbackCaptureProvider()
