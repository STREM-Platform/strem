"""Tests for photo & voice capture (D3/D4/D6): parse, confirm, guardrails."""

import asyncio
import uuid
from typing import cast

from langchain_core.language_models import BaseChatModel

from app.capture import (
    NO_VISION_NOTE,
    AnthropicCaptureProvider,
    FallbackCaptureProvider,
    MealCapture,
    VoiceCapture,
    WorkoutCapture,
    WorkoutItem,
    _VisionMeal,
    _VisionWorkout,
    _VisionWorkoutItem,
    build_capture_provider,
    sanitize_meal,
    sanitize_voice,
    sanitize_workout,
)
from app.config import Settings
from tests.support import ai_app, auth_header

IMG = ("scan.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")
AUDIO = ("note.m4a", b"fakeaudio", "audio/m4a")


# ── parse endpoints ──────────────────────────────────────────────────────────


def test_capture_workout_returns_structured_result() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/workout",
                headers=auth_header(uuid.uuid4()),
                files={"image": IMG},
            )
            assert res.status_code == 200
            body = res.json()
            assert body["title"] == "Upper Push"
            assert body["items"][0]["name"] == "Bench Press"
            assert "note" in body

    asyncio.run(scenario())


def test_capture_meal_returns_macro_estimate() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/meal",
                headers=auth_header(uuid.uuid4()),
                files={"image": IMG},
            )
            assert res.status_code == 200
            body = res.json()
            assert body["cal"] == 620
            assert body["p"] == 48

    asyncio.run(scenario())


def test_capture_voice_returns_detail() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/voice",
                headers=auth_header(uuid.uuid4()),
                files={"audio": AUDIO},
            )
            assert res.status_code == 200
            assert res.json()["detail"] == "Easy 5k, felt strong"

    asyncio.run(scenario())


# ── confirm ──────────────────────────────────────────────────────────────────


def test_confirm_workout_records_action_and_writes() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/confirm",
                headers=auth_header(uuid.uuid4()),
                json={
                    "kind": "workout",
                    "summary": "Logged Upper Push from a scan",
                    "citedData": [{"icon": "camera", "text": "Scanned sheet"}],
                    "workout": {"sessionType": "strength", "durationMinutes": 50},
                },
            )
            assert res.status_code == 201
            body = res.json()
            assert body["writtenId"] == "written-workout-id"
            assert body["action"]["capability"] == "logCapture"
            assert body["action"]["status"] == "done"
            assert body["action"]["citedData"][0]["text"] == "Scanned sheet"
            assert len(h.capture_writer.workouts) == 1
            assert h.capture_writer.workouts[0]["session_type"] == "strength"

    asyncio.run(scenario())


def test_confirm_meal_writes_nutrition_day() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/confirm",
                headers=auth_header(uuid.uuid4()),
                json={
                    "kind": "meal",
                    "summary": "Logged chicken & rice",
                    "meal": {"date": "2026-06-18", "targetsMet": True},
                },
            )
            assert res.status_code == 201
            assert res.json()["writtenId"] == "written-meal-id"
            assert len(h.capture_writer.meals) == 1

    asyncio.run(scenario())


def test_confirm_voice_records_action_only() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/confirm",
                headers=auth_header(uuid.uuid4()),
                json={"kind": "voice", "summary": "Noted easy run"},
            )
            assert res.status_code == 201
            body = res.json()
            assert body["writtenId"] is None
            assert body["action"]["status"] == "done"
            assert h.capture_writer.workouts == []
            assert h.capture_writer.meals == []

    asyncio.run(scenario())


def test_confirm_workout_without_payload_is_validation_error() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.post(
                "/v1/ai/capture/confirm",
                headers=auth_header(uuid.uuid4()),
                json={"kind": "workout", "summary": "missing payload"},
            )
            assert res.status_code == 400
            assert res.json()["code"] == "validation_error"

    asyncio.run(scenario())


