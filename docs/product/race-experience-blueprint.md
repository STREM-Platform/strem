# Race Experience Blueprint

**Status:** Active design authority  
**Decision date:** 2026-09-21  
**Product authority:** [`trail-running-pivot.md`](trail-running-pivot.md)  
**Media policy:** [`race-media-policy.md`](race-media-policy.md)  
**Validation protocol:** [`race-experience-usability.md`](race-experience-usability.md)

## Purpose

This document defines the first sellable STREM experience: an advanced race-command system for a self-coached trail runner preparing for one real event. It replaces the current card-based prototype direction.

The visual promise is cinematic, specific, and calm under pressure. The functional promise is more important: within 15 seconds, an athlete must be able to name the race, the current preparation phase, the most important unresolved risk, the evidence behind it, and the next action.

This is not a tracker dashboard, a generic plan library, an AI chat wrapper, or a race-photo gallery.

## Experience Thesis

The app should feel like a private race operations room carried into the mountains:

- the race is always the organizing context;
- the course is a story told through sections, terrain, elevation, daylight, weather, and cutoffs;
- preparation is shown as evidence gained and uncertainty removed, not points earned;
- the AI acts as a transparent decision layer across the product, not as a personality hidden in a tab;
- photography creates emotional commitment, while maps, data, and provenance create trust;
- the next useful action is always more prominent than the next metric.

The visual signature is **field instrument over race atmosphere**: legible operational information placed over or beside licensed mountain and event media, with restrained topographic details and no fantasy telemetry.

## The 15-Second Contract

Every primary surface must let the athlete answer the following without scrolling or opening a chat:

1. Which Race Mission is active and when is race day?
2. Which phase am I in?
3. What matters most now?
4. What evidence supports that conclusion, and what is still unknown?
5. What can I do next?

When the product cannot answer one of these, it must state the missing evidence and offer a way to provide or obtain it. It must never fill the gap with sample or inferred data presented as fact.

## Information Architecture

The five primary destinations remain:

| Destination | Athlete question | Primary action |
|---|---|---|
| Mission | Am I on course for this race? | Complete today's priority or resolve the leading gap |
| Plan | What should I do, and why? | Inspect or complete the next session |
| Race Lab | How will I execute this specific event? | Rehearse or resolve a race-operation decision |
| AI | What changed, why, and what should change next? | Accept, edit, or reject a cited proposal |
| Athlete | What does STREM know and use about me? | Correct data, sources, consent, or constraints |

`Course` is a first-class deep view opened from Mission and Race Lab. It is not a sixth permanent navigation item. Race creation is a focused setup flow. Authentication, entitlement, and failure states wrap the primary system rather than becoming destinations.

## Content Hierarchy

Every primary screen uses the same command hierarchy:

1. **Identity:** event, course section, week, session, or decision being viewed.
2. **State:** current phase, freshness, and operational status.
3. **Decision:** the conclusion that matters now.
4. **Evidence:** recorded facts and calculations that support the conclusion.
5. **Uncertainty:** assumptions, unknowns, conflicts, and stale inputs.
6. **Action:** one primary action, with secondary actions visually subordinate.

The sequence may be arranged spatially on wider displays, but it must not be reversed. A large chart cannot precede the decision it is meant to explain.

## Visual Principles

### 1. Race-specific before brand-generic

Use approved event or athlete media and real course geometry when available. The STREM visual system frames the race; it does not replace it. A generic mountain image must be labelled as atmosphere, never as the event.

### 2. Evidence has texture

Recorded activities, athlete statements, official race facts, calculations, assumptions, and unknowns have distinct labels and icons. Color reinforces those differences but is never the only signal.

### 3. Density is earned

The first viewport is editorial and decisive. Detail expands progressively through evidence drawers, course-section views, weekly views, and decision receipts. Advanced does not mean showing every metric at once.

### 4. Motion explains change

Motion may connect an accepted adaptation to the sessions it changes, reveal travel along an elevation profile, or show a status transition. It must not create ambient movement, fake live data, or delay a task.

