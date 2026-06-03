# strem-user-service

User profiles, onboarding state, and the XP / rank / medal progression module
for STREM. This service is the source of truth for personalization data that is
not authentication (see `strem-docs/architecture/service-map.md`).

This repository is currently a **skeleton**: a FastAPI app with a health
endpoint and the MVP data models defined as Pydantic schemas. There is no
database, persistence, or XP calculation logic yet — those follow once the
contract is finalized in `strem-shared-contracts/contracts/user/openapi.yml`.

## What it does (now)

- `GET /health` → `{"status": "ok", "service": "strem-user-service"}`
- Defines MVP schemas in `app/schemas/` (no persistence yet)

## Data models (`app/schemas/`)

| Schema | Purpose |
|--------|---------|
| `UserProfile` | `id`, `username`, `email`, `identity_goal`, `created_at` |
| `XPLedgerEntry` | `id`, `user_id`, `xp_amount`, `source`, `earned_at` (append-only) |
| `UserRank` | The 5 MVP ranks: Initiate, Builder, Forged, Hybrid, Warrior |
| `Medal` / `MedalType` | The 10 MVP medals |

All enums and weights mirror `strem-docs/product/game-systems.md` and the
published user contract — they are not redefined independently.

### XP sources (game-systems.md)

| Source | XP |
|--------|----|
| `strength_session` | 50 |
| `running_session` | 40 |
| `mobility_recovery` | 30 |
| `nutrition_day` | 25 |
| `tribe_checkin` | 20 |
| `mission_complete` | 75–150 |
| `challenge_complete` | 100–500 |
| `streak_7_day` | 200 |
| `streak_30_day` | 1000 |

Fixed weights are in `XP_FIXED`; variable-reward ranges are in `XP_RANGE`
(`app/schemas/xp.py`).

## Run locally

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

uvicorn app.main:app --reload   # http://localhost:8000/health
```

## Run with Docker

```bash
docker build -t strem-user-service .
docker run -p 8000:8000 --env-file .env strem-user-service
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check
pytest            # tests
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string for the user database. |
| `JWT_SECRET` | Secret used to verify access tokens issued by strem-auth-service. |

## Structure

```
strem-user-service/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app + /health
│   └── schemas/
│       ├── __init__.py
│       ├── user.py        # UserProfile
│       ├── xp.py          # XPSource, XPLedgerEntry, XP weights
│       └── game.py        # UserRank, Medal, MedalType, rank bands
├── tests/
│   └── test_health.py
├── .github/workflows/ci.yml
├── Dockerfile             # multi-stage build
├── .env.example
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
└── README.md
```

## Out of scope (skeleton)

No database connection or migrations, no auth middleware, and no XP calculation
logic yet — schemas only, per strem-user-service#1.
