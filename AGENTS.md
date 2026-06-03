# strem-infra — Agent Guide

This repository holds STREM's **local development infrastructure** and **shared
CI templates**. Read this before changing anything here. Also read
`strem-docs/AGENTS.md` and `strem-docs/prompts/global/agent-rules.md`.

## What belongs here

- Local development Docker Compose (`docker/docker-compose.yml`) and its support files
- Canonical CI workflow templates (`ci-templates/`)
- Environment templates with safe local defaults (`.env.example`)
- The validate workflow that guards Compose config

## Rules

1. **Local-dev infrastructure only.** No application service code or service
   containers — those live in each service's own repo and connect to the shared
   infrastructure over mapped ports.
2. **No secrets, ever.** `.env.example` contains safe local placeholders only.
   Never commit a real password, token, or production credential. `.env` is
   gitignored.
3. **No Kubernetes or production deployment manifests** in this phase. Local
   Compose only. Production orchestration is a later, separate decision.
4. **Document technology decisions.** Database, cache, and broker choices follow
   `strem-docs/architecture/database-strategy.md` and
   `strem-docs/architecture/event-driven-strategy.md`. If you change a choice,
   document why in a comment and, for a significant change, an ADR in strem-docs.
5. **Keep ports conflict-free.** Every mapped host port must be unique across the
   Compose file.
6. **Stateful services need a named volume and a health check.** Match the
   pattern already used by `postgres` and `redis`.
7. **Validate before opening a PR.** Run
   `docker compose -f docker/docker-compose.yml config` — this is exactly what
   the validate workflow runs.

## CI templates

`ci-templates/` are the reference CI workflows copied into service repos. Keep
them in sync with `strem-docs/templates/ci/`. Changing a template affects every
service that adopts it — note the impact in the PR.
