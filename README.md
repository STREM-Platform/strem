# STREM Engineering Operating System

**STREM is not a fitness tracker.**

STREM is a transformation operating system for hybrid athletes and ambitious people — a system that makes you stronger, more disciplined, and more connected through daily proof, tribe accountability, and AI coaching that knows your story.

Inspired by the Bulgarian word `stremezh`: striving, ambition, discipline, upward movement, resilience, constant growth.

**Slogan: STREM — Never Settle.**

---

## What STREM Is / What STREM Is Not

| STREM Is | STREM Is Not |
|----------|--------------|
| An identity operating system | A fitness tracker |
| A real-life character progression system | A calorie counter |
| A tribe accountability platform | A social media feed |
| An AI transformation coach that knows your story | A generic AI chatbot |
| A disciplined progression arc (XP, ranks, medals, missions) | A gamified engagement trap |
| A hybrid athlete philosophy in product form | Another wellness dashboard |

---

## What This Repository Is

`strem-docs` is the canonical engineering operating system for STREM. It gives founders, engineers, designers, AI coding agents, reviewers, and future operators a shared foundation — product vision, architecture, workflows, prompts, runbooks, and templates — before application code exists.

It covers:

- product vision, philosophy, and MVP discipline
- game systems, tribe mechanics, and transformation psychology
- service boundaries and repository strategy
- architecture decisions and ADRs
- AI-agent development workflows
- reusable prompts and review rules
- GitHub issue and PR workflows
- runbooks for features, services, reviews, releases, and incidents
- future vision: audio generation, video generation, immersive seasons, The Chronicle

---

## What This Repository Is Not

This repository is not an application runtime. Do not add backend services, frontend apps, fake placeholder code, generated boilerplate, database migrations, Docker services, or API implementations here.

---

## The Durable Moat

STREM's competitive advantage is not feature quantity. It is:

- **Identity transformation**: rank progression, character evolution, XP as proof of discipline
- **Behavioral adaptation**: AI missions that adapt to burnout, consistency, tribe state, and identity goals
- **Tribe accountability**: small groups (4–8 members) built for belonging, not broadcasting
- **Progression immersion**: seasonal arcs, medals, missions — making transformation feel like an arc, not a grind

Training logs, running logs, nutrition logs, AI coaching, and tribes are MVP mechanics. They prove the thesis. They are not the final product by themselves.

---

## Core Product Truth

- STREM is the operating system for becoming your strongest self.
- STREM prioritizes discipline, identity, transformation, resilience, and community.
- STREM's MVP validates the transformation loop — not feature quantity.
- STREM starts Bulgaria-first and scales global-ready.
- STREM uses AI to reduce decision fatigue and narrate transformation, not to replace human judgment.
- STREM must avoid scope creep until retention is proven.

---

## The Long Arc

| Phase | Theme | Focus |
|-------|-------|-------|
| 0 | Engineering Foundation | Docs, architecture, agent workflows |
| 1 | Foundation (MVP) | Transformation loop, basic XP, missions, tribes |
| 2 | Identity | Full progression, seasonal arcs, tribe vs. tribe |
| 3 | Immersion | Audio layer, wearable integration, mature seasons |
| 4 | Cinematic | Video recaps, The Chronicle, AI avatar evolution |

See `product/roadmap.md` for full phase specification and gate criteria.

See `product/future-immersion.md` for the North Star vision.

---

## Key Documents

### Vision and Philosophy
- `vision/product-philosophy.md` — The STREM Manifesto and design principles
- `vision/transformation-psychology.md` — Behavioral science foundation
- `vision/brand-identity.md` — Brand voice, tone, and visual identity
- `vision/bulgarian-heritage.md` — Cultural origin and differentiation

### Product
- `product/game-systems.md` — XP economy, ranks, medals, missions, challenges, seasons
- `product/tribe-design.md` — Tribe mechanics, formation, check-ins, accountability
- `product/mvp-scope.md` — Complete MVP inclusion and exclusion list
- `product/roadmap.md` — Thematic phase roadmap with gate criteria
- `product/prd.md` — Full product requirements including game systems
- `product/feature-map.md` — Features mapped by phase
- `product/retention-strategy.md` — Behavioral retention loops and mechanics
- `product/future-immersion.md` — Audio, video, cinematic North Star
- `product/user-personas.md` — Hybrid athlete, busy professional, transformation seeker
- `product/monetization.md` — Revenue strategy and premium tier design

### Architecture
- `architecture/system-overview.md` — Service map and ownership
- `architecture/ai-architecture.md` — Mission generation, behavioral adaptation, safety
- `architecture/adr/` — Architecture Decision Records (ADR 001–005)

### AI-Agent Workflows
- `prompts/global/agent-rules.md` — Required reading for all AI agents
- `prompts/global/architecture-rules.md` — Architecture operating rules
- `prompts/features/feature-build-prompt.md` — Feature implementation template
- `workflows/` — Claude Code, Codex, multi-agent workflows

### Standards and Runbooks
- `runbooks/` — Feature creation, service creation, code review, release, incident response
- `templates/` — GitHub issues, PRs, reviews, testing, backend and frontend tasks

---

## MVP Boundary

**Included:**
- authentication, user profiles, onboarding
- training log, running log, nutrition log
- basic AI transformation coach with weekly mission generation
- small accountability tribes (invite-only, 4–8 members, collective XP)
- basic XP system (5 ranks: Initiate → Warrior)
- 10 milestone medals
- 2 challenge types (individual discipline + tribe collective)

**Excluded:**
- supplements, marketplace, coach marketplace
- advanced wearables, advanced analytics
- advanced social network, meal-prep marketplace
- Titan and Ascended ranks, path ranks (V2)
- seasonal arcs, tribe vs. tribe (V2)
- audio generation (V3), video generation (V4)

---

## Repository Rollout

Foundation repositories:

- `strem-docs`
- `strem-shared-contracts`
- `strem-infra`

Approved first-wave product repositories (create on scoped need, not preemptively):

- `strem-mobile`
- `strem-api-gateway`
- `strem-auth-service`
- `strem-user-service`
- `strem-training-service`
- `strem-nutrition-service`
- `strem-community-service`
- `strem-ai-orchestrator`

Postpone until validated:

- `strem-xp-service` (if progression outgrows user-service)
- `strem-challenge-service` (V2 complexity)
- `strem-notification-service`
- `strem-recovery-service`
- `strem-payment-service`
- `strem-coach-service`
- `strem-marketplace-service`
- `strem-meal-prep-service`
- `strem-web`, `strem-admin`, `strem-coach-dashboard`

---

## Agent Rule

All AI agents must read `AGENTS.md` and `prompts/global/agent-rules.md` before modifying any STREM repository.

The anti-drift checklist in `prompts/global/agent-rules.md` is mandatory before every feature build.
