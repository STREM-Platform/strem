"""Seed PR detection (D1/D2) with the athlete's baseline PRs (#61).

An experienced athlete's FIRST logged lift would otherwise always look like a PR
(no prior record). Reading their stated PRs from the Athlete Baseline profile
(strem-user-service) gives a floor: a logged effort only counts as a PR if it
beats the seeded baseline. PRs are never fabricated — only a real logged lift is
ever recorded; the baseline is purely the comparison floor.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.autoregulation import estimated_1rm


def _norm(exercise: str) -> str:
    return exercise.strip().lower()


def baseline_e1rm_map(records: list[dict[str, Any]]) -> dict[str, float]:
    """Best seeded estimated-1RM per (normalised) exercise from the profile PRs.

    Only weight+reps PRs map to an e1RM floor; race-time PRs are skipped.
    """
    out: dict[str, float] = {}
    for record in records:
        exercise = str(record.get("exercise", "")).strip()
        kg = record.get("weight_kg")
        if not exercise or not isinstance(kg, int | float) or isinstance(kg, bool):
            continue
        reps = record.get("reps")
        reps_int = reps if isinstance(reps, int) and not isinstance(reps, bool) and reps > 0 else 1
        e1rm = estimated_1rm(reps_int, float(kg))
        key = _norm(exercise)
        out[key] = max(out.get(key, 0.0), e1rm)
    return out


async def load_pr_baseline(base_url: str, token: str) -> dict[str, float]:
    """Fetch the athlete profile and build the PR baseline floor.

    Best-effort: no token, user-service down, or no profile → an empty floor, so
    PR detection degrades to history-only and finishing a session never blocks.
    """
    if not token:
        return {}
    url = f"{base_url.rstrip('/')}/users/me/athlete-profile"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    except httpx.RequestError:
        return {}
    if res.status_code != 200:
        return {}
    records = res.json().get("personal_records", [])
    return baseline_e1rm_map(records if isinstance(records, list) else [])
