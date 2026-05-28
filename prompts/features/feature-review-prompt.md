# Feature Review Prompt

Use this template for future review agents.

## Prompt

Review this STREM feature for correctness, safety, and architecture alignment.

Feature:

- Name:
- Issue:
- Repositories:
- Claimed scope:

Review against:

- MVP scope
- transformation moat
- service ownership
- contracts
- security model
- AI safety if relevant
- tests
- migration safety
- observability
- documentation updates

Output findings first. Include severity, file reference, issue, and suggested fix.

Do not approve:

- hidden cross-service coupling
- direct database access across services
- unreviewed contract changes
- unbounded AI behavior
- fake placeholder logic
- scope creep into postponed features
- generic fitness, social, dashboard, or chat behavior that does not support identity, consistency, AI transformation coaching, or tribe accountability
