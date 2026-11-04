# strem-user-service

Profiles, onboarding, legal acceptance, the athlete profile, and the Race OS
records — Race Missions, their Race Lab layers and race history — for STREM
(strem-docs#26). It is the source of truth for personalization data that
is not authentication.

## Endpoints

All routes are under `/v1` (the health probe is unversioned), authenticated with
the access token from `strem-auth-service` and scoped to the token's user.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness probe. |
| `GET`/`PATCH` | `/v1/users/me` | Profile; update display name, identity statement, goal. |
| `POST` | `/v1/users/onboarding` | Upsert onboarding answers; completes when the required fields are present. |
| `GET` | `/v1/users/onboarding/status` | Onboarding status and resume point. |
| `GET` | `/v1/users/me/legal` · `POST …/legal/accept` | Versioned Terms, Privacy and Medical Disclaimer acceptance. |
| `GET`/`PUT` | `/v1/users/me/athlete-profile` | Weight, injuries, dietary needs, experience — inputs that change decisions. |
| `POST`/`GET` | `/v1/race-missions` | Create (Idempotency-Key) / list (`?state=`). Up to 12 active missions. |
| `GET` | `/v1/race-missions/active` | The focus: the nearest upcoming active mission. |
| `GET`/`PATCH` | `/v1/race-missions/{id}` | Read / edit (If-Match + correction reason). |
| `POST` | `/v1/race-missions/{id}/complete` · `/archive` | Close with a result (adds it to race history) / archive. |
| `GET`/`DELETE` | `/v1/race-missions/data` | Export everything (incl. layers, plans, courses) / permanently delete mission data. |
| `GET` | `/v1/race-missions/{id}/course-access` | Training-service's ownership + deletion-fence check. |
| `GET`/`PUT`/`DELETE` | `/v1/race-missions/{id}/layers[/{kind}]` | Race Lab layers (fuel, gear, logistics, strategy), If-Match versions. |
| `PATCH` | `/v1/race-missions/{id}/layers/{kind}/items/{item_id}` | One item's status and note. |
| `GET`/`POST`/`PUT`/`DELETE` | `/v1/users/me/races[/{id}]` | Race history; `POST /import` adds source-flagged races. |

## Behaviour worth knowing

- **Layers keep progress.** Replacing a layer (e.g. a rebuild by the race team)
  keeps each item's status and note by item id. Layers are writable only while the
  mission is active.
- **Deletion is coordinated.** Mission data deletion advances a per-owner
  generation and purges training-service courses and plans through its internal
  endpoint before erasing missions. A failed purge keeps the intent;
  retry DELETE to finish.
- **Onboarding** persists per screen and is idempotent; profiles are created on
  first access and fall back to the email local-part for a display name.
- **Retired features** (strem-docs#28): XP, ranks, medals, streaks, biomarkers,
  agent consent/autonomy and the XP event worker were removed. Their tables stay
  (models kept in `app/models.py`) — no drop migration without a retention decision.

## Migrations

`alembic upgrade head`. Race OS adds `0010_race_os` (several active missions,
`mission_layers`, `race_results`); its downgrade requires
`-x allow_race_os_data_loss=true`. Back up before migrating a populated database.

## Optional release tests

Use a new, disposable PostgreSQL container bound to loopback, with database name
`strem_mission_test`, and set `STREM_TEST_POSTGRES_URL` to its
`postgresql+asyncpg://...` URL (never your normal `DATABASE_URL`):

```text
python -m pytest tests/test_race_mission_postgres.py
```

With `STREM_TEST_GATEWAY_REPO` pointing at a local `strem-api-gateway` checkout:

```text
python -m pytest tests/test_race_mission_gateway_smoke.py
```

Both are skipped in ordinary CI unless configured.

## Run locally

Bring up Postgres via `strem-infra`, then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8002/health
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
| `JWT_SECRET` / `JWT_ALGORITHM` | Verify access tokens from strem-auth-service. |
| `COURSE_STORAGE_BASE_URL` | Internal training-service root (no `/v1`) for course/plan export and purge. |
