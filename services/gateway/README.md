# strem-api-gateway

STREM's mobile-facing entrypoint — routes `/v1` requests to the owning backend
service and hands off the caller's bearer token. It **owns no domain data, no
database, and no business logic**.

`strem-mobile` targets a single configurable base URL (this gateway) instead of
per-service ports. Nutrition and community routes were retired with the pre-pivot
product (strem-docs#28); those prefixes now return `404`.

## Routing

| Path prefix (`/v1/…`) | Upstream service |
|-----------------------|------------------|
| `/v1/auth/*` | strem-auth-service |
| `/v1/users/*` | strem-user-service |
| `/v1/race-missions/*` | strem-user-service |
| `/v1/training/*`, `/v1/integrations/*` | strem-training-service |
| `/v1/ai/*` | strem-ai-orchestrator |

The gateway forwards the method, path, query, body, and `Authorization` header
unchanged, and returns the upstream response verbatim. Unknown prefixes → `404`;
an unreachable upstream → `502`. `GET /health` is unversioned.

## Run locally

Start the backend services (and Postgres + Redis via `strem-infra`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # point the *_BASE_URL vars at your services

uvicorn app.main:app --reload   # http://localhost:8000/health
```

## Run with Docker

```bash
docker build -t strem-api-gateway .
docker run -p 8000:8000 --env-file .env strem-api-gateway
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check (strict)
pytest            # proxy tests (httpx MockTransport — no live upstreams)
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AUTH_BASE_URL` … `AI_BASE_URL` | Upstream `/v1` base URLs for each service. |
| `UPSTREAM_TIMEOUT_SECONDS` | Per-request upstream timeout. |
