"""Race gear checklist: own it -> test it in training -> pack it.

Built from the sport, format, support, duration, expected conditions and
daylight. Organizer mandatory kit always wins: the list asks the athlete to
verify it rather than pretending to know it.
"""

from __future__ import annotations

from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import (
    estimate_finish,
    expected_temperature,
    family,
    race_start_hour,
)

Item = dict[str, Any]


def _item(item_id: str, title: str, detail: str | None = None, **extra: Any) -> Item:
    item: Item = {"id": item_id, "title": title}
    if detail:
        item["detail"] = detail
    item.update(extra)
    return item


def _clock_hours(value: object) -> float | None:
    """'2027-03-20T18:22' or '18:22' -> 18.37."""
    text = str(value or "")
    if "T" in text:
        text = text.split("T", 1)[1]
    try:
        hours, minutes = text[:5].split(":")
        return int(hours) + int(minutes) / 60
    except ValueError:
        return None


def _night_exposure(ctx: RaceContext, minutes: int) -> bool:
    if minutes >= 12 * 60:
        return True
    start = race_start_hour(ctx)
    sunset = _clock_hours((ctx.conditions or {}).get("sunset"))
    if start and sunset is not None:
        finish_hour = start[0] + start[1] / 60 + minutes / 60
        return finish_hour > sunset - 0.25
    return minutes >= 9 * 60


def build_gear(ctx: RaceContext) -> dict[str, Any]:
    fam = family(ctx)
    minutes = estimate_finish(ctx).minutes
    temp = expected_temperature(ctx)
    night = _night_exposure(ctx, minutes)
    support = ctx.event.get("support")
    self_supported = support in ("self_supported", "unsupported")
    sections: list[dict[str, Any]] = []

    sections.append(
        {
            "id": "mandatory",
            "title": "Mandatory kit — verify with the organizer",
            "kind": "checklist",
            "description": "Organizers publish a mandatory kit list and may check it at bib pickup or on course. Their list overrides this one.",
            "items": [
                _item(
                    "find-kit-list",
                    "Find the official mandatory kit list",
                    "Race website / athlete guide. Note anything not on this checklist.",
                    priority="critical",
                ),
                _item(
                    "kit-check", "Check every mandatory item against your pack", priority="critical"
                ),
            ],
        }
    )
    if fam in ("trail", "hike", "ski"):
        sections += _mountain(fam, minutes, night, temp, self_supported)
    elif fam == "run":
        sections += _road_run(minutes, temp)
    elif fam == "bike":
        sections += _bike(ctx, minutes, night, temp, self_supported)
    elif fam == "swim":
        sections += _swim(temp)
    elif fam == "tri":
        sections += _tri(temp)
    else:
        sections += _road_run(minutes, temp)
    sections.append(_race_day_admin(fam))

    assumptions = [f"Race duration about {minutes // 60} h {minutes % 60:02d}"]
    if temp is not None:
        assumptions.append(f"Expected race-day high around {temp:.0f} °C")
    else:
        assumptions.append(
            "Conditions unknown — pack layers for both cold and heat until the forecast is in"
        )
    if night:
        assumptions.append("Part of the race is likely in darkness — lights are essential")
    return {
        "headline": "Own it, test it in training, then pack it",
        "summary": (
            "Every item moves through three steps: you have it, it has survived a long session, "
            "and it is packed for race day. Anything new on race day is a risk — test shoes, pack, "
            "clothing and lights on long sessions first."
        ),
        "metrics": [
            {"label": "Items", "value": str(sum(len(s["items"]) for s in sections))},
            {"label": "Night gear", "value": "needed" if night else "not expected"},
        ],
        "sections": sections,
        "warnings": [
            "Organizer mandatory kit always takes priority over this list.",
            "Break in shoes over at least 50 km; never race in brand-new shoes.",
        ],
        "assumptions": assumptions,
        "sources": ["STREM race engine: sport, format, duration and conditions"],
    }


