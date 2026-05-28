# ADR 0004: Async Messaging — Evaluate Broker Based on Operational Cost and Scale

## Status

Revised — original decision (RabbitMQ before Kafka) replaced with evaluation-based approach.

## Context

STREM needs asynchronous communication between services for domain events (training session logged → XP awarded, mission generated, AI coach triggered). The original decision prescribed RabbitMQ as the first broker without evaluating lighter alternatives.

The correct frame is not "which broker is most familiar" but "which broker provides reliable async delivery at MVP scale with the least operational overhead for a small team."

## Decision

**Do not mandate a specific broker. Evaluate at implementation time using the criteria in `architecture/event-driven-strategy.md`.**

The decision should be made when the first service that needs async messaging is being implemented — not in advance during the documentation phase.

At that point, the team evaluates:

| Option | When It Fits |
|--------|-------------|
| Redis Streams | Redis is already running for cache. Lowest overhead — no additional infrastructure. Good for MVP event volume. |
| NATS JetStream | Dedicated lightweight broker, very fast, minimal ops cost. Good for MVP and V2. |
| RabbitMQ | Needed if complex routing patterns are required. More overhead than Redis Streams or NATS. |
| Kafka / Redpanda | High-throughput streaming, long replay. Not appropriate for MVP. Evaluate for V2+ analytics pipelines. |

The preferred direction for MVP is Redis Streams or NATS — both avoid introducing a third stateful service when the event volume does not justify one. If evaluation at implementation time finds a different choice better justified, document it in a new ADR.

## Consequences

Benefits:

- technology choice is made with actual service requirements in hand, not speculatively
- avoids locking in operational overhead before scale warrants it
- Redis Streams path reuses existing infrastructure if Redis is the cache layer
- NATS path keeps messaging simple and fast with minimal ops

Costs:

- the decision is deferred, which means it must be made deliberately when implementation begins
- team must evaluate options rather than defaulting to a familiar choice

## Guardrail

Do not introduce a messaging broker until at least one service has a concrete need for async event delivery. Document the broker choice in an ADR at that point. Do not introduce Kafka or Redpanda in MVP without a new ADR documenting the throughput or replay requirement that justifies the operational overhead.
