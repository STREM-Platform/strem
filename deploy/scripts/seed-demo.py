"""Seed a realistic local Race OS demo account through the API gateway.

This script does not insert database rows directly. It calls the same HTTP
contracts the mobile app uses: the demo athlete gets a profile, race history,
eight weeks of logged training, today's check-in and one Race Mission with an
openly licensed cover photo. Then the race team builds every layer (training
plan, fuel, gear, logistics, strategy). Without an Anthropic key or credit the
deterministic race engine builds them and says so.

Pass --course with a GPX/ZIP you are allowed to use to attach a real course
(elevation profile, climbs, map). Course files are never committed.

Run it again any day to keep the account current: it logs the plan's sessions
since the last logged one (missing roughly one in seven, like a real athlete)
and fills in the last two weeks of check-ins, so the tracker, calendar, trends
and cockpit always have recent data. Nothing is duplicated.
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from typing import Any

DEFAULT_EMAIL = "race-demo@strem.app"
DEFAULT_PASSWORD = "NeverSettle123!"
DEFAULT_DISPLAY_NAME = "Alex Demo"
SEED_NOTE = "Race OS demo seed"

COVER_FIELDS = (
    "url",
    "thumb_url",
    "title",
    "creator",
    "creator_url",
    "license",
    "license_url",
    "source_url",
    "provider",
    "depicts",
)

MISSION_NAME = "Swabian Alb Trail 50K"
PREFERRED_COVER = "Lochen, Schwäbische Alb"

# Synthetic athlete story: a DNF in the heat in June, a strong 30K in September,
# now preparing alone for a first 50K abroad.
RACE_HISTORY: list[dict[str, Any]] = [
    {
        "name": "Sofia Half Marathon",
        "race_date": "2025-10-11",
        "sport": "road_running",
        "location_name": "Sofia, Bulgaria",
        "distance_km": 21.1,
        "elevation_gain_m": 120,
        "status": "finished",
        "finish_minutes": 106,
        "rating": 4,
        "lessons": ["Holding back to km 12 and finishing strong beat going out hard."],
    },
    {
        "name": "Rila Trail 24K",
        "race_date": "2026-06-13",
        "sport": "trail_running",
        "location_name": "Rila, Bulgaria",
        "distance_km": 24.0,
        "elevation_gain_m": 1450,
        "status": "dnf",
        "conditions": "29 °C on an exposed ridge, no shade.",
        "fueling_notes": "Only water and two gels, no salt. Calves cramped at 2 h 40.",
        "gear_notes": "New shoes with under 30 km on them; heel blister by km 10.",
        "notes": "Dropped at km 17 when cramps stopped me on the long descent.",
        "lessons": [
            "Take electrolytes every hour in heat, not just water.",
            "Never race in shoes with less than 50 km on them.",
            "Train descents: my quads gave out before my lungs did.",
        ],
    },
    {
        "name": "Vitosha Trail 30K",
        "race_date": "2026-09-26",
        "sport": "trail_running",
        "location_name": "Vitosha, Sofia",
        "distance_km": 30.0,
        "elevation_gain_m": 1600,
        "status": "finished",
        "finish_minutes": 252,
        "placement": "112 / 240",
        "rating": 4,
        "conditions": "14 °C, fog on the summit, muddy forest trails.",
        "fueling_notes": "Gel every 35 min plus salt caps; boiled potatoes at the aid stations.",
        "gear_notes": "Poles on the final climb saved my legs.",
        "lessons": [
            "Eating every 30–35 minutes worked: no bonk.",
            "Poles pay off on climbs over 300 m.",
            "Start slower: places lost in the first 5 km came back later.",
        ],
    },
]


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
    parser.add_argument("--course", type=Path, help="GPX or ZIP file to attach as the race course")
    parser.add_argument(
        "--rebuild", action="store_true", help="rebuild every layer even if they exist"
    )
    return parser.parse_args()


def request_json(
    method: str,
    base_url: str,
    path: str,
    body: dict[str, Any] | None = None,
    token: str | None = None,
    expected: tuple[int, ...] = (200, 201),
    headers: dict[str, str] | None = None,
    timeout: float = 30,
) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    all_headers = {"Content-Type": "application/json", **(headers or {})}
    if token:
        all_headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=all_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
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


def accept_legal(base_url: str, token: str) -> None:
    legal = request_json("GET", base_url, "/users/me/legal", token=token)
    acceptances = [
        {"document_type": doc["document_type"], "version": doc["required_version"]}
        for doc in legal["documents"]
    ]
    request_json(
        "POST", base_url, "/users/me/legal/accept", {"acceptances": acceptances}, token=token
    )


def seed_race_history(base_url: str, token: str) -> int:
    existing = request_json("GET", base_url, "/users/me/races", token=token)
    names = {race["name"] for race in existing["items"]}
    added = 0
    for race in RACE_HISTORY:
        if race["name"] not in names:
            request_json("POST", base_url, "/users/me/races", race, token=token)
            added += 1
    return added


def training_week(week: int) -> list[tuple[int, dict[str, Any]]]:
    """(weekday, session) pairs for one week; week 0 is eight weeks ago."""
    long_minutes = [105, 120, 135, 0, 140, 155, 170, 0][week]
    sessions: list[tuple[int, dict[str, Any]]] = [
        (1, {"session_type": "running", "duration_minutes": 45 + week, "distance_km": round(8.0 + week * 0.2, 1), "elevation_m": 90, "avg_hr": 141, "title": "Easy run"}),
        (2, {"session_type": "strength", "duration_minutes": 40, "title": "Strength: legs and core"}),
    ]
    if week != 4:  # a work trip ate this week's hill session
        sessions.append(
            (3, {"session_type": "trail_running", "duration_minutes": 60, "distance_km": 9.5, "elevation_m": 380 + week * 20, "avg_hr": 152, "title": "Hill repeats"})
        )
    if week == 3:  # Vitosha Trail 30K on Saturday, recovery hike on Sunday
        sessions.append(
            (5, {"session_type": "trail_running", "duration_minutes": 252, "distance_km": 30.0, "elevation_m": 1600, "avg_hr": 156, "title": "Vitosha Trail 30K", "is_race": True})
        )
        sessions.append(
            (6, {"session_type": "hiking", "duration_minutes": 50, "distance_km": 4.0, "elevation_m": 150, "avg_hr": 108, "title": "Recovery walk"})
        )
    elif long_minutes:
        sessions.append(
            (5, {"session_type": "trail_running", "duration_minutes": long_minutes, "distance_km": round(long_minutes / 7.4, 1), "elevation_m": long_minutes * 6, "avg_hr": 144, "title": "Long trail run"})
        )
        sessions.append(
            (6, {"session_type": "running", "duration_minutes": 40, "distance_km": 7.0, "elevation_m": 60, "avg_hr": 136, "title": "Recovery run"})
        )
    return sessions


def seed_training(base_url: str, token: str, today: date) -> int:
    existing = request_json("GET", base_url, "/training/sessions?limit=200", token=token)
    if any((item.get("notes") or "").startswith(SEED_NOTE) for item in existing["items"]):
        return 0
    first_monday = today - timedelta(days=today.weekday()) - timedelta(weeks=7)
    added = 0
    for week in range(8):
        for weekday, session in training_week(week):
            day = first_monday + timedelta(weeks=week, days=weekday)
            if day >= today:
                continue
            start = datetime.combine(day, time(5, 30), tzinfo=UTC)
            body = {**session, "notes": f"{SEED_NOTE}: synthetic session", "logged_at": start.isoformat()}
            request_json("POST", base_url, "/training/sessions", body, token=token)
            added += 1
    return added


PLAN_TO_SESSION = {"brick": "cycling"}
SESSION_TYPES = {
    "strength", "running", "trail_running", "cycling", "swimming",
    "mobility", "hybrid", "hiking", "rowing", "skiing",
}


def top_up_training(base_url: str, token: str, mission_id: str, today: date) -> int:
    """Log the plan's sessions from the day after the latest logged one up to yesterday."""
    try:
        plan = request_json("GET", base_url, f"/training/missions/{mission_id}/plan", token=token)
    except ApiFailure:
        return 0  # no plan yet: nothing to log against
    weeks = (plan.get("content") or {}).get("weeks") or []
    existing = request_json("GET", base_url, "/training/sessions?limit=200", token=token)
    logged = [str(item.get("logged_at", ""))[:10] for item in existing["items"]]
    since = max(logged, default=(today - timedelta(days=1)).isoformat())
    added = 0
    planned = [s for w in weeks for s in w.get("sessions") or []]
    for index, session in enumerate(sorted(planned, key=lambda s: s.get("date", ""))):
        day = str(session.get("date", ""))
        if not (since < day < today.isoformat()) or session.get("kind") in ("rest", "race"):
            continue
        sport = PLAN_TO_SESSION.get(session.get("sport"), session.get("sport"))
        if sport not in SESSION_TYPES or index % 7 == 3:  # a real athlete misses some
            continue
        minutes = int(session.get("duration_minutes") or 45)
        body: dict[str, Any] = {
            "session_type": sport,
            "title": session.get("title") or "Training",
            "duration_minutes": max(10, round(minutes * (0.92 + (index % 5) * 0.03))),
            "notes": f"{SEED_NOTE}: logged to plan",
            "logged_at": datetime.combine(date.fromisoformat(day), time(6, 0), tzinfo=UTC).isoformat(),
        }
        if session.get("distance_km"):
            body["distance_km"] = round(float(session["distance_km"]) * 0.97, 1)
        if session.get("elevation_m"):
            body["elevation_m"] = int(session["elevation_m"])
        request_json("POST", base_url, "/training/sessions", body, token=token)
        added += 1
    return added


