# strem-ai-orchestrator

The Race OS **race team** for STREM (strem-docs#26, ADR 0008): it builds every
layer of a Race Mission — training plan, fuel, gear, logistics and race strategy —
writes the daily brief, answers questions and proposes adaptations. Implements the
race endpoints in `strem-shared-contracts/contracts/ai/openapi.yml`.

It owns no race facts and copies **no raw logs**. It reads the mission, course, plan,
progress, sessions, check-ins, race history and athlete profile through the user and
training service APIs with the athlete's token, and writes plans and layers back
through the same APIs. It stores only chat history, cached briefs and adaptation
proposals.

## How it works

- **Race engine** (`app/race/engine/`) — deterministic builds by sport family:
  periodized plan with lighter weeks and a duration-based taper, a progressing long
  session, fueling by duration/heat/weight, gear by format/night/conditions, dated
  logistics, terrain-based pacing, the brief and adaptation rules. Always available;
  the safety envelope.
- **AI race team** (`app/race/ai/`) — Claude (`RACE_MODEL`, server-side fallback)
  personalizes engine documents with structured outputs. Guardrails keep fueling in
  safe ranges, plan edits within ±25% per session / ±40% per week, and never drop
  critical items, warnings or ids. Without a key or credit, the engine result is
  stored with `ai_reason`; every result carries `origin: engine | ai | athlete`.
- **Enrichment** (`app/race/enrich/`) — Open-Meteo places and conditions (forecast
  within 16 days, else a labelled seasonal assumption), openly licensed photos from
  Wikimedia Commons and Openverse with attribution.

## Endpoints

All routes are under `/v1` (the health probe is unversioned) and authenticated with
the access token from `strem-auth-service`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness probe. |
| `GET` | `/v1/ai/race/status` | Whether the AI race team is available, and why not. |
| `POST` | `/v1/ai/race/{mission_id}/build` | Build the plan, then every layer. |
| `POST` | `/v1/ai/race/{mission_id}/layers/{kind}/build` | Build one layer (`plan`, `fuel`, `gear`, `logistics`, `strategy`). |
| `GET` | `/v1/ai/race/{mission_id}/brief` | Today's brief with evidence, risks and actions. |
| `GET` | `/v1/ai/race/{mission_id}/knowledge` | What the race team can read, and what is missing. |
| `GET` | `/v1/ai/race/{mission_id}/conditions` | Race-day conditions. |
| `GET`/`POST`/`DELETE` | `/v1/ai/race/{mission_id}/chat` | Chat with the race team. |
| `POST` | `/v1/ai/race/{mission_id}/adapt` | Propose changes to the next two weeks. |
| `POST` | `/v1/ai/race/{mission_id}/proposals/{id}/{accept\|reject}` | Decide a proposal. |
| `POST` | `/v1/ai/race/history/import-strava` | Add Strava races to race history. |
| `GET` | `/v1/ai/enrich/places` · `/photos` | Place search · licensed photo candidates. |

## Run locally

Bring up the stack via `strem-infra` (`docker compose --env-file .env up`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8006/health
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check (strict)
pytest            # endpoint and engine tests over httpx + in-memory SQLite
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string for the AI database. |
| `JWT_SECRET` / `JWT_ALGORITHM` | Verify access tokens from strem-auth-service. |
| `USER_SERVICE_BASE_URL` / `TRAINING_SERVICE_BASE_URL` | The service APIs the race team reads and writes through. |
| `ANTHROPIC_API_KEY` | Enables the AI race team; blank = race engine only. |
| `RACE_MODEL` | Claude model for the race team (default `claude-opus-5-5`). |
| `SSL_CERT_FILE` | Optional CA bundle for outbound enrichment calls behind TLS inspection. |

The pre-pivot Forge agent, missions, recaps, seasons, tribe and capture routes were
retired in strem-docs#28. Their tables stay in the database (models kept in
`app/models.py` so Alembic metadata matches); no code reads or writes them.
