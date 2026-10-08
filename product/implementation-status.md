# Implementation Status

_Last updated: 2026-10-08._

## Current product

STREM is in trail-running pivot validation. The current mobile app is a product-direction prototype around one Race Mission; it is not yet a production Race Pass.

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
| Real mission intake and persistence | Scoped; implementation not started | `strem-user-service#23`, `strem-mobile#104` |
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

## Prototype honesty

The mobile Mission, Plan, and Race Lab currently use one centralized, visibly labelled sample Race Mission. The fixture is not returned as personal data and must be deleted when approved race-specific contracts land.

The Mission workspace uses a fixed, visible 24 September 2026 demo snapshot so its countdown cannot imply that old sample sessions are current. Its course illustration is not official GPX or an event photograph. Expandable evidence and reasoning remain synthetic. The unexplained sample readiness score was removed in merged mobile PR #110.

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

The STREM-Platform Core Platform project board (project 1; organization sign-in required) contains 24 trail-delivery issues. Ninety-two historical completed/superseded items were archived, not deleted. `Ready` is a queued-work status, not permission to bypass dependencies. The `Delivery gate` field distinguishes contract approval, upstream implementation, human review, UX validation and pilot validation.

### Verification for this increment

- Mobile: TypeScript, ESLint, 20 unit tests and production web export passed. Browser/physical-device screenshots, keyboard/screen-reader interaction and responsive visual acceptance remain unverified because no browser was connected to the available UI tool. Do not close #103 or #109 on this evidence alone.
- AI: 121 tests, ruff and strict mypy across 63 files passed in an isolated Python 3.12 environment. No paid/live model call was performed; scripted-provider tests do not establish real-provider quality or coaching safety.
- Contracts: eight OpenAPI specs, eighteen existing event schemas and seven positive/negative examples passed after scope cleanup. This is schema validation, not semantic or safety approval.
- Real-event photography rights and the five-athlete comprehension test remain unfulfilled; `strem-docs#21` makes these explicit deliverables.

## Next irreversible decision

Do not build more unconnected prototype breadth. Contract PR #39 still needs review of provenance trust, typed plan mutations, target resource concurrency, and real reversal semantics; its unconstrained before/after diff is not an approved write API. No service or mobile implementation should treat the draft as approved before it merges. AI PR #38 also requires review because the fallback is shared with safety middleware. In parallel, the business decision remains whether real athletes will pay for the concierge pilot in `strem-docs#16`.
