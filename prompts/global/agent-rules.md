# Global Agent Rules

Use this prompt at the start of AI-agent work in any STREM repository.

---

## Prompt

You are working on STREM, an AI-powered transformation operating system for ambitious people and hybrid athletes.

STREM is NOT a fitness tracker, calorie app, dashboard product, social feed, or generic AI chatbot. It is an identity operating system — a system that helps users become stronger, more disciplined, and more connected through daily proof, tribe accountability, and AI coaching that knows their story.

---

## The Anti-Drift Checklist

Run this before every feature build, change, or architectural decision:

1. **Identity test**: Does this feature help the user feel like a stronger, more disciplined version of themselves? If the answer is unclear or no, examine before proceeding.

2. **Moat test**: Would a generic fitness app (MyFitnessPal, Strava, Nike Run Club) build this exact same feature in the exact same way? If yes, we need a clear differentiation reason, or this feature waits.

3. **Transformation pillar test**: Does this feature reinforce at least one of the four moat pillars: identity transformation, behavioral adaptation, tribe accountability, or progression immersion? If none, deprioritize.

4. **Metric test**: Are we measuring transformation signals (XP earned, missions completed, rank progress, tribe participation, missed-day recovery) rather than engagement signals (session time, clicks, opens)? Never optimize for the latter.

5. **Prohibited pattern test**: Does this add social following mechanics, public likes, follower counts, calorie shaming, or dark pattern notifications? If yes, STOP. These are explicitly forbidden.

---

## What The Moat Is

STREM's durable differentiation comes from four pillars. Every feature should serve at least one:

**Identity Transformation**
- Character evolution based on multi-pillar activity (movement, nutrition, recovery, tribe, discipline)
- Rank progression with named identity stages (Initiate → Builder → Forged → Hybrid → Warrior → Titan → Ascended)
- Path ranks that reflect the athlete the user has actually become (Iron Mind, Mountain Runner, Iron Body)
- XP as proof of discipline and identity growth — not entertainment points

**Behavioral Adaptation**
- AI missions that adapt based on performance patterns, burnout signals, tribe state, and consistency
- Behavioral adaptation engine that proactively triggers interventions (re-engagement, recovery protocols, milestone nudges)
- Context assembly that prioritizes identity goal → safety → performance → tribe → consistency
- Compassionate re-entry mechanics after missed days (no punishment, smaller missions)

**Tribe Accountability**
- Small tribes (4–8 members) — locker room, not social media
- Collective XP (Tribe Power) that grows with shared effort
- Tribe challenges that create collective ownership
- Accountability without shame: gentle nudges, not public failure states
- Tribe check-in format that is structured and fast, not a social media post

**Progression Immersion**
- XP economy that rewards multi-pillar engagement and consistency
- 7-rank progression system with identity-named stages
- Medals that feel earned and difficult, not trivially awarded
- Immersive seasonal arcs (V2+) that give the transformation a narrative container
- Future: audio briefings, cinematic video recaps, AI avatar evolution, The Chronicle

---

## What The Moat Is Not

Do not mistake these for core differentiation:

- General fitness analytics dashboards → these are supporting displays, not the product
- Calorie counting precision → a tool, not the identity
- Public leaderboards without tribe context → this is social comparison, not accountability
- Generic AI chat without mission/identity grounding → this is a chatbot, not a transformation coach
- Advanced recovery or nutrition features without retention proof → these are ecosystem features

---

## Before Changing Files

1. Read the workspace `AGENTS.md`.
2. Read the repository `AGENTS.md`.
3. Read the issue and acceptance criteria.
4. Identify the repository, subsystem, and files in scope.
5. Confirm whether contracts, migrations, security, AI behavior, or deployment are affected.
6. State how the task supports the current product phase.

---

## Operating Rules

- Stay inside the issue scope.
- Do not create fake services, placeholder runtime code, or unrequested boilerplate.
- Preserve user and teammate changes.
- Prefer existing patterns over new abstractions.
- Keep service boundaries intact.
- Do not share database models across services.
- Do not change public contracts without contract review.
- Add or update tests when implementation risk requires it.
- Update docs when behavior, workflow, or architecture changes.

---

## MVP Scope (Read This Every Time)

**Included in MVP:**
- auth, user profiles, onboarding
- training log, running log, nutrition log
- basic AI transformation coach with weekly mission generation
- small accountability tribes (invite-only, 4–8 members, collective XP)
- basic XP system (5 ranks: Initiate → Warrior)
- 10 milestone medals
- 2 challenge types (individual discipline + tribe collective)

**Excluded from MVP:**
- supplements, marketplace, coach marketplace
- advanced wearables
- advanced analytics dashboards
- advanced social network
- meal-prep marketplace
- Titan and Ascended ranks (V2)
- path ranks: Iron Mind, Mountain Runner, etc. (V2)
- seasonal arcs (V2)
- tribe vs. tribe challenges (V2)
- global STREM events (V2)
- audio generation (V3)
- video generation and cinematic recaps (V4)
- AI avatar system (V4)

**Critical:** "advanced challenge and XP systems" in old exclusion lists meant advanced versions of these systems. Basic XP, 5 ranks, 10 medals, simple missions, and simple challenges ARE in MVP scope. Do not exclude the MVP game layer based on misreading the exclusion list.

---

## Key Documents To Reference

For product context:
- `product/game-systems.md` — XP economy, ranks, medals, missions, challenges, seasons
- `product/tribe-design.md` — tribe size, formation, check-ins, accountability, moderation
- `product/mvp-scope.md` — complete MVP inclusion and exclusion list
- `vision/transformation-psychology.md` — behavioral science foundation
- `vision/product-philosophy.md` — manifesto, emotional design principles, design test
- `product/roadmap.md` — phase gates and thematic roadmap

For architecture context:
- `architecture/ai-architecture.md` — mission generation, behavioral adaptation, safety escalation
- `architecture/system-overview.md` — service map and ownership
- `architecture/adr/` — architectural decisions

---

## When Finished, Report

- what changed
- how it was verified
- risks or follow-ups
- which transformation pillar(s) the change serves
