# Implementation Status

The single "where are we now" view. The other product docs describe the *intended*
system; this one tracks what is **actually built and merged to `main`**, what is
partial, and what is queued. Update it whenever a capability ships.

**Legend:** ✅ done & merged · 🟡 core shipped, follow-up queued · 🟦 frontend landed, backend mocked (issue open) · ⬜ planned (issue exists) · 🔒 gated/future (Phase 3+)

_Last updated: 2026-06-19._

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

### Forge — the omniscient agent

The AI-coach depth scattered across Phase 2/3 (HRV-aware adaptation, behavioral
triggers, proactive re-engagement, wearable-driven readiness) was pulled together
into **one autonomous agent, Forge** — not a set of chatbots. **The backend is now
built and merged across the services** (2026-06-19): the agent itself is a
LangChain `create_agent` + middleware stack over LangGraph + Claude
(`claude-opus-4-8`), with a keyless deterministic fallback so everything boots
without API keys, LangGraph checkpoint memory, and LangSmith tracing for
production observability. Each surface cites the user's own data and every
autonomous action is logged + reversible. The mobile app reaches these through a
flag (`forgeAgentMock`); the live-endpoint wiring is in `strem-mobile#57`.

| Capability | Status | Where / issue |
|---|---|---|
| Advanced agent (create_agent + middleware: grounding, metrics, action-logging, guardrail) | ✅ | `strem-ai-orchestrator` `app/agent/*` · #16 |
| Context graph + signals + memory (assembler, providers) | ✅ | A6 #43, A4 #44, A1/A5 #45 · `/ai/context`, `/ai/memory` |
| Forge chat (cited, omniscient, care-redirect) | ✅ | B1 #48 · `/ai/agent/chat` |
| Adaptive missions / readiness-aware plan | ✅ | B4 #50 · `/ai/agent/plan` |
| Cross-domain insights (sample-gated) | ✅ | B8 #51 · `/ai/insights` |
| Live-workout autoregulation (per-set RPE→rest/load) + PR detect | ✅ | D1/D2 #52 · `/training/sessions/{id}/sets`, `/finish`, `/training/prs` |
| AI capture (photo→workout, photo→meal, voice→log) + confirm→write | ✅ | D3/D4/D6 #53 · `/ai/capture/*` (vision provider stubbed; honest fallback) |
| Agent Activity feed + autonomy gating + undo | ✅ | B3 #49 · `/ai/agent/actions`, `/activity`, `/approve`, `/undo`, `/metrics` |
| Consent (source toggles) + per-capability autonomy persistence | ✅ | A7 #54 · `/users/me/agent-consent`, `/agent-autonomy` |
| Guardrail filter (no shame/vanity/diagnosis/faked progress) | ✅ | A8 #47 · `app/safety.py` + `@after_model` middleware |
| Mobile: live endpoints wired behind `forgeAgentMock` (insights/plan/consent real today) | 🟡 | `strem-mobile#57` (flag default still mock) |
| Orchestrator per-set live-workout cue (`/ai/agent/live-workout`) | ⬜ | follow-up (needs a training-service list-sets read) |
| Production Anthropic-vision/transcription provider (capture) | ⬜ | follow-up (prompts + evals) |

Backend tracking issues: `STREM-Platform/strem-mobile#43–#54`, `#46`.

## Tribes & accountability

| Capability | Status | Where |
|---|---|---|
| Tribe creation / join / check-ins / Tribe Power | ✅ | `strem-community-service` |
| Collective challenges (create / contribute / complete) — in app | ✅ | MVP-13 · `/tribes/{id}/challenges` |
| Weekly tribe summary + inactive-member (nudge) detection | ✅ | MVP-16 · `/tribes/{id}/weekly-summary` |
| Tribe leaderboard (by Tribe Power) | ✅ | P2-02 · `/tribes/leaderboard` |
| Tribe-vs-tribe head-to-head challenges | ⬜ | P2-05 — see `social-competition-plan.md` |
| 1v1 personal duels (challenge another athlete) | ⬜ | new — see `social-competition-plan.md` |
| Challenge proof (photo / video / verified-from-data) | ⬜ | new — see `social-competition-plan.md` |
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

## Deeper context & trust (planned — new, 2026-06-19)

Requested by the founder; designed in [`next-steps-plan.md`](next-steps-plan.md) §3.
The thread: give the agent the whole person, and earn the trust to hold that data.

| Capability | Status | Where |
|---|---|---|
| Athlete Baseline (body metrics, training history, **PRs**, injuries, equipment) — feeds A6, seeds PR baseline | ⬜ | next-steps §3.1 |
| Supplements & current stack (Fuel) — informs, never prescribes | ⬜ | next-steps §3.2 |
| Biomarker / blood-result intake + trend analysis (never diagnosis; disclaimed) | ⬜ | next-steps §3.3 |
| **Legal & policy** — Terms, Privacy Policy, **Medical Disclaimer**, consent gates | ⬜ | next-steps §3.4 — **launch blocker** |
| Wearable → readiness loop closure (feed recovery samples into A4 / `/ai/context`) | ⬜ | next-steps §4 |

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
| **Forge AI-agent prototype-sync (Today/Train/Coach/Profile + Privacy + Agent Activity, 6-tab nav)** | ✅ | merged; backend now live, wiring behind `forgeAgentMock` (`#57`) |

## Connected sources (A3 — wearable / external ingestion)

Pulled forward from Phase 3 and shipped 2026-06-19 as a module in
`strem-training-service` (runs normalize into sessions; tokens stay out of the
orchestrator). Routed `/v1/integrations/*` by the gateway.

| Capability | Status | Where |
|---|---|---|
| Provider OAuth connect / disconnect (Whoop, Strava) — tokens encrypted at rest (Fernet) | ✅ | A3 #46 · `/integrations/{provider}/connect`, `DELETE` |
| Connection registry with real last-sync ("what your coach sees") | ✅ | `/integrations/sources` |
| Sync: Strava runs (+ elevation) → sessions; Whoop → recovery samples (sleep/HRV/RHR/score) | ✅ | `/integrations/{provider}/sync` (idempotent) |
| `wearable.synced` event (so the agent can react, e.g. low-HRV nudge) | ✅ | `events/wearable.synced` |
| Recovery read for A4 readiness | ✅ | `/integrations/recovery` |
| Apple Health (on-device HealthKit push) | ⬜ | follow-up |
| Redis-scheduled background sync worker + Strava push webhooks | ⬜ | follow-up (`sync()` + manual `POST /sync` are in place) |
| HRV-aware readiness: feed recovery samples into A4 signals + `/ai/context` | ⬜ | follow-up (closes the wearable→coach loop) |

## Future (gated — not started, behind Phase-1/2 evidence)

| Capability | Status |
|---|---|
| Audio layer (briefings, running guidance, recaps) | 🔒 P3-02 + |
| Video generation, The Chronicle, AI avatar (Phase 4) | 🔒 not started |
| Monetization / marketplace | 🔒 not started |

---

When a ⬜/🔒 item ships, move it to ✅ here and reconcile the owning product doc
(see the doc-reconciliation issue). This file is the fast path; the detailed specs
live in `game-systems.md`, `feature-map.md`, `tribe-design.md`, etc.
