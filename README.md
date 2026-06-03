# strem-auth-service

Authentication and session management for STREM — account identity, credential
verification, and the JWT / refresh-token lifecycle.

This repository is currently a **skeleton**: a FastAPI app exposing a health
endpoint, with the dependency, container, and CI scaffolding in place. No auth
logic is implemented yet — it will be built against the contract in
`strem-shared-contracts/contracts/auth/openapi.yml`.

See `strem-docs/architecture/service-map.md` for service boundaries and
`strem-docs/architecture/adr/0002-use-fastapi-for-services.md` for the framework decision.

## What it does (now)

- `GET /health` → `{"status": "ok", "service": "strem-auth-service"}`

## Run locally

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # adjust values as needed

uvicorn app.main:app --reload   # http://localhost:8000/health
```

## Run with Docker

```bash
docker build -t strem-auth-service .
docker run -p 8000:8000 --env-file .env strem-auth-service
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check
pytest            # tests (health endpoint via httpx.AsyncClient)
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string for the auth database. |
| `JWT_SECRET` | Secret used to sign JWT access tokens. |
| `JWT_ALGORITHM` | JWT signing algorithm (e.g. `HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime in minutes (contract default: 15). |

See `.env.example` for the template.

## Structure

```
strem-auth-service/
├── app/
│   ├── __init__.py
│   └── main.py            # FastAPI app + /health
├── tests/
│   └── test_health.py
├── .github/workflows/ci.yml
├── Dockerfile             # multi-stage build
├── .env.example
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml         # ruff / mypy / pytest config
└── README.md
```

## Out of scope (skeleton)

No JWT issuance, OAuth2, session storage, or database connection yet — those
follow once the auth contract is finalized in `strem-shared-contracts`.
