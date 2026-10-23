"""Shared outbound HTTP for enrichment: identifying User-Agent, TLS bundle, cache."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

USER_AGENT = "STREM-RaceOS/1.0 (+https://github.com/STREM-Platform)"
_CACHE: dict[str, tuple[float, Any]] = {}
_CACHE_LIMIT = 512


def _verify() -> str | bool:
    # Honour a custom CA bundle (corporate TLS inspection on dev machines).
    return os.environ.get("SSL_CERT_FILE") or True


async def get_json(
    url: str, params: dict[str, Any] | None = None, *, ttl: float = 3600, timeout: float = 10
) -> Any:
    key = url + "?" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    hit = _CACHE.get(key)
    now = time.monotonic()
    if hit and now - hit[0] < ttl:
        return hit[1]
    async with httpx.AsyncClient(
        timeout=timeout, headers={"User-Agent": USER_AGENT}, verify=_verify()
    ) as client:
        response = await client.get(url, params=params)
    response.raise_for_status()
    value = response.json()
    if len(_CACHE) >= _CACHE_LIMIT:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[key] = (now, value)
    return value


def clear_cache() -> None:
    _CACHE.clear()
