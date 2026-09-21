# STREM Engineering Operating System

STREM is the **AI race team for self-coached trail runners**.

It begins when an athlete commits to a real trail or mountain event and stays with them through preparation, rehearsals, race-week execution, finish, and debrief. Existing devices record what happened. STREM explains what it means for this athlete and this race.

**Positioning:** Your devices know what happened. STREM knows what it means for race day.

**Emotional promise:** No coach. No crew. Still not alone.

## Start here

- [`product/trail-running-pivot.md`](product/trail-running-pivot.md) — active product authority
- [`product/trail-running-delivery-plan.md`](product/trail-running-delivery-plan.md) — validation and implementation sequence
- [`product/implementation-status.md`](product/implementation-status.md) — current build truth
- [`vision/product-philosophy.md`](vision/product-philosophy.md) — durable product and design principles
- [`prompts/global/agent-rules.md`](prompts/global/agent-rules.md) — rules for AI-assisted work

## First customer

A working adult preparing mostly alone for a first serious 20–50 km trail or mountain event. They may use Strava, a watch, or a recovery platform, but they do not have an affordable personal race team coordinating training, terrain, recovery, fueling, equipment, conditions, logistics, and race strategy.

## Active product

- one active Race Mission;
- trail-specific athlete and event intake;
- event/course facts and provenance;
- preparation evidence and unresolved risks;
- a life-aware trail plan and inspectable adaptations;
- Race Lab for course, pacing, fuel, gear, conditions, and logistics;
- calendar export and consented free/busy availability;
- explainable AI decisions with athlete control;
- race-week operations and post-race learning.

## Explicit exclusions

The active product does not include generic tracker dashboards, calorie counting, XP, ranks, medals, streak rewards, Tribe, Crew personas, follower mechanics, leaderboards, biomarkers, supplements, marketplaces, cinematic recaps, or broad multi-sport support.

Those directions were removed on 2026-09-20. Git history is the archive; they are not parallel roadmaps.

## Repository purpose

`strem-docs` is the canonical documentation system for:

- product authority and validation gates;
- implementation status;
- architecture and ADRs;
- security, privacy, and AI-safety rules;
- repository and contract workflows;
- runbooks, prompts, and review templates.

Runtime code, migrations, infrastructure assets, and generated contracts do not belong here.

## Repository map

- `product/` — active product thesis, delivery plan, and status
- `vision/` — brand, origin, and product philosophy
- `architecture/` — service boundaries and ADRs
- `prompts/` — engineering and AI-agent operating prompts
- `workflows/` — development workflows
- `runbooks/` — operational procedures
- `templates/` — issues, pull requests, reviews, testing, and task templates
- `legal/` — policy source documents requiring legal review

## Review gates

Human or review-agent approval is required for shared contracts, service boundaries, database migrations, authentication, authorization, privacy, health data, safety-affecting AI recommendations, CI/CD, and deployment changes.

## Validation before breadth

The next business gate is a paid concierge pilot with 10 athletes preparing for real events. The next engineering gate is a reviewed Race Mission contract. No second sport or major ecosystem feature should be added before those gates produce evidence.