### 5. Outdoors is a usage condition

The compact experience must remain readable in glare, with one hand, while fatigued, and with intermittent connectivity. Critical controls are large; contrast does not depend on a photograph; cached truth remains distinguishable from current truth.

### 6. Premium means confidence

Premium value comes from course specificity, explained decisions, rehearsals, and an executable race plan. Blur, glass, gradients, and large imagery are supporting treatments, not the paid proposition.

## Anti-Patterns

- A grid of interchangeable rounded cards with no dominant decision.
- A single opaque readiness percentage or traffic light.
- Endless activity metrics copied from a watch or Strava.
- A heroic image that obscures event identity or primary actions.
- Stock, scraped, or generated imagery implied to be the official event.
- AI chat as the only way to understand or control a recommendation.
- Silent plan regeneration after a missed session or low check-in.
- Generic encouragement when the athlete needs evidence or a decision.
- Gamified XP, streak pressure, ranks, leaderboards, or fabricated urgency.
- Tiny provenance labels, unlabeled icons, horizontal carousels, or gesture-only actions.
- Desktop layouts that simply stretch a phone column.
- Skeletons that resemble real readiness data for so long that they can be mistaken for it.

## Visual System

The existing dark trail palette and condensed display type can remain as raw materials, but the implementation must move from one undifferentiated dark surface to a layered system.

### Color roles

| Token role | Use | Rule |
|---|---|---|
| `canvas.base` | Primary night/forest canvas | Never use pure black for large areas |
| `canvas.raised` | Operational panels | Distinguishable without relying on shadow |
| `canvas.scrim` | Text protection over media | Gradient strength adapts to crop luminance |
| `text.primary` | Decisions and essential facts | WCAG 2.2 AA contrast |
| `text.secondary` | Supporting explanation | WCAG 2.2 AA contrast |
| `signal.action` | Primary action and selected state | One dominant action color per viewport |
| `signal.positive` | Evidence on target | Never used for unverified readiness |
| `signal.attention` | Gap, time pressure, stale input | Paired with text/icon |
| `signal.critical` | Safety or cutoff threat | Reserved; not used for decoration |
| `signal.unknown` | Missing or unverified | Neutral hatch/dash treatment plus label |
| `provenance.official` | Organizer-provided fact | Includes `Official` wordmark/icon |

All text and interactive states target WCAG 2.2 AA. Normal text requires at least 4.5:1 contrast, large text and essential non-text boundaries at least 3:1. The product minimum touch target is 44 by 44 logical pixels even though WCAG's minimum target criterion permits 24 by 24 CSS pixels in specified cases.

### Typography roles

| Role | Character | Use |
|---|---|---|
| Display | Condensed, assertive | Race name, countdown, section identity |
| Interface | Highly legible sans | Navigation, decisions, explanatory content |
| Data | Tabular/monospaced numerals | Distance, elevation, time, cutoffs, timestamps |

No essential copy uses all caps. Display type must not be used below 20 logical pixels. Dynamic type and browser zoom must reflow rather than clip event names or values.

### Shape and depth

- Use square or softly chamfered operational panels for dense evidence.
- Reserve large radii for the main race image, sheets, and prominent actions.
- Use one-pixel terrain or contour details at low contrast; they are decorative and hidden from assistive technology.
- Use shadows sparingly. Borders and surface contrast must preserve hierarchy when shadows disappear.
- Blur is optional and must become opaque when the platform requests reduced transparency.

### Provenance vocabulary

Every material fact is tagged with one of these states:

| State | Meaning | Example |
|---|---|---|
| Official | Supplied by an organizer or verified official source | Race cutoff |
| Athlete | Entered or confirmed by the athlete | Available Friday evening |
| Recorded | Imported from a connected source | Completed trail run |
| Calculated | Deterministically derived from identified inputs | Climb rate |
| Assumption | Working value awaiting confirmation | Expected heat |
| Unknown | Required evidence does not exist | Night-running exposure |
| Stale | Previously valid but outside its freshness window | Old weather forecast |
| Conflicted | Two sources disagree | Course distance mismatch |

