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

from dataclasses import dataclass, field
from typing import Protocol

from app.config import Settings, get_settings
from app.safety import check_guardrails

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
    """FastAPI dependency — the configured capture provider (tests override).

    TODO(D3/D4 vision): return an ``AnthropicCaptureProvider`` (Claude multimodal)
    when ``settings.anthropic_api_key`` is set. Until that lands with its prompts
    and evals, we use the honest fallback so capture never fabricates data.
    """
    global _provider
    if _provider is None:
        _provider = build_capture_provider()
    return _provider


def build_capture_provider(settings: Settings | None = None) -> CaptureProvider:
    settings = settings or get_settings()
    return FallbackCaptureProvider()
