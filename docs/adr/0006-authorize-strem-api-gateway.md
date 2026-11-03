# ADR 0006: Authorize and Scope strem-api-gateway

## Status

Accepted

## Context

`strem-api-gateway` is an approved first-wave repository in
[`repository-strategy.md`](../repository-strategy.md) and is the mobile-facing
entrypoint in [`service-map.md`](../service-map.md). With the Wave 1 and Wave 2
backend services implemented (auth, user, training, nutrition, community, AI
orchestrator), the authenticated surfaces the mobile app calls are now known, so
the gateway can be created against a real, stable set of routes rather than
guessed ones.

Creating an organization repository is a meaningful, hard-to-reverse write. This
ADR records the authorization and the precise scope so the repository is created
deliberately — not as a silent placeholder — and so its first implementation
issue is unambiguous.

This ADR does **not** add any gateway runtime code to `strem-docs`.

## Decision

1. **Name.** The gateway repository is `strem-api-gateway` (confirmed; not
   replaced by `strem-intelligence-platform` or any other existing repo).

2. **Authorization.** Creation of the private `STREM-Platform/strem-api-gateway`
   repository is authorized.

3. **Scope (and non-scope).** The gateway owns mobile-facing concerns only:
   - request routing to the backend services,
   - auth handoff (forwarding the `Authorization: Bearer` access token),
   - rate-limiting integration,
   - mobile-facing aggregation where a screen genuinely needs it.

   The gateway **owns no domain data**, no database, and no business logic. It
   does not duplicate or re-implement service contracts; it routes to them. It is
   not an event consumer.

4. **Routed surfaces.** The gateway routes the `/v1` surfaces of the MVP
   services, per the shared contracts:
   - `auth` → `strem-shared-contracts/contracts/auth/openapi.yml`
   - `user` → `contracts/user/openapi.yml`
   - `training` → `contracts/training/openapi.yml`
   - `nutrition` → `contracts/nutrition/openapi.yml`
   - `community` → `contracts/community/openapi.yml`
   - `ai` → `contracts/ai/openapi.yml`

5. **First implementation issue.** Immediately after the repository is created, a
   single scoped issue (drafted in the appendix) initializes the gateway:
   skeleton, health endpoint, CI from the infra template, local config, and route
   stubs for the six services above. No domain logic.

## Consequences

- `strem-api-gateway` becomes the single external entrypoint; `strem-mobile`
  targets one configurable base URL (the gateway) instead of per-service ports.
- `strem-infra` adds the gateway container to the local compose stack once the
  gateway has a Dockerfile and health endpoint (`strem-infra#4`).
- Because the gateway owns no data, it can be rebuilt or replaced (e.g. with a
  managed gateway later) without data migration.

## Alternatives Considered

- **No gateway; mobile calls services directly.** Rejected for MVP: it leaks
  per-service topology and ports into the client and complicates auth handoff and
  rate limiting. The gateway keeps the client surface stable.
- **Defer the repository.** Rejected: the authenticated surfaces are now known
  and Wave 2 mobile integration needs a single entrypoint.

---

## Appendix — Drafted first issue for `strem-api-gateway`

> File this in the new repository once it exists. It follows
> [`templates/github-issue-template.md`](../../templates/github-issue-template.md).

**Title:** Initialize strem-api-gateway skeleton with health, CI, and service route stubs

**Body:**

**Build order: 17 (gateway) · Priority: P1 · Phase: Implementation (Wave 2 — Integration Foundation)**

### Context

`strem-api-gateway` is authorized and scoped in
`strem-docs/architecture/adr/0006-authorize-strem-api-gateway.md`. It is the
mobile-facing entrypoint and owns routing, auth handoff, and rate-limiting
integration only — no domain data.

### Goal

Initialize the gateway repository so a developer can run it locally and reach
stubbed routes for each backend service.

### Acceptance Criteria

- [ ] FastAPI skeleton per `strem-docs/runbooks/create-new-service.md`:
  `GET /health` → `{status:ok,service:strem-api-gateway}`, multi-stage
  Dockerfile, `.env.example`, `README.md`, `AGENTS.md`, and CI from
  `strem-infra/ci-templates/python-fastapi-ci.yml`.
- [ ] Configurable upstream base URLs for auth, user, training, nutrition,
  community, and AI services (env-driven; no secrets).
- [ ] Route stubs under `/v1` for each service that forward the
  `Authorization: Bearer` header to the configured upstream (auth handoff).
- [ ] The gateway owns no database, no domain models, and no business logic.
- [ ] References `service-map.md`, `repository-strategy.md`, and the routed
  shared contracts.
- [ ] CI green: ruff, mypy, pytest.

### Out of Scope

Production deployment, observability stack, advanced rate-limiting policy,
response aggregation beyond simple pass-through, and any domain logic.

### References

`strem-docs/architecture/service-map.md` · `strem-docs/architecture/repository-strategy.md` ·
`strem-docs/runbooks/create-new-service.md` · `strem-shared-contracts/contracts/*`
