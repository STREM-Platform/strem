# Runbook: Create New Feature

## Preconditions

- issue exists
- feature is in the current roadmap phase
- affected repository is named
- acceptance criteria are clear
- security and data implications are understood

## Planning Steps

1. Define the user outcome.
2. Confirm MVP or future-phase status.
3. Identify owning service or app.
4. Identify data changes.
5. Identify API or event contract changes.
6. Identify AI behavior changes.
7. Define tests.
8. Define rollout and observability needs.

## Implementation Steps

1. Create a focused branch.
2. Read `AGENTS.md`.
3. Implement the smallest complete behavior.
4. Add tests.
5. Update docs if behavior, contracts, or workflows changed.
6. Run verification.
7. Open PR with template.

## Review Gates

Architecture review required for:

- new service boundary
- contract changes
- event changes
- migrations
- AI transformation coach policy changes
- auth/security changes

## Done Means

- acceptance criteria pass
- tests pass or skipped with reason
- docs updated where needed
- PR risk is clear
