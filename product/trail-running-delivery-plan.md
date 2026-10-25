# Trail Running Delivery Plan

**Status:** Active execution plan  
**Authority:** [`trail-running-pivot.md`](trail-running-pivot.md)  
**Started:** 2026-09-20

## Outcome

Prove that self-coached trail runners will pay STREM to reduce race-preparation uncertainty. The first sellable product is one complete Race Mission for a real 20–50 km event, not an activity tracker and not a broad multi-sport platform.

## Non-Negotiable Product Loop

1. The athlete commits to a real event.
2. STREM understands the event demands and the athlete's constraints.
3. STREM creates a preparation map with explicit assumptions.
4. Imported or manual evidence updates readiness and unresolved risks.
5. The AI proposes explainable decisions and plan changes.
6. The athlete rehearses terrain, fueling, gear, and logistics.
7. STREM produces an executable race-week and race-day plan.
8. The outcome becomes memory for the next mission.

Work that does not strengthen this loop is paused.

## Stage 0 — Paid Concierge Proof

Before broad backend implementation:

- recruit 10 athletes already registered for a trail event 4–12 weeks away;
- charge EUR 49–79 for a manually assisted Race Mission pilot;
- collect event facts, course files, training history, constraints, and weekly check-ins with lightweight tools;
- deliver a weekly decision, risk board, rehearsal plan, and race-week plan;
- record whether STREM changed a decision, prevented a mistake, improved confidence, and would be purchased again;
- interview at least five race organizers about providing structured race facts and a co-branded pilot.

**Go gate:** at least five paid athletes complete four weeks, four report a concrete changed decision or avoided mistake, and three express strong repeat intent. Interest without payment does not pass.

## Stage 1 — Race Mission Foundation

Founder-approved first increment (2026-10-08, `strem-user-service#24`):
private manually entered event and goal, one active mission, authenticated
create/read/edit/archive, immutable revisions and mission-only export/delete in
the existing user-service database. The additive contract/migration scope was
explicitly approved; no legacy-data deletion, AI health advice or new integrations.
This increment precedes GPX, broader constraints and preparation decisions below;
those remain separate reviewed issues, not implied approval of draft contract #39.

Build only the smallest real vertical slice:

- create one active Race Mission from a manually entered event;
- capture goal, date, distance, elevation, terrain, cutoff, location, experience, limitations, availability, terrain access, and equipment;
- ingest a GPX file and derive basic course facts;
- show Mission, Plan, Race Lab, AI, and Athlete from real mission data;
- preserve provenance for every athlete-entered, imported, calculated, and AI-inferred field.

The first usable slice can work without wearable integrations. Manual evidence must remain a first-class path.

## Stage 2 — Evidence And Adaptation

- import Strava history and new sessions;
- classify duration, distance, vertical gain, surface, long-run exposure, and climbing/descending specificity;
- add a 10-second check-in for soreness, fatigue, illness, stress, confidence, and schedule changes;
- calculate transparent preparation evidence rather than one opaque readiness score;
- let the AI propose a change with sources, assumptions, confidence, safety flags, and accept/edit/reject controls;
- never silently rewrite the plan.

## Stage 3 — Race Lab And Calendar

- model course sections, cutoffs, aid stations, mandatory kit, and race-week logistics;
- build fueling, hydration, gear, and condition rehearsals tied to actual sessions;
- export race weekend, deadlines, travel, and key rehearsals to Apple/Google/Outlook calendars;
- optionally read free/busy windows after explicit consent; never ingest meeting content;
- add live weather only inside a useful forecast window and label earlier conditions as assumptions.

Do not build a broad race-discovery calendar until structured organizer data and a commercial reason exist.

## Stage 4 — Sellable Race Pass

- free: race card, countdown, initial gap assessment, and limited checklist;
- Race Pass experiment: EUR 59–99 for the full mission;
- expert-reviewed experiment: EUR 129–199;
- measure activation, weekly evidence updates, accepted adaptations, rehearsal completion, race-plan completion, finish outcome, repeat intent, and refund reasons;
- avoid pricing around data volume, dashboards, or AI-chat message limits.

## Repository Work Packages

Every package needs a scoped GitHub issue before implementation. Contract, service-boundary, privacy, health-data, AI-safety, and deployment work retains the required review gates.

| Order | Repository | Scoped package |
|---:|---|---|
| 1 | `strem-docs` | Pilot script, interview guide, success metrics, and decision log |
| 2 | `strem-shared-contracts` | Race Mission, event facts, athlete constraints, course, evidence, rehearsal, decision proposal, and calendar-intent contracts |
| 3 | `strem-user-service` | Trail athlete context and consented constraint storage |
| 4 | `strem-training-service` | GPX/course ingestion, activity evidence, elevation and terrain summaries |
| 5 | `strem-ai-orchestrator` | Race-context assembly, gap detection, cited recommendation, adaptation proposal, and safety escalation |
| 6 | `strem-api-gateway` | Route the approved mission/course/decision contracts |
| 7 | `strem-mobile` | Replace the labelled prototype fixture with the real vertical slice |
| 8 | `strem-infra` | Add observability and release support only when the slice is deployable |

Nutrition and community services are not first-wave owners. Race fueling can begin as a mission rehearsal object; same-event support remains optional until the solo product retains.

## Current Execution Order (2026-10-11)

The existing cross-repository master issue is `STREM-Platform/strem-docs#20` (organization sign-in required); use its linked issues, not a second roadmap.

