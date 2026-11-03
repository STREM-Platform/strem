# ADR 0001: Use Bounded Services With Staged Repository Creation

## Status

Accepted

## Context

STREM has a broad long-term ecosystem vision: training, running, nutrition, recovery, community, AI coaching, coaches, marketplace, wearables, analytics, and accountability systems.

The platform is also intended for AI-assisted development with parallel agents and strict boundaries. A single unstructured codebase would make it easier to start but harder to coordinate safely as agents and domains multiply.

The counter-risk is just as serious: creating every microservice too early would produce fake enterprise architecture, empty repositories, unclear ownership, and operational drag before product-market evidence exists.

## Decision

STREM will use bounded service ownership with staged repository creation.

Create foundation repositories first:

- docs
- shared contracts
- infrastructure

Approve these MVP ownership boundaries, but create their repositories only as scoped implementation issues are ready:

- mobile
- API gateway
- auth
- user
- training
- nutrition
- community
- AI orchestrator

Postpone services for meal prep, recovery, challenges, XP, notifications, payments, coaches, marketplace, web, admin, and coach dashboard until validated by roadmap or ADR.

## Consequences

Benefits:

- clear ownership
- safe parallel AI-agent work
- isolated service domains
- future scalability
- stronger contract discipline
- less premature operational overhead

Costs:

- more repository coordination
- more CI/CD setup
- more local development complexity
- greater need for documentation
- discipline required to avoid empty repo creation

## Guardrail

Do not create empty service repositories simply because they exist in the long-term vision or first-wave boundary map. Create repositories when the work is ready to make them real.
