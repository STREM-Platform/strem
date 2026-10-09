# Implementation Status

_Last updated: 2026-10-09._

## Current product

STREM is in trail-running pivot validation. Founder-approved issue `strem-user-service#24` now has a locally implemented real Race Mission foundation across user-service, shared-contracts, gateway and mobile. This is not a completed or deployed production Race Pass. Main still contains the older prototype until the coordinated PRs merge.

| Capability | Status | Evidence |
|---|---|---|
| Product thesis, first customer, boundaries, and commercial hypothesis | Documented | `trail-running-pivot.md` |
| Paid pilot gate and repository delivery sequence | Documented | `trail-running-delivery-plan.md` |
| Advanced race-command experience, responsive flows, motion, accessibility, and component rules | Mission workspace merged to mobile/main in PR #110 (`0d8cd22`); full visual acceptance outstanding | `race-experience-blueprint.md`, `strem-mobile#103`, `strem-docs#21` |
| Licensed event-media acquisition, attribution, fallback, takedown, and `EventMedia` proposal | Documented; contract implementation not started | `race-media-policy.md` |
| Five-athlete comprehension and usability gate | Documented; test not run | `race-experience-usability.md` |
| Mobile navigation: Mission, Plan, Race Lab, AI, Athlete | Merged to `strem-mobile/main`; prototype data remains | `88468e6` |
| Trail visual system, responsive auth, onboarding, legal, and atmospheric race UI | Merged to `strem-mobile/main`; visually reviewed, not the final advanced experience | `f7b867d` and `strem-mobile#103` |
| Live authentication, legal acceptance, user profile, athlete baseline, consent, AI chat, action receipts, and Strava/Whoop source status | Existing live paths retained | mobile API clients and existing services |
| Race Mission, event facts/media, GPX/course, constraints, evidence, risk, rehearsal, decision, calendar-intent, and debrief contracts | Review draft open; not merged | `strem-shared-contracts#38`, PR `strem-shared-contracts#39`, human review required |
| Private mission create/read/edit/archive, one active mission, revisions, export/delete | Implemented locally; approval recorded for this narrow foundation, release checks pending | `strem-user-service#24`; partial delivery of `strem-user-service#23`, `strem-mobile#104`, `strem-api-gateway#11` |
| GPX course intelligence | Scoped; implementation not started | `strem-training-service#10`, `strem-mobile#105` |
| Real adaptive trail plan and preparation evidence | Scoped; implementation not started | `strem-training-service#11`, `strem-mobile#106` |
| Cited, reversible AI Race Team decisions | Scoped; implementation not started | `strem-ai-orchestrator#33`, `strem-mobile#108` |
| Honest AI-unavailable response without misleading context citations | Implemented in PR #38; not merged, safety-adjacent fallback review required | `strem-ai-orchestrator#34`; 121 tests, ruff and strict mypy pass |
| Consented evidence snapshots, proactive proposals and real-provider evaluation | Scoped; not implemented | `strem-ai-orchestrator#35`, `#36`, `#37` |
| Functional Race Lab rehearsals and operations | Scoped; implementation not started | `strem-mobile#107` |
| Calendar export and consented free/busy ingestion | Product/privacy decision scoped; implementation not approved | `strem-docs#18` |
| Race Pass packaging and entitlement | Validation scoped; checkout not approved | `strem-docs#19` |
| Paid 10-athlete concierge pilot | Scoped; recruitment and payment not started | `strem-docs#16` |
| Pilot release environment and observability | Scoped; gated on a deployable vertical slice | `strem-infra#17` |

## Real foundation and prototype removal

On the foundation branch, mobile creates and reloads authenticated server-owned mission records. Event details and goal are athlete-entered, never official facts. Elevation and cutoff can remain unknown. Dates are calendar dates in the entered event timezone; no race-start time is invented. Editing uses versions; create/archive retries use idempotency receipts. Archive retains history; explicit mission-only deletion removes owned missions, revisions and receipts without touching legacy data.

The runtime sample mission, course explorer/profile, fabricated preparation sessions and sample advice have been deleted on this branch. Plan, course intelligence and race-specific AI now show honest unavailable states. Generic coach chat is no longer presented as a mission-aware Race Team. Unsaved form drafts are not yet resumable across closing the form. No new AI/data-source consent is implied by mission creation.

The founder explicitly approved existing user-service ownership and additive migration `0008_race_missions` on 2026-10-08. No existing rows are migrated or deleted. Keep the additive tables if rolling application code back; downgrading populated tables is destructive and requires separate approval/backup. No real database was migrated during this increment. The narrow user contract takes precedence over overlapping, unmerged draft PR #39 foundation operations; course/proposal contracts still need their own review.

