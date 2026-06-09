"""Seed a real local STREM demo account through the API gateway.

This script does not insert database rows directly. It calls the same HTTP
contracts the mobile app uses, so the demo data exercises auth, onboarding,
tribes, training, nutrition, missions, and event-driven XP.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, date, datetime
from typing import Any

DEFAULT_EMAIL = "demo@strem.app"
DEFAULT_PASSWORD = "NeverSettle123!"
DEFAULT_DISPLAY_NAME = "Alex Demo"


class ApiFailure(RuntimeError):
    def __init__(self, status: int, body: Any) -> None:
        self.status = status
        self.body = body
        super().__init__(f"HTTP {status}: {body}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000/v1")
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--display-name", default=DEFAULT_DISPLAY_NAME)
    return parser.parse_args()


def request_json(
    method: str,
    base_url: str,
    path: str,
    body: dict[str, Any] | None = None,
    token: str | None = None,
    expected: tuple[int, ...] = (200, 201),
) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = response.read()
            if response.status not in expected:
                raise ApiFailure(response.status, payload.decode("utf-8"))
            if response.status == 204 or not payload:
                return None
            return json.loads(payload.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            parsed: Any = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        raise ApiFailure(exc.code, parsed) from exc


def register_or_login(base_url: str, email: str, password: str, display_name: str) -> dict[str, Any]:
    try:
        return request_json(
            "POST",
            base_url,
            "/auth/register",
            {"email": email, "password": password, "display_name": display_name},
        )
    except ApiFailure as exc:
        if exc.status != 409:
            raise
        return request_json(
            "POST",
            base_url,
            "/auth/login",
            {"email": email, "password": password},
        )


def get_or_create_tribe(base_url: str, token: str) -> dict[str, Any]:
    try:
        return request_json("GET", base_url, "/tribes/me", token=token)
    except ApiFailure as exc:
        if exc.status != 404:
            raise
        return request_json(
            "POST",
            base_url,
            "/tribes",
            {
                "name": "Forge Circle",
                "mission_statement": "Show up, report honestly, raise the standard.",
                "approval_required": False,
            },
            token=token,
        )


def poll_xp(base_url: str, token: str, initial_total: int) -> dict[str, Any]:
    latest: dict[str, Any] = {"total_xp": initial_total}
    for _ in range(20):
        latest = request_json("GET", base_url, "/users/me/xp", token=token)
        if int(latest["total_xp"]) > initial_total:
            return latest
        time.sleep(1)
    return latest


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")

    print(f"Seeding STREM demo data through {base_url}")
    session = register_or_login(base_url, args.email, args.password, args.display_name)
    token = session["tokens"]["access_token"]

    initial_xp = request_json("GET", base_url, "/users/me/xp", token=token)

    request_json(
        "POST",
        base_url,
        "/users/onboarding",
        {
            "display_name": args.display_name,
            "identity_statement": (
                "I am becoming a disciplined hybrid athlete who never negotiates "
                "with the baseline."
            ),
            "transformation_goal": "hybrid_athlete",
            "training_level": "intermediate",
            "preferred_modalities": ["strength", "running", "nutrition"],
            "weekly_target_days": 5,
            "nutrition_preference": "high_protein",
            "tribe_preference": "join_now",
            "timezone": "Europe/Sofia",
            "screen": "launch",
        },
        token=token,
    )

    tribe = get_or_create_tribe(base_url, token)

    request_json(
        "POST",
        base_url,
        "/training/sessions",
        {
            "session_type": "running",
            "duration_minutes": 45,
            "distance_km": 8.2,
            "notes": "Demo seed: controlled aerobic work before the day starts.",
            "logged_at": datetime.now(UTC).isoformat(),
        },
        token=token,
    )

    request_json(
        "POST",
        base_url,
        "/nutrition/days",
        {
            "date": date.today().isoformat(),
            "targets_met": True,
            "notes": "Demo seed: protein target hit and meals stayed deliberate.",
        },
        token=token,
    )

    request_json(
        "POST",
        base_url,
        f"/tribes/{tribe['id']}/checkins",
        {
            "completed_action": "running",
            "status_note": "Logged the proof. No drama, just direction.",
        },
        token=token,
    )

    try:
        request_json("POST", base_url, "/ai/missions/generate", token=token)
    except ApiFailure as exc:
        print(f"Mission generation skipped: {exc}")

    # Pre-generate this week's coach recap so the Coach screen opens with a real
    # narrative instead of an empty state during the demo.
    try:
        request_json("POST", base_url, "/ai/coach/recap/generate", token=token)
    except ApiFailure as exc:
        print(f"Recap generation skipped: {exc}")
    xp = poll_xp(base_url, token, int(initial_xp["total_xp"]))
    missions = request_json("GET", base_url, "/ai/missions/active", token=token)
    profile = request_json("GET", base_url, "/users/me", token=token)
    tribe = request_json("GET", base_url, "/tribes/me", token=token)
    xp = request_json("GET", base_url, "/users/me/xp", token=token)

    print("")
    print("Demo account ready.")
    print(f"Email:    {args.email}")
    print(f"Password: {args.password}")
    print("")
    print(f"Profile: {profile['display_name']} | {profile['rank']} | {xp['total_xp']} XP")
    print(f"Tribe:   {tribe['name']} | {tribe['tribe_power']} Tribe Power")
    print(f"Missions active: {len(missions['items'])}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ApiFailure as error:
        print(f"API failure: {error}", file=sys.stderr)
        sys.exit(1)
