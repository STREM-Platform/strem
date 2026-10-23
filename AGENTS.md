# strem-docs Agent Guide

This repository is the canonical product, architecture, workflow, and operating documentation source for STREM.

## Active authority

Read before contributing:

1. `product/race-os.md`
2. `product/trail-running-pivot.md`
3. `product/trail-running-delivery-plan.md`
4. `product/implementation-status.md`
5. `prompts/global/agent-rules.md`

STREM is the AI race team for self-coached endurance athletes: an athlete names a race or challenge and STREM plans training, fueling, gear, logistics and strategy for it (founder direction 2026-10-23, `strem-docs#26`). Trail running stays the first validation market and the depth benchmark. Older hybrid-athlete, gamification, Tribe, Crew, generic tracker, and cinematic directions have been removed. Do not recreate them from Git history without an explicit new founder decision.

## Documentation rules

- Write direct, testable product and engineering decisions.
- Keep one active roadmap and one implementation-status source.
- Distinguish shipped, locally implemented, prototype-only, planned, and validation work.
- Do not claim runtime behavior that is not present in code and contracts.
- Link cross-repository work to scoped issues and state its contract dependency.
- Update indexes and repair links whenever a document is removed or renamed.
- Prefer deletion over preserving contradictory product directions.

## Product anti-drift

A change belongs only if it improves an event-specific decision, rehearsal, risk, operation, trust control, or paid validation step for an athlete preparing for a race or challenge.

Stop or narrow work that becomes:

- a generic tracker or dashboard;
- a generic AI chat or training plan;
- social engagement, gamification, or mandatory community;
- a sport without sport-correct engine rules, or breadth that makes trail preparation worse;
- fabricated certainty or personal data;
- unreviewed health, privacy, contract, or safety behavior.

## Repository boundaries

- Product decisions belong here.
- Shared APIs and schemas belong in `strem-shared-contracts` after review.
- Runtime code belongs in its owning service or app repository.
- Deployment and observability assets belong in `strem-infra`.
- Do not place application code, fake services, migrations, or generated contract artifacts in this repository.

## Required review gates

Human or review-agent approval is required for shared contracts, service boundaries, migrations, authentication, authorization, privacy, health-data behavior, safety-affecting AI behavior, CI/CD, and deployment.

## Completion

When documentation changes, report what became authoritative, what was removed, which links were reconciled, and which implementation or validation decision remains next.
