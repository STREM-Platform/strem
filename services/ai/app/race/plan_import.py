"""Import an athlete's own training plan (strem-mobile#118).

Sources: screenshots/photos and PDFs (read by the AI race team with vision) and
CSV or pasted text (read by a deterministic parser, so they work without AI).
Both produce the same raw sessions, which are normalized into the plan schema
and returned as a *draft*: nothing is saved until the athlete reviews it. The
athlete's plan is transcribed, never rebalanced — sanity checks become warnings.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.race.engine.common import day_text, hm, monday

MAX_SOURCES = 6
MAX_BASE64_CHARS = 8_000_000  # ~6 MB decoded per file
WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

PlanSport = Literal[
    "running",
    "trail_running",
    "cycling",
    "swimming",
    "strength",
    "mobility",
    "hiking",
    "rowing",
    "skiing",
    "hybrid",
    "brick",
    "rest",
    "other",
]
SessionKind = Literal[
    "easy",
    "long",
    "tempo",
    "intervals",
    "hills",
    "recovery",
    "strength",
    "mobility",
    "race_sim",
    "brick",
    "back_to_back",
    "technique",
    "test",
    "cross",
    "rest",
    "race",
]
Intensity = Literal["rest", "very_easy", "easy", "moderate", "steady", "threshold", "hard", "race"]
Phase = Literal["general", "base", "build", "specific", "peak", "taper", "race", "recovery"]


class ImportSource(BaseModel):
    kind: Literal["image", "pdf", "csv", "text"]
    media_type: str | None = Field(default=None, max_length=60)
    data_base64: str | None = Field(default=None, max_length=MAX_BASE64_CHARS)
    text: str | None = Field(default=None, max_length=60_000)
    name: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def has_payload(self) -> ImportSource:
        if self.kind in ("image", "pdf") and not self.data_base64:
            raise ValueError("Images and PDFs need data_base64")
        if self.kind in ("csv", "text") and not (self.text or "").strip():
            raise ValueError("CSV and text sources need text")
        if self.kind == "image" and self.media_type not in (
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
        ):
            raise ValueError("Images must be PNG, JPEG, WebP or GIF")
        return self


class PlanImportRequest(BaseModel):
    sources: list[ImportSource] = Field(min_length=1, max_length=MAX_SOURCES)
    # The first day of the imported plan when the source has no dates.
    start_date: date | None = None


# ── What the AI returns (also the shape the text parser fills) ──────────────


class AIImportSession(BaseModel):
    week: int | None = Field(description="Week number as written in the plan, if any")
    date: str | None = Field(description="ISO date (YYYY-MM-DD) only when the plan shows a date")
    weekday: Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"] | None
    title: str = Field(description="The session name as written")
    sport: PlanSport
    kind: SessionKind
    duration_minutes: int | None
    distance_km: float | None = Field(description="Kilometres; convert miles")
    elevation_m: int | None
    intensity: Intensity
    details: str = Field(description="Structure, paces, notes exactly as written; empty if none")


class AIImportWeek(BaseModel):
    week: int
    label: str | None = Field(description="The week's heading or theme, if written")
    phase: Phase | None


class AIImportedPlan(BaseModel):
    sessions: list[AIImportSession]
    weeks: list[AIImportWeek]
    start_date_hint: str | None = Field(description="ISO date the plan starts, only if shown")
    unreadable: list[str] = Field(description="Parts that could not be read with confidence")


IMPORT_RULES = """You transcribe an athlete's existing training plan from images, PDFs or text into structured data.
- Transcribe exactly what is written. Never add, remove, merge, improve or rebalance sessions — this is the athlete's plan.
- One entry per session. Multiple sessions on one day are separate entries; a written rest day is a session with kind "rest" and sport "rest".
- Tables: each cell is one session (a day with morning and evening columns has two); "-" or empty cells are nothing. A table with one row per weekday and no weeks is a weekly template: transcribe it once as week 1.
- Choices such as "Z2 Bike / Run / Stepper" are one session: keep the wording as the title, classify by the first option. Keep names like "Swim A" or "THE ERG" exactly; with no duration given, leave duration null.
- Durations in minutes, distances in kilometres (convert miles × 1.609), climbing in metres.
- Classify sport, kind and intensity from the wording (e.g. "long run" → running/long/easy; "6x800m" → running/intervals/hard; "gym" → strength/strength/moderate).
- Keep paces, reps and notes in `details` verbatim.
- If something is unreadable or ambiguous, leave the field null and describe it in `unreadable`. Do not guess dates that are not shown."""


# ── Deterministic parser (CSV and plain text) ───────────────────────────────

_DAY_NAMES = {
    "mon": 0,
    "monday": 0,
    "tue": 1,
    "tues": 1,
    "tuesday": 1,
    "wed": 2,
    "weds": 2,
    "wednesday": 2,
    "thu": 3,
    "thur": 3,
    "thurs": 3,
    "thursday": 3,
    "fri": 4,
    "friday": 4,
    "sat": 5,
    "saturday": 5,
    "sun": 6,
    "sunday": 6,
}
_WEEK_RE = re.compile(r"^\s*(?:week|wk|w)\s*\.?\s*(\d{1,2})\b[\s:.\-–]*(.*)$", re.I)
_ISO_RE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DMY_RE = re.compile(r"\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b")
_DAY_RE = re.compile(
    r"^\s*(" + "|".join(sorted(_DAY_NAMES, key=len, reverse=True)) + r")\b\.?[\s:,\-–]*", re.I
)
# "1h30", "2h 15min" — but never the distance in "2h 18 km".
_HM_RE = re.compile(
    r"\b(\d{1,2})\s*h(?:ours?|rs?)?"
    r"(?:\s*(\d{1,2})(?!\d)(?!\s*(?:km|k|mi|miles?)\b|\s*m\s*\+)(?:\s*(?:min|mins|m)\b|')?)?(?!\w)",
    re.I,
)
_MIN_RE = re.compile(r"\b(\d{1,3})\s*(?:min|mins|minutes|m\b(?!\s*(?:\+|d\+|vert|climb))|')", re.I)
_CLOCK_RE = re.compile(r"\b(\d{1,2}):(\d{2})(?::\d{2})?\b")
_KM_RE = re.compile(r"\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:km|k)\b", re.I)
_MI_RE = re.compile(r"\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:mi|mile|miles)\b", re.I)
_ELEV_RE = re.compile(
    r"\b(\d{2,5})\s*(?:m\s*\+|m\s*d\+|d\+|hm|m\s*vert|m\s*climb|vert)(?!\w)", re.I
)

# (keywords, sport, kind, intensity) — first match wins, so specific before generic.
_CLASSES: list[tuple[tuple[str, ...], str, str, str]] = [
    (("rest", "off", "day off", "recovery day"), "rest", "rest", "rest"),
    (("race", "parkrun", "event day"), "running", "race", "race"),
    (("brick",), "brick", "brick", "steady"),
    (("swim", "pool", "open water"), "swimming", "technique", "moderate"),
    (
        ("bike", "ride", "cycle", "cycling", "spin", "turbo", "zwift", "gravel", "mtb"),
        "cycling",
        "cross",
        "easy",
    ),
    (("strength", "gym", "weights", "core", "lift", "circuit"), "strength", "strength", "moderate"),
    (("yoga", "mobility", "stretch", "pilates", "foam"), "mobility", "mobility", "very_easy"),
    (("hike", "hiking", "walk", "fastpack"), "hiking", "easy", "easy"),
    (("row", "erg", "paddle", "kayak"), "rowing", "cross", "moderate"),
    (("hyrox", "hy", "wall balls", "sled"), "hybrid", "cross", "hard"),
    (("stepper", "stairmaster", "stair climber", "stairs"), "hybrid", "cross", "easy"),
    (("ski", "skimo", "nordic"), "skiing", "easy", "easy"),
    (
        ("interval", "repeats", "reps", "fartlek", "vo2", "track", "x400", "x800", "x1k", "x1000"),
        "running",
        "intervals",
        "hard",
    ),
    (
        ("tempo", "threshold", "lactate", "cruise", "marathon pace", "mp"),
        "running",
        "tempo",
        "threshold",
    ),
    (("hill", "hills", "uphill", "climb", "vert"), "trail_running", "hills", "hard"),
    (("long", "lsd"), "running", "long", "easy"),
    (("trail",), "trail_running", "easy", "easy"),
    (("recovery", "shakeout", "jog"), "running", "recovery", "very_easy"),
    (("easy", "aerobic", "base", "z2", "zone 2", "run"), "running", "easy", "easy"),
]
_REPS_RE = re.compile(r"\b\d+\s*[x×]\s*\d+", re.I)


@dataclass
class RawSession:
    title: str
    sport: str = "running"
    kind: str = "easy"
    intensity: str = "easy"
    week: int | None = None
    on: date | None = None
    weekday: int | None = None
    duration: int | None = None
    distance: float | None = None
    elevation: int | None = None
    details: str = ""


@dataclass
class RawPlan:
    sessions: list[RawSession] = field(default_factory=list)
    week_labels: dict[int, tuple[str | None, str | None]] = field(default_factory=dict)
    unparsed: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    start_hint: date | None = None


def _num(value: str) -> float:
    return float(value.replace(",", "."))


def classify(text: str) -> tuple[str, str, str]:
    # "Long Aerobic Run / Stepper / Bike" is a choice: the first option names it.
    if "/" in text:
        first = text.split("/", 1)[0]
        if first.strip() and (found := _classify(first))[0] != "other":
            return found
    return _classify(text)


def _classify(text: str) -> tuple[str, str, str]:
    lowered = f" {text.lower()} "
    if _REPS_RE.search(lowered):
        sport = "cycling" if any(w in lowered for w in (" bike", " ride", " watts")) else "running"
        return sport, "intervals", "hard"
    for words, sport, kind, intensity in _CLASSES:
        if any(re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", lowered) for w in words):
            return sport, kind, intensity
    return "other", "cross", "moderate"


def _duration(text: str) -> int | None:
    if m := _HM_RE.search(text):
        return int(m.group(1)) * 60 + int(m.group(2) or 0)
    if m := _MIN_RE.search(text):
        return int(m.group(1))
    if m := _CLOCK_RE.search(text):
        hours, minutes = int(m.group(1)), int(m.group(2))
        return hours * 60 + minutes if hours <= 12 else None
    return None


def _distance(text: str, plan: RawPlan) -> float | None:
    if m := _KM_RE.search(text):
        return round(_num(m.group(1)), 2)
    if m := _MI_RE.search(text):
        if "Distances in miles were converted to kilometres" not in plan.assumptions:
            plan.assumptions.append("Distances in miles were converted to kilometres")
        return round(_num(m.group(1)) * 1.609, 2)
    return None


def _date(text: str) -> date | None:
    try:
        if m := _ISO_RE.search(text):
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if m := _DMY_RE.search(text):
            year = int(m.group(3))
            return date(year + 2000 if year < 100 else year, int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None
    return None


def _title(text: str) -> str:
    """The session's name without the numbers the row already shows ("tempo 55 min" → "Tempo")."""
    for pattern in (_ELEV_RE, _HM_RE, _CLOCK_RE, _KM_RE, _MI_RE, _MIN_RE):
        text = pattern.sub(" ", text)
    text = re.sub(r"\s{2,}", " ", text).strip(" 	-–•*|,;:+")
    return (text[:1].upper() + text[1:])[:120]


