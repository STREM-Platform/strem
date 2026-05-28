# Observability

Observability should begin simple and mature with the platform. MVP services need enough visibility to debug user flows, protect reliability, and understand retention-impacting failures.

## MVP Observability

Each service should eventually expose:

- structured logs
- request IDs
- basic health checks
- error logs
- latency metrics
- domain event publish/consume status

## Later Observability Stack

Introduce later:

- OpenTelemetry
- Prometheus
- Grafana
- distributed traces
- alerting
- service-level objectives
- product analytics

Do not overbuild observability before services exist.

## Logging Principles

Logs must be useful without leaking sensitive personal data.

Do not log:

- passwords
- tokens
- full AI conversations by default
- full nutrition logs unless required and protected
- private tribe messages without explicit operational need

Log:

- request ID
- service name
- endpoint or operation
- status
- latency
- error class
- event name
- correlation ID

## AI Observability

AI observability should track:

- request type
- model/provider metadata
- latency
- safety filter result
- user feedback
- error class

Avoid storing excessive sensitive content unless there is a clear consent and retention policy.

## Product Metrics

Product analytics should measure:

- onboarding completion
- first log conversion
- weekly active loggers
- tribe participation
- AI transformation coach usage
- retention cohorts

Product analytics must respect privacy and consent.
