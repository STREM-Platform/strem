# Event-Driven Strategy

> **Status (2026-10-25, strem-docs#28):** no service publishes or consumes domain events today. The examples below are historical; the strategy (Redis Streams first, owning service owns the event) applies when a cross-service reaction is next needed, e.g. a proactive race-team brief after a sync.

> The event inventory includes existing legacy producers and consumers. New
> product work must prioritize Race Mission evidence and decision events; dormant
> tribe or progression events are maintenance-only until formally deprecated.

STREM uses asynchronous domain events to decouple services. The service that owns domain state owns the event. The choice of message broker is a technology decision that should be evaluated against operational cost, throughput requirements, and team bandwidth — not defaulted to without assessment.

## Why Events

Events reduce coupling between services. They allow domain services to announce what happened without knowing every downstream consumer.

Core domain events:

- `user.onboarded`
- `training.session_logged`
- `training.run_logged`
- `nutrition.entry_logged`
- `community.tribe_joined`
- `community.tribe_checkin_completed`
- `progression.xp_awarded`
- `ai.mission_generated`
- `ai.coach_summary_created`

## Broker Selection — Evaluate Per Phase

Do not pick a broker to match a default stack. Pick the broker that fits the current operational reality and scale.

### Evaluation Criteria

| Criterion | Question |
|-----------|----------|
| Operational simplicity | Can a solo or small team operate this without significant overhead? |
| Routing flexibility | Does the service need complex routing (fanout, topic-based, header-based)? |
| Throughput | What is the expected events-per-second at current scale and at next scale? |
| Persistence | Do events need to be replayed? For how long? |
| Infrastructure cost | Does this require a new service to run, or can it reuse existing infrastructure? |
| Python ecosystem | Is there a mature, well-maintained client library? |

### Options and Trade-offs

**Redis Streams**
- Runs on the same Redis instance already used for cache and rate limiting — no additional infrastructure
- Persistent, consumer group support, replay within retention window
- Well-supported in Python (`redis-py`)
- Good fit for MVP: low operational cost, no new dependency
- Limitation: not built for extremely high throughput or long-term event replay at analytics scale

**NATS**
- Extremely lightweight, very fast, minimal operational overhead
- JetStream (NATS persistence layer) adds durable delivery and replay
- Excellent Python client (`nats.py`)
- Good fit for MVP and early V2: simple to operate, very performant for service-to-service events
- Limitation: smaller ecosystem than RabbitMQ/Kafka, less mature tooling for complex routing

**RabbitMQ**
- Mature, flexible routing (fanout, topic, direct, headers)
- Well-supported in Python (`pika`, `aio-pika`)
- Higher operational overhead than Redis Streams or NATS
- Good fit if complex routing patterns are needed and team has RabbitMQ familiarity
- Limitation: more moving parts than necessary for early-stage event patterns

**Kafka / Redpanda**
- Best for high-throughput streaming, long event replay, analytics pipelines
- Redpanda is Kafka-compatible with lower operational overhead
- Good fit for V2+ when analytics, wearable data ingestion, or audit log replay becomes a requirement
- Limitation: significant operational complexity for MVP scale — do not introduce without a justified ADR

### Recommendation by Phase

| Phase | Recommendation |
|-------|---------------|
| MVP | Redis Streams (if Redis is in use) or NATS JetStream — lowest overhead, good enough |
| V2 | Evaluate if event volume or routing complexity justifies RabbitMQ or Redpanda |
| V3+ | Evaluate Kafka or Redpanda for analytics pipelines and wearable data |

The recommendation is not a mandate. If the team evaluates and finds a different option better justified, write an ADR and use that instead.

## Event Ownership

The service that owns the domain state owns the event. This is a fixed principle regardless of broker choice.

- `strem-user-service` owns profile, onboarding, and progression events
- `strem-training-service` owns training and running log events
- `strem-nutrition-service` owns nutrition log events
- `strem-community-service` owns tribe and check-in events
- `strem-ai-orchestrator` owns mission and coaching events

## Naming Convention

Use past-tense domain events in `domain.action` format:

- `user.onboarded`
- `training.session_logged`
- `training.run_logged`
- `nutrition.entry_logged`
- `community.tribe_joined`
- `community.checkin_completed`
- `progression.xp_awarded`
- `ai.mission_generated`
- `ai.coach_summary_created`

## Contracts

Event schemas belong in `strem-shared-contracts` when implementation begins. Event changes require:

- schema versioning
- consumer impact review
- contract review
- migration or compatibility plan

## AI Orchestrator

The AI orchestrator may consume events to trigger mission generation or coaching responses. It must not mutate domain records directly — it calls service APIs or publishes its own events where action is needed.

## Failure Handling

Each event consumer must define regardless of broker:

- idempotency behavior (can the same event be processed twice safely?)
- retry policy (how many retries, with what backoff?)
- dead-letter handling (where do failed events go for inspection?)
- observability signals (how do we know an event was processed or failed?)
- data privacy constraints (are sensitive fields excluded from event payloads where possible?)