`AI-generated` is not a provenance state for facts. AI output is a proposal that cites the states above.

## Reusable Components

| Component | Responsibility | Required states |
|---|---|---|
| `RaceHero` | Event identity, countdown, approved media, phase, primary action | image, atmospheric fallback, loading, rights-disabled |
| `MissionDecision` | One current conclusion with why and next action | supported, assumption-heavy, insufficient evidence, safety escalation |
| `EvidenceStrip` | Compact target/observation/gap view | on target, incomplete, stale, unknown |
| `SourceChip` | Provenance, source, timestamp, freshness | all provenance states; expandable details |
| `RiskRail` | Prioritized unresolved risks and deadlines | low, attention, critical, resolved |
| `CourseRibbon` | Mini elevation and course-section navigator | GPX ready, processing, missing, failed |
| `CourseSection` | Terrain, grade, daylight, weather, cutoff, execution note | official, calculated, assumed, unknown |
| `PhaseTimeline` | Base/build/specific/taper/race/recovery orientation | current, completed, planned, changed |
| `SessionBrief` | Purpose, prescription, terrain target, evidence goal | planned, adapted, completed, skipped, unavailable |
| `RehearsalCard` | Hypothesis, protocol, outcome, confidence | draft, scheduled, completed, failed, learned |
| `DecisionDiff` | Before/after plan change with cited reasons | proposal, accepted, edited, rejected, expired |
| `StateBanner` | Offline, stale, permission, outage, incomplete state | informative, attention, blocking |
| `MediaCredit` | Rights-compliant credit and source link | visible credit, details-sheet credit, unavailable |
| `EntitlementGate` | Value preview and Race Pass boundary | eligible, purchased, restored, unavailable |

Components may render differently by width, but their semantics and state names must remain shared across mobile, tablet, and web.

## Responsive Composition

The layout system uses content behavior, not device model names:

| Range | Composition |
|---|---|
| Compact, below 600 px | One decisive vertical path; bottom navigation; sticky primary action only when it does not cover content |
| Medium, 600-1023 px | Two-column split where context remains visible; side rail for section navigation; bottom or side navigation based on posture |
| Wide, 1024 px and above | Persistent navigation plus two- or three-pane workspace: context, primary work, evidence/details |

Wide screens must use additional space to preserve context, compare evidence, and inspect detail simultaneously. They must not enlarge every mobile card. Reading columns are capped near 72 characters; maps and elevation views may span the available workspace.

## Screen Blueprints

The examples below use a visibly synthetic mission, `Rila Ridge 32K`, solely to define hierarchy. It must never be shipped as athlete data.

### 1. Authentication and return

**Job:** enter a trusted product and understand its race-specific promise.

**Compact first view:** restrained mountain atmosphere, STREM wordmark, `Your race. One preparation system.`, sign-in methods, legal links, and a plain statement that connected sources are optional.

**Wide view:** media occupies one side; the authentication surface occupies the other. The image includes a credit when required and is labelled `Trail running atmosphere` unless it depicts an approved official event.

**States:** first visit, returning athlete, expired session, offline, provider failure, account deletion pending. Authentication must not require a memory or puzzle test that conflicts with accessible-authentication requirements.

### 2. Create Race Mission

**Job:** turn a real event commitment into the smallest useful mission.

**Flow:** event identity -> event facts -> course -> athlete goal and constraints -> evidence sources -> review assumptions -> create.

The athlete may search an approved event directory or enter facts manually. Event search results must distinguish official records from community or athlete-entered records. Uploading GPX is recommended, not blocking. Every step supports `Save and continue later`.

The review screen groups data as `Confirmed`, `Calculated`, and `Still needed`. It states what STREM can and cannot conclude before creation.

**Responsive:** compact uses one task per step; wide uses a persistent mission summary and source/evidence panel beside the form.

**Failure handling:** preserve entered values; identify the exact failed field or upload; offer manual continuation when directory, map, or integration services fail.

### 3. Mission

**Job:** know whether preparation is moving toward a confident finish and what to do today.

