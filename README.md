# strem-training-service

Strength, running, and mobility **session logging** for STREM. Implements
`strem-shared-contracts/contracts/training/openapi.yml` and publishes
`training.session_logged` so `strem-user-service` can award XP.

Running stays in this service for MVP — there is no separate endurance service
(see `strem-docs/architecture/service-map.md`). This service does **not** own XP,
ranks, or medals.

## Endpoints

All routes are served under the `/v1` base path (the health probe is unversioned).
Every `/v1` route is authenticated with the access token from `strem-auth-service`
and scoped to the token's `user_id`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness probe → `{"status":"ok","service":"strem-training-service"}`. |
| `POST` | `/v1/training/sessions` | Log a strength / running / mobility session; publishes `training.session_logged`. |
| `GET`  | `/v1/training/sessions` | List the caller's sessions (paginated, newest first; optional `session_type` filter). |
| `GET`  | `/v1/training/sessions/{session_id}` | Get one of the caller's sessions by id. |

## Run locally

Bring up Postgres + Redis via `strem-infra` (`docker compose up`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8003/health
```

## Run with Docker

```bash
docker build -t strem-training-service .
docker run -p 8003:8000 --env-file .env strem-training-service
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
| `DATABASE_URL` | Async PostgreSQL connection string for the training database. |
| `JWT_SECRET` | Shared secret used to verify access tokens from strem-auth-service. |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`); must match strem-auth-service. |
| `MESSAGE_BROKER_URL` | Redis Streams broker for publishing `training.session_logged`. |