def _layers(temp: float | None, prefix: str) -> list[Item]:
    items = [
        _item(
            f"{prefix}-jacket",
            "Waterproof jacket with taped seams",
            "Often mandatory in mountain races.",
            priority="high",
        ),
        _item(f"{prefix}-warm", "Warm mid-layer", "Long-sleeve or light insulated layer."),
        _item(f"{prefix}-hat-gloves", "Hat/buff and light gloves"),
    ]
    if temp is not None and temp >= 22:
        items += [
            _item(f"{prefix}-cap", "Sun cap or visor + sunglasses"),
            _item(f"{prefix}-sunscreen", "Sweat-proof sunscreen"),
            _item(f"{prefix}-cooling", "Cooling buff / arm sleeves to wet at aid stations"),
        ]
    return items


def _mountain(
    fam: str, minutes: int, night: bool, temp: float | None, self_supported: bool
) -> list[dict[str, Any]]:
    footwear = [
        _item(
            "shoes",
            "Trail shoes with grip for the course terrain",
            "Run at least 50 km in them, including a long session.",
            priority="critical",
        ),
        _item("socks", "Tested socks (+ spare pair for long races)"),
        _item("gaiters", "Short gaiters (optional, for scree/dust)"),
    ]
    carry = [
        _item("vest", "Running vest / pack that fits all mandatory kit", priority="high"),
        _item("flasks", "Soft flasks or bottles (2 × 500 ml minimum)", priority="high"),
        _item("cup", "Reusable cup (many races are cupless)"),
    ]
    if fam in ("trail", "hike") and minutes >= 240:
        carry.append(
            _item(
                "poles",
                "Poles (if allowed and the course is steep)",
                "Practice with them on climbs first.",
            )
        )
    if fam == "ski":
        carry += [
            _item("skis-skins", "Skis, bindings and skins checked/waxed", priority="critical"),
            _item(
                "avalanche",
                "Avalanche transceiver, shovel, probe (if required)",
                priority="critical",
            ),
            _item("helmet-ski", "Helmet (if required)"),
        ]
    safety = [
        _item("phone", "Phone, charged, with the race safety number saved", priority="critical"),
        _item("blanket", "Survival blanket"),
        _item("whistle", "Whistle"),
        _item("first-aid", "Mini first-aid: blister plasters, tape, painkiller you tolerate"),
        _item("anti-chafe", "Anti-chafe balm"),
    ]
    if night:
        safety += [
            _item("headlamp", "Headlamp (200+ lumens) tested on a night run", priority="critical"),
            _item("headlamp-spare", "Spare batteries or a second light", priority="high"),
        ]
    if self_supported:
        safety += [
            _item("navigation", "GPX on watch and phone + offline map", priority="critical"),
            _item("water-filter", "Water filter or purification tablets"),
            _item("power-bank", "Power bank and cables"),
        ]
    return [
        {"id": "footwear", "title": "Footwear", "kind": "checklist", "items": footwear},
        {
            "id": "clothing",
            "title": "Clothing & layers",
            "kind": "checklist",
            "items": [
                _item("race-kit", "Race top + shorts tested on long sessions", priority="high"),
                *_layers(temp, "layer"),
            ],
        },
        {"id": "carry", "title": "Carry system", "kind": "checklist", "items": carry},
        {"id": "safety", "title": "Safety & essentials", "kind": "checklist", "items": safety},
    ]


def _road_run(minutes: int, temp: float | None) -> list[dict[str, Any]]:
    items = [
        _item(
            "race-shoes",
            "Race shoes with 30-80 km of use",
            "Do a long run with race-pace sections in them.",
            priority="critical",
        ),
        _item("socks", "Tested socks"),
        _item("race-kit", "Race kit tested on a long run"),
        _item("anti-chafe", "Anti-chafe balm / nipple tape"),
        _item("gel-carry", "Way to carry gels (belt, pockets, shorts)"),
        _item("throwaway", "Throwaway layer for the start corral"),
    ]
    if temp is not None and temp >= 20:
        items += [_item("cap", "Cap and sunglasses"), _item("sunscreen", "Sunscreen")]
    if temp is not None and temp < 8:
        items += [_item("gloves", "Light gloves and arm warmers")]
    return [{"id": "kit", "title": "Race kit", "kind": "checklist", "items": items}]


