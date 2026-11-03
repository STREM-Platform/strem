"""Openly licensed race and location photography with attribution.

Wikimedia Commons (fast, all freely licensed) is the primary source; Openverse
is queried in parallel with a short time box. NoDerivatives licences are
excluded because display crops can count as adaptations. Every candidate
carries creator, licence and source page so the app can credit it; whether a
photo depicts the actual event is the athlete's call, defaulting to atmosphere.

Photos follow the race type (ai#54): queries carry sport terms and candidates
that visibly show the sport rank first, so a trail race never opens on a
historical drawing or a namesake glacier on another continent.
"""

from __future__ import annotations

import asyncio
import html
import re
import time
from typing import Any
from urllib.parse import quote, urlsplit, urlunsplit

import httpx

from app.race.enrich.http import get_json

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
OPENVERSE_API = "https://api.openverse.org/v1/images/"
# Commons renders only its standard thumbnail widths; any other width is HTTP 400.
COMMONS_WIDTHS = (250, 330, 500, 960, 1280, 1920, 3840)
# Openverse is a bonus source: short time box, then a pause after any failure.
OPENVERSE_TIMEOUT = 4.0
OPENVERSE_PAUSE = 600.0
_OPENVERSE = {"paused_until": 0.0}
SCENIC = {
    "trail_running": "mountains",
    "hiking": "mountains",
    "skimo": "mountains snow",
    "nordic_skiing": "snow landscape",
    "mountain_biking": "mountains",
    "gravel": "landscape",
    "cycling": "road landscape",
    "swimming": "lake",
    "rowing": "lake",
    "triathlon": "landscape",
}
# Sport -> (search term, words that show a photo is about that sport).
SPORT_TERMS: dict[str, tuple[str, tuple[str, ...]]] = {
    "trail_running": ("trail running", ("trail", "running", "runner", "ultra", "skyrace")),
    "road_running": ("marathon runners", ("marathon", "running", "runner", "10k", "half")),
    "triathlon": ("triathlon", ("triathlon", "triathlete", "ironman")),
    "duathlon": ("duathlon", ("duathlon", "running", "cycling", "bike")),
    "cycling": ("road cycling race", ("cycling", "cyclist", "bicycle", "fondo", "peloton")),
    "gravel": ("gravel cycling", ("gravel", "cycling", "cyclist", "bike")),
    "mountain_biking": ("mountain bike race", ("mountain bike", "mtb", "biker", "cycling")),
    "swimming": ("open water swimming", ("swim",)),
    "hiking": ("hiking trail", ("hiking", "hiker", "trek", "trail")),
    "skimo": ("ski mountaineering race", ("ski mountaineering", "skimo", "ski touring")),
    "nordic_skiing": ("cross-country skiing", ("cross-country", "nordic", "loppet", "skiing")),
    "rowing": ("rowing regatta", ("rowing", "regatta", "kayak", "canoe", "paddl")),
    "hybrid": ("obstacle course race", ("hyrox", "obstacle", "fitness race")),
    "multisport": ("adventure race", ("adventure race", "kayak", "trek", "multisport")),
}
_TAG = re.compile(r"<[^>]+>")


