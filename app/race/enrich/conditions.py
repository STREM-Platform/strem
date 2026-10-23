"""Race-day conditions from Open-Meteo.

Inside the 16-day forecast window: the forecast for race day (kind=forecast).
Further out: the same calendar window (±3 days) over the last five years of
historical weather (kind=seasonal) — an assumption, clearly labelled, never a
forecast. Altitude adjusts temperature when the course climbs well above the
reference point.
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from statistics import mean
from typing import Any

import httpx

from app.race.enrich.http import get_json

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_DAYS = 16
DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset"
WEATHER_CODES = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "fog",
    51: "drizzle",
    53: "drizzle",
    55: "drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    80: "showers",
    81: "showers",
    82: "heavy showers",
    95: "thunderstorms",
    96: "thunderstorms with hail",
    99: "thunderstorms with hail",
}


def _first(daily: dict[str, Any], key: str) -> Any:
    values = daily.get(key) or []
    return values[0] if values else None


async def forecast(lat: float, lon: float, day: date) -> dict[str, Any] | None:
    body = await get_json(
        FORECAST_URL,
        {
            "latitude": lat,
            "longitude": lon,
            "daily": DAILY + ",precipitation_probability_max,weather_code",
            "timezone": "auto",
            "start_date": day.isoformat(),
            "end_date": day.isoformat(),
        },
        ttl=3 * 3600,
    )
    daily = body.get("daily") or {}
    if not daily.get("time"):
        return None
    code = _first(daily, "weather_code")
    return {
        "kind": "forecast",
        "date": day.isoformat(),
        "temp_max_c": _first(daily, "temperature_2m_max"),
        "temp_min_c": _first(daily, "temperature_2m_min"),
        "precipitation_mm": _first(daily, "precipitation_sum"),
        "precipitation_probability": _first(daily, "precipitation_probability_max"),
        "wind_max_kmh": _first(daily, "wind_speed_10m_max"),
        "weather": WEATHER_CODES.get(int(code), "mixed") if code is not None else None,
        "sunrise": _first(daily, "sunrise"),
        "sunset": _first(daily, "sunset"),
        "reference_elevation_m": body.get("elevation"),
    }


async def seasonal(
    lat: float, lon: float, day: date, today: date, years: int = 5
) -> dict[str, Any] | None:
    async def one(year_back: int) -> dict[str, Any] | None:
        try:
            anchor = day.replace(year=day.year - year_back)
        except ValueError:  # 29 February
            anchor = (day - timedelta(days=1)).replace(year=day.year - year_back)
        if anchor >= today:
            return None
        body = await get_json(
            ARCHIVE_URL,
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": (anchor - timedelta(days=3)).isoformat(),
                "end_date": (anchor + timedelta(days=3)).isoformat(),
                "daily": DAILY,
                "timezone": "auto",
            },
            ttl=7 * 24 * 3600,
            timeout=15,
        )
        return dict(body)

    results = await asyncio.gather(*(one(n) for n in range(1, years + 1)), return_exceptions=True)
    bodies = [r for r in results if isinstance(r, dict)]
    if not bodies:
        return None
    highs, lows, rain, wind = [], [], [], []
    for body in bodies:
        daily = body.get("daily") or {}
        highs += [v for v in daily.get("temperature_2m_max") or [] if v is not None]
        lows += [v for v in daily.get("temperature_2m_min") or [] if v is not None]
        rain += [v for v in daily.get("precipitation_sum") or [] if v is not None]
        wind += [v for v in daily.get("wind_speed_10m_max") or [] if v is not None]
    latest = bodies[0].get("daily") or {}
    mid = len(latest.get("time") or []) // 2
    wet_days = sum(1 for v in rain if v >= 1.0)
    return {
        "kind": "seasonal",
        "date": day.isoformat(),
        "years": len(bodies),
        "temp_max_c": round(mean(highs), 1) if highs else None,
        "temp_min_c": round(mean(lows), 1) if lows else None,
        "temp_max_range_c": [round(min(highs), 1), round(max(highs), 1)] if highs else None,
        "precipitation_mm": round(mean(rain), 1) if rain else None,
        "wet_day_share": round(wet_days / len(rain), 2) if rain else None,
        "wind_max_kmh": round(mean(wind), 1) if wind else None,
        "sunrise": (latest.get("sunrise") or [None])[mid],
        "sunset": (latest.get("sunset") or [None])[mid],
        "reference_elevation_m": bodies[0].get("elevation"),
    }


def _summary(cond: dict[str, Any]) -> str:
    bits = []
    if cond.get("temp_max_c") is not None:
        bits.append(f"{cond['temp_min_c']:.0f}–{cond['temp_max_c']:.0f} °C")
    if cond.get("weather"):
        bits.append(str(cond["weather"]))
    if cond.get("precipitation_probability") is not None:
        bits.append(f"{cond['precipitation_probability']}% chance of rain")
    elif cond.get("wet_day_share") is not None:
        bits.append(f"rain on {round(cond['wet_day_share'] * 100)}% of days")
    if cond.get("wind_max_kmh") is not None:
        bits.append(f"wind up to {cond['wind_max_kmh']:.0f} km/h")
    if cond.get("sunrise") and cond.get("sunset"):
        bits.append(f"daylight {str(cond['sunrise'])[-5:]}–{str(cond['sunset'])[-5:]}")
    prefix = (
        "Forecast"
        if cond["kind"] == "forecast"
        else f"Typical for the date ({cond.get('years')} past years)"
    )
    return f"{prefix}: " + ", ".join(bits)


async def race_conditions(
    lat: float | None,
    lon: float | None,
    race_day: date,
    today: date,
    course_high_m: float | None = None,
) -> dict[str, Any] | None:
    if lat is None or lon is None:
        return None
    try:
        if 0 <= (race_day - today).days <= FORECAST_DAYS - 1:
            cond = await forecast(lat, lon, race_day)
        else:
            cond = await seasonal(lat, lon, race_day, today)
    except (httpx.HTTPError, ValueError, KeyError):
        return None
    if not cond:
        return None
    reference = cond.get("reference_elevation_m")
    if course_high_m is not None and reference is not None and course_high_m - reference > 300:
        drop = round((course_high_m - reference) / 1000 * 6.5, 1)
        cond["altitude_note"] = (
            f"The course tops out ~{round(course_high_m - reference)} m above the reference point: "
            f"expect about {drop} °C colder up high."
        )
    cond["summary"] = _summary(cond)
    cond["source"] = "Open-Meteo" + (
        " forecast" if cond["kind"] == "forecast" else " historical weather (ERA5)"
    )
    return cond