def seed_checkins(base_url: str, token: str, today: date) -> int:
    """Two weeks of check-ins with a believable rhythm, filling only missing days."""
    existing = request_json("GET", base_url, "/training/checkins?limit=28", token=token)
    have = {item["day"] for item in existing["items"]}
    added = 0
    for back in range(14, 0, -1):
        day = today - timedelta(days=back)
        if day.isoformat() in have:
            continue
        rough = back in (5, 6)  # a short bad patch: poor sleep after a hard weekend
        body = {
            "day": day.isoformat(),
            "sleep_quality": 2 if rough else 3 + (back % 3 != 0),
            "sleep_hours": 5.9 if rough else round(6.8 + (back % 4) * 0.3, 1),
            "energy": 2 if rough else 3 + (back % 2),
            "soreness": 3 if day.weekday() in (0, 6) else 2,
            "stress": 4 if rough else 2 + (back % 3 == 1),
            "motivation": 4 if rough else 5,
        }
        request_json("PUT", base_url, "/training/checkins", body, token=token)
        added += 1
    return added


def ensure_mission(base_url: str, token: str, today: date) -> tuple[dict[str, Any], bool]:
    active = request_json("GET", base_url, "/race-missions?state=active", token=token)
    for mission in active["items"]:
        if mission["event"]["name"] == MISSION_NAME:
            return mission, False

    query = urllib.parse.urlencode({"location": "Lochen", "sport": "trail_running"})
    photos = request_json("GET", base_url, f"/ai/enrich/photos?{query}", token=token, timeout=60)
    items = photos["items"]
    pick = next((p for p in items if p.get("title") == PREFERRED_COVER), items[0] if items else None)
    cover = {key: pick[key] for key in COVER_FIELDS if pick.get(key) is not None} if pick else None

    body = {
        "event": {
            "name": MISSION_NAME,
            "race_date": "2027-04-17",
            "timezone": "Europe/Berlin",
            "location_name": "Balingen, Swabian Alb",
            "distance_km": 50.0,
            "elevation_gain_m": 1900,
            "cutoff_minutes": 600,
            "sport": "trail_running",
            "format": "single_day",
            "support": "aid_stations",
            "start_time": "07:30",
            "latitude": 48.2423,
            "longitude": 8.9253,
            "country_code": "DE",
            "description": (
                "A first 50 km on the limestone escarpment of the Swabian Alb: forest "
                "single track, steep climbs to the ridge and long runnable descents."
            ),
        },
        "goal": {
            "outcome": "finish_confidently",
            "motivation": "Finish what Rila didn't let me: strong on the last descent, not cramping.",
            "priority": "A",
        },
        "cover": cover,
        "preparation": {
            "experience": "some",
            "start_date": today.isoformat(),
            "training_days_per_week": 5,
            "weekly_hours": 8,
            "long_session_day": "saturday",
            "current_weekly_km": 40,
            "current_weekly_hours": 6,
            "longest_recent_km": 30,
            "longest_recent_hours": 4.2,
            "strength_sessions_per_week": 1,
            "terrain_access": ["trails", "mountains", "rolling_hills", "gym"],
            "constraints": "Office job and two kids: weekday sessions before 7:30, long run Saturday morning.",
            "home_location": "Sofia, Bulgaria",
            "travel_notes": "Flying Sofia to Stuttgart two days before the race, then renting a car.",
        },
    }
    mission = request_json(
        "POST",
        base_url,
        "/race-missions",
        body,
        token=token,
        headers={"Idempotency-Key": f"seed-demo-{today.isoformat()}"},
    )
    return mission, True