The existing backend still has legacy coaching paths. Audit found that its keyless/error fallback could claim personal analysis and attach context chips. AI PR #38 fixes those fallback paths; until reviewed and merged, do not describe the backend as fully honest or production-ready. Successful response chips are still context summaries, not validated claim-level citations; that work belongs to #33/#35/#37.

The advanced experience may use approved event photography, athlete-owned media, or licensed stock fallbacks. No race-site or social-media image may be scraped, and no stock or generated image may be presented as the official event. The governing design and media-rights work is now documented in `race-experience-blueprint.md`, `race-media-policy.md`, and `race-experience-usability.md` under `strem-docs#17`.

## Removed from the active mobile product

- generic Train and Fuel destinations;
- Tribe, challenges, leaderboards, and proof uploads;
- XP, ranks, medals, streaks, seasons, and collectible progression;
- Crew personas and the Forge-branded mock runtime;
- biomarkers, supplements, recaps, cinematic sharing, workout execution, and capture flows;
- obsolete image, sharing, media-library, and view-shot dependencies.

Backend services and stored data were not deleted. Removing or migrating them affects service boundaries, data retention, privacy obligations, and contracts, so it requires separate reviewed issues.

## Active execution backlog

The cross-repository source of truth is `strem-docs#20`. It sequences paid validation, the advanced experience blueprint, contracts, service implementation, mobile replacement, functional hardening, and pilot operations.

The pre-pivot mobile issues for Fuel, Tribe, Crew, Forge personas, generic capture, biomarkers, supplements, and social competition were closed as superseded on 2026-09-21. Their Git and issue history remains available; retained trust and integration foundations remain in code.

On 2026-10-08, seven superseded PRs were closed without merging: mobile #92/#94/#95, shared-contracts #37, infra #16, gateway #10 and community #16. Branches and commits remain recoverable. The inherited proof-media changes were also removed from contract PR #39 in `62c5c8c`; that PR now remains focused on Race Mission contracts.

The STREM-Platform Core Platform project board (project 1; organization sign-in required) includes the scoped foundation issue #24. Ninety-two historical completed/superseded items were archived, not deleted. `Ready` is a queued-work status, not permission to bypass dependencies. The `Delivery gate` field distinguishes contract approval, upstream implementation, human review, UX validation and pilot validation.

### Verification for this increment

- Foundation: 103 standard user-service tests and two separately opted-in release tests pass; mobile has 24 passing tests and a successful production web export. Python lint/strict types and mobile TypeScript/ESLint pass. The PostgreSQL 16 migration/API lifecycle and real-HTTP gateway/user-service restart checks use disposable loopback databases. The HTTP check uses signed test JWTs; it does not verify auth-service registration or mobile interaction. Browser/device acceptance remains outstanding: browser control has no connected browser and the native UI helper is unavailable. The mobile README supplies the manual checklist. Do not close #103 or #109 on this evidence alone.
- A PostgreSQL regression reproduced concurrent deletion leaving an orphaned idempotency snapshot (`0 missions / 0 revisions / 1 receipt`). Per-owner transaction locking now serializes mission writes and exports; the regression verifies complete new records for a create ordered after deletion. No production schema change or existing-data migration was added.
- Mobile deadlines now cover response-body reads and token refresh/retry, not just initial response headers. Regression tests cover both stalled-body and stalled-refresh cases. Calendar dates reject timestamps instead of silently coercing them. These are foundation correctness fixes, not new AI or integration capabilities.
- AI: 121 tests, ruff and strict mypy across 63 files passed in an isolated Python 3.12 environment. No paid/live model call was performed; scripted-provider tests do not establish real-provider quality or coaching safety.
- Foundation contracts: seven main-branch OpenAPI specs and eighteen existing event schemas validate with the additive user contract. The broader PR #39 has separate draft-only validation evidence; do not confuse it with approved implemented operations.
- Real-event photography rights and the five-athlete comprehension test remain unfulfilled; `strem-docs#21` makes these explicit deliverables.

## Next irreversible decision

Do not build more unconnected prototype breadth. Contract PR #39 still needs review of provenance trust, typed plan mutations, target resource concurrency, and real reversal semantics; its unconstrained before/after diff is not an approved write API. No service or mobile implementation should treat the draft as approved before it merges. AI PR #38 also requires review because the fallback is shared with safety middleware. In parallel, the business decision remains whether real athletes will pay for the concierge pilot in `strem-docs#16`.
