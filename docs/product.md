# Race OS - Active Product Direction

**Status:** Active product authority, pending founder review of the implementing PRs
**Decision date:** 2026-10-23 (founder direction, `strem-docs#26`)
**Scope change:** any race or self-imposed endurance challenge, not only trail
**Depth benchmark:** trail and mountain running stay the first validation market and the standard every other sport must meet

## What changed

The founder asked for STREM to be the system where an athlete names the race or
challenge they are preparing for and STREM plans everything for the best
performance: training, food and fueling, logistics, gear and race strategy. AI must
work in every layer, the experience must feel like committing to a real race
(photos of the place, the course, the countdown), and a tracker must show the work
put in. Connected workout and health sources and previous races feed the AI so it
knows the athlete. Old surfaces that no longer fit are removed.

This keeps the thesis of [`trail-running-pivot.md`](trail-running-pivot.md) — the AI
race team for self-coached athletes, organized around a Race Mission — and replaces
its single-sport expansion rule. The first customer, the anti-tracker stance and the
honesty rules stay.

## The Race Mission

A mission is one race or challenge with its own preparation. An athlete can prepare
several at once (an A race plus tune-ups, or a season); the nearest upcoming one leads
the home screen unless the athlete pins another. Each mission has:

- **The race:** sport (trail, road, triathlon, duathlon, cycling, gravel, MTB,
  open-water swim, hiking/fastpacking, ski mountaineering, nordic, rowing, hybrid,
  multisport or a custom challenge), format (single day, multi-stage, non-stop
  multi-day), support level, date and start time, place with coordinates and
  timezone, distance, climbing, cutoff, legs for multisport.
- **The goal:** finish, finish strong, a target time or compete; priority A/B/C;
  the athlete's own words for why it matters.
- **A cover photo** the athlete picks from openly licensed photography of the event
  or its location, always credited (see [`race-media-policy.md`](race-media-policy.md)).
- **The starting point:** experience, days and hours available, current volume,
  longest recent session, terrain access, strength, life constraints, home.

## The layers

| Layer | Owner | What the athlete gets |
|---|---|---|
| Training plan | training-service | Periodized weeks from today to race day (base, build, race-specific, taper, race week), a long session that progresses, one quality session, lighter weeks, sessions with purpose, structure and fuel rehearsal |
| Course | training-service | Uploaded GPX on a topographic map, elevation profile and climbs |
| Fuel & hydration | user-service | Carbs, fluid and sodium per hour scaled to duration, heat and weight; an hour-by-hour race table; carb load and race breakfast; gut-training rehearsals; dietary needs turned into product checks |
| Gear | user-service | Kit by sport, format, night exposure and conditions; mandatory kit first; have it → tested → packed |
| Logistics | user-service | Dated tasks from registration and travel to bib pickup and race morning |
| Race strategy | user-service | Effort by course segment, arrival times, cutoff buffer, contingencies and the athlete's why |

Every layer is built first by the deterministic **race engine** — always available,
the safety envelope — and then personalized by the **AI race team** from everything
STREM knows. Guardrails keep AI edits inside safe limits. Every layer, plan, brief and
proposal says whether the engine, the AI or the athlete made it, and why the AI was
not used when it was not.

## The race team

- **Daily brief:** what matters today, the evidence behind it (recorded, athlete,
  course, plan, calculated, forecast), risks and actions.
- **Chat:** answers with the athlete's numbers, not generic advice.
- **Adapt:** the athlete says what changed (sick, injured, busy, travelling, tired);
  the team proposes changes to the next two weeks; nothing changes until the athlete
  accepts. Illness and pain always carry a rest-and-assessment note.
- **What it knows:** a visible list of the sources it reads and what is missing.

## The tracker

The work put in, honestly: weekly hours planned vs done, the long-session
progression, distance and climbing, consistency once the plan has history — and
the weeks of real training before the plan started, so a new plan never opens empty.
Readiness is shown per layer as counts of real work (sessions done, items tested,
tasks done), never as one composite score.

## Knowing the athlete

Strava (full history on first sync, races flagged), manual sessions, daily
check-ins (sleep, energy, soreness, stress, motivation, illness, pain), race history
(finishes, DNFs, fueling and gear lessons; completed missions add themselves), and the
athlete profile (weight, injuries, dietary needs). Whoop is available when its keys are
configured. Conditions come from forecasts within 16 days, otherwise a labelled
five-year seasonal assumption.

## Still out of scope

Tribes, XP, ranks, medals, streak economies, public proof walls, social feeds,
marketplaces, biomarkers and supplements. A generic chat or a generic plan that ignores
the race does not belong in the product.

## Depth bar for every sport

A sport is supported when the engine has sport-correct rules for its plan, fueling,
gear, logistics and pacing, and the app labels its assumptions. Trail running remains
the benchmark: if a change makes trail preparation worse, it does not ship.