1. Finish the founder-approved foundation (`user-service#24`): contract PR #40, user-service PR #25, gateway PR #12 and mobile PR #111. PostgreSQL migration, real-HTTP restart and compact/wide real-service browser lifecycle checks pass; native/accessibility/athlete acceptance remains outstanding. Triage mobile #112 dependency advisories and review #113 session restoration before pilot release. Separately align/review shared-contracts #38 / PR #39: broader course provenance, typed/concurrent plan diffs and reversal semantics are not approved by the foundation decision.
2. Review AI #34 / PR #38 for honest unavailable responses. This is a correctness repair, not the Race Mission AI engine.
3. Deliver the next connected slice under docs #24: source/edition review, authorized GPX, persisted course model, synchronized map/elevation and approved race media when available. Existing owners remain training #10, gateway #11 and mobile #103/#104/#105. Approve the new storage/contracts/privacy boundary first; the foundation approval does not cover it. Persisted mission intake and fixture removal are implemented; course intelligence is not.
4. Under AI #33, execute #35 (consented evidence snapshots) before #36 (proactive proposals). Build the #37 evaluation harness alongside these, including an explicit opt-in real-provider test. Do not call scripted tests proof of live AI.
5. Continue mobile #103 and #105–#109 on the same real slice. Docs #21 supplies rights-cleared event media and responsive/athlete acceptance evidence. A stronger synthetic screen does not close functional tickets.
6. Run docs #16 paid validation in parallel. Race Pass pricing/entitlement (#19), calendar decisions (#18) and pilot deployment (infra #17) keep their existing gates.

### Backend packages behind the remaining screens

These are implementation scopes, not claims that the features exist. Ownership extensions remain proposals until reviewed.

| Package | Owning ticket | Dependencies / consumer |
|---|---|---|
| Initial preparation plan, activation and versioned session lifecycle | `strem-training-service#12` | user #23, training #10/#11, reviewed safety protocol; mobile #106 and AI proposals |
| Mission logistics, sourced requirements and checklists | `strem-user-service#26` | source/edition review docs #24, contracts #38; mobile #107 |
| Session/course-linked rehearsal records and results | `strem-training-service#13` | reviewed privacy/safety fields, training #11; mobile #106/#107 |
| Weather provider, forecast horizon, privacy/cost and ownership decision | `strem-docs#25` | Must produce separately approved implementation tickets; mobile #107 and AI #35 |

### Acceptance for the next visible milestone

On 2026-10-22 the founder approved the narrow private course storage/API and cleanup
scope in [ADR 0007](../architecture/adr/0007-private-mission-courses.md). It is now
implemented on dependent review branches: GPX upload/replacement, persisted model,
route/elevation/section inspection and coordinated export/deletion. This does not
approve broader draft PR #39, automatic source ingestion, photography, a basemap
provider or production deployment. Remaining source/media/map acceptance below
still applies; the initial geometry view explicitly has no basemap.

An athlete can attach an authorized GPX to the chosen event edition, reload the app,
and inspect the actual route, elevation and derived sections. Selecting a section
keeps the map, profile and textual inspector synchronized. The Mission hero uses
approved event photography with readable credits when rights exist; otherwise it
uses actual course geometry and typography, never a fabricated race photo or route.
The source panel shows the edition, source links, verification time, conflicts and
what remains unknown. A map-provider outage leaves course facts and the text/profile
view usable. Missing GPX or media does not prevent saving a mission.

The first website workflow is curated source review, not an unrestricted importer.
Docs #24 names all affected repositories and requires a map-provider decision,
private upload/retention review, additive migration, and coherent export/deletion
across mission and course owners before runtime implementation. No new bucket,
paid provider account, automatic crawler or photo hotlink is authorized by the
visual direction. Photo rights acquisition stays in docs #21.

The AI reads the minimum useful, consented evidence for each decision. It does not observe every part of a person's life. Revocation, missing/stale data, manual-only use and conflicts are first-class cases. More integrations are justified by improved race decisions, not by the number of connected apps.

## First Contract Vocabulary

- `RaceMission`: lifecycle, athlete goal, event reference, dates, phase, state.
- `EventFacts`: official versus athlete-entered facts with provenance and freshness.
- `CourseModel`: GPX, sections, distance, elevation, terrain, aid stations, cutoffs.
- `AthleteConstraints`: availability, terrain access, limitations, equipment, preferences.
- `PreparationEvidence`: observation, target, time window, source, confidence.
- `Risk`: gap, severity, why it matters, mitigation, deadline, status.
- `Rehearsal`: terrain, fuel, gear, heat/cold, night, or logistics test and result.
- `DecisionProposal`: recommendation, alternatives, evidence, assumptions, confidence, safety classification, athlete response.
- `CalendarIntent`: exportable event or task; calendar provider data stays outside the core mission contract.

## Issue Triage Rule

Audit every existing open issue against the Race Mission loop:

- **Keep now:** directly enables the first paid mission or trust/safety.
- **Rewrite:** useful capability framed around old XP, Crew, Tribe, generic dashboard, or tracker UI.
- **Park:** potentially useful after trail retention, with no current implementation work.
- **Close:** only creates generic engagement, social comparison, duplicate tracking, or premature multi-sport breadth.

Do not keep an issue merely because code already exists.

## Stop Conditions

Pause or materially change direction if the paid pilot shows any of the following:

- athletes value a static plan but not weekly adaptation;
- manual data burden prevents weekly use;
- recommendations cannot be made trustworthy with available evidence;
- athletes will not pay above a low-cost generic plan;
- the highest-value buyer is consistently a coach or organizer rather than an athlete.

Those are learning outcomes, not failures. They determine whether STREM should become an athlete Race Pass, a coach copilot, or organizer infrastructure.
