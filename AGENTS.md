# strem-docs Agent Guide

This repository is the canonical documentation system for STREM. It exists to make the company buildable by humans and AI agents without losing strategic discipline.

---

## Rule #1 — Protect The Transformation Moat

STREM must never become a fitness tracker, calorie app, dashboard product, generic AI chatbot, or social feed.

Before making any documentation change, run the anti-drift checklist from `prompts/global/agent-rules.md`:

1. Does this change help the user feel like a stronger, more disciplined version of themselves?
2. Would a generic fitness app do this the same way? If yes, what differentiates it?
3. Does it reinforce at least one of the four moat pillars: identity transformation, behavioral adaptation, tribe accountability, or progression immersion?
4. Does it optimize for transformation signals (XP earned, missions completed, rank progress, tribe participation) rather than engagement signals?
5. Does it introduce social following mechanics, public likes, follower counts, calorie shaming, or dark patterns? If yes, stop.

**Required reading before contributing:**
- `prompts/global/agent-rules.md` — Complete anti-drift rules and moat definition
- `product/game-systems.md` — Game system specification (XP, ranks, medals, missions, challenges)
- `product/tribe-design.md` — Tribe mechanics specification
- `vision/product-philosophy.md` — The STREM Manifesto and design principles
- `product/mvp-scope.md` — MVP inclusion and exclusion list

---

## Mission

Maintain the engineering operating system for STREM:

- product and brand source of truth
- architecture strategy and ADRs
- repository strategy
- AI-agent workflows and reusable prompts
- engineering standards
- runbooks and templates
- future skill and subagent definitions

---

## Editing Rules

- Write in clear, direct, production-oriented language.
- Avoid motivational filler, fake implementation details, and unapproved runtime APIs.
- Keep MVP scope narrow unless a roadmap document explicitly marks a feature as future.
- Prefer concrete boundaries, ownership, and acceptance criteria over vague advice.
- Use Markdown only unless a future issue explicitly asks for another artifact type.
- Link related documents when it helps navigation.
- When documenting game mechanics (XP, missions, challenges, medals), cross-reference `product/game-systems.md` rather than redefining them independently.
- When documenting tribe mechanics, cross-reference `product/tribe-design.md`.
- When documenting AI behavior, cross-reference `architecture/ai-architecture.md`.

---

## Documentation Style

STREM should read like a serious, AI-native engineering foundation with elite athletic ambition:

- strategic but practical
- AI-native but safety-aware
- scalable but not prematurely complex
- premium and disciplined, not hype-driven
- Bulgaria-first and global-ready
- transformation-oriented rather than tracker-oriented
- identity-first rather than data-first

---

## Canonical Product Constraints

**MVP includes:**
- authentication
- user profiles
- onboarding (identity-first, under 5 minutes)
- training log
- running log
- nutrition log
- basic AI transformation coach with weekly mission generation
- small accountability tribes (invite-only, 4–8 members)
- basic XP system (5 ranks: Initiate → Warrior)
- 10 milestone medals
- 2 challenge types (individual discipline + tribe collective)

**MVP excludes:**
- supplements, marketplace, coach marketplace
- advanced wearables, advanced analytics
- advanced social network, meal-prep marketplace
- Titan and Ascended ranks (V2)
- path ranks: Iron Mind, Mountain Runner, etc. (V2)
- seasonal arcs (V2)
- tribe vs. tribe challenges (V2)
- audio generation (V3)
- video generation and cinematic recaps (V4)
- AI avatar system (V4)

**Note on game system scope:** basic XP, 5 ranks, 10 medals, missions, and simple challenges ARE in MVP. The old exclusion "advanced challenge and XP systems" referred to the V2+ expanded game system (Titan rank, path ranks, seasons, tribe vs. tribe, global events). Do not exclude the MVP game layer.

---

## Canonical Technology Constraints

**Fixed (not re-evaluated per service):**
- Backend language: Python
- API framework: FastAPI
- Mobile: React Native, Expo, TypeScript
- CI/CD: GitHub Actions
- Web/Admin: Next.js (later)

**Evaluated per service (choose best fit, document the decision):**
- Database: see `architecture/database-strategy.md` — PostgreSQL is the default for relational needs, but not mandated
- Cache / rate limiting: Redis-compatible (Redis, Valkey, Dragonfly) — choose based on licensing and performance
- Async messaging: see `architecture/event-driven-strategy.md` — Redis Streams or NATS preferred for MVP, RabbitMQ/Kafka only if justified
- ORM / migrations: SQLAlchemy + Alembic for PostgreSQL services; adapt for other database choices

**Infrastructure:**
- Local dev: Docker Compose (services defined at implementation time based on chosen technologies)
- Production: managed platform initially, Kubernetes when service count and scale justify it
- Observability: OpenTelemetry + Prometheus/Grafana (later, after MVP)

**AI:**
- `strem-ai-orchestrator` owns mission generation, behavioral adaptation, narrative coaching, safety escalation
- XP ledger in `strem-user-service` for MVP; extract to `strem-xp-service` only if V2 complexity demands it

---

## Agent Review Checklist

Before finishing a docs change, verify:

- the change does not introduce implementation code
- MVP and future-phase boundaries are respected
- the anti-drift checklist from Rule #1 has been run
- game system mechanics reference `product/game-systems.md` for consistency
- tribe mechanics reference `product/tribe-design.md` for consistency
- AI behavior references `architecture/ai-architecture.md` for consistency
- repository ownership is clear
- service boundaries are not silently changed
- AI-agent instructions are safe for parallel work
- security and privacy implications are acknowledged where relevant
- templates remain usable by both humans and AI agents
- the product is not drifting toward a generic fitness tracker, calorie app, dashboard, chatbot, or social feed
