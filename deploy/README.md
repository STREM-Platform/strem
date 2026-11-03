# deploy

Everything needed to run STREM as containers.

- `docker/docker-compose.yml` — Postgres, Redis and the five services (gateway on
  port 8000). Build contexts are `../../services/*`.
- `docker/postgres/init/` — creates one database per service on first boot.
- `.env.example` — safe local defaults; copy to `.env` and add `OPENAI_API_KEY`.
- `scripts/migrate-stack.py` — runs every service's Alembic migrations.
- `scripts/seed-demo.py` — demo athlete `race-demo@strem.app` / `NeverSettle123!`
  with a race, training, check-ins and a checkpoint plan for race-day mode.
- `scripts/delete-local-account.py` — remove one local account to test sign-up again.
- `scripts/smoke-health.py` — checks every service's `/health`.

See the root `README.md` for the commands.
