# Implementation Status

The single "where are we now" view. The other product docs describe the *intended*
system; this one tracks what is **actually built and merged to `main`**, what is
partial, and what is queued. Update it whenever a capability ships.

**Legend:** ✅ done & merged · 🟡 core shipped, follow-up queued · ⬜ planned (issue exists) · 🔒 gated/future (Phase 3+)

_Last updated: 2026-06-10._

## The transformation loop (MVP) — shipped

| Capability | Status | Where |
|---|---|---|
| Auth (JWT, refresh, sessions) | ✅ | `strem-auth-service` |
| Onboarding (7-screen, identity-first) | ✅ | `strem-mobile` + `strem-user-service` |
| Training / running / mobility logging | ✅ | `strem-training-service` |
| Nutrition logging | ✅ | `strem-nutrition-service` |
| Weekly proof-of-consistency + mission history | ✅ | MVP-17 — Coach screen |
| XP ledger + award from events (Redis Streams) | ✅ | `strem-user-service` workers |

## AI coach

| Capability | Status | Where |
|---|---|---|
| Weekly narrative recap (read + on-demand generate) | ✅ | MVP-03 · `/ai/coach/recap` (+ `/generate`) |
| Structured weekly missions (generate/complete/skip/history) | ✅ | `/ai/missions/*` |
| Behavioral adaptation (re-engagement / burnout / milestone / steady) | ✅ | P2-04 · `/ai/coach/adaptation` |
| Multi-week context signals (active days, rank proximity from ledger) | ✅ | P2-04 · context provider |
| AI tribe-summary narrative | ✅ | MVP-16 · `/ai/coach/tribe-summary` |
| Season-aware narrative + connected multi-week mission arcs | ⬜ | P2-08 |
| Audio mission briefings (TTS) | 🔒 | P3-02 |

## Tribes & accountability

| Capability | Status | Where |
|---|---|---|
| Tribe creation / join / check-ins / Tribe Power | ✅ | `strem-community-service` |
| Collective challenges (create / contribute / complete) — in app | ✅ | MVP-13 · `/tribes/{id}/challenges` |
| Weekly tribe summary + inactive-member (nudge) detection | ✅ | MVP-16 · `/tribes/{id}/weekly-summary` |
| Tribe leaderboard (by Tribe Power) | ✅ | P2-02 · `/tribes/leaderboard` |
| Tribe-vs-tribe head-to-head challenges | ⬜ | P2-05 |
| Mobile surfacing of leaderboard | ⬜ | P2-09 |

## Game & progression

| Capability | Status | Where |
|---|---|---|
| 5 MVP ranks (Initiate→Warrior) | ✅ | `strem-user-service` |
| **Full 7-rank ladder (Titan, Ascended)** | ✅ | P2-01 (was labelled "V2" in game-systems.md) |
| 10 MVP medals + **expanded catalogue (16, P2 tier)** | ✅ | P2-01 |
| Streak bonuses (7/30-day) + current streak surfaced | ✅ | MVP-14 · `/users/me/xp` |
| Rank-up & medal "moments" + medal gallery | ✅ | MVP-15 — Profile |
| Seasonal XP multipliers | ⬜ | P2-06 |
| Seasonal challenges + permanent seasonal medals | ⬜ | P2-07 |

## Seasonal arcs

| Capability | Status | Where |
|---|---|---|
| Season model + active-season resolver + endpoint | ✅ | P2-03 · `/ai/season/current` |
| XP multiplier / seasonal challenges / coach voice / mobile banner | ⬜ | P2-06 / P2-07 / P2-08 / P2-09 |

## Notifications

| Capability | Status | Where |
|---|---|---|
| Consent + per-type preferences + milestone nudge | ✅ | MVP-18 — Profile |
| OS push delivery (expo-notifications + Expo Push send) | ⬜ | MVP-19 |

## Platform hardening

| Capability | Status | Where |
|---|---|---|
| Gateway rate limiting + security headers + size cap | ✅ | HARDEN-01 · `strem-api-gateway` |
| CORS for the web build | ✅ | gateway |
| Observability: structured JSON logs + request-ID correlation (all services + gateway propagation) | ✅ | HARDEN-02 |
| Service-boundary authZ & secrets audit (PASS) | ✅ | HARDEN-03 · `architecture/security-boundary-audit.md` |
| Contracts validation CI | ✅ | HARDEN-04 · `strem-shared-contracts` |
| Mobile a11y + cross-platform shadows | ✅ | HARDEN-05 |
| Crash & error monitoring (privacy-respecting) | ✅ | HARDEN-06 |
| Full-stack integration CI | ⬜ | HARDEN-07 |
| Route-vs-contract conformance tests | ⬜ | HARDEN-08 |
| GDPR export & account deletion | ⬜ | HARDEN-09 |
| Privacy-respecting product analytics (retention funnel) | ⬜ | HARDEN-10 |

## Frontend

| Capability | Status | Where |
|---|---|---|
| Premium design system (tokens, primitives, polished screens) | ✅ | MVP-01 |
| **Visual design overhaul (imagery, iconography, navigation, less text density)** | ⬜ | MVP-20 |

## Future (gated — not started, behind Phase-1/2 evidence)

| Capability | Status |
|---|---|
| Wearable integration (HealthKit / Google Fit) | 🔒 P3-01 |
| Audio layer (briefings, running guidance, recaps) | 🔒 P3-02 + |
| Video generation, The Chronicle, AI avatar (Phase 4) | 🔒 not started |
| Monetization / marketplace | 🔒 not started |

---

When a ⬜/🔒 item ships, move it to ✅ here and reconcile the owning product doc
(see the doc-reconciliation issue). This file is the fast path; the detailed specs
live in `game-systems.md`, `feature-map.md`, `tribe-design.md`, etc.
