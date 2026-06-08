# strem-api-gateway — Agent Guide

This service is STREM's mobile-facing entrypoint. It routes `/v1` requests to the
owning backend service and hands off the caller's bearer token. Read this before
any change, along with `strem-docs/AGENTS.md`,
`strem-docs/architecture/adr/0006-authorize-strem-api-gateway.md`, and
`strem-docs/architecture/service-map.md`.

## Owned vs. not owned

- **Owns**: routing, auth handoff (forwarding `Authorization: Bearer`),
  rate-limiting integration, and mobile-facing aggregation where genuinely needed.
- **Does not own**: any domain data, database, ORM models, business logic, or
  events. It does not validate JWTs (the owning services do) and it does not
  re-implement contracts — it routes to them.

## Rules

1. **No domain logic, ever.** If a change adds business rules, data models, or a
   database, it belongs in a service repo, not here.
2. **Routes follow the contracts.** Upstream paths are the `/v1` surfaces in
   `strem-shared-contracts/contracts/*`. Add a route by mapping a path prefix to
   an upstream base URL in `app/config.py` — do not transform payloads.
3. **Pass the token through.** Auth handoff means forwarding the bearer token
   unchanged; the gateway never mints or inspects tokens in MVP.
4. **Config, not secrets.** Upstream URLs come from env; no secrets in this repo.
5. **Gates must pass.** `ruff check .`, `mypy .` (strict), and `pytest`.

## Boundaries (MVP)

In scope: health, routing/proxy for auth/user/training/nutrition/community/ai,
and auth handoff. Out of scope: production deployment, observability stack,
advanced rate-limiting policy, response aggregation beyond pass-through, and any
domain logic.
