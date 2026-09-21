# Feature Build Prompt

## Inputs

- Repository and scoped issue or explicit founder request:
- Race Mission outcome:
- Athlete problem:
- Acceptance criteria:
- Data sources and provenance:
- Safety, consent, contract, migration, and deployment impact:

## Required preparation

1. Read `AGENTS.md` and the nearest repository guide.
2. Read `product/trail-running-pivot.md`, `product/trail-running-delivery-plan.md`, and `product/implementation-status.md`.
3. Inspect the current implementation and worktree before editing.
4. State whether the feature improves a decision, rehearsal, risk, or race operation.
5. Identify what is recorded fact, calculated evidence, athlete input, assumption, and unknown.
6. Stop for the required review if shared contracts, service boundaries, auth, privacy, health behavior, AI safety, migrations, or deployment change.

## Build rules

- Build for the first self-coached 20–50 km trail athlete, not a hypothetical all-sports market.
- Keep manual entry useful when no wearable is connected.
- Do not reproduce tracker functionality unless it is necessary input infrastructure.
- Do not add XP, ranks, medals, Tribe, Crew, social comparison, or generic engagement mechanics.
- Never ship fabricated personal data behind an unlabeled fallback.
- AI decisions must expose evidence, assumptions, confidence, missing inputs, and athlete control.
- Prefer one real vertical slice over several preview-only surfaces.
- Remove replaced code, tests, assets, flags, and documentation.

## Verification

- Run the repository type, lint, test, and build checks.
- Test empty, unavailable, partial-data, and consent-revoked states.
- Confirm no retired route or product language remains.
- Reconcile `product/implementation-status.md`.

## Final report

- Race Mission value delivered
- files and behavior changed
- obsolete material removed
- checks run and results
- prototype versus live-data boundary
- review gates and follow-ups