def test_capture_endpoints_require_auth() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            assert (
                await h.client.post("/v1/ai/capture/workout", files={"image": IMG})
            ).status_code == 401
            assert (
                await h.client.post(
                    "/v1/ai/capture/confirm", json={"kind": "voice", "summary": "x"}
                )
            ).status_code == 401

    asyncio.run(scenario())


# ── guardrails (pure) ────────────────────────────────────────────────────────


def test_sanitize_strips_shaming_note() -> None:
    dirty = WorkoutCapture(
        title="Push",
        items=[WorkoutItem(name="Bench", detail="4x6", note="you failed, lazy effort")],
        note="pathetic session",
    )
    clean = sanitize_workout(dirty)
    assert "lazy" not in clean.note.lower()
    assert "pathetic" not in clean.note.lower()
    assert "failed" not in clean.items[0].note.lower()


def test_sanitize_meal_floors_negative_macros() -> None:
    clean = sanitize_meal(MealCapture(title="x", cal=-10, p=-1, c=5, f=2, note="ok"))
    assert clean.cal == 0
    assert clean.p == 0
    assert clean.c == 5


def test_sanitize_voice_keeps_clean_note() -> None:
    clean = sanitize_voice(VoiceCapture(title="Run", detail="5k", note="Nice work"))
    assert clean.note == "Nice work"


# ── Anthropic vision provider (#67) ──────────────────────────────────────────


class _StubStructured:
    def __init__(self, value: object, fail: bool) -> None:
        self.value = value
        self.fail = fail

    async def ainvoke(self, messages: object) -> object:
        if self.fail:
            raise RuntimeError("vision boom")
        return self.value


class _StubVisionModel:
    def __init__(self, value: object = None, *, fail: bool = False) -> None:
        self.value = value
        self.fail = fail

    def with_structured_output(self, schema: object) -> _StubStructured:
        return _StubStructured(self.value, self.fail)


def _provider(value: object = None, *, fail: bool = False) -> AnthropicCaptureProvider:
    return AnthropicCaptureProvider(cast(BaseChatModel, _StubVisionModel(value, fail=fail)))


def test_vision_parses_workout() -> None:
    vision = _VisionWorkout(
        title="Upper Push", items=[_VisionWorkoutItem(name="Bench", detail="4x8 @ 80kg")]
    )
    result = asyncio.run(_provider(vision).parse_workout(b"img", "image/jpeg"))
    assert result.title == "Upper Push"
    assert result.items[0].name == "Bench"


def test_vision_parses_meal() -> None:
    vision = _VisionMeal(title="Chicken & rice", cal=620, protein_g=48, carbs_g=72, fat_g=14)
    result = asyncio.run(_provider(vision).parse_meal(b"img", "image/jpeg"))
    assert result.cal == 620 and result.p == 48 and result.c == 72 and result.f == 14


def test_vision_failure_falls_back_honestly() -> None:
    workout = asyncio.run(_provider(fail=True).parse_workout(b"img", "image/jpeg"))
    assert workout.items == [] and workout.note == NO_VISION_NOTE
    meal = asyncio.run(_provider(fail=True).parse_meal(b"img", "image/jpeg"))
    assert meal.cal == 0 and meal.note == NO_VISION_NOTE


def test_vision_empty_workout_falls_back() -> None:
    provider = _provider(_VisionWorkout(title="x", items=[]))
    workout = asyncio.run(provider.parse_workout(b"i", "image/jpeg"))
    assert workout.note == NO_VISION_NOTE


def test_vision_voice_stays_honest_fallback() -> None:
    voice = asyncio.run(_provider().parse_voice(b"audio", "audio/m4a"))
    assert voice.detail == "" and voice.note == NO_VISION_NOTE


def test_build_capture_provider_keyless_vs_keyed() -> None:
    keyless = build_capture_provider(Settings(anthropic_api_key=""))
    assert isinstance(keyless, FallbackCaptureProvider)
    keyed = build_capture_provider(Settings(anthropic_api_key="sk-test"))
    assert isinstance(keyed, AnthropicCaptureProvider)
