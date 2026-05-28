# Runbook: Create New Service

Use this only after an ADR or approved issue authorizes a new service repository.

## Preconditions

- service boundary is documented
- owner is assigned
- repository name is approved
- data ownership is clear
- public API or event contracts are identified
- MVP or roadmap phase justifies the service

## Steps

1. Create repository under `strem-platform`.
2. Add repository README.
3. Add repository `AGENTS.md`.
4. Define service responsibility and non-responsibility.
5. Add local development instructions.
6. Add test instructions.
7. Add contract strategy.
8. Add migration policy if the service owns a database.
9. Add CI skeleton only when implementation begins.
10. Update `strem-docs` service map and repository strategy.

## Required Docs

Each service must document:

- owned domain
- database ownership
- event ownership
- API ownership
- security concerns
- observability expectations
- deployment assumptions

## Guardrails

- do not create a service because it appears in the long-term vision
- do not duplicate another service's data
- do not share ORM models
- do not implement code before contracts and ownership are clear