def _session_from(
    text: str,
    plan: RawPlan,
    *,
    week: int | None,
    weekday: int | None,
    on: date | None,
    cell: bool = False,
) -> RawSession | None:
    cleaned = text.strip(" \t-–•*|")
    if not cleaned:
        return None
    sport, kind, intensity = classify(cleaned)
    duration, distance = _duration(cleaned), _distance(cleaned, plan)
    elevation = int(m.group(1)) if (m := _ELEV_RE.search(cleaned)) else None
    if sport == "other" and duration is None and distance is None and not cell:
        return None
    if kind == "long" and duration is not None and duration < 60 and distance is None:
        kind = "easy"
    title = _title(cleaned) or kind.replace("_", " ").capitalize()
    return RawSession(
        title=title,
        sport=sport,
        kind=kind,
        intensity=intensity,
        week=week,
        on=on,
        weekday=weekday,
        duration=duration,
        distance=distance,
        elevation=elevation,
    )


_COLUMNS = {
    "date": ("date", "day date", "datum"),
    "day": ("day", "weekday", "dow"),
    "week": ("week", "wk", "week no", "week number"),
    "title": ("workout", "session", "title", "training", "description", "activity", "plan", "name"),
    "sport": ("type", "sport", "discipline", "category"),
    "duration": ("duration", "time", "minutes", "mins", "length"),
    "distance": ("distance", "km", "kilometres", "kilometers", "miles"),
    "elevation": ("elevation", "vert", "climb", "gain", "d+"),
    "notes": ("notes", "details", "comment", "comments", "pace", "structure"),
}


