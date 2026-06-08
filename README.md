# strem-infra

Local development infrastructure, the composed MVP service stack, and shared CI
templates for STREM.

`docker compose up -d` brings up PostgreSQL, Redis, and the MVP services (auth,
user, training, nutrition, community, AI orchestrator, and the gateway) with one
command. CI workflow templates for service repos live in
[`ci-templates/`](ci-templates/README.md).

## Contents

```
strem-infra/
├── docker/
│   ├── docker-compose.yml          # Postgres + Redis + the 7 MVP services
│   └── postgres/init/              # per-service database creation on first boot
├── ci-templates/                   # canonical CI workflows for service repos
├── scripts/smoke-health.sh         # verify every service GET /health after up
├── .github/workflows/validate.yml  # validates compose config on PR
├── .env.example                    # safe local defaults for every required var
├── AGENTS.md
└── README.md
```

## Repository layout assumption

The service containers build from the service repositories, which must be cloned
as **siblings** of `strem-infra` under one parent directory (each service's build
context is `../../strem-<service>` relative to the compose file):

```
<parent>/
├── strem-infra/
├── strem-api-gateway/
├── strem-auth-service/
├── strem-user-service/
├── strem-training-service/
├── strem-nutrition-service/
├── strem-community-service/
└── strem-ai-orchestrator/
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Engine + Compose v2)
- git

## Start / stop

```bash
cp .env.example .env          # safe local defaults; adjust if needed

docker compose -f docker/docker-compose.yml up -d     # start
docker compose -f docker/docker-compose.yml ps        # status / health
docker compose -f docker/docker-compose.yml down       # stop (keep data)
docker compose -f docker/docker-compose.yml down -v    # stop + wipe data (reset)
```

Health checks are defined on every container; `... ps` shows `healthy` once each
is ready. **Startup order** is handled automatically: services wait for Postgres
and Redis to be healthy (`depends_on: condition: service_healthy`), and the
gateway waits for the services. Postgres + Redis come up first, then the six
backend services, then the gateway.

After the stack is up, smoke-check every service's health endpoint:

```bash
./scripts/smoke-health.sh
# or manually, e.g.:  curl http://localhost:8001/health
```

> First run builds seven images and can take a few minutes. The schema is created
> by each service's own migrations (`alembic upgrade head`), not by infra — run a
> service's migration once its container and Postgres are healthy.

## Ports

| Service | Port (host) | URL |
|---------|------|-----|
| Gateway (mobile entrypoint) | `8000` | http://localhost:8000 |
| Auth | `8001` | http://localhost:8001/health |
| User | `8002` | http://localhost:8002/health |
| Training | `8003` | http://localhost:8003/health |
| Nutrition | `8004` | http://localhost:8004/health |
| Community | `8005` | http://localhost:8005/health |
| AI orchestrator | `8006` | http://localhost:8006/health |
| PostgreSQL | `5432` | one database per service |
| Redis | `6379` | cache + Redis Streams broker |

Each service listens on `8000` **inside** its container; the gateway and services
reach each other by container name (e.g. `http://user:8000/v1`). On first boot,
Postgres creates one database per MVP service (`strem_auth`, `strem_user`,
`strem_training`, `strem_nutrition`, `strem_community`, `strem_ai`); the gateway
has no database.

## Troubleshooting

- **A service is `unhealthy`** → `docker compose -f docker/docker-compose.yml logs <service>`. The most common cause is missing migrations: exec in and run `alembic upgrade head`. `GET /health` itself does not touch the database, so a healthy container with failing API calls usually means the schema is not migrated.
- **Build context error** → ensure the service repos are cloned as siblings (see layout above).
- **Port already in use** → another process holds `8000-8006`/`5432`/`6379`; stop it or change the host port mapping.
- **Event consumers** (XP attribution, Tribe Power) run as separate worker processes (`python -m app.worker` in the user and community services); start them alongside the API when testing the event-driven loop.

## Why Redis Streams as the broker

Redis is already required for cache and rate limiting, and Redis Streams can
serve as the MVP message broker — avoiding a third stateful service. This is the
lower-overhead option recommended in
`strem-docs/architecture/event-driven-strategy.md`. The decision is documented
in a comment at the top of `docker/docker-compose.yml`. Revisit (with an ADR)
when event volume or routing complexity justifies a dedicated broker.

## Add a service to the Compose file

1. If the service needs its own database, add a `CREATE DATABASE strem_<name>;`
   line to `docker/postgres/init/01-create-databases.sql` and a matching
   `<NAME>_DB_URL` in `.env.example`.
2. If the service needs new shared infrastructure (it usually does not — app
   containers live in their own repos), add a service block to
   `docker/docker-compose.yml` with a unique non-conflicting port, a named
   volume if it is stateful, and a health check.
3. Run `docker compose -f docker/docker-compose.yml config` to confirm the file
   is valid (this is what CI checks).

## References

- `strem-docs/architecture/database-strategy.md` — data ownership and per-service databases
- `strem-docs/architecture/event-driven-strategy.md` — broker selection and event ownership
- `strem-docs/architecture/deployment-strategy.md` — Docker Compose for local, managed/K8s later