def _strip_query(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _commons_thumb(original: str, width: int, original_width: int) -> str:
    """Build a Commons thumbnail URL (…/thumb/a/ab/Name.jpg/960px-Name.jpg)."""
    url = _strip_query(original)
    marker = "/wikipedia/commons/"
    width = next((step for step in COMMONS_WIDTHS if step >= width), COMMONS_WIDTHS[-1])
    if marker not in url or width >= original_width:
        return url
    head, tail = url.split(marker, 1)
    name = tail.rsplit("/", 1)[-1]
    return f"{head}{marker}thumb/{tail}/{width}px-{name}"


def _clean(text: Any, limit: int = 200) -> str | None:
    if not text:
        return None
    value = html.unescape(_TAG.sub("", str(text))).strip()
    return value[:limit] or None


async def search_commons(query: str, depicts: str, limit: int = 12) -> list[dict[str, Any]]:
    try:
        body = await get_json(
            COMMONS_API,
            {
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f"{query} filetype:bitmap",
                "gsrnamespace": 6,
                "gsrlimit": limit,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size|mime",
                "iiextmetadatafilter": (
                    "Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName"
                ),
            },
            ttl=6 * 3600,
        )
    except (httpx.HTTPError, ValueError):
        return []
    results = []
    for page in (body.get("query") or {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = {k: v.get("value") for k, v in (info.get("extmetadata") or {}).items()}
        license_name = _clean(meta.get("LicenseShortName"), 60)
        width, height = int(info.get("width") or 0), int(info.get("height") or 0)
        if (
            info.get("mime") not in ("image/jpeg", "image/png", "image/webp")
            or width < 1000
            or not license_name
            or "nd" in license_name.lower().replace(" ", "-").split("-")
        ):
            continue
        original = str(info.get("url"))
        results.append(
            {
                "id": f"commons:{page.get('pageid')}",
                "url": _commons_thumb(original, 1280, width),
                "thumb_url": _commons_thumb(original, 500, width),
                "width": width,
                "height": height,
                "title": _clean(
                    meta.get("ObjectName") or page.get("title", "").removeprefix("File:"), 300
                ),
                "description": _clean(meta.get("ImageDescription"), 300),
                "creator": _clean(meta.get("Artist")) or "Wikimedia Commons contributor",
                "creator_url": None,
                "license": license_name,
                "license_url": _strip_query(str(meta["LicenseUrl"]))
                if meta.get("LicenseUrl")
                else None,
                "source_url": str(
                    info.get("descriptionurl")
                    or f"https://commons.wikimedia.org/wiki/{quote(page.get('title', ''))}"
                ),
                "provider": "wikimedia",
                "depicts": depicts,
            }
        )
    return results


async def search_openverse(query: str, depicts: str, limit: int = 10) -> list[dict[str, Any]]:
    if time.monotonic() < _OPENVERSE["paused_until"]:
        return []
    try:
        body = await get_json(
            OPENVERSE_API,
            {"q": query, "page_size": limit, "license_type": "commercial", "mature": "false"},
            ttl=6 * 3600,
            timeout=OPENVERSE_TIMEOUT,
        )
    except (httpx.HTTPError, ValueError):
        # A slow or failing Openverse must not hold every photo search hostage.
        _OPENVERSE["paused_until"] = time.monotonic() + OPENVERSE_PAUSE
        return []
    results = []
    for row in body.get("results") or []:
        license_code = str(row.get("license") or "")
        width, height = int(row.get("width") or 0), int(row.get("height") or 0)
        if "nd" in license_code.split("-") or (width and width < 1000) or not row.get("url"):
            continue
        version = row.get("license_version")
        label = (
            "CC0"
            if license_code == "cc0"
            else (
                "Public Domain Mark"
                if license_code == "pdm"
                else f"CC {license_code.upper()} {version or ''}".strip()
            )
        )
        results.append(
            {
                "id": f"openverse:{row.get('id')}",
                "url": str(row["url"]),
                "thumb_url": row.get("thumbnail") or row["url"],
                "width": width or None,
                "height": height or None,
                "title": _clean(row.get("title"), 300),
                "description": None,
                "creator": _clean(row.get("creator")) or "Unknown creator",
                "creator_url": row.get("creator_url"),
                "license": label,
                "license_url": row.get("license_url"),
                "source_url": row.get("foreign_landing_url") or row["url"],
                "provider": "openverse",
                "depicts": depicts,
            }
        )
    return results


async def search_media(
    event_name: str | None, location: str | None, sport: str | None, limit: int = 24
) -> list[dict[str, Any]]:
    """Photos of this race in its sport first, then its place, then sport atmosphere."""
    term, words = SPORT_TERMS.get(sport or "", ("", ()))
    scenic = SCENIC.get(sport or "", "landscape")
    place = ", ".join(part.strip() for part in location.split(",")[:2]) if location else ""
    tasks: list[Any] = []
    if event_name:
        tasks.append(search_commons(event_name, "event"))
        tasks.append(search_openverse(event_name, "event"))
        if term:
            tasks.append(search_commons(f"{event_name} {term}", "event"))
    if place:
        if term:
            tasks.append(search_commons(f"{place} {term}", "location"))
        tasks.append(search_commons(f"{place} {scenic}", "location"))
    if term:
        tasks.append(search_commons(term, "atmosphere", limit=20))
        tasks.append(search_commons(f"{term} race", "atmosphere"))
        tasks.append(search_openverse(term, "atmosphere"))
    elif sport:
        tasks.append(search_commons(f"{sport.replace('_', ' ')} race", "atmosphere"))
    batches = await asyncio.gather(*tasks, return_exceptions=True)
    seen: set[str] = set()
    ranked: list[dict[str, Any]] = []
    for batch in batches:
        if isinstance(batch, BaseException):
            continue
        for item in batch:
            key = _strip_query(item["url"])
            if key in seen:
                continue
            seen.add(key)
            ranked.append(item)
    ranked.sort(key=lambda item: (_rank(item, words), _cover_fit(item)))
    return ranked[:limit]


def shows_sport(item: dict[str, Any], words: tuple[str, ...]) -> bool:
    text = f"{item.get('title') or ''} {item.get('description') or ''}".lower()
    return any(word in text for word in words)


# Documents and artwork are never a race cover, whatever their title matches.
NOT_A_PHOTO = (
    "drawing",
    "painting",
    "map of",
    " map",
    "logo",
    "coat of arms",
    "charter",
    "poster",
    "race car",
    "concept",
    "stamp",
    "diagram",
    "document",
)


def _rank(item: dict[str, Any], words: tuple[str, ...]) -> int:
    """Event in its sport, place in its sport, sport atmosphere, then the rest."""
    title = f" {item.get('title') or ''}".lower()
    if any(word in title for word in NOT_A_PHOTO):
        return 9
    order = {"event": 0, "location": 1, "atmosphere": 2}.get(item["depicts"], 3)
    if not words:
        return order
    return order if shows_sport(item, words) else 3 + order


def _cover_fit(item: dict[str, Any]) -> int:
    """0 for frames that crop well into a hero, 1 for wide panoramas, 2 for portrait."""
    width, height = item.get("width") or 0, item.get("height") or 0
    if not width or not height:
        return 1
    ratio = width / height
    if ratio < 1:
        return 2
    return 0 if ratio <= 2.2 else 1
