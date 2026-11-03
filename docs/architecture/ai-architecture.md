# AI Architecture — Race Mission Decision System

## Purpose

STREM AI turns consented athlete evidence and event demands into explainable Race Mission decisions. It is not a generic chatbot, autonomous medical system, or silent plan generator.

## Decision context

The orchestrator assembles only the context needed for a decision:

- active Race Mission and athlete goal;
- official and athlete-entered event facts with provenance and freshness;
- course sections, distance, elevation, terrain, cutoffs, aid stations, and mandatory kit;
- athlete experience, limitations, equipment, terrain access, and availability;
- recent activity evidence, load, recovery, and subjective check-ins;
- completed and unresolved terrain, fueling, gear, condition, and logistics rehearsals;
- previously accepted, rejected, or edited decisions;
- consent state for every external source.

Manual athlete evidence must remain usable when no external source is connected.

## Evidence classes

Every material input is classified as one of:

- `official_fact` — organizer or verified event source;
- `athlete_statement` — explicitly entered by the athlete;
- `source_observation` — imported activity or recovery record;
- `calculation` — deterministic output with method and input references;
- `assumption` — a planning hypothesis that needs confirmation;
- `unknown` — missing information that limits confidence.

AI output must never blur these classes.

## Decision proposal

A consequential recommendation returns:

- the proposed action;
- why it matters for this event;
- alternatives considered;
- cited evidence and provenance;
- explicit assumptions and unknowns;
- confidence and its basis;
- safety classification;
- what changes in the plan;
- whether athlete approval is required;
- an accept, edit, or reject path.

The plan is not silently regenerated after missed work or new data.

## System flow

1. Gateway authenticates the athlete and routes the request.
2. Orchestrator requests approved data from owning services.
3. Consent filter removes disabled sources before context assembly.
4. Deterministic calculations produce transparent evidence and risk candidates.
5. AI interprets conflicts, missing evidence, and alternatives.
6. Safety middleware blocks diagnosis, prescription, shame, invented facts, and unsupported certainty.
7. The proposal is stored with input references, model/version metadata, and athlete response.
8. Accepted changes are executed through typed service tools and leave an action receipt.

## Tool boundaries

The AI may read through approved service APIs. It does not share databases or own raw source data.

Write tools must be typed, least-privilege, auditable, idempotent where possible, and scoped to the authenticated athlete. High-impact plan changes require approval. Reversible actions expose undo when the underlying service supports it.

## Safety

STREM provides training decision support, not diagnosis or treatment.

Escalate rather than coach through:

- chest pain, fainting, severe breathing difficulty, or emergency symptoms;
- suspected serious injury;
- illness conflicting with training;
- eating-disorder or dangerous fueling language;
- medication, supplement dosing, laboratory interpretation, or medical treatment;
- mental-health crisis or self-harm language.

The response should stop performance optimization, state the limitation, and direct the athlete to appropriate professional or emergency help.

## Failure behavior

- Missing source: explain the gap and provide the safest useful manual path.
- Stale source: identify freshness and reduce confidence.
- Conflicting sources: show the conflict; do not average it away silently.
- Model unavailable: return deterministic evidence and an honest unavailable state.
- Tool failure: do not claim the change happened; keep the previous plan.
- No supporting evidence: ask for the smallest useful input rather than inventing readiness.

## Observability and privacy

Log request IDs, latency, tool outcomes, safety classifications, model/version, and anonymized evaluation metadata. Do not log raw chat, health data, calendar contents, precise routes, or tokens by default.

The action receipt visible to the athlete is a product requirement, not only an operational log.

## Evaluation

Evaluate the system on:

- factual grounding and provenance;
- correct handling of missing and conflicting data;
- trail/course specificity;
- plan-change consistency;
- safety escalation;
- calibration of confidence;
- usefulness to self-coached athletes;
- whether the recommendation changes a meaningful decision.

Engagement, answer length, and apparent confidence are not success metrics.
