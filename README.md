# strem-infra

Local development infrastructure, the composed MVP service stack, and shared CI
templates for STREM.

`docker compose up -d` brings up PostgreSQL, Redis, the MVP API services (auth,
user, training, nutrition, community, AI orchestrator, and the gateway), and the
local event workers that close the XP / Tribe Power loop. CI workflow templates
for service repos live in
[`ci-templates/`](ci-templates/README.md).

## Contents

```
strem-infra/
├── docker/
│   ├── docker-compose.yml          # Postgres + Redis + the 7 MVP services
│   └── postgres/init/              # per-service database creation on first boot
├── ci-templates/                   # canonical CI workflows for service repos
├── scripts/migrate-stack.py        # run Alembic migrations in service containers
├── scripts/seed-demo.py            # seed the Race OS demo athlete through the gateway
├── scripts/smoke-health.py         # cross-platform health check for every service
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
- Python 3.12+ for the local helper scripts
- git

## Start / stop

```bash
cp .env.example .env          # safe local defaults; adjust if needed

docker compose --env-file .env -f docker/docker-compose.yml up -d     # start
docker compose -f docker/docker-compose.yml ps        # status / health
docker compose -f docker/docker-compose.yml down       # stop (keep data)
docker compose -f docker/docker-compose.yml down -v    # stop + wipe data (reset)
```

Health checks are defined on every container; `... ps` shows `healthy` once each
is ready. **Startup order** is handled automatically: services wait for Postgres
and Redis to be healthy (`depends_on: condition: service_healthy`), and the
gateway waits for the services. Postgres + Redis come up first, then the API
services and workers, then the gateway.

After the stack is up, apply service migrations and smoke-check every service's
health endpoint:

```bash
python scripts/migrate-stack.py
python scripts/smoke-health.py
# or manually, e.g.:  curl http://localhost:8001/health
```

> First run builds the service images and can take a few minutes. Health checks
> do not require database tables, so always run `python scripts/migrate-stack.py`
> before exercising authenticated API routes.

## MVP demo on a laptop

This is the smallest real local demo path today: it uses the API gateway and all
MVP services, not mocked mobile data.

From `strem-infra`:

```bash
cp .env.example .env
docker compose --env-file .env -f docker/docker-compose.yml up -d --build   # builds 7 images on first run (a few minutes)
python scripts/migrate-stack.py                              # apply Alembic migrations in each service
python scripts/smoke-health.py                               # every service reports healthy
python scripts/seed-demo.py                                  # seed the Race OS demo athlete through the gateway
```

> Pass `--env-file .env` when the compose file lives in `docker/`: Compose looks
> for `.env` next to the compose file, so without it keys such as
> `ANTHROPIC_API_KEY` silently stay empty.

To see the course map, elevation profile and climb-by-climb pacing, attach a
GPX/ZIP you are allowed to use (course files are never committed):

```bash
python scripts/seed-demo.py --course path/to/course.gpx
```

`docker compose ... ps` should show every container `healthy` before you seed.

Then start the mobile app from the sibling `strem-mobile` repo, in a second
terminal:

```bash
npm install
npm run web        # opens the Expo web build in your browser (http://localhost:8081)
```

The mobile app defaults to `http://localhost:8000/v1`. If you need to override
it, set `EXPO_PUBLIC_API_URL=http://localhost:8000/v1` before starting Expo.

> The gateway enables CORS for any `localhost` port, so the browser build works
> whether Expo serves on `8081` or bumps to `8082+` when that port is taken.

Use the seeded account:

```text
Email:    race-demo@strem.app
Password: NeverSettle123!
```

The seed creates a synthetic athlete preparing alone for a first 50 km trail race
abroad: a profile (weight, an old knee issue, lactose intolerance), three past
races (a half marathon, a DNF in the heat, a strong 30K), eight weeks of logged
training, today's check-in and one Race Mission with an openly licensed cover
photo. It then asks the race team to build every layer.

Expected demo path:

1. Sign in with the seeded account and land on the Mission screen: the race
   hero, today's session, the race-team brief and the tracker with the eight
   weeks of training before the plan.
2. Open Plan to see the periodized weeks to race day and why the plan looks the
   way it does.
3. Open Race Lab for fuel, gear, logistics and strategy — and, with `--course`,
   the course map, climbs and segment-by-segment pacing.
4. Open Team to ask the AI race team about your race (needs an Anthropic key
   with credit; without one every layer is built by the deterministic race
   engine and says so).
5. Open You for race history, connected sources, check-ins and data export.

Known local-demo limits:

- `seed-demo.py` is idempotent: it reuses the account, the mission and the seeded
  history, and rebuilds layers only when they are missing (`--rebuild` forces it).
- Without `ANTHROPIC_API_KEY` (or with an account out of credit) the brief, chat
  and adaptations fall back to the race engine and show the reason in the app.

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
| User worker | none | consumes domain events and awards XP |
| Community worker | none | consumes `user.xp_earned` and attributes Tribe Power |
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
- **Event consumers are not running** -> confirm `user-worker` and `community-worker` are up with `docker compose -f docker/docker-compose.yml ps`. They run `python -m app.worker` in the user and community service images.
- **Browser shows a CORS error in the Expo web build** -> the gateway allows any `localhost` origin by default (`CORS_ALLOW_ORIGIN_REGEX`). If you serve the web build from a non-localhost origin (a LAN IP, a tunnel), add it to `CORS_ALLOW_ORIGINS` on the `gateway` service and `up -d --build gateway`.

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
