# strem-ai-orchestrator

The MVP AI transformation coach for STREM — structured weekly **missions** and
weekly narrative **coaching recaps**. Implements
`strem-shared-contracts/contracts/ai/openapi.yml`.

It is a narrative coaching system, not a chatbot. It owns no domain records and
copies **no raw logs** — it reads identity context per request from approved
service APIs (`strem-docs/architecture/ai-architecture.md`). XP for completed
missions is awarded by `strem-user-service`, which consumes `ai.mission_completed`.

## Endpoints

All routes are under the `/v1` base path (the health probe is unversioned) and
authenticated with the access token from `strem-auth-service`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness probe → `{"status":"ok","service":"strem-ai-orchestrator"}`. |
| `GET`  | `/v1/ai/missions/active` | List the caller's active missions. |
| `GET`  | `/v1/ai/missions/history` | Paginated mission history. |
| `POST` | `/v1/ai/missions/generate` | Generate 1-3 weekly missions (empty + `reason` when declined). |
| `GET`  | `/v1/ai/missions/{mission_id}` | Mission detail. |
| `POST` | `/v1/ai/missions/{mission_id}/complete` | Complete → publishes `ai.mission_completed`. |
| `POST` | `/v1/ai/missions/{mission_id}/skip` | Skip (no shame, no XP). |
| `POST` | `/v1/ai/missions/{mission_id}/expire` | Expire (no punishment). |
| `GET`  | `/v1/ai/coach/recap` | Latest weekly narrative recap (`404` if none yet). |
| `GET`  | `/v1/ai/coach/recaps` | Paginated recap history. |
| `GET`  | `/v1/ai/context` | The assembled Athlete Context Graph: sources + signals (A4) + memory (A5). |
| `GET`/`POST`/`DELETE` | `/v1/ai/memory[/{id}]` | Long-term agent memory (A5). |
| `POST` | `/v1/ai/agent/chat` | Forge — the omniscient coach (LangGraph agent, cited). |
| `POST` | `/v1/ai/agent/actions` | Record a typed, autonomy-gated, reversible action (B3). |
| `GET`  | `/v1/ai/agent/activity` | The agent activity feed (newest first). |
| `POST` | `/v1/ai/agent/actions/{id}/approve` · `/undo` | Approve a proposed action · reverse one. |
| `GET`  | `/v1/ai/agent/metrics` | Agent run metrics for ops inspection (model/tool/guardrail counters). |

## The Forge agent (B1)

`app/agent/` is a LangChain `create_agent` (over LangGraph) with a middleware
stack — **grounding** (injects context + long-term memory into the prompt),
**output guardrail** (A8 safety net), **model metrics**, and **action logging**
(records a reversible, autonomy-gated `AgentAction` around every tool call). A
LangGraph checkpointer gives per-user thread memory; the model is Claude
(`langchain-anthropic`) when `ANTHROPIC_API_KEY` is set, else a deterministic
offline fallback. Set `LANGSMITH_API_KEY` for full per-run tracing in production.

## How it works

- **Context** (`app/context.py`) — identity (`identity_statement`,
  `transformation_goal`, `training_level`, `weekly_target_days`) is read from
  `strem-user-service`'s profile. No raw logs are stored. When onboarding is
  incomplete, generation declines with `reason: insufficient_context`.
- **Generation** (`app/generator.py`) — rule-based (no external LLM in MVP),
  identity-grounded. Difficulty adapts to recent consistency: a returning user
  only ever gets a `re-entry` first mission. XP rewards stay in the 75-150 range.
- **Safety** (`app/safety.py`) — detects medical/injury/supplement/crisis signals
  and redirects to a professional, framed as care.
- **Recap** (`app/recap.py`) — an identity-grounded narrative (not a metrics
  dashboard); generation publishes `ai.coach_summary_created`. Intended to run
  weekly from a scheduled worker.

## Run locally

Bring up Postgres + Redis via `strem-infra` (`docker compose up`), then:

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
pytest            # endpoint tests over httpx + in-memory SQLite
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string for the AI database. |
| `JWT_SECRET` / `JWT_ALGORITHM` | Verify access tokens from strem-auth-service. |
| `MESSAGE_BROKER_URL` | Redis Streams broker for the AI events. |
| `USER_SERVICE_BASE_URL` | Approved user-service API for identity context. |
