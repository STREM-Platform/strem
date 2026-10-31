"""Tests for connected-source ingestion (A3): connect, registry, sync, recovery."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable, Mapping
from datetime import UTC, datetime, timedelta

from app.config import Settings
from app.crypto import TokenCipher, get_token_cipher
from app.errors import AppError
from app.integrations.providers import (
    NormalizedRecovery,
    NormalizedSession,
    Provider,
    SyncResult,
    TokenSet,
)
from tests.support import TEST_SETTINGS, Harness, StubProvider, auth_header, training_app


def run(
    scenario: Callable[[Harness], Awaitable[None]],
    providers: Mapping[str, Provider] | None = None,
) -> None:
    async def _inner() -> None:
        async with training_app(providers=providers) as harness:
            await scenario(harness)

    asyncio.run(_inner())


def _strava_with_run() -> StubProvider:
    return StubProvider(
        id="strava",
        result=SyncResult(
            sessions=[
                NormalizedSession(
                    external_id="987",
                    session_type="trail_running",
                    duration_minutes=41,
                    distance_km=8.2,
                    elevation_m=320,
                    logged_at=datetime.now(UTC),
                    notes="Morning trail",
                )
            ]
        ),
    )


# ── crypto ───────────────────────────────────────────────────────────────────


def test_token_cipher_round_trips() -> None:
    cipher = TokenCipher(TEST_SETTINGS.integrations_encryption_key)
    sealed = cipher.encrypt("secret-token")
    assert sealed != "secret-token"
    assert cipher.decrypt(sealed) == "secret-token"


def test_cipher_requires_key() -> None:
    try:
        get_token_cipher(Settings(integrations_encryption_key=""))
    except AppError as exc:
        assert exc.status_code == 503
    else:  # pragma: no cover
        raise AssertionError("expected AppError")


# ── registry ─────────────────────────────────────────────────────────────────


def test_sources_lists_catalog_with_state() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.get("/v1/integrations/sources", headers=auth_header(uuid.uuid4()))
        assert res.status_code == 200
        items = {s["id"]: s for s in res.json()["items"]}
        assert set(items) == {"whoop", "strava", "health"}
        assert items["strava"]["on"] is False
        assert items["strava"]["last"] == "Never"

    run(scenario)


# ── connect / disconnect ─────────────────────────────────────────────────────


def test_connect_marks_source_connected() -> None:
    provider = StubProvider(id="strava", tokens=TokenSet(access_token="acc-123", refresh_token="r"))

    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        res = await h.client.post(
            "/v1/integrations/strava/connect",
            headers=auth_header(user),
            json={"code": "oauth-code", "redirect_uri": "strem://cb"},
        )
        assert res.status_code == 201
        body = res.json()
        assert body["id"] == "strava"
        assert body["on"] is True
        # Tokens are sealed before storage (see test_token_cipher_round_trips); the
        # response exposes only connection state, never the token.
        assert "access_token" not in body

    run(scenario, providers={"strava": provider})


def test_connect_then_disconnect_clears_source() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        await h.client.post(
            "/v1/integrations/strava/connect",
            headers=auth_header(user),
            json={"code": "c"},
        )
        deleted = await h.client.delete("/v1/integrations/strava", headers=auth_header(user))
        assert deleted.status_code == 204
        sources = await h.client.get("/v1/integrations/sources", headers=auth_header(user))
        strava = next(s for s in sources.json()["items"] if s["id"] == "strava")
        assert strava["on"] is False

    run(scenario, providers={"strava": StubProvider(id="strava")})


def test_connect_unknown_provider_is_404() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.post(
            "/v1/integrations/garmin/connect",
            headers=auth_header(uuid.uuid4()),
            json={"code": "c"},
        )
        assert res.status_code == 404

    run(scenario, providers={"strava": StubProvider(id="strava")})


# ── sync ─────────────────────────────────────────────────────────────────────


def test_sync_strava_creates_run_with_elevation_and_publishes() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        headers = auth_header(user)
        await h.client.post("/v1/integrations/strava/connect", headers=headers, json={"code": "c"})

        synced = await h.client.post("/v1/integrations/strava/sync", headers=headers)
        assert synced.status_code == 200
        assert synced.json()["synced_sessions"] == 1

        sessions = await h.client.get("/v1/training/sessions", headers=headers)
        item = sessions.json()["items"][0]
        assert item["session_type"] == "trail_running"
        assert item["elevation_m"] == 320

    run(scenario, providers={"strava": _strava_with_run()})


def test_sync_is_idempotent_on_external_id() -> None:
    async def scenario(h: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await h.client.post("/v1/integrations/strava/connect", headers=headers, json={"code": "c"})
        first = await h.client.post("/v1/integrations/strava/sync", headers=headers)
        second = await h.client.post("/v1/integrations/strava/sync", headers=headers)
        assert first.json()["synced_sessions"] == 1
        assert second.json()["synced_sessions"] == 0  # same activity id → no duplicate

        sessions = await h.client.get("/v1/training/sessions", headers=headers)
        assert sessions.json()["pagination"]["total"] == 1

    run(scenario, providers={"strava": _strava_with_run()})


def test_sync_whoop_stores_recovery() -> None:
    whoop = StubProvider(
        id="whoop",
        result=SyncResult(
            recovery=[
                NormalizedRecovery(
                    date=datetime.now(UTC),
                    hrv_ms=72.5,
                    resting_hr=48,
                    recovery_score=66,
                )
            ]
        ),
    )

    async def scenario(h: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await h.client.post("/v1/integrations/whoop/connect", headers=headers, json={"code": "c"})
        synced = await h.client.post("/v1/integrations/whoop/sync", headers=headers)
        assert synced.json()["synced_recovery"] == 1

        recovery = await h.client.get("/v1/integrations/recovery", headers=headers)
        rows = recovery.json()["items"]
        assert rows[0]["recovery_score"] == 66
        assert rows[0]["hrv_ms"] == 72.5

    run(scenario, providers={"whoop": whoop})


def test_sync_refreshes_expired_token() -> None:
    provider = StubProvider(
        id="strava",
        tokens=TokenSet(
            access_token="acc",
            refresh_token="ref",
            expires_at=datetime.now(UTC) - timedelta(hours=1),  # already expired
        ),
        result=SyncResult(),
    )

    async def scenario(h: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await h.client.post("/v1/integrations/strava/connect", headers=headers, json={"code": "c"})
        await h.client.post("/v1/integrations/strava/sync", headers=headers)
        assert provider.refreshed >= 1

    run(scenario, providers={"strava": provider})


def test_integrations_require_auth() -> None:
    async def scenario(h: Harness) -> None:
        assert (await h.client.get("/v1/integrations/sources")).status_code == 401
        assert (await h.client.get("/v1/integrations/recovery")).status_code == 401

    run(scenario)


# ── provider failures are explained, not 500s (issue #21) ───────────────────

_REAL_ASYNC_CLIENT = __import__("httpx").AsyncClient


def _patch_http(monkeypatch, handler) -> None:  # type: ignore[no-untyped-def]
    import httpx

    def client(**kwargs):  # type: ignore[no-untyped-def]
        return _REAL_ASYNC_CLIENT(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", client)


def test_provider_failures_become_clear_errors(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    import httpx
    import pytest

    from app.integrations.providers import _get_json, _post_form

    def unreachable(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("certificate verify failed", request=request)

    cases = [
        (unreachable, 503, "provider_unreachable", "Strava could not be reached"),
        (
            lambda r: httpx.Response(400, json={"message": "Bad Request"}),
            400,
            "provider_rejected",
            "Strava did not accept",
        ),
        (lambda r: httpx.Response(429), 503, "provider_rate_limited", "busy"),
        (lambda r: httpx.Response(502), 503, "provider_unavailable", "had an error"),
    ]
    for handler, status, code, text in cases:
        _patch_http(monkeypatch, handler)
        with pytest.raises(AppError) as caught:
            asyncio.run(_post_form("https://www.strava.com/oauth/token", {"code": "x"}))
        assert (caught.value.status_code, caught.value.code) == (status, code)
        assert text in caught.value.message

    _patch_http(monkeypatch, unreachable)
    with pytest.raises(AppError) as caught:
        asyncio.run(_get_json("https://api.prod.whoop.com/developer/v1/recovery", {}, {}))
    assert caught.value.code == "provider_unreachable" and "WHOOP" in caught.value.message

    _patch_http(monkeypatch, lambda r: httpx.Response(200, json={"ok": True}))
    assert asyncio.run(_post_form("https://www.strava.com/oauth/token", {})) == {"ok": True}
