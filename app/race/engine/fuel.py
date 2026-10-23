"""Race fueling and hydration plan.

Targets follow widely used sports-nutrition ranges: carbohydrate scales with
duration (30-60 g/h under ~2.5 h, 60-90 g/h beyond, built up by gut training),
fluid 400-800 ml/h by temperature (never forced beyond thirst), sodium
300-700 mg/h. Guidance only — not medical or dietetic advice.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import (
    estimate_finish,
    expected_temperature,
    family,
    hm,
    level,
    slug,
)


def carb_target(minutes: int, lvl: str, fam: str) -> tuple[int, int]:
    """(target g/h, starting g/h for gut training)."""
    if minutes < 75:
        return 0, 0
    if minutes < 150:
        return 45, 30
    if fam == "tri" or minutes < 300:
        target = 75 if lvl in ("experienced", "elite") else 60
    elif minutes < 720:
        target = 80 if lvl in ("experienced", "elite") else 65
    else:
        target = (
            70 if lvl in ("experienced", "elite") else 60
        )  # long ultras: real food, lower intensity
    return target, max(30, target - 30)


def fluid_target(temp_c: float | None, weight_kg: float | None) -> tuple[int, str]:
    if temp_c is None:
        base, label = 550, "temperate conditions assumed"
    elif temp_c >= 28:
        base, label = 750, f"hot ({temp_c:.0f} °C expected)"
    elif temp_c >= 20:
        base, label = 650, f"warm ({temp_c:.0f} °C expected)"
    elif temp_c >= 10:
        base, label = 550, f"mild ({temp_c:.0f} °C expected)"
    else:
        base, label = 450, f"cold ({temp_c:.0f} °C expected)"
    if weight_kg:
        base = int(base * max(0.85, min(1.15, weight_kg / 70)))
    return min(base, 850), label


def sodium_target(temp_c: float | None, minutes: int) -> int:
    value = 400
    if minutes >= 240:
        value += 100
    if temp_c is not None and temp_c >= 24:
        value += 150
    return min(value, 800)


def build_fuel(ctx: RaceContext) -> dict[str, Any]:
    fam, lvl = family(ctx), level(ctx)
    finish = estimate_finish(ctx)
    minutes = finish.minutes
    temp = expected_temperature(ctx)
    weight = ctx.weight_kg
    carbs, carbs_start = carb_target(minutes, lvl, fam)
    fluid, fluid_label = fluid_target(temp, weight)
    sodium = sodium_target(temp, minutes)
    hours = max(1, round(minutes / 60))
    assumptions = [
        f"Duration about {hm(minutes)} ({finish.note.lower()})",
        f"Fluid for {fluid_label}",
    ]
    if weight:
        assumptions.append(f"Body weight {weight:g} kg (your profile)")
    else:
        assumptions.append("No body weight in your profile — gram targets use per-hour ranges")
    multi_day = ctx.event.get("format") in ("multi_stage", "non_stop") or minutes > 24 * 60

    metrics = [
        {
            "label": "Carbohydrate",
            "value": str(carbs) if carbs else "optional",
            "unit": "g/h" if carbs else None,
            "note": "Short race: a sports drink or mouth rinse is enough"
            if not carbs
            else f"Build up from {carbs_start} g/h in training",
        },
        {
            "label": "Fluid",
            "value": f"{fluid - 100}-{fluid + 100}",
            "unit": "ml/h",
            "note": "Drink to thirst within this range",
        },
        {
            "label": "Sodium",
            "value": f"{sodium - 100}-{sodium + 100}",
            "unit": "mg/h",
            "note": "More if you are a salty sweater",
        },
    ]
    if weight and minutes >= 90:
        metrics.append(
            {
                "label": "Carb load",
                "value": f"{round(weight * 7)}-{round(weight * 10)}",
                "unit": "g/day",
                "note": "The 36-48 h before the race (7-10 g/kg)",
            }
        )
    if weight:
        metrics.append(
            {
                "label": "Race breakfast",
                "value": f"{round(weight * 1.5)}-{round(weight * 2)}",
                "unit": "g carbs",
                "note": "2.5-3 h before the start",
            }
        )

    sections: list[dict[str, Any]] = []
    if carbs:
        sections.append(_race_timeline(ctx, minutes, carbs, fluid, sodium, fam))
    sections.append(_pre_race(ctx, weight, minutes))
    sections.append(_rehearsals(ctx, carbs, carbs_start, minutes, temp))
    if multi_day:
        sections.append(
            {
                "id": "multi-day",
                "title": "Multi-day fueling",
                "kind": "checklist",
                "description": "Energy debt accumulates over days; real food and recovery meals matter as much as on-course carbs.",
                "items": [
                    {
                        "id": "real-food",
                        "title": "Plan savoury real food for hours 6+",
                        "detail": "Potatoes, rice balls, soup, wraps — sweet fatigue is real.",
                        "priority": "high",
                    },
                    {
                        "id": "recovery-meal",
                        "title": "Recovery meal within 60 min after each stage",
                        "detail": "Carbs + 25-30 g protein; rehydrate with sodium.",
                    },
                    {
                        "id": "caffeine-sleep",
                        "title": "Plan caffeine around sleep windows",
                        "detail": "Save caffeine for night sections and the final day.",
                    },
                ],
            }
        )
    warnings = [
        "Never try a new product on race day — race only with what worked in training.",
        "Drinking far beyond thirst can cause hyponatraemia; stay within the fluid range.",
        "Guidance only, not medical advice. With diabetes, GI conditions or other health conditions, plan fueling with a professional.",
    ]
    diet = [str(d).strip() for d in (ctx.profile or {}).get("dietary_constraints") or []]
    diet = [d for d in diet if d][:5]
    if diet:
        # The engine can't vet products; it makes the check an explicit task.
        assumptions.append("Your dietary needs (from your profile): " + ", ".join(diet))
        sections.insert(
            1 if carbs else 0,
            {
                "id": "dietary",
                "title": "Your dietary needs",
                "kind": "checklist",
                "description": "Race food hides ingredients. Check every product before you train with it.",
                "items": [
                    {
                        "id": slug(f"diet-{need}"),
                        "title": f"Check every gel, drink and bar: {need}",
                        "detail": "Read the full label, including any recovery drink or caffeine product.",
                        "priority": "high",
                    }
                    for need in diet
                ]
                + [
                    {
                        "id": "diet-aid-stations",
                        "title": "Find out exactly what the aid stations serve",
                        "detail": "If it doesn't fit your needs, carry everything you plan to eat.",
                    }
                ],
            },
        )
    return {
        "headline": (
            f"{carbs} g carbs, {fluid} ml fluid and ~{sodium} mg sodium per hour"
            if carbs
            else f"Hydration-led plan: {fluid} ml/h, carbs optional for a {hm(minutes)} race"
        ),
        "summary": (
            f"For about {hm(minutes)} of racing, aim for {carbs or 'little or no'} g of carbohydrate per hour "
            f"(~{carbs * hours if carbs else 0} g total), {fluid - 100}-{fluid + 100} ml of fluid and "
            f"{sodium - 100}-{sodium + 100} mg of sodium per hour. Start fueling in the first 20-30 minutes "
            "and keep the rhythm steady — small amounts every 20 minutes beat big feeds. "
            "Your long sessions are where you train the gut to handle this."
        ),
        "metrics": metrics[:12],
        "sections": sections,
        "warnings": warnings,
        "assumptions": assumptions,
        "sources": ["STREM race engine: sports-nutrition guideline ranges"],
    }


def _race_timeline(
    ctx: RaceContext, minutes: int, carbs: int, fluid: int, sodium: int, fam: str
) -> dict[str, Any]:
    hours = max(1, -(-minutes // 60))
    items: list[dict[str, Any]] = [
        {
            "id": "start-minus-15",
            "title": "15 min before the start",
            "detail": "Optional: one gel or 200-300 ml sports drink if the start is late morning.",
            "when": "T-15 min",
            "values": {"carbs_g": 20, "fluid_ml": 250, "sodium_mg": 0},
        }
    ]
    for hour in range(1, min(hours, 30) + 1):
        if fam == "tri" and hour == 1:
            items.append(
                {
                    "id": "h1-swim",
                    "title": "Swim — nothing to eat",
                    "detail": "Start fueling 10-15 min into the bike once your breathing settles.",
                    "when": "Hour 1",
                    "values": {"carbs_g": 0, "fluid_ml": 0, "sodium_mg": 0},
                }
            )
            continue
        hour_carbs = carbs if hour > 1 else int(carbs * 0.75)
        detail = _hour_detail(hour_carbs, fluid, hour, minutes)
        items.append(
            {
                "id": f"h{hour}",
                "title": f"Hour {hour}",
                "detail": detail,
                "when": f"{hm((hour - 1) * 60)}–{hm(min(hour * 60, minutes))}",
                "values": {"carbs_g": hour_carbs, "fluid_ml": fluid, "sodium_mg": sodium},
            }
        )
    return {
        "id": "race-day",
        "title": "Race-day intake, hour by hour",
        "kind": "table",
        "description": "Spread each hour's intake into 3 portions (every ~20 min). Set a watch alert.",
        "columns": ["carbs_g", "fluid_ml", "sodium_mg"],
        "items": items[:120],
    }


def _hour_detail(carbs: int, fluid: int, hour: int, total: int) -> str:
    gels = max(1, round(carbs / 25))
    if hour >= 5 and total > 360:
        return f"Mix it up: {gels - 1} gel(s) plus real food (≈25 g carbs); {fluid} ml with electrolyte."
    return f"≈{gels} gel(s) or equivalent drink mix; {fluid} ml with electrolyte."


def _pre_race(ctx: RaceContext, weight: float | None, minutes: int) -> dict[str, Any]:
    race = ctx.race_date
    load = minutes >= 90
    items = []
    if load:
        items.append(
            {
                "id": "carb-load",
                "title": "Carb load 36-48 h out",
                "detail": (
                    f"About {round(weight * 7)}-{round(weight * 10)} g carbs/day"
                    if weight
                    else "About 7-10 g carbs per kg body weight per day"
                )
                + " — rice, pasta, bread, potatoes, juice. Cut fibre and fat.",
                "due_date": (race - timedelta(days=2)).isoformat(),
                "priority": "high",
            }
        )
    items.extend(
        [
            {
                "id": "dinner",
                "title": "Familiar, simple dinner the night before",
                "detail": "Carb-rich, low fibre, nothing new or spicy. Eat early.",
                "due_date": (race - timedelta(days=1)).isoformat(),
            },
            {
                "id": "breakfast",
                "title": "Race breakfast 2.5-3 h before the start",
                "detail": (
                    f"{round(weight * 1.5)}-{round(weight * 2)} g carbs"
                    if weight
                    else "1.5-2 g carbs per kg"
                )
                + " — e.g. oats with honey and banana, white bread with jam. Coffee only if you train with it.",
                "due_date": race.isoformat(),
                "priority": "high",
            },
            {
                "id": "pre-hydrate",
                "title": "Pre-hydrate with sodium",
                "detail": "500 ml with electrolyte 2 h before; sip to thirst after that.",
                "due_date": race.isoformat(),
            },
        ]
    )
    return {
        "id": "pre-race",
        "title": "Race week and race morning",
        "kind": "timeline",
        "items": items,
    }


def _rehearsals(
    ctx: RaceContext, carbs: int, carbs_start: int, minutes: int, temp: float | None
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    if carbs:
        items.append(
            {
                "id": "gut-training",
                "title": f"Gut-train from {carbs_start} to {carbs} g/h",
                "detail": "Add ~10 g/h each long session until race-day intake feels normal.",
                "priority": "critical",
            }
        )
        items.append(
            {
                "id": "choose-products",
                "title": "Choose race products (gels, drink mix, chews)",
                "detail": "Prefer glucose + fructose blends for intakes above 60 g/h. Check what aid stations serve.",
                "priority": "high",
            }
        )
    items.extend(
        [
            {
                "id": "sweat-test",
                "title": "Do a sweat-rate test",
                "detail": "Weigh before and after a 60-min session (no toilet): kg lost + litres drunk = sweat rate per hour.",
            },
            {
                "id": "breakfast-test",
                "title": "Rehearse race breakfast before a long session",
                "detail": "Same food, same timing as race morning.",
                "priority": "high",
            },
        ]
    )
    if minutes >= 150:
        items.append(
            {
                "id": "caffeine-plan",
                "title": "Test caffeine timing (optional)",
                "detail": "If you use it: ~3 mg/kg about an hour before a key effort or in the second half.",
            }
        )
    if temp is not None and temp >= 22:
        items.append(
            {
                "id": "heat-fuel",
                "title": "Practice fueling in the heat",
                "detail": "Run one or two long sessions in warm conditions with race fluids and sodium.",
                "priority": "high",
            }
        )
    return {
        "id": "rehearsals",
        "title": "Rehearse in training",
        "kind": "checklist",
        "description": "Mark each one tested once it worked in a long session.",
        "items": items,
    }
