"""Tests for photo & voice capture (D3/D4/D6): parse, confirm, guardrails."""

import asyncio
import uuid

from app.capture import (
    MealCapture,
    VoiceCapture,
    WorkoutCapture,
    WorkoutItem,
    sanitize_meal,
    sanitize_voice,
    sanitize_workout,
)
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
