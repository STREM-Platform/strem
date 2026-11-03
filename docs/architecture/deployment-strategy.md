# Deployment Strategy

STREM should start with Docker Compose locally and GitHub Actions for CI, then graduate to managed infrastructure and eventually Kubernetes when operational complexity justifies it.

## Phase 1: Local Development

Use Docker Compose to run local dependencies. The specific services in the Compose file depend on the technology choices made at implementation time — not on a pre-decided stack.

Typical local dependencies will include some combination of:

- the chosen primary database(s) per service
- the chosen cache / rate-limit layer
- the chosen async messaging broker
- service containers as implementation begins

Each service should also support direct local development (running outside Docker) where practical, to minimize dev loop friction.

## Phase 2: Early Environments

Create separate environments with clear promotion gates:

- local
- development
- staging
- production

Early production may run on a simple managed platform (Railway, Render, Fly.io, or equivalent VM-based deployment) before Kubernetes. Choose the platform that minimizes operational overhead for a small team while meeting GDPR and security requirements.

Managed database services (Supabase, Neon, PlanetScale, managed PostgreSQL, etc.) should be evaluated against self-hosted for each service — the goal is low operational overhead, not self-hosting for its own sake.

## Phase 3: CI/CD

GitHub Actions is the CI/CD platform. Each service repository should run:

- linting
- type checks
- tests (unit, integration where applicable)
- contract checks
- security scans
- build verification

Deployment automation is introduced only after service skeletons and environment decisions exist. Do not build elaborate CI/CD pipelines for services that do not yet have validated functionality.

## Phase 4: Kubernetes Later

Kubernetes becomes appropriate when STREM needs:

- multiple production services running simultaneously
- independent scaling per service
- rollout controls (canary, blue/green)
- mature observability requirements
- secrets and config management at scale
- stronger deployment isolation

Do not introduce Kubernetes during the documentation foundation phase or early MVP. The operational overhead is not justified until the product has proven retention and the service count warrants it.

Consider managed Kubernetes (GKE, EKS, DigitalOcean Kubernetes) rather than self-managed to keep operational burden low when the time comes.

## Infrastructure Repository

`strem-infra` will own:

- Docker Compose files for local development
- environment configuration templates
- shared CI patterns and reusable GitHub Actions workflows
- deployment manifests (Kubernetes YAML, Helm charts, or equivalent — decided at implementation)
- observability configuration
- infrastructure runbooks

## Release Principle

Small, reversible changes are preferred. Every production deployment should be traceable to a PR, issue, and release note. Rollback must always be faster than forward-fix for data-mutating changes.
