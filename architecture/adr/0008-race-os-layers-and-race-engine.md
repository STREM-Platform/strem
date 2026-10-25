# ADR 0008: Race OS — mission layers, training plans and the race engine

## Status and scope

Proposed for founder review, 2026-10-23. Founder direction is recorded in
`strem-docs#26`; the product direction is [`race-os.md`](../../product/race-os.md).
Implemented on `issue26-race-os` branches in docs, shared-contracts, user-service,
training-service, ai-orchestrator, api-gateway, infra and mobile. The branches stack
on the open October foundation and course-flow PRs; nothing is merged or deployed.

Review gates that apply: shared contracts, migrations, health-data context read by
the AI, safety-affecting AI behavior (the guardrails below), media licensing and the
map tile provider.

## Ownership

- **user-service** owns Race Mission v2, the four Race Lab layers and race history.
  One layer document per mission and kind (`fuel`, `gear`, `logistics`, `strategy`)
  in `mission_layers`: sections of checklist, timeline, table or notes items with
  stable slug ids, metrics, warnings and assumptions. Writes use If-Match versions.
  Replacing a layer keeps the athlete's status and note per item id, so a rebuild
  never erases progress. Layers are writable only while the mission is active.
  Race history (`race_results`) holds athlete entries, completed missions and races
  imported from a connected source (`strava:<id>`, unique per user).
- **training-service** owns the mission training plan (`mission_plans`) and computes
  progress server-side: planned sessions matched to logged or imported sessions by
  day and compatible sport (partial below 60% of the planned time), derived missed
  sessions, consistency, long-session progression and eight weeks of evidence. A
  session date can move without losing its status. Plans are purged with courses
  under [ADR 0007](0007-private-mission-courses.md)'s deletion fence and included in
  the mission export. Daily check-ins live here too (`wellness_checkins`).
- **ai-orchestrator** owns no race facts. It reads through the same service APIs with
  the athlete's token and writes plans and layers back through them. It stores only
  chat history, cached briefs (keyed by a digest of their inputs) and adaptation
  proposals.

## Several missions

The one-active-mission index is dropped; an athlete may hold up to 12 active
missions. `GET /race-missions/active` returns the focus — the nearest upcoming
mission — and the app may pin another locally. Completing a mission records its
result and adds it to race history.

## Race engine first, AI second

Every layer has a deterministic engine build from sport-family rules: periodization
with lighter weeks and a taper sized to race duration; a long session that starts
from a regular long session and progresses to a race-appropriate peak capped by the
athlete's available hours (with a warning when the cap binds); fueling ranges by
duration, heat and body weight; gear by sport, format, night exposure and conditions;
dated logistics; terrain-based pacing from the GPX when present. The engine is always
available and is the safety envelope.

With an Anthropic key that has credit, the race team (`claude-opus-5-5`, server-side
fallback model) personalizes the engine document from the athlete's context, using
structured outputs. Guardrails then apply before anything is stored:

- fueling targets stay inside the engine's safe ranges; hourly fluid stays capped;
- plan edits stay within ±25% per session and ±40% per week of the engine plan;
- critical items, engine warnings and stable ids cannot be removed;
- a draft that fails validation is discarded and the engine document is stored.

If the AI is unavailable — no key, no credit (cooled down for 10 minutes), timeouts —
the engine document is stored with `ai_reason`. Every plan, layer, brief and proposal
carries `origin: engine | ai | athlete` and the app shows it.

Adaptation: the athlete states what changed; the team returns a proposal for the
next two weeks with a reason per change and a safety note for illness or pain.
Nothing changes until the athlete accepts; a proposal whose plan changed meanwhile is
rejected as stale.

## What the AI may read

Mission and course summary, plan and progress, sessions including race-flagged ones,
check-ins, race history, the athlete profile, connected-source status and recovery
summaries — rendered with provenance labels so answers can say where a number came
from. No new data source or consent is introduced: sources the athlete connected are
read as before. The health-data gate must approve this context before release.

## Enrichment

- **Places and conditions:** Open-Meteo geocoding, forecast within 16 days, otherwise
  a five-year seasonal assumption labelled as such, plus an altitude note.
- **Photos:** Wikimedia Commons (primary) and Openverse (time-boxed to 4 s, paused for
  10 minutes after a failure) through their public APIs. NoDerivatives licences are
  excluded; creator, licence, licence URL and source page are stored with the cover
  and shown; `depicts` defaults to atmosphere and only the athlete can mark a photo as
  showing the race. Commons URLs use its standard thumbnail widths.
- **Maps:** OpenTopoMap tiles with attribution, for development only. Production needs
  a licensed provider.

## Migrations and rollout

User `0010_race_os` drops the one-active partial index and adds `mission_layers` and
`race_results`; downgrade requires an explicit data-loss flag. Training `0006_race_os`
adds `mission_plans`, session evidence columns (title, source sport, elapsed time,
heart rate, `is_race`) and `wellness_checkins`. AI `0005_race_os` adds chat, brief
and proposal tables. All are additive apart from the dropped index. Compose wires
user → training course storage, training → user mission access, `RACE_MODEL`, and a
180 s gateway timeout for multi-call builds.

## Consequences

- The product works without AI, and says so; with AI, cost scales with builds, briefs
  and chats. The local account is currently out of credit, so verification used the
  engine path and checked the AI path with tests.
- Pre-pivot mobile surfaces (tribes, XP, crew chat, the old trail mission shell) are
  removed. Their backends still exist and are retired separately.
- CC BY-SA display crops and the production map provider need legal review before
  release.

## Verification

User-service 110 tests (2 PostgreSQL-only skips), training-service 102 (1 skip),
ai-orchestrator 145; ruff and strict mypy pass; all OpenAPI specs validate. Mobile
TypeScript, lint and 32 unit tests pass. A synthetic athlete seeded through the
gateway (`strem-infra/scripts/seed-demo.py`, optional local GPX) was walked through
every screen at 390 px and 1440 px with Playwright, including creating a second race
through the setup flow.
