# Implementation Status

_Last updated: 2026-09-21._

## Current product

STREM is in trail-running pivot validation. The current mobile app is a product-direction prototype around one Race Mission; it is not yet a production Race Pass.

| Capability | Status | Evidence |
|---|---|---|
| Product thesis, first customer, boundaries, and commercial hypothesis | Documented | `trail-running-pivot.md` |
| Paid pilot gate and repository delivery sequence | Documented | `trail-running-delivery-plan.md` |
| Mobile navigation: Mission, Plan, Race Lab, AI, Athlete | Merged to `strem-mobile/main`; prototype data remains | `88468e6` |
| Trail visual system, responsive auth, onboarding, legal, and atmospheric race UI | Merged to `strem-mobile/main`; visually reviewed, not the final advanced experience | `f7b867d` and `strem-mobile#103` |
| Live authentication, legal acceptance, user profile, athlete baseline, consent, AI chat, action receipts, and Strava/Whoop source status | Existing live paths retained | mobile API clients and existing services |
| Race Mission, event facts, GPX/course, constraints, evidence, risk, rehearsal, decision, and media contracts | Scoped; implementation not started | `strem-shared-contracts#38`, review required |
| Real mission intake and persistence | Scoped; implementation not started | `strem-user-service#23`, `strem-mobile#104` |
| GPX course intelligence | Scoped; implementation not started | `strem-training-service#10`, `strem-mobile#105` |
| Real adaptive trail plan and preparation evidence | Scoped; implementation not started | `strem-training-service#11`, `strem-mobile#106` |
| Cited, reversible AI Race Team decisions | Scoped; implementation not started | `strem-ai-orchestrator#33`, `strem-mobile#108` |
| Functional Race Lab rehearsals and operations | Scoped; implementation not started | `strem-mobile#107` |
| Calendar export and consented free/busy ingestion | Product/privacy decision scoped; implementation not approved | `strem-docs#18` |
| Race Pass packaging and entitlement | Validation scoped; checkout not approved | `strem-docs#19` |
| Paid 10-athlete concierge pilot | Scoped; recruitment and payment not started | `strem-docs#16` |
| Pilot release environment and observability | Scoped; gated on a deployable vertical slice | `strem-infra#17` |

## Prototype honesty

The mobile Mission, Plan, and Race Lab currently use one centralized, visibly labelled sample Race Mission. The fixture is not returned as personal data and must be deleted when approved race-specific contracts land.

If a live athlete endpoint fails, active trust surfaces show an empty or unavailable state. They do not fall back to a fictional athlete graph.

The advanced experience may use approved event photography, athlete-owned media, or licensed stock fallbacks. No race-site or social-media image may be scraped, and no stock or generated image may be presented as the official event. The governing design and media-rights work is `strem-docs#17`.

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

## Next irreversible decision

Do not build more unconnected prototype breadth. Execute `strem-docs#17` first to define the advanced race-first experience and the legal path to real event imagery. The next engineering review gate is `strem-shared-contracts#38`. In parallel, the next business decision remains whether real athletes will pay for the concierge pilot in `strem-docs#16`.