**First viewport:** 

1. `RaceHero`: approved event media or clearly labelled atmospheric fallback, race name, location, date, `47 days`, and `Specific phase`.
2. `MissionDecision`: `Descending durability is the leading gap`, with a two-line reason and confidence.
3. Primary action: `Open Saturday's downhill rehearsal`.
4. Evidence strip: longest specific descent, vertical exposure, fueling rehearsal, night exposure.

Below the fold: risk rail, course ribbon, current phase map, recent evidence changes, race-week milestones, and source freshness.

**Wide:** hero and decision share the command header; current evidence and risks remain visible while a course or session detail opens in the third pane.

**Do not show:** generic weekly activity rings, total lifetime kilometers, an opaque readiness score, social feed, or AI greeting.

### 4. Course

**Job:** understand what the course will demand and where preparation or race execution can fail.

The default view synchronizes a map, elevation profile, and ordered section list. Selecting any representation highlights the same course section everywhere. Each section contains distance bounds, gain/loss, grade distribution, known surface, technicality evidence, aid/cutoff facts, likely daylight, forecast or seasonal assumption, and an execution/rehearsal note.

Map provider attribution remains visible and unobstructed. When no map provider is configured, the elevation and section model still work. No cached or exported map tiles are shown outside provider terms.

**Compact:** elevation is the stable navigator; map is an expandable full-screen view; section facts appear in a sheet. A list alternative exposes every spatial insight without requiring map gestures.

**Wide:** map and elevation occupy the main canvas; the section inspector remains docked. Keyboard and non-drag controls support zoom and section changes.

**States:** GPX processing, partial route, elevation unavailable, conflicting official distance, no aid-station data, map offline, provider attribution error. A provider attribution error disables the map layer rather than hiding the attribution.

### 5. Plan and session

**Job:** see the purposeful preparation sequence and understand why the next session exists.

The Plan opens at the current week, not at an abstract monthly calendar. The week header states its purpose, total load range, vertical target, key evidence objective, and constraint conflicts. Sessions form a temporal route through the week, with the key rehearsal visually dominant.

A session brief contains purpose, duration/distance range, intensity guidance, terrain/elevation target, equipment/fueling rehearsal, evidence to capture, acceptable substitutions, and the reason it matters for the course.

When an adaptation is proposed, the previous and proposed sessions remain comparable until the athlete accepts, edits, or rejects the change.

**Compact:** week route plus day details. **Wide:** phase timeline, week, and session inspector coexist. Dragging is never required to reschedule.

### 6. Race Lab

**Job:** convert preparation into an executable event operation.

Race Lab uses five workstreams: `Pacing & cutoffs`, `Fuel & hydration`, `Gear & conditions`, `Travel & logistics`, and `Contingencies`. It opens on the workstream with the highest unresolved consequence, not an equal grid.

Each workstream shows the working decision, official facts, assumptions, rehearsal evidence, unresolved choices, and deadline. A completed rehearsal produces a `learned` statement and may update the race-day plan only through an inspectable proposal.

Race-week output is a chronological, offline-capable field plan: before travel, registration, night before, morning, course sections, aid stations, and emergency contingencies.

### 7. AI decision

**Job:** understand a proposed change and retain control.

AI is surfaced contextually wherever evidence changes. The AI destination is an inbox and history of decision proposals, not an open-ended chat home.

Each proposal includes:

- one recommendation in plain language;
- why now;
- cited observations with source and freshness;
- assumptions and missing evidence;
- confidence described in calibrated language;
- safety classification;
- alternatives, including `keep current plan`;
- a before/after diff;
- `Accept`, `Edit`, and `Reject` actions;
- a durable receipt after the response.

Chat may be offered below a proposal for clarification, but it cannot bypass the structured decision, citation, and response controls. Health concerns trigger scope-safe guidance and escalation, never diagnosis.

### 8. Athlete

**Job:** inspect and control the facts STREM may use.

