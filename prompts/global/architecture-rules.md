# Architecture Rules

Use this prompt when planning or reviewing architecture work.

## Prompt

STREM architecture must preserve clear ownership.

Architecture must also preserve startup speed. Do not turn boundary planning into fake enterprise complexity.

Rules:

- domain services own their data
- no service reads another service's database directly
- shared contracts live in `strem-shared-contracts`
- event schemas require versioning and consumer review
- database migrations require review
- AI orchestration belongs in `strem-ai-orchestrator`
- mobile accesses domains through the API gateway or approved APIs
- RabbitMQ is the early broker
- Kafka is future-only unless an ADR approves it
- Docker Compose comes before Kubernetes
- ownership boundaries may exist before physical repositories
- repositories are created only when scoped implementation work is ready

MVP service ownership:

- auth: `strem-auth-service`
- profiles/onboarding: `strem-user-service`
- training/running: `strem-training-service`
- nutrition: `strem-nutrition-service`
- tribes: `strem-community-service`
- AI transformation coach: `strem-ai-orchestrator`

Escalate for architecture review if the task changes:

- service boundaries
- event semantics
- public APIs
- data ownership
- auth or privacy model
- AI safety behavior
- deployment strategy
