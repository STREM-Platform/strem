# strem-infra

Local development infrastructure and shared CI templates for STREM.

`docker compose up -d` brings up the infrastructure dependencies every STREM
service needs locally — PostgreSQL and Redis — with one command. CI workflow
templates for service repos live in [`ci-templates/`](ci-templates/README.md).

## Contents

```
strem-infra/
├── docker/
│   ├── docker-compose.yml          # Postgres + Redis (Redis Streams = broker)
│   └── postgres/init/              # per-service database creation on first boot
├── ci-templates/                   # canonical CI workflows for service repos
├── .github/workflows/validate.yml  # validates compose config on PR
├── .env.example                    # safe local defaults for every required var
├── AGENTS.md
└── README.md
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

Health checks are defined on every service; `... ps` shows `healthy` once they
are ready to accept connections.

## Ports

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | `5432` | Primary relational database (one DB per service) |
| Redis | `6379` | Cache, rate limiting, and the Redis Streams message broker |

On first boot, Postgres creates one database per MVP service
(`strem_auth`, `strem_user`, `strem_training`, `strem_nutrition`,
`strem_community`, `strem_ai`). Connection strings are in `.env.example`.

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