The surface is organized around `Race context`, `Availability & terrain access`, `Experience & limitations`, `Equipment`, `Connected sources`, and `Data controls`. Every field shows origin and last update. The athlete can correct a calculation by correcting its inputs, not by silently overwriting provenance.

Connected sources display permission scope, last successful sync, imported signal categories, and revoke controls. Export and deletion remain easy to find. The screen avoids trophy-case treatment and generic profile vanity metrics.

### 9. Loading, empty, offline, stale, and error

The product uses a state-specific hierarchy:

| State | What remains visible | Primary action |
|---|---|---|
| Initial loading | Screen identity and stable layout; no fake values | None unless cancellation is useful |
| No Race Mission | Product promise and minimum event fields | Create Race Mission |
| Missing evidence | Known decision boundary and exact missing input | Add evidence or mark unavailable |
| Offline with cache | Cached content plus saved-at time | Continue offline or retry |
| Offline without cache | Task-safe explanation | Retry or use manual note where valid |
| Stale source | Last known value and age | Refresh or continue with labelled assumption |
| Partial service failure | Unaffected content and local actions | Retry failed part |
| AI unavailable | Evidence and existing plan | Continue without AI; no fabricated proposal |
| Media unavailable | Event identity on graphic fallback | Continue; report only if rights/data issue |
| Blocking safety state | What is blocked and why | Seek appropriate help or resolve input |

Errors preserve context, entered data, and the user's last safe action. A retry never duplicates a mission, upload, purchase, or accepted plan change.

### 10. Race Pass paywall

**Job:** connect payment to a concrete reduction in race uncertainty.

The free preview contains the real race identity, initial preparation gaps, and a limited checklist. The paywall appears at a value boundary, such as opening the full preparation map or generating a course-specific race plan.

It shows:

- what STREM already understands about this athlete and race;
- the specific Race Pass outputs that unlock;
- a clear per-event price and access period;
- what still depends on athlete evidence;
- refund, restore-purchase, privacy, and support routes;
- no false countdown, crossed-out fictional price, or vague `unlimited AI` claim.

On wider screens, the athlete's real preview and the offer appear together. On compact screens, the preview remains immediately above the offer so the context is not lost.

## Motion Specification

| Pattern | Default | Reduced motion |
|---|---|---|
| Screen transition | 180-240 ms shared-axis or fade | 120-160 ms cross-fade |
| Evidence expansion | 160-220 ms size/fade preserving origin | Instant layout plus short highlight fade |
| Course section change | 220-320 ms synchronized highlight and profile travel | Instant selection plus outline change |
| Decision accepted | Diff collapses into affected sessions over 240-360 ms | Static before/after confirmation |
| Status update | Short color, icon, and text transition | Text/icon update without spatial motion |

Use platform-native easing or a standard emphasized curve. Animations are interruptible. No essential information exists only in motion. Auto-playing parallax, animated background video, pulsing urgency, continuous contour movement, and auto-advancing carousels are prohibited. Respect the system reduced-motion and reduced-transparency settings.

## Accessibility and Field Use

- Target WCAG 2.2 AA across mobile and web, including contrast, reflow, visible focus, focus not obscured, status announcements, and accessible authentication.
- Provide alt text that describes the information or purpose of meaningful media; mark atmosphere as decorative when it adds no information.
- Pair color with labels, icons, patterns, or position.
- Maintain a logical reading and focus order when panes rearrange.
- Provide list and text alternatives to maps, charts, and elevation gestures.
- Support screen readers, external keyboards, switch input, browser zoom, and dynamic text.
- Use 44 by 44 logical-pixel product targets, with at least 8 pixels between adjacent compact controls where possible.
- Keep bottom navigation and sticky actions from obscuring focused content.
- Test critical views in bright sunlight, grayscale, reduced transparency, large text, reduced motion, and offline mode.

## Media and Performance Budgets