def _bike(
    ctx: RaceContext, minutes: int, night: bool, temp: float | None, self_supported: bool
) -> list[dict[str, Any]]:
    bike = [
        _item(
            "service",
            "Bike service 2 weeks before",
            "Drivetrain, brakes, cables, bearings.",
            priority="critical",
        ),
        _item("tyres", "Fresh tyres / refreshed tubeless sealant", priority="high"),
        _item("fit", "Position you have ridden for 4+ hours"),
        _item("computer", "Bike computer charged with the route loaded"),
    ]
    repair = [
        _item("tubes", "Spare tube(s) and tyre levers", priority="high"),
        _item("inflation", "CO2 + pump"),
        _item("multitool", "Multi-tool with chain breaker + quick link"),
        _item("plug", "Tubeless plugs (if tubeless)"),
    ]
    rider = [
        _item("helmet", "Helmet", priority="critical"),
        _item("kit-bike", "Bib shorts and jersey tested on long rides"),
        _item("glasses-gloves", "Glasses and gloves"),
        _item("bottles", "2-3 bottles / cages"),
        _item("food-storage", "Top-tube bag or pockets for food"),
        _item("rain-shell", "Packable rain jacket + arm warmers"),
    ]
    if night or minutes >= 8 * 60:
        rider += [
            _item("lights", "Front + rear lights with runtime for the night", priority="critical"),
            _item("reflective", "Reflective vest (often required)"),
        ]
    if self_supported:
        rider += [
            _item("bags", "Bikepacking bags tested fully loaded", priority="high"),
            _item("power-bank", "Power bank / dynamo"),
            _item("sleep", "Bivy / sleep system (if sleeping out)"),
        ]
    return [
        {"id": "bike", "title": "Bike", "kind": "checklist", "items": bike},
        {"id": "repair", "title": "Repair kit", "kind": "checklist", "items": repair},
        {"id": "rider", "title": "Rider kit", "kind": "checklist", "items": rider},
    ]


def _swim(temp: float | None) -> list[dict[str, Any]]:
    items = [
        _item(
            "wetsuit",
            "Wetsuit (check water temperature rules)",
            "Swim in it at least 3 times.",
            priority="high",
        ),
        _item("goggles", "Goggles: tinted + clear spare pair", priority="high"),
        _item("cap", "Swim cap (race cap is usually provided)"),
        _item("grease", "Anti-chafe for the neck"),
        _item("tow-float", "Tow float (if required)"),
        _item("warm-after", "Warm clothes and a hot drink for after"),
    ]
    if temp is not None and temp < 16:
        items.append(_item("neoprene", "Neoprene cap / socks for cold water"))
    return [{"id": "swim", "title": "Swim kit", "kind": "checklist", "items": items}]


def _tri(temp: float | None) -> list[dict[str, Any]]:
    return [
        *_swim(temp),
        {
            "id": "t1-bike",
            "title": "T1 + bike",
            "kind": "checklist",
            "items": [
                _item("bike-service", "Bike serviced 2 weeks out", priority="critical"),
                _item("helmet", "Helmet (strapped before touching the bike)", priority="critical"),
                _item("bike-shoes", "Bike shoes"),
                _item("bottles", "Race bottles and nutrition on the bike"),
                _item("repair", "Spare tube + CO2"),
            ],
        },
        {
            "id": "t2-run",
            "title": "T2 + run",
            "kind": "checklist",
            "items": [
                _item("run-shoes", "Run shoes with elastic laces", priority="high"),
                _item("race-belt", "Race belt with number"),
                _item("run-cap", "Cap / visor"),
                _item("tri-suit", "Tri-suit tested in a brick session", priority="high"),
            ],
        },
    ]


def _race_day_admin(fam: str) -> dict[str, Any]:
    items = [
        _item("bib", "Bib, pins/belt and timing chip", priority="critical"),
        _item("id-cash", "ID, insurance card, small cash"),
        _item("watch", "Watch charged, race profile set up"),
        _item("drop-bag", "Drop bags labelled (if used)"),
        _item("post-race", "Dry clothes and recovery snack for the finish"),
    ]
    if fam in ("tri",):
        items.append(
            _item("transition-bag", "Transition bag packed the night before", priority="high")
        )
    return {"id": "race-day", "title": "Race-day admin", "kind": "checklist", "items": items}
