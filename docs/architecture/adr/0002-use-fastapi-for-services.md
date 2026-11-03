# ADR 0002: Use Python and FastAPI For Backend Services

## Status

Accepted

## Context

STREM backend services need a productive, typed, AI-friendly foundation for API development, domain logic, database integration, and AI orchestration.

Two decisions needed to be made:
1. What language and framework to build backend services in.
2. What supporting technologies (database, cache, messaging) to use.

These have different stability requirements. The language and framework choice has high switching cost — it affects every service, every engineer, and every AI agent working in the codebase. Supporting technology choices have lower switching cost — they can be made per service and changed with an ADR.

## Decision

**Fixed: Use Python and FastAPI for all backend services.**

Python is the backend language. FastAPI is the API framework. These are not re-evaluated per service.

Rationale:
- Python has the strongest AI/ML ecosystem — critical for `strem-ai-orchestrator` and future AI capabilities
- FastAPI is async-native, produces OpenAPI schemas automatically, is well-typed, and is AI-agent-friendly
- Strong Python client libraries exist for every database, broker, and infrastructure tool STREM may use
- Consistent language across all services reduces cognitive overhead for a small team and AI agents

**Not fixed: database, cache, and messaging technology.**

These are evaluated per service based on access patterns, performance requirements, and operational cost. See:
- `architecture/database-strategy.md` — database selection framework
- `architecture/event-driven-strategy.md` — messaging broker evaluation

The defaults (PostgreSQL for relational data, Redis-compatible cache, lightweight async broker) are starting recommendations, not mandates. If a service has a justified reason to use a different technology, document it in a service-level ADR.

## Consequences

Benefits:

- consistent backend language across all services
- strong async and typing support via FastAPI
- excellent AI ecosystem fit for the orchestrator
- automatic OpenAPI schema generation
- clear foundation for AI agents working across the codebase

Costs:

- must enforce structure to avoid service sprawl
- must manage Python dependency hygiene and version consistency across services
- must define consistent testing and migration standards per service

## Guardrail

FastAPI service code must not be generated until service repositories are explicitly created and scoped via a GitHub issue with defined acceptance criteria.

Supporting technology choices (database, cache, broker) must be documented in each service's `AGENTS.md` or a service-level ADR before implementation begins.
