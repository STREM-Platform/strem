# Service Map

This map defines ownership for the active trail pivot while acknowledging existing legacy storage. Product status does not transfer ownership or authorize deletion of user data.

## Active request path

`strem-mobile → strem-api-gateway → owning service → service-owned store`

The AI orchestrator reads through approved APIs. It never shares domain databases.

## Repositories

### `strem-mobile`

Owns Race Mission presentation, onboarding, manual input, source authorization, athlete controls, proposal review, and field-ready mobile interaction.

### `strem-api-gateway`

Owns external routing, authentication handoff, rate limiting, request correlation, and mobile-facing aggregation where justified. It owns no domain records.

### `strem-auth-service`

Owns account identity, credentials, sessions, tokens, and authentication audit events.

### `strem-user-service`

Owns athlete profile, onboarding, constraints that are not event-specific, legal acceptance, consent, and preferences. Existing XP, rank, and medal records remain legacy data until a reviewed retention or migration issue removes them.

### `strem-training-service`

Owns activity history, Strava/Whoop connection state, normalized sessions, recovery samples, and future course/activity evidence derivation. GPX and terrain responsibilities require an approved Race Mission contract before implementation.

### `strem-ai-orchestrator`

Owns consent-filtered context assembly, evidence interpretation, cited AI responses, safety middleware, decision proposals, and action receipts. It owns no athlete, event, activity, or calendar source of truth.

### `strem-nutrition-service`

Owns existing nutrition records. It has no active standalone mobile surface. Race fueling should begin as a Race Mission rehearsal contract; do not expand this service until ownership is reviewed.

### `strem-community-service`

Owns existing tribe and challenge records. Community is dormant in the active product. Do not add new social behavior or delete retained data without a reviewed deprecation and privacy plan.

### `strem-shared-contracts`

Owns reviewed OpenAPI, event schemas, DTO definitions, contract tests, and schema history. The next product contract is the Race Mission vertical slice.

### `strem-infra`

Owns local orchestration, CI/CD, environment templates, observability configuration, and deployment assets.

### `strem-docs`

Owns product authority, architecture decisions, workflows, prompts, runbooks, and implementation status.

## Not approved

Do not create separate race, calendar, weather, payments, marketplace, coach, recovery, or endurance services until a scoped issue and ADR show why an existing owner cannot hold the capability.
