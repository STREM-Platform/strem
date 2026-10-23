# Trail Running Pivot - Active Product Direction

**Status:** Active for thesis, first customer and validation; sport scope superseded by [`race-os.md`](race-os.md) (2026-10-23)  
**Decision date:** 2026-09-20  
**Initial sport:** Trail and mountain running  
**Expansion rule:** Replaced on 2026-10-23 by founder direction `strem-docs#26`: any race or self-imposed challenge, with trail as the depth benchmark (see `race-os.md`).

## Product Thesis

STREM is the AI race team for self-coached athletes preparing for demanding endurance events. Trail running is the first proving ground.

The product begins when an athlete commits to a race. It combines the athlete's history, available time, recovery, terrain access, event course, conditions, fueling practice, equipment, and subjective state into one explainable preparation system. Existing devices record what happened. STREM determines what it means for the athlete's Race Mission and what should happen next.

**Positioning:** Your devices know what happened. STREM knows what it means for race day.

**Emotional promise:** No coach. No crew. Still not alone.

## First Customer

The first customer is a working adult, usually 25-45, who:

- has registered or intends to register for a first serious 20-50 km trail or mountain event;
- trains mostly alone and cannot justify a full-service personal coach;
- already uses a watch, Strava, or a health platform, or is willing to provide lightweight manual check-ins;
- needs to coordinate running, elevation, strength, recovery, fueling, gear, logistics, and race strategy;
- values arriving healthy and finishing confidently more than optimizing elite performance metrics.

The product must work without a tribe. Same-event circles, a buddy, or expert review are optional support layers.

## Core Object: Race Mission

A Race Mission is the complete operating period from event commitment through post-race debrief. It owns:

- event identity, date, distance, elevation, terrain, cutoffs, course, aid stations, and mandatory kit;
- athlete goal, experience, limitations, weekly availability, terrain access, and equipment;
- preparation phases and weekly plan;
- race-specific rehearsals;
- readiness evidence and unresolved risks;
- pacing, fueling, hydration, gear, travel, logistics, weather, and contingency plans;
- race result, lessons, and next-mission recommendation.

The MVP supports one active Race Mission. A future season can contain multiple ranked events only after the single-mission loop is retained.

## Product Surfaces

### Mission

The home screen answers three questions immediately:

1. What race am I preparing for and how much time remains?
2. Am I on course to finish, and what evidence supports that assessment?
3. What is the single most important action today?

It is not a statistics dashboard.

### Plan

The plan expresses preparation as purposeful weeks and sessions. It combines running, elevation, descending durability, strength, mobility, recovery, and race rehearsals. It adapts around completed evidence and real-life constraints rather than silently regenerating a generic plan.

### Race Lab

Race Lab turns the event into an executable operation:

- course sections and terrain demands;
- cutoff and pacing scenarios;
- fueling and hydration targets that must be rehearsed;
- gear and mandatory-kit decisions;
- weather, heat, cold, altitude, and surface assumptions;
- aid-station, travel, bib, packing, and race-week tasks;
- contingency plans.

### AI Race Team

AI is a system capability, not only a chat tab. It:

- assembles a consented athlete context from connected sources and check-ins;
- identifies conflicts and missing evidence;
- recommends one decision with cited reasons and confidence;
- proposes plan changes that the athlete can inspect, accept, modify, or reject;
- distinguishes recorded facts from assumptions;
- escalates injury, illness, nutrition, and health concerns instead of diagnosing.

### Athlete

The athlete surface owns profile, limitations, terrain access, equipment, connected sources, consent, data controls, previous races, and the factual history the AI may use.

## Race And Personal Calendar Decision

The MVP is not a generic race-discovery calendar. Athletes normally discover and register for events elsewhere; STREM should first make the event they chose dramatically easier to prepare for.

- A chosen event and its date anchor the Race Mission.
- STREM exports the race weekend, registration or cancellation deadlines, travel blocks, key rehearsals, and race-week tasks to the athlete's personal calendar.
- With explicit permission, STREM reads free/busy windows only, not meeting titles or contents, so the plan can adapt to real life.
- A curated race directory becomes valuable later, once organizer partnerships provide trustworthy course files, cutoff rules, aid stations, required kit, and referral or co-branded revenue.

This keeps calendar integration in service of execution rather than turning STREM into another event-listing app.

## Data Strategy

STREM does not compete with trackers. It ingests the minimum useful signals from approved sources and keeps provenance.

Initial priority:

1. Strava activity history.
2. Apple Health and Android Health Connect aggregation.
3. Existing Whoop recovery ingestion.
4. Calendar free/busy windows without meeting contents.
5. Event course, official facts, and weather.
6. Fast subjective check-in: fatigue, soreness, stress, illness, confidence, and constraints.

Every recommendation must state which sources, observations, and assumptions influenced it. Connections are optional and individually revocable. The product must remain useful with manual evidence only.

## Trail MVP Loop

1. Choose or enter a real event.
2. Complete trail-specific athlete and constraint intake.
3. Connect available evidence sources.
4. Receive the first preparation map and this week's priorities.
5. Complete or import sessions and short subjective check-ins.
6. Let STREM explain progress, surface risks, and propose adaptations.
7. Rehearse course-specific fueling, equipment, terrain, and conditions.
8. Execute the race-week and race-day plan.
9. Debrief the outcome and preserve lessons for the next Race Mission.

## Commercial Model To Validate

The first paid offer is a per-event Race Pass, not a generic monthly tracking subscription.

- Free preview: race card, countdown, preparation assessment, and limited checklist.
- Race Pass hypothesis: EUR 59-99 for the complete Race Mission.
- Expert-reviewed Race Pass hypothesis: EUR 129-199.
- Later: annual season access for repeat athletes and co-branded official preparation programmes for event organizers.

These are validation hypotheses, not committed prices.

## Keep, Retire, Replace

### Keep and adapt

- authentication, legal, privacy, consent, export, and deletion foundations;
- user and athlete profiles;
- Strava and Whoop ingestion;
- training-session history and imports;
- AI context, memory, provenance, safety, and reversible-action foundations;
- nutrition primitives needed for race fueling;
- visual brand elements that support a serious mountain and field-instrument identity.

### Remove from the active experience

- mandatory Tribe onboarding and Tribe as a primary navigation destination;
- Crew personas and invented claims about connected sources;
- generic Train and Fuel tabs;
- generic XP, ranks, medals, streaks, duels, leaderboards, and proof walls as primary value;
- biomarker and supplement surfaces;
- fabricated readiness, recovery, source history, or activity data.

Existing backend code is not deleted merely because it is no longer surfaced. It remains isolated until an explicit repository issue approves deprecation or removal.

### Replace with

- Today dashboard -> Mission command screen;
- generic training log -> trail preparation Plan;
- nutrition tab -> Race Lab fueling rehearsal;
- Tribe -> optional same-event support after the solo loop works;
- generic coach/Crew -> one explainable AI Race Team;
- profile-as-trophy-case -> Athlete context and data-control surface.

## Validation Gate

Before building broad backend support, validate the Race Mission with a concierge pilot:

- 10 athletes preparing for a real 20-50 km trail event;
- a paid EUR 49-79 pilot rather than free interest;
- weekly use through at least four weeks;
- evidence that the product changed a preparation decision or prevented a concrete mistake;
- at least two race organizers willing to discuss a co-branded pilot after athlete results exist.

Do not add the next sport until the trail loop demonstrates paid demand and meaningful repeat intent.
