# Implementation Status

_Last updated: 2026-09-20._

## Current product

STREM is in trail-running pivot validation. The current mobile app is a product-direction prototype around one Race Mission; it is not yet a production Race Pass.

| Capability | Status | Evidence |
|---|---|---|
| Product thesis, first customer, boundaries, and commercial hypothesis | Documented | `trail-running-pivot.md` |
| Paid pilot gate and repository delivery sequence | Documented | `trail-running-delivery-plan.md` |
| Mobile navigation: Mission, Plan, Race Lab, AI, Athlete | Implemented locally; review/merge pending | `strem-mobile` |
| Trail visual system and focused onboarding | Implemented locally; review/merge pending | `strem-mobile` |
| Live authentication, legal acceptance, user profile, athlete baseline, consent, AI chat, action receipts, and Strava/Whoop source status | Existing live paths retained | mobile API clients and existing services |
| Race Mission, event facts, GPX/course, constraints, evidence, risk, rehearsal, and decision contracts | Not started | shared-contract review required |
| Real mission intake and persistence | Not started | contract and service issues required |
| Real adaptive trail plan and readiness evidence | Not started | training and AI issues required |
| Calendar export and consented free/busy ingestion | Not started | privacy and platform review required |
| Paid 10-athlete concierge pilot | Not started | founder validation work |

## Prototype honesty

The mobile Mission, Plan, and Race Lab currently use one centralized, visibly labelled sample Race Mission. The fixture is not returned as personal data and must be deleted when approved race-specific contracts land.

If a live athlete endpoint fails, active trust surfaces show an empty or unavailable state. They do not fall back to a fictional athlete graph.

## Removed from the active mobile product

- generic Train and Fuel destinations;
- Tribe, challenges, leaderboards, and proof uploads;
- XP, ranks, medals, streaks, seasons, and collectible progression;
- Crew personas and the Forge-branded mock runtime;
- biomarkers, supplements, recaps, cinematic sharing, workout execution, and capture flows;
- obsolete image, sharing, media-library, and view-shot dependencies.

Backend services and stored data were not deleted. Removing or migrating them affects service boundaries, data retention, privacy obligations, and contracts, so it requires separate reviewed issues.

## Next irreversible decision

Do not build more prototype breadth. The next engineering decision is the reviewed Race Mission contract. The next business decision is whether real athletes will pay for the concierge pilot.
