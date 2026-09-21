# Database Strategy

> Existing nutrition, progression, and community stores may contain retained
> legacy data even though those features are dormant in the active trail product.
> Product removal does not authorize data deletion or ownership changes.

Each service owns its data. No service may read or write another service's database directly. That principle is fixed. The specific database technology for each service is not — it should be chosen based on the service's actual access patterns, performance requirements, and operational cost.

## Decision Framework

Before choosing a database for a service, answer:

1. **Access pattern** — Is this primarily relational (joins, transactions, foreign keys)? Document/semi-structured? Time-series? Key-value lookups?
2. **Write volume** — How many writes per second at MVP scale? At V2 scale?
3. **Read pattern** — Point lookups? Range queries? Full-text search? Aggregations?
4. **Consistency requirements** — Does this data require ACID guarantees, or is eventual consistency acceptable?
5. **Operational cost** — What is the hosting, maintenance, and failure-recovery cost of this choice for a small team?

The right database is the one that best fits those answers — not the one that appears in a default stack template.

## Technology Categories and When to Use Each

### Relational (PostgreSQL, MySQL, CockroachDB)

Best for: structured domain data with relationships, transactions, and integrity constraints.

Good fit for: auth records, user profiles, training logs, nutrition logs, tribe membership, community events.

PostgreSQL is the default recommendation for services that need relational guarantees. It is mature, well-supported in Python, supports JSON columns for semi-structured data, and has the TimescaleDB extension available for time-series needs.

Do not use a relational database if the service primarily needs document flexibility, time-series efficiency, or key-value speed.

### Document Store (MongoDB, DynamoDB, Firestore)

Best for: flexible schemas, nested structures, content that doesn't map cleanly to tables.

Potentially good fit for: AI coaching session metadata, mission objects, structured notification payloads, content that changes shape frequently during early product iteration.

Consider if a service stores data with variable structure where schema rigidity creates more friction than value.

### Time-Series (TimescaleDB, InfluxDB, Clickhouse)

Best for: high-volume append-only data with time-based queries (averages, aggregations, trends).

Potentially good fit for: training session metrics at high volume (V2+), wearable biometric data ingestion (V3), analytics pipelines.

TimescaleDB is a PostgreSQL extension — lowest operational overhead if PostgreSQL is already running. Native time-series databases make sense when volume justifies the operational cost of a separate system.

### Key-Value / Cache (Redis, Valkey, Dragonfly, Memcached)

Best for: ephemeral state, rate limiting, session tokens, idempotency keys, short-lived cache, background job coordination.

Redis is the default recommendation for cache and short-lived state. Valkey (MIT-licensed Redis fork) and Dragonfly (Redis-compatible, higher throughput) are valid alternatives if licensing or performance is a concern.

Key-value stores must not become the durable source of truth for user logs, profiles, or tribe data.

### Vector Database (Pinecone, Weaviate, pgvector)

Deferred to V2+ when RAG is introduced. PostgreSQL's `pgvector` extension is the lowest-friction starting point. Dedicated vector databases (Pinecone, Weaviate, Qdrant) should be evaluated only when embedding volume or query patterns justify the operational overhead.

## Per-Service Guidance (MVP)

| Service | Recommended Approach | Rationale |
|---------|---------------------|-----------|
| `strem-auth-service` | Relational (PostgreSQL) | Sessions, tokens, identity — relational integrity required |
| `strem-user-service` | Relational (PostgreSQL) | Profiles, onboarding, XP ledger — structured, transactional |
| `strem-training-service` | Relational (PostgreSQL); evaluate TimescaleDB if log volume warrants | Training and running logs are time-stamped but not yet high-volume |
| `strem-nutrition-service` | Relational (PostgreSQL) | Meal logs are structured with clear schema |
| `strem-community-service` | Relational (PostgreSQL) | Tribe membership, check-ins, Tribe Power — relational fits well |
| `strem-ai-orchestrator` | Flexible — consider document store or relational + JSONB for mission objects and conversation metadata | Mission objects and coach session state may benefit from document flexibility |
| Cache / rate limits | Redis or equivalent | Ephemeral, not durable |

These are starting recommendations. Each service team (or agent) must evaluate the actual access pattern before selecting a database. If a different choice is better, document the decision in an ADR.

## Data Ownership Rules

- Each service owns one database or schema boundary.
- No service reads or writes another service's database directly.
- Data shared across services moves through API contracts or domain events — never through shared tables or shared ORM models.
- Shared ORM models across services are prohibited.

## Migrations

Migration tooling should match the chosen database:

- PostgreSQL services: Alembic is the standard migration tool for Python.
- Other databases: choose appropriate migration tooling and document it in the service's `AGENTS.md`.

Migration rules regardless of tool:

- migrations must be reviewed before merge
- migrations must include rollback or forward-fix strategy
- destructive changes require explicit approval
- cross-service data movement requires an ADR or architecture review
- generated migrations must be inspected before merge

## Privacy and Deletion

Health-adjacent and performance data must support:

- data minimization
- user export (required before V2 growth)
- user deletion (required before V2 growth)
- auditability for sensitive operations
- consent-aware processing

These requirements apply to every database choice — they are not PostgreSQL-specific.

## Adding a New Database

If a service requires a database technology not listed above:

1. Document the access pattern and why existing options do not fit.
2. Write an ADR with trade-offs and the decision.
3. Define the operational plan: hosting, backup, failure recovery.
4. Get architecture review before implementation begins.

The goal is not to standardize on one database. The goal is to make every database choice deliberate, documented, and maintainable.