def attach_course(base_url: str, token: str, mission_id: str, course: Path) -> str:
    try:
        request_json("GET", base_url, f"/training/missions/{mission_id}/course", token=token)
        return "kept the existing course"
    except ApiFailure as exc:
        if exc.status != 404:
            raise
    payload = {"content_base64": base64.b64encode(course.read_bytes()).decode("ascii")}
    request_json(
        "PUT",
        base_url,
        f"/training/missions/{mission_id}/course",
        payload,
        token=token,
        headers={"If-Match": '"0"'},
        timeout=120,
    )
    return f"uploaded {course.name}"


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    today = date.today()

    print(f"Seeding the STREM Race OS demo through {base_url}")
    session = register_or_login(base_url, args.email, args.password, args.display_name)
    token = session["tokens"]["access_token"]

    accept_legal(base_url, token)
    request_json(
        "POST",
        base_url,
        "/users/onboarding",
        {
            "display_name": args.display_name,
            "identity_statement": "I race to find out what I can do on the hardest day.",
            "transformation_goal": "build_endurance",
            "training_level": "intermediate",
            "weekly_target_days": 5,
            "timezone": "Europe/Sofia",
            "screen": "identity",
        },
        token=token,
    )
    request_json(
        "PUT",
        base_url,
        "/users/me/athlete-profile",
        {
            "height_cm": 178,
            "weight_kg": 72.5,
            "age_band": "30_39",
            "years_training": 4,
            "equipment_access": "home_gym",
            "personal_records": [
                {"exercise": "Half marathon", "time": "1:46:20"},
                {"exercise": "10K", "time": "47:05"},
            ],
            "injuries": [
                {"area": "Left knee", "note": "IT band irritation on long descents in 2025."}
            ],
            "dietary_constraints": ["Lactose intolerant"],
        },
        token=token,
    )
    races = seed_race_history(base_url, token)
    sessions = seed_training(base_url, token, today)
    request_json(
        "PUT",
        base_url,
        "/training/checkins",
        {
            "day": today.isoformat(),
            "sleep_quality": 4,
            "sleep_hours": 7.2,
            "energy": 4,
            "soreness": 2,
            "stress": 3,
            "motivation": 5,
        },
        token=token,
    )

    mission, created = ensure_mission(base_url, token, today)
    mission_id = mission["id"]
    course = attach_course(base_url, token, mission_id, args.course) if args.course else None

    layers = request_json("GET", base_url, f"/race-missions/{mission_id}/layers", token=token)
    built = None
    if args.rebuild or not layers["items"]:
        print("Building the race layers (the AI race team can take a few minutes)...")
        built = request_json(
            "POST", base_url, f"/ai/race/{mission_id}/build", {}, token=token, timeout=600
        )
    topped = top_up_training(base_url, token, mission_id, today)
    checkins = seed_checkins(base_url, token, today)

    print("")
    print("Demo account ready.")
    print(f"Email:    {args.email}")
    print(f"Password: {args.password}")
    print("")
    print(f"Mission:  {MISSION_NAME} ({'created' if created else 'existing'}) {mission_id}")
    print(f"Cover:    {(mission.get('cover') or {}).get('title') or 'none'}")
    print(f"History:  {races} race(s) added | Training: {sessions} session(s) added")
    print(f"Kept current: {topped} plan session(s) logged | {checkins} check-in(s) added")
    if course:
        print(f"Course:   {course}")
    if built:
        for result in built.get("results", []):
            reason = result.get("error") or result.get("ai_reason") or ""
            print(f"  {result.get('kind'):<9} {result.get('origin') or '-':<7} {reason[:90]}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ApiFailure as error:
        print(f"API failure: {error}", file=sys.stderr)
        sys.exit(1)
