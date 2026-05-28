# System Overview

STREM is built as a bounded service architecture with strict contracts and a mobile-first user experience.

The architecture must avoid two failure modes:

- a monolith that becomes too tangled for parallel AI-assisted development
- a premature microservice explosion that creates empty repositories and operational drag before product proof

The architecture must support:

- AI-assisted development
- clear service ownership
- isolated feature work
- parallel agents
- contract-driven integration
- privacy-aware health and performance data
- MVP discipline with future ecosystem expansion

## Fixed Decisions

These are not open for re-evaluation without an ADR:

- **Backend language**: Python
- **API framework**: FastAPI (async, typed, OpenAPI-native)
- **Mobile**: React Native with Expo (see ADR 0003)
- **Service architecture**: bounded services with explicit contracts (see ADR 0001)
- **AI agent workflow**: scoped issues, review gates, contract review for sensitive changes (see ADR 0005)

## Technology Selection Principle

Everything outside of Python + FastAPI is chosen by evaluating:

1. Does it solve the problem with the least operational overhead at current scale?
2. Does it have a mature, well-maintained Python ecosystem?
3. Is there a better-performing alternative that is not significantly harder to operate?
4. Does the choice allow migration later if requirements change?

When a service is being built, the team selects the best technology for that service's specific access patterns and requirements — then documents the decision. See `architecture/database-strategy.md` for database selection guidance and `architecture/event-driven-strategy.md` for messaging guidance.

## High-Level Shape

```
strem-mobile → strem-api-gateway → domain services → per-service data stores
```

Supporting systems (technology to be evaluated at implementation time):

- cache and short-lived state layer (Redis, Valkey, or equivalent)
- async messaging layer (Redis Streams, NATS, RabbitMQ, or equivalent — see event-driven-strategy.md)
- `strem-ai-orchestrator` for AI transformation coaching, mission generation, and behavioral adaptation
- `strem-shared-contracts` for OpenAPI and event schemas
- `strem-infra` for local development, CI/CD, and deployment assets

## MVP Domain Ownership

| Service | Owns |
|---------|------|
| `strem-auth-service` | identity, sessions, auth primitives |
| `strem-user-service` | profiles, onboarding, user preferences, XP ledger, rank, medals |
| `strem-training-service` | training and running logs |
| `strem-nutrition-service` | nutrition logs |
| `strem-community-service` | tribes, check-ins, Tribe Power, challenges |
| `strem-ai-orchestrator` | AI transformation coach, mission generation, behavioral adaptation, narrative coaching |

These are ownership boundaries first. Physical repositories are created in implementation order — not as empty placeholders.

## Architectural Principles

- Optimize for clear boundaries before scale.
- Use explicit contracts instead of shared database access.
- Choose the right technology for each service's access patterns — document deviations from default guidance in ADRs.
- Keep running logs inside training service for MVP.
- Keep AI in a separate orchestrator so it can evolve without contaminating domain services.
- Prefer event-driven integration for cross-service reactions over synchronous coupling.
- Prefer fewer active services until the MVP loop proves user pull.
- Prefer operational simplicity over theoretical performance until scale demands otherwise.

## Health and Privacy Sensitivity

STREM handles personal performance, nutrition, and health-adjacent data. The system must be designed with GDPR, data minimization, consent, deletion, auditability, and explainable AI behavior in mind from day one — regardless of which specific technologies are chosen.

## Future Direction

The architecture can evolve toward:

- Kubernetes for independent scaling and deployment isolation
- OpenTelemetry + Prometheus/Grafana for observability
- RAG and vector database for AI knowledge layer
- Advanced event streaming (Kafka, Redpanda) for analytics and wearable data
- Wearable integrations (V3)
- Coach and marketplace domains (Phase 3+)

Those are future phases, not MVP requirements. Each requires a dedicated ADR before introduction.
