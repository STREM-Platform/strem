"""Athlete Baseline (#61) → /ai/context memory.

The provider folds the SET fields of the athlete profile into memory facts Forge
can cite; absent fields are never fabricated (A8).
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any
from unittest.mock import patch

import httpx

from app import context
from app.context import GraphSnapshot, HttpAthleteContextProvider

_PROFILE = {"onboarding_completed": True, "identity_statement": "I am a hybrid athlete."}


def _handler(
    athlete: dict[str, Any] | None, supplements: list[dict[str, Any]] | None = None
) -> Callable[[httpx.Request], httpx.Response]:
    def handle(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/users/me/athlete-profile"):
            if athlete is None:
                return httpx.Response(404, json={})
            return httpx.Response(200, json=athlete)
        if path.endswith("/users/me/xp"):
            return httpx.Response(200, json={"streak_state": "active"})
        if path.endswith("/users/me"):
            return httpx.Response(200, json=_PROFILE)
        if path.endswith("/training/sessions"):
            return httpx.Response(200, json={"items": []})
        if path.endswith("/nutrition/supplements"):
            return httpx.Response(200, json={"items": supplements or []})
        if path.endswith("/nutrition/days"):
            return httpx.Response(200, json={"items": []})
        if path.endswith("/integrations/sources"):
            return httpx.Response(200, json={"items": []})
        if path.endswith("/integrations/recovery"):
            return httpx.Response(200, json={"items": []})
        return httpx.Response(404, json={})

    return handle


def _snapshot(
    athlete: dict[str, Any] | None, supplements: list[dict[str, Any]] | None = None
) -> GraphSnapshot | None:
    provider = HttpAthleteContextProvider(
        "http://user.test/v1", "http://training.test/v1", "http://nutrition.test/v1"
    )
    transport = httpx.MockTransport(_handler(athlete, supplements))
    real_client = httpx.AsyncClient

    def _factory(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs.pop("timeout", None)
        return real_client(transport=transport, timeout=5.0)

    async def _run() -> GraphSnapshot | None:
        with patch("app.context.httpx.AsyncClient", _factory):
            return await provider.for_user("user-1", "tok")

    return asyncio.run(_run())


def test_profile_facts_appear_in_context_memory() -> None:
    athlete = {
        "years_training": 6,
        "personal_records": [
            {"exercise": "Back Squat", "weight_kg": 140, "reps": 1},
            {"exercise": "5k run", "time": "21:30"},
        ],
        "injuries": [{"area": "left knee", "note": "flares on lunges"}],
        "equipment_access": "home_gym",
        "dietary_constraints": ["dairy-free"],
    }
    snap = _snapshot(athlete)
    assert snap is not None
    texts = [m.text for m in snap.memory]
    assert "6 years training" in texts
    assert "PR: Back Squat 140kg × 1" in texts
    assert "PR: 5k run 21:30" in texts
    assert any(t.startswith("Injury: left knee") for t in texts)
    assert "Equipment: home gym" in texts
    assert "Diet: dairy-free" in texts


def test_no_profile_means_no_fabricated_memory() -> None:
    snap = _snapshot(None)
    assert snap is not None
    assert snap.memory == []


def test_supplement_facts_appear_in_context_memory() -> None:
    snap = _snapshot(None, supplements=[{"name": "Creatine", "dose": "5g", "timing": "daily"}])
    assert snap is not None
    assert any("Takes Creatine" in m.text for m in snap.memory)


def test_profile_memory_only_surfaces_set_fields() -> None:
    assert context._profile_memory({}) == []
    only_years = context._profile_memory({"years_training": 1})
    assert [m.text for m in only_years] == ["1 year training"]