def _parse_csv(text: str, plan: RawPlan) -> bool:
    sample = text[:4000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        return False
    rows = list(csv.reader(io.StringIO(text), dialect))
    if len(rows) < 2:
        return False
    header = [h.strip().lower() for h in rows[0]]
    cols: dict[str, int] = {}
    for key, names in _COLUMNS.items():
        for i, h in enumerate(header):
            if i not in cols.values() and (h in names or any(h.startswith(n) for n in names)):
                cols[key] = i
                break
    if "title" not in cols and "sport" not in cols:
        return False
    miles = "distance" in cols and "mile" in header[cols["distance"]]
    for raw in rows[1:]:
        if not any(cell.strip() for cell in raw):
            continue

        def cell(key: str, row: list[str] = raw) -> str:
            return row[cols[key]].strip() if key in cols and cols[key] < len(row) else ""

        text_bits = " ".join(b for b in (cell("title"), cell("sport")) if b)
        sport, kind, intensity = classify(text_bits or cell("notes"))
        week = int(m.group(1)) if (m := re.search(r"\d+", cell("week"))) else None
        weekday = _DAY_NAMES.get(cell("day").lower().strip(".")) if cell("day") else None
        on = _date(cell("date")) if cell("date") else None
        duration = _duration(cell("duration")) if cell("duration") else _duration(text_bits)
        if duration is None and cell("duration").replace(".", "").isdigit():
            duration = int(float(cell("duration")))
        distance = None
        if cell("distance"):
            try:
                distance = round(
                    _num(re.sub(r"[^\d.,]", "", cell("distance"))) * (1.609 if miles else 1), 2
                )
            except ValueError:
                distance = None
        elevation = (
            int(float(re.sub(r"[^\d.]", "", cell("elevation"))))
            if re.search(r"\d", cell("elevation"))
            else None
        )
        title = (cell("title") or cell("sport") or "Session")[:120]
        if sport == "other" and duration is None and distance is None:
            plan.unparsed.append(", ".join(raw)[:200])
            continue
        plan.sessions.append(
            RawSession(
                title=title,
                sport=sport,
                kind=kind,
                intensity=intensity,
                week=week,
                on=on,
                weekday=weekday,
                duration=duration,
                distance=distance,
                elevation=elevation,
                details=cell("notes")[:600],
            )
        )
    if miles:
        plan.assumptions.append("Distances in miles were converted to kilometres")
    return True


_EMPTY_CELL = re.compile(r"^[\s\-–—_.x/]*$|^(?:n/?a|none|off-?)$", re.I)


def _cells(line: str, wide_spaces: bool) -> list[str]:
    if "\t" in line:
        return [c.strip() for c in line.split("\t")]
    if line.strip().startswith("|") or line.count("|") >= 2:
        return [c.strip() for c in line.strip().strip("|").split("|")]
    if wide_spaces:
        return [c.strip() for c in re.split(r"\s{2,}", line.strip())]
    return [line.strip()]


def _day(cell: str) -> int | None:
    return _DAY_NAMES.get(cell.strip().lower().rstrip(".:"))


def _parse_grid(text: str, plan: RawPlan) -> bool:
    """A weekly table: one session per cell, several per day when there are
    morning/evening columns; '-' or empty cells are nothing."""
    lines = [ln for ln in text.splitlines() if ln.strip() and not re.fullmatch(r"[\s|:\-+]+", ln)]
    for wide in (False, True):
        rows = [_cells(ln, wide) for ln in lines]
        side = [r for r in rows if len(r) >= 2 and _day(r[0]) is not None]
        top = next((r for r in rows if sum(_day(c) is not None for c in r) >= 3), None)
        if len(side) >= 3:
            week: int | None = None
            for row in rows:
                weekday = _day(row[0]) if row else None
                if weekday is None:
                    if len(row) == 1 and (m := _WEEK_RE.match(row[0])):
                        week = int(m.group(1))
                        plan.week_labels[week] = (m.group(2).strip() or None, None)
                    continue  # header ("Day | Morning | Evening") or a note row
                for value in row[1:]:
                    if _EMPTY_CELL.match(value):
                        continue
                    session = _session_from(
                        value, plan, week=week, weekday=weekday, on=None, cell=True
                    )
                    if session:
                        plan.sessions.append(session)
            return bool(plan.sessions)
        if top is not None:
            columns = {i: d for i, c in enumerate(top) if (d := _day(c)) is not None}
            for index, row in enumerate(rows[rows.index(top) + 1 :], start=1):
                label = row[0] if row and 0 not in columns else ""
                m = _WEEK_RE.match(label) if label else None
                week = int(m.group(1)) if m else index
                if label:
                    plan.week_labels[week] = ((m.group(2).strip() if m else label) or None, None)
                for i, weekday in columns.items():
                    value = row[i] if i < len(row) else ""
                    if _EMPTY_CELL.match(value):
                        continue
                    session = _session_from(
                        value, plan, week=week, weekday=weekday, on=None, cell=True
                    )
                    if session:
                        plan.sessions.append(session)
            return bool(plan.sessions)
    return False


def parse_text(text: str, plan: RawPlan | None = None, *, csv_hint: bool = False) -> RawPlan:
    plan = plan or RawPlan()
    if not csv_hint and _parse_grid(text, plan):
        return plan
    if (
        csv_hint or text.count(",") + text.count(";") + text.count("\t") > text.count("\n")
    ) and _parse_csv(text, plan):
        return plan
    week: int | None = None
    weekday: int | None = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if m := _WEEK_RE.match(line):
            week = int(m.group(1))
            label = m.group(2).strip() or None
            plan.week_labels[week] = (label, None)
            continue
        on = _date(line)
        rest = line
        if m := _DAY_RE.match(line):
            weekday = _DAY_NAMES[m.group(1).lower()]
            rest = line[m.end() :]
        elif on is None:
            weekday = None
        if on is not None:
            rest = _ISO_RE.sub("", _DMY_RE.sub("", rest))
        # "Mon: easy 40 min + strength 30 min" → two sessions on the same day.
        parts = [p for p in re.split(r"\s+(?:\+|&|and|then)\s+|;", rest) if p.strip()] or [rest]
        found = False
        for part in parts:
            session = _session_from(part, plan, week=week, weekday=weekday, on=on)
            if session:
                plan.sessions.append(session)
                found = True
        if not found and len(line) > 2:
            plan.unparsed.append(line[:200])
    return plan


def from_ai(result: dict[str, Any], plan: RawPlan | None = None) -> RawPlan:
    plan = plan or RawPlan()
    parsed = AIImportedPlan.model_validate(result)
    for w in parsed.weeks:
        plan.week_labels[w.week] = (w.label, w.phase)
    for s in parsed.sessions:
        on = None
        if s.date:
            try:
                on = date.fromisoformat(s.date)
            except ValueError:
                on = None
        plan.sessions.append(
            RawSession(
                title=s.title[:120] or "Session",
                sport=s.sport,
                kind=s.kind,
                intensity=s.intensity,
                week=s.week,
                on=on,
                weekday=WEEKDAYS.index(s.weekday) if s.weekday else None,
                duration=s.duration_minutes,
                distance=s.distance_km,
                elevation=s.elevation_m,
                details=s.details[:600],
            )
        )
    plan.unparsed.extend(u[:200] for u in parsed.unreadable[:20])
    if parsed.start_date_hint:
        try:
            plan.start_hint = date.fromisoformat(parsed.start_date_hint)
        except ValueError:
            pass
    return plan


# ── Normalization into the plan schema ──────────────────────────────────────


_PHASE_WORDS: list[tuple[str, str]] = [
    ("recovery", "recovery"),
    ("taper", "taper"),
    ("peak", "peak"),
    ("race week", "race"),
    ("specific", "specific"),
    ("build", "build"),
    ("base", "base"),
    ("off-season", "recovery"),
]


def phase_from(label: str | None) -> str | None:
    """A week heading such as "Week 3 – build" names its phase."""
    lowered = (label or "").lower()
    return next((phase for word, phase in _PHASE_WORDS if word in lowered), None)


def _next_monday(today: date) -> date:
    return today + timedelta(days=(7 - today.weekday()) % 7 or 7) if today.weekday() else today


def normalize(
    raw: RawPlan,
    *,
    today: date,
    race_date: date | None,
    start_date: date | None,
    timezone: str,
    sport: str,
    title: str,
) -> tuple[dict[str, Any], list[str]]:
    """Dates, weeks and ids for the raw sessions; returns (plan content, warnings)."""
    assumptions = list(raw.assumptions)
    dated = [s.on for s in raw.sessions if s.on]
    if start_date:
        anchor = monday(start_date)
    elif dated:
        anchor = monday(min(dated))
    elif raw.start_hint:
        anchor = monday(raw.start_hint)
    else:
        anchor = _next_monday(today)
        assumptions.append(
            f"The plan had no dates; week 1 starts {day_text(anchor)} — change it before saving"
        )

    # Undated sessions: an explicit week number wins; otherwise weekdays run
    # forward and a weekday at or before the previous one starts a new week.
    current_week, last_weekday, sequential = 1, -1, 0
    placed: list[tuple[date, RawSession]] = []
    for s in raw.sessions:
        if s.on and not start_date:
            placed.append((s.on, s))
            continue
        if s.on and start_date:
            shift = monday(start_date) - monday(min(dated)) if dated else timedelta(0)
            placed.append((s.on + shift, s))
            continue
        if s.week is not None:
            if s.week != current_week:
                last_weekday = -1
            current_week = max(1, s.week)
        if s.weekday is not None:
            # Earlier weekday than the last one = next week; the same day again is a second session.
            if s.week is None and s.weekday < last_weekday:
                current_week += 1
            last_weekday = s.weekday
            day = anchor + timedelta(weeks=current_week - 1, days=s.weekday)
        else:
            day = anchor + timedelta(weeks=current_week - 1, days=min(sequential, 6))
            sequential += 1
        placed.append((day, s))
    if any(s.weekday is None and s.on is None for _, s in placed):
        assumptions.append(
            "Some sessions had no day; they were placed on consecutive days — check them"
        )

    by_week: dict[date, list[tuple[date, RawSession]]] = {}
    for day, s in sorted(placed, key=lambda item: item[0]):
        by_week.setdefault(monday(day), []).append((day, s))

    weeks: list[dict[str, Any]] = []
    for index, (start, items) in enumerate(sorted(by_week.items()), start=1):
        label, phase = raw.week_labels.get(index, (None, None))
        sessions: list[dict[str, Any]] = []
        for k, (day, s) in enumerate(items):
            minutes = s.duration if s.duration is not None else (0 if s.kind == "rest" else None)
            sessions.append(
                {
                    "id": f"imp-w{index}-{WEEKDAYS[day.weekday()]}-{k + 1}",
                    "date": day.isoformat(),
                    "sport": s.sport,
                    "kind": s.kind,
                    "title": s.title,
                    "purpose": s.details,
                    "duration_minutes": minutes,
                    "distance_km": s.distance,
                    "elevation_m": s.elevation,
                    "intensity": s.intensity,
                    "key": s.kind
                    in ("long", "intervals", "tempo", "hills", "race_sim", "race", "back_to_back"),
                }
            )
        hours = sum((x["duration_minutes"] or 0) for x in sessions if x["kind"] != "rest") / 60
        km = sum(x["distance_km"] or 0 for x in sessions)
        longest = max(
            (x for x in sessions if x["kind"] != "rest"),
            key=lambda x: x["duration_minutes"] or 0,
            default=None,
        )
        week_phase = phase or phase_from(label) or "general"
        # A bare "Week 3 – build" heading says no more than the phase does.
        bare = (label or "").strip().lower() in ("", week_phase)
        focus = f"{week_phase.capitalize()} week" if bare else (label or "").strip()
        weeks.append(
            {
                "index": index,
                "start_date": start.isoformat(),
                "phase": week_phase,
                "focus": focus[:240],
                "target_hours": round(hours, 1) if hours else None,
                "target_km": round(km, 1) if km else None,
                "long_session": f"{longest['title'][:60]} · {hm(longest['duration_minutes'])}"
                if longest and longest["duration_minutes"]
                else None,
                "sessions": sessions,
            }
        )

    first = date.fromisoformat(weeks[0]["start_date"]) if weeks else anchor
    content = {
        "headline": f"Your plan — {len(weeks)} week{'s' if len(weeks) != 1 else ''}",
        "summary": (
            f"Imported for {title}. This is your plan as you wrote it: the race team reviews it and may "
            "suggest changes, but never rewrites it without your OK."
        ),
        "sport": sport,
        "timezone": timezone,
        "start_date": (min(first, race_date) if race_date else first).isoformat(),
        "race_date": race_date.isoformat() if race_date else None,
        "phases": phase_spans(weeks, race_date),
        "weeks": weeks,
        "principles": [],
        "assumptions": assumptions[:16],
        "warnings": [],
    }
    warnings = sanity_warnings(weeks, race_date)
    content["warnings"] = warnings[:12]
    return content, warnings


def phase_spans(weeks: list[dict[str, Any]], race_date: date | None) -> list[dict[str, str]]:
    """Consecutive weeks of one phase form a block on the road-to-race-day bar."""
    spans: list[dict[str, str]] = []
    for w in weeks:
        week_end = date.fromisoformat(w["start_date"]) + timedelta(days=6)
        end = (min(week_end, race_date) if race_date else week_end).isoformat()
        if spans and spans[-1]["phase"] == w["phase"]:
            spans[-1]["end_date"] = end
        else:
            bare = w["focus"] == f"{w['phase'].capitalize()} week"
            goal = "As written in your plan" if bare else w["focus"]
            spans.append(
                {"phase": w["phase"], "start_date": w["start_date"], "end_date": end, "goal": goal}
            )
    # Plans hold at most 8 phase blocks: later blocks fold into the eighth.
    if len(spans) > 8:
        spans = spans[:7] + [{**spans[7], "end_date": spans[-1]["end_date"]}]
    return spans


def sanity_warnings(weeks: list[dict[str, Any]], race_date: date | None) -> list[str]:
    """The engine's checks, as advice: the athlete's plan is never rewritten."""
    out: list[str] = []
    previous: float | None = None
    for w in weeks:
        hours = w["target_hours"] or 0
        if previous and previous >= 2 and hours > previous * 1.3:
            out.append(
                f"Week {w['index']} jumps {round((hours / previous - 1) * 100)}% in time from the week before — big jumps raise injury risk."
            )
        previous = hours or previous
        days = {s["date"] for s in w["sessions"]}
        rest = any(s["kind"] == "rest" for s in w["sessions"])
        if len(days) >= 7 and not rest:
            out.append(f"Week {w['index']} has no rest day.")
    if weeks and race_date:  # a plan outside any race has no race day to check against
        last = date.fromisoformat(weeks[-1]["start_date"]) + timedelta(days=6)
        if last < race_date - timedelta(days=21):
            out.append(
                f"The plan ends {day_text(last)}, {(race_date - last).days} days before race day — the race team can fill the gap."
            )
        late = sum(
            1 for w in weeks for s in w["sessions"] if date.fromisoformat(s["date"]) > race_date
        )
        if late:
            out.append(f"{late} session(s) fall after race day.")
    return out
