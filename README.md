# strem-user-service

Private Race Missions, user profiles, onboarding state, and retained legacy progression
for STREM. This service is the source of truth for personalization data that is
not authentication (see `strem-docs/architecture/service-map.md`).

Profile, onboarding, and progression (XP ledger, ranks, medals) endpoints
implement `strem-shared-contracts/contracts/user/openapi.yml`. Progression
events are published to Redis Streams per `event-driven-strategy.md`.

## Endpoints

### Race Mission foundation (#24)

Founder approved on 2026-10-08: authenticated private create/read/edit/archive,
one active mission per account, additive storage, and mission-only export/delete.
This does not authorize AI advice, activity integrations or migration of legacy data.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/race-missions` | Create; Idempotency-Key required. |
| GET | `/v1/race-missions/active` | Load current account's active mission. |
| GET/PATCH | `/v1/race-missions/{id}` | Owned read/edit; edits require If-Match version and correction reason. |
| POST | `/v1/race-missions/{id}/archive` | Archive, preserving history; If-Match and Idempotency-Key required. |
| GET/DELETE | `/v1/race-missions/data` | Export all owned missions/revisions, or permanently remove mission data with exact confirmation. |

Contract: `strem-shared-contracts/contracts/user/openapi.yml`. Missing optional
course facts stay null; source is always athlete_entry. No readiness, official
verification or plan is inferred. Archive is not deletion. Mission deletion removes
revisions and idempotency receipts too, but does not delete account/activity data.

Migration `0008_race_missions` adds three tables without changing existing rows.
Back up the target DB, verify DATABASE_URL, then run `alembic upgrade head` before
starting the new API. Deploy user API and gateway before the mobile consumer.
On rollback keep the additive tables and revert application code; do not downgrade
a populated database unless separately approved and backed up (downgrade deletes
the new tables). No real database migration is performed by the test suite.

Tests cover isolated SQLite migration/restart, separate-connection concurrent
creation/editing, JWT owner isolation, replay, history and deletion. PostgreSQL
deployment smoke tests and device/browser interaction QA remain release gates.

### Existing profile and legacy progression APIs

All routes are served under the `/v1` base path (the health probe is unversioned).
Every `/v1` route is authenticated with the access token issued by
`strem-auth-service` and scoped to the token's `user_id` ("me").

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness probe → `{"status":"ok","service":"strem-user-service"}`. |
| `GET`  | `/v1/users/me` | Full profile + game state (rank, total XP, medals). |
| `PATCH`| `/v1/users/me` | Update `display_name`, `identity_statement`, `transformation_goal`. |
| `POST` | `/v1/users/onboarding` | Upsert onboarding answers (per-screen); completes when all required fields are present. |
| `GET`  | `/v1/users/onboarding/status` | `not_started` / `in_progress` / `completed` + resume point. |
| `GET`  | `/v1/users/me/xp` | XP total, current rank, and progress to the next rank. |
| `GET`  | `/v1/users/me/xp/history` | Paginated XP ledger, newest first. |
| `GET`  | `/v1/users/me/medals` | Earned medals. |

## Onboarding model

Onboarding answers persist per screen (`onboarding-flow.md` recovery path), so
`POST /users/onboarding` accepts a partial payload plus an optional `screen`
marker and is idempotent. Onboarding is marked **completed** only when all five
required fields are present: `identity_statement`, `transformation_goal`,
`training_level`, `weekly_target_days`, `timezone`. `last_completed_screen`
drives the resume point so an abandoned flow continues at the next incomplete
screen.

Profiles are created lazily on first access, keyed by the auth `user_id`. Until
onboarding sets a display name, the profile falls back to the email local-part.

## Progression (XP, ranks, medals)

The append-only `xp_ledger` is the source of truth for total XP; XP never
decreases. `app/progression.py::award_xp` is the single internal entry point
(consumed by the domain-event consumers in strem-user-service#5): it appends to
the ledger, recomputes the total, derives the rank (`app/ranks.py`), unlocks
medals (`app/medals.py`), and publishes `user.xp_earned`, `user.rank_achieved`,
and `user.medal_earned` to Redis Streams (exact payloads per the shared event
schemas). Rank bands, the nine MVP XP sources, and the ten MVP medal conditions
mirror `strem-docs/product/game-systems.md` and the user contract — never
redefined independently.

Medal conditions that reference signals outside this service use the closest
faithful ledger proxy (documented in `app/medals.py`): e.g. the first
`tribe_checkin` implies tribe membership for `tribe_member`.

### Event consumers (the loop closer)

A separate worker (`python -m app.worker`) consumes the progression streams via a
Redis Streams consumer group and awards XP through `award_xp`. So logging an
action — or completing a mission or challenge — visibly produces XP:

- `training.session_logged` / `nutrition.day_logged` / `tribe.checkin_completed` → log XP.
- `ai.mission_completed` → `mission_complete` XP (the event's `xp_reward`, 75-150).
- `tribe.challenge_completed` → `challenge_complete` XP, the tribe collective pool distributed across participating members.
- After any award, **7-day (200) and 30-day (1000) consistency streak bonuses** are detected from the ledger and awarded once per user.

Per `event-driven-strategy.md`:

- **Idempotent** — dedupe by broker message id in `processed_events`; a
  redelivered event is a no-op (the ledger entry's `source_reference` is
  `"<stream>:<message_id>"`).
- **Retry** — a handler failure leaves the message un-acked; it is reclaimed and
  retried on the next pass.
- **Dead-letter** — malformed events, or ones exceeding `MAX_DELIVERIES`, move to
  `<stream>.dead`.

The `tribe.checkin_completed` consumer is wired now and stays idle until the
community service (Wave 2) starts publishing.

```bash
python -m app.worker   # run alongside the API (separate process)
```

## Run locally

Bring up Postgres via `strem-infra` (`docker compose up postgres`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8002/health
```

## Run with Docker

```bash
docker build -t strem-user-service .
docker run -p 8002:8000 --env-file .env strem-user-service
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check (strict)
pytest            # endpoint tests over httpx + in-memory SQLite
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string for the user database. |
| `JWT_SECRET` | Shared secret used to verify access tokens from strem-auth-service. |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`); must match strem-auth-service. |

## Structure

```
strem-user-service/
├── app/
│   ├── main.py            # FastAPI app factory + /health
│   ├── config.py          # env-backed Settings
│   ├── db.py              # async engine + session dependency
│   ├── deps.py            # JWT auth dependency + DI aliases
│   ├── security.py        # access-token verification
│   ├── errors.py          # contract-aligned Error responses
│   ├── models.py          # UserProfile ORM
│   ├── ranks.py           # rank derivation from total XP
│   ├── profiles.py        # profile + onboarding domain logic
│   ├── routers/           # profile + onboarding endpoints
│   └── schemas/           # enums, profile, onboarding, game, xp
├── alembic/               # migrations (0001_user_profiles)
├── tests/                 # endpoint tests over the ASGI app
├── Dockerfile
├── alembic.ini
├── .env.example
├── requirements.txt / requirements-dev.txt
├── pyproject.toml
└── README.md
```
