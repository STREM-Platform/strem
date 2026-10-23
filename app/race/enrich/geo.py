"""Place search (Open-Meteo geocoding): coordinates, timezone and country."""

from __future__ import annotations

from typing import Any

import httpx

from app.race.enrich.http import get_json

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


async def search_places(query: str, limit: int = 8) -> list[dict[str, Any]]:
    query = query.strip()
    if len(query) < 2:
        return []
    try:
        body = await get_json(
            GEOCODE_URL,
            {"name": query, "count": limit, "language": "en", "format": "json"},
            ttl=24 * 3600,
        )
    except (httpx.HTTPError, ValueError):
        return []
    places = []
    for row in body.get("results") or []:
        if row.get("latitude") is None or row.get("longitude") is None:
            continue
        region = ", ".join(str(x) for x in (row.get("admin1"), row.get("country")) if x)
        places.append(
            {
                "name": str(row.get("name")),
                "label": f"{row.get('name')}" + (f", {region}" if region else ""),
                "latitude": round(float(row["latitude"]), 5),
                "longitude": round(float(row["longitude"]), 5),
                "elevation_m": row.get("elevation"),
                "timezone": row.get("timezone"),
                "country_code": (row.get("country_code") or "").upper() or None,
                "attribution": "Open-Meteo geocoding (GeoNames)",
            }
        )
    return places