- The first meaningful decision must render without waiting for hero media.
- Reserve media aspect ratio and focal point to prevent layout shift.
- Use responsive crops rather than downloading a desktop master on compact devices.
- Initial compact hero target: at most 400 KB after transformation; wide hero target: at most 900 KB. Exceptions require measured quality benefit and performance review.
- Load one above-fold image eagerly; defer galleries and secondary sections.
- Display a stable color/terrain fallback on slow networks, rights expiry, or decode failure.
- Maps must not block Mission rendering and must have an elevation/list alternative.
- Cache race-week text and athlete-confirmed operational facts for offline use; show the saved-at time.

These are design budgets, not evidence of achieved performance. Implementation issues must measure them on a representative mid-range Android device and a constrained mobile network.

## Benchmark Lessons

STREM may learn from, but must not imitate, the following category strengths:

- **Runna:** a race goal can drive a comprehensible plan and device-connected execution. STREM differentiates through course-specific uncertainty, rehearsals, race operations, and cited adaptation.
- **Komoot:** maps, elevation, surface, route detail, and weather form a coherent route-planning language. STREM applies that language to preparation evidence and race execution rather than general route discovery.
- **TrainingPeaks:** calendars, periodization, and deep training detail serve serious planning. STREM keeps comparable intent while translating complexity into one race decision for a self-coached athlete.

The benchmark is not the number of screens. It is whether STREM makes the athlete's specific race feel understood in a way those products do not combine.

## Design Acceptance Checklist

A production screen is not accepted until all relevant items are true:

- [ ] Event identity and current phase are unambiguous.
- [ ] One decision or action dominates the first viewport.
- [ ] Evidence, assumption, unknown, stale, and conflict states are visually and semantically distinct.
- [ ] No fabricated or sample value can be mistaken for athlete data.
- [ ] Media has an approved rights record and correct credit treatment.
- [ ] Generic media is labelled as atmosphere and is not implied to be the event.
- [ ] Loading, empty, offline, stale, partial failure, and retry behavior are designed.
- [ ] Compact, medium, and wide compositions are intentional.
- [ ] Focus order, screen-reader names, chart alternatives, contrast, text scaling, and targets are verified.
- [ ] Motion has a task purpose and an equivalent reduced-motion state.
- [ ] The athlete can inspect and reverse consequential AI changes.
- [ ] The screen remains useful without AI, a connected wearable, or a loaded photograph.
- [ ] Performance budgets are measured rather than assumed.
- [ ] The five-athlete 15-second test passes before calling the flow complete.

## Engineering Handoff

This blueprint governs the following sequence:

1. `strem-shared-contracts#38` defines Race Mission and `EventMedia` fields, provenance, evidence, risk, rehearsal, and decision proposal states.
2. `strem-mobile#103` converts these principles and components into the production visual system.
3. `strem-mobile#104` through `#108` replace the synthetic mission with the real vertical slice.
4. `strem-mobile#109` verifies accessibility, state coverage, performance, and release quality.

No implementation may introduce an additional primary destination or a new score without updating the product authority and proving that it improves the Race Mission loop.

## Issue 17 Delivery Map

| Required outcome | Governing section or document |
|---|---|
| Visual principles and anti-patterns | `Visual Principles`, `Anti-Patterns` |
| Tokens and reusable components | `Visual System`, `Reusable Components` |
| Mobile, tablet, and web behavior | `Responsive Composition` and every screen blueprint |
| Auth, mission creation, Mission, Course, Plan, Race Lab, AI, Athlete, errors, paywall | `Screen Blueprints` |
| Purposeful and reduced motion | `Motion Specification` |
| Rights hierarchy, attribution, fallback, and takedown | [`race-media-policy.md`](race-media-policy.md) |
| `EventMedia` fields for contract review | [`race-media-policy.md`](race-media-policy.md#eventmedia-contract-proposal) |
| Five-athlete usability script and 15-second gate | [`race-experience-usability.md`](race-experience-usability.md) |
| Acceptance checklist | `Design Acceptance Checklist` and `Media Acceptance Checklist` |

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Understanding target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Runna](https://www.runna.com/)
- [Komoot route details](https://support.komoot.com/hc/en-us/articles/4403138423066)
- [TrainingPeaks learning center](https://www.trainingpeaks.com/learn/)
