# Service Map

This document defines initial service ownership. It prevents agents from scattering related behavior across repositories.

## First-Wave Services

### strem-api-gateway

Owns external API entrypoint behavior:

- request routing
- auth handoff
- rate limiting integration
- public API aggregation where needed
- mobile-facing gateway concerns

It must not own core domain data.

### strem-auth-service

Owns:

- account identity
- authentication flows
- sessions and tokens
- password or provider-based login
- auth audit events

It must not own profile, training, nutrition, or community data.

### strem-user-service

Owns:

- user profile
- onboarding answers
- goals
- preferences
- basic identity settings

It is the source of truth for personalization context that is not authentication.

### strem-training-service

Owns:

- strength/general training logs
- running logs
- training summaries
- future workout templates only when approved

Running remains here for MVP. Do not create a separate endurance service yet.

### strem-nutrition-service

Owns:

- basic meal logs
- nutrition notes
- simple daily nutrition records

It does not own meal-prep marketplace, grocery automation, or supplements during MVP.

### strem-community-service

Owns:

- basic tribes
- tribe membership
- tribe check-ins
- lightweight tribe discussion
- basic moderation state

It must not become a broad social network during MVP.

### strem-ai-orchestrator

Owns:

- basic AI transformation coach interactions
- context assembly from approved service contracts
- AI response policy enforcement
- safety boundaries
- future RAG and agent orchestration

It must not become the owner of domain records. Domain services remain sources of truth.

## Foundation Repositories

### strem-docs

Source of truth for product, architecture, workflows, prompts, runbooks, and ADRs.

### strem-shared-contracts

Future source of truth for:

- OpenAPI specs
- event schemas
- shared DTOs
- contract test definitions
- schema version history

### strem-infra

Future source of truth for:

- Docker Compose
- GitHub Actions shared patterns
- environment templates
- observability config
- deployment manifests

## Postponed Services

Postpone until validated need:

- meal prep
- recovery
- challenges
- XP
- notifications
- payments
- coach
- marketplace
- web
- admin
- coach dashboard
