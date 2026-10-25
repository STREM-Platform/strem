# Service Map

Ownership for the Race OS platform as it runs on `main` (2026-10-25). Product status does not transfer ownership or authorize deletion of user data.

## Active request path

`strem-mobile → strem-api-gateway → owning service → service-owned store`

The AI orchestrator reads and writes through the owning services' APIs with the athlete's token. It never shares domain databases. No service publishes domain events today (see `event-driven-strategy.md`).

## Running services

### `strem-mobile`

Race Mission presentation: race setup, Mission home, Plan, Race Lab, the race team, the athlete hub, source connections, check-ins, data controls and onboarding (welcome + one "about you" step).

### `strem-api-gateway`

External routing (`auth`, `users`, `race-missions`, `training`, `integrations`, `ai`), bearer-token handoff, rate limiting (Redis), request-size limits and CORS. It owns no domain records.

### `strem-auth-service`

Account identity, credentials, sessions and tokens (register, login, refresh, logout, me).

### `strem-user-service`

Profile, onboarding, legal acceptance, the athlete profile (weight, injuries, dietary needs), Race Missions (several active, completion into history), Race Lab layers (fuel, gear, logistics, strategy) and race history. Coordinates mission-data export and deletion with training-service (ADR 0007).

### `strem-training-service`

Logged and imported sessions, Strava/Whoop connection state and recovery samples, private mission courses (GPX), mission training plans, progress and evidence, and daily check-ins.

### `strem-ai-orchestrator`

The race team (ADR 0008): the deterministic race engine, guarded AI personalization (Claude), daily briefs, chat, adaptation proposals and enrichment (places, conditions, openly licensed photos). It stores only chat history, cached briefs and proposals; it owns no athlete, race or activity source of truth.

### `strem-shared-contracts`

Reviewed OpenAPI for auth, user, training, integrations and ai; the event catalogue (empty since strem-docs#28).

### `strem-infra`

Docker Compose for local development, the demo seed, migration and health scripts, CI templates.

### `strem-docs`

Product authority, architecture decisions, workflows, prompts, runbooks and implementation status.

## Retired (strem-docs#28)

- `strem-nutrition-service` and `strem-community-service`: no longer part of the stack or the contracts. Their repositories and databases still exist; archiving the repositories and dropping `strem_nutrition`/`strem_community` need a founder retention decision.
- User-service XP, ranks, medals, streaks, biomarkers and agent consent/autonomy; training-service strength sets and personal records; the pre-pivot AI coach. Their tables remain (models kept for Alembic) until a retention decision.

## Not approved

Do not create separate race, calendar, weather, payments, marketplace, coach, recovery, season or endurance services until a scoped issue and ADR show why an existing owner cannot hold the capability. Seasons (strem-training-service#18) belong in training-service.
