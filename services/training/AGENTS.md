# strem-training-service — Agent Guide

This service owns strength, running, and mobility **session logs** for MVP.
Read this before making any change, along with `strem-docs/AGENTS.md` and
`strem-docs/prompts/global/agent-rules.md`.

## Owned vs. not owned

- **Owns**: training session records (strength / running / mobility) and the
  `training.session_logged` event. Running stays here for MVP — there is no
  separate endurance service.
- **Does not own**: XP, ranks, or medals (those belong to `strem-user-service`,
  which consumes `training.session_logged`). Identity/auth belongs to
  `strem-auth-service`. Do not duplicate another service's data.

## Rules

1. **Contract is the source of truth.** Endpoints, fields, and `session_type`
   values match `strem-shared-contracts/contracts/training/openapi.yml`. The
   event payload matches `events/training.session_logged.schema.json` (version
   1). Do not invent fields or enums.
2. **No XP logic here.** This service publishes the domain event; the user
   service awards XP. Do not compute or store XP.
3. **Data ownership.** This service owns the `strem_training` database. Do not
   read or write another service's database; do not share ORM models.
4. **Gates must pass.** `ruff check .`, `mypy .` (strict), and `pytest` must be
   green before a PR.

## Boundaries (MVP)

In scope: session logging endpoints + the `training.session_logged` event.
Out of scope: workout templates/programs, XP calculation, a separate endurance
service, and analytics. See `strem-docs/product/mvp-scope.md` and
`strem-docs/architecture/service-map.md`.
