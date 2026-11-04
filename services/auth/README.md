# strem-auth-service

Authentication and session management for STREM — account identity, credential
verification, and the JWT / refresh-token lifecycle.

Implements the auth API (OpenAPI at `/docs`). Auth owns account
identity and the token lifecycle only; profile, onboarding and Race OS records
belong to the user service.

## Endpoints

All routes are served under the `/v1` base path (the health probe is unversioned).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET`  | `/health` | public | Liveness probe → `{"status":"ok","service":"strem-auth-service"}`. |
| `POST` | `/v1/auth/register` | public | Create an account; returns identity + initial token pair. `409` on duplicate email. |
| `POST` | `/v1/auth/login` | public | Authenticate; returns identity + token pair. `401` on bad credentials. |
| `POST` | `/v1/auth/refresh` | refresh token (body) | Rotate the refresh token and mint a new access token. `401` if invalid/expired/revoked. |
| `POST` | `/v1/auth/logout` | access token | Revoke a refresh token. `204`. |
| `GET`  | `/v1/auth/me` | access token | Return the current account identity. `401` if missing/invalid. |

## How it works

- **Passwords** are hashed with Argon2id (`argon2-cffi`). Plaintext is never stored or logged.
- **Access token** — HS256 JWT, 15-minute lifetime, claims `user_id` (UUID) + `email`. This `user_id` is the identifier every other STREM service keys user data on.
- **Refresh token** — opaque `rt_<hex>` string, 30-day lifetime, stored server-side **as a SHA-256 hash** and revocable. `refresh` rotates it (the presented token is invalidated and a new pair issued).

## Run locally

Bring up Postgres via `strem-infra` (`docker compose up postgres`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # adjust values as needed

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8001/health
```

## Run with Docker

```bash
docker build -t strem-auth-service .
docker run -p 8001:8000 --env-file .env strem-auth-service
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
| `DATABASE_URL` | Async PostgreSQL connection string for the auth database. |
| `JWT_SECRET` | Secret used to sign JWT access tokens. |
| `JWT_ALGORITHM` | JWT signing algorithm (default `HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime in minutes (contract default: 15). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token lifetime in days (contract default: 30). |

See `.env.example` for the template.

## Structure

```
strem-auth-service/
├── app/
│   ├── main.py            # FastAPI app factory + /health
│   ├── config.py          # env-backed Settings
│   ├── db.py              # async engine + session dependency
│   ├── models.py          # User, RefreshToken ORM
│   ├── security.py        # Argon2 hashing, refresh tokens, JWT
│   ├── schemas.py         # request/response models (contract-aligned)
│   ├── deps.py            # bearer-auth dependency + DI aliases
│   ├── errors.py          # contract-aligned Error responses
│   └── routers/auth.py    # the five auth endpoints
├── alembic/               # migrations (0001_initial: users, refresh_tokens)
├── tests/                 # endpoint tests over the ASGI app
├── Dockerfile             # multi-stage build
├── alembic.ini
├── .env.example
├── requirements.txt / requirements-dev.txt
├── pyproject.toml         # ruff / mypy / pytest config
└── README.md
```
