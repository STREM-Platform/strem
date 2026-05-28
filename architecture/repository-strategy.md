# Repository Strategy

STREM uses a multi-repository strategy under the canonical GitHub organization `strem-platform`.

The strategy supports:

- clear ownership
- parallel AI-agent work
- independent service evolution
- strict contracts
- isolated blast radius
- future service scaling without premature repository sprawl

## Repository Creation Policy

STREM distinguishes between approved first-wave repositories and repositories that should be created immediately.

Create a repository only when it has:

- a scoped issue
- an owner
- a clear boundary
- a near-term implementation need
- documented contracts or planned contracts
- a test and local development expectation

## Create Immediately

- `strem-docs`
- `strem-shared-contracts`
- `strem-infra`

## Approved First-Wave Product Repositories

Create these as MVP implementation reaches them, not as empty placeholders:

- `strem-mobile`
- `strem-api-gateway`
- `strem-auth-service`
- `strem-user-service`
- `strem-training-service`
- `strem-nutrition-service`
- `strem-community-service`
- `strem-ai-orchestrator`

## Recommended MVP Creation Order

1. `strem-shared-contracts`
2. `strem-infra`
3. `strem-auth-service`
4. `strem-user-service`
5. `strem-training-service`
6. `strem-nutrition-service`
7. `strem-community-service`
8. `strem-ai-orchestrator`
9. `strem-api-gateway`
10. `strem-mobile`

This order favors contracts and core identity before user-facing integration. If mobile prototyping needs to start earlier, it should use documented mock contracts rather than inventing backend behavior.

## Postpone

Do not create until validated by roadmap or ADR:

- `strem-meal-prep-service`
- `strem-recovery-service`
- `strem-challenge-service`
- `strem-xp-service`
- `strem-notification-service`
- `strem-payment-service`
- `strem-coach-service`
- `strem-marketplace-service`
- `strem-web`
- `strem-admin`
- `strem-coach-dashboard`

## Why Not Create Everything Now

Empty repositories create coordination overhead, fake architecture, and AI-agent confusion. STREM should create repositories when there is a real boundary, roadmap need, and owner.

## Repository Rules

Each repository must include:

- README
- AGENTS.md
- issue and PR expectations
- local development instructions
- test instructions
- ownership and service boundary notes

Each service repository must define:

- owned domain
- data ownership
- API contracts
- event contracts
- security concerns
- local run command
- migration policy

## Shared Contracts

`strem-shared-contracts` is the only approved place for shared API and event contracts. Services must not copy private models from one another.

Contract changes require:

- versioning
- review from affected service owners
- compatibility notes
- contract tests later

## Current Remote Note

The canonical organization name in documentation is `strem-platform`. Any existing local remote mismatch should be handled separately and intentionally.
