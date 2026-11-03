# ADR 0009: The athlete's timeline — race plans, seasons and the base plan

## Status and scope

Accepted by the founder, 2026-10-31 (training-service#23 merged; seasons in
training-service#18). Extends [ADR 0008](0008-race-os-layers-and-race-engine.md):
mission plans stay as they are; the athlete's plan is composed from them.

Review gates that apply: shared contracts (`/training/plan*`, `/training/seasons*`),
two additive migrations (training 0007 `athlete_plans`, 0008 `athlete_seasons`).

## Decision

**training-service owns three kinds of plan documents** (same `PlanContent` shape,
`origin` engine / ai / athlete, If-Match or versioned writes):

1. **Mission plans** (`mission_plans`) — one per Race Mission, built by the race
   engine and AI or imported by the athlete. Unchanged.
2. **Season plans** (`athlete_seasons.plan_content`) — a named block of the year
   (name, dates, focus: base, build, race season, off-season, recovery). Seasons
   never overlap. A season plan is drafted by the race team
   (`POST /ai/race/seasons/{id}/build`: engine draft, AI-personalized when
   available) or imported.
3. **The base plan** (`athlete_plans`) — the athlete's own ongoing training with
   no race and no season (often an imported weekly template).

**`GET /training/plan` composes them into one calendar.** For each week:

- the **governing race** — the highest-priority upcoming race whose plan covers
  the week (A before B before C, then the nearest) — supplies the week; other
  races' race-day sessions in that week stay visible unless the governing plan
  already placed that race (the engine fits B/C races into an A plan, user#31);
- otherwise the plan of the **season** the week falls in;
- otherwise the **base plan**.

Composed session ids are source-prefixed (`m<8 hex>-`, `s<8 hex>-`, `b-`), so
`PATCH /training/plan/sessions/{id}` edits the owning document; race-plan edits
still check mission access through user-service. Nothing is copied. Progress is
computed over the composed timeline (`/training/plan/progress`) with the same
matching rules as mission progress. Races (names, dates, priority) are read from
user-service with the athlete's token on each request; if that read fails the
timeline answers 503 rather than guessing.

## Consequences

- An athlete with no race can train on a plan; adding races re-plans around
  them without losing their own plan.
- A race plan never overwrites the base or season plan: when the race is
  completed or archived, the season/base weeks show again.
- Base plans and seasons are exported and purged with mission data (ADR 0007).
- Not yet: the AI rebuilding *every* affected plan when priorities change (the
  app rebuilds the changed race and later race plans on request), and seasons
  drafted from the previous season's results (follow-up in #18).
