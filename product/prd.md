# Product Requirements Document

## Product

STREM is an AI-powered transformation operating system for ambitious people and hybrid athletes. The long-term ecosystem can include training, running, endurance, strength, nutrition, recovery, habits, mindset, community, AI coaching, coaches, marketplace, wearables, analytics, and accountability systems.

The MVP must validate the smallest strong version of the transformation thesis, not the largest possible feature set.

---

## Product Moat

STREM must not win because it has more trackers, dashboards, or content.

STREM wins because it helps users build a new identity through:

- disciplined daily proof across multiple transformation pillars
- AI-generated missions that cover movement, recovery, nutrition, tribe, and discipline — not just workouts
- behavioral adaptation after missed days, burnout signals, and milestone proximity
- small accountability tribes (4–8 members) with collective XP and structured check-ins
- emotional progression that makes effort visible and identity-building
- hybrid athlete philosophy across strength, endurance, nutrition, and resilience

---

## Problem

People who want to transform their health and performance are forced into fragmented tools:

- training logs in one app
- nutrition in another
- community in group chats
- goals in notes
- coaching in disconnected conversations
- recovery and habits in separate systems

This fragmentation creates decision fatigue, weak accountability, and low retention.

The deeper problem is identity drift. Users know what they want to become, but their environment, routines, and feedback loops keep pulling them back into the old version of themselves.

STREM exists to interrupt identity drift — to make the transformation identity so visible, so socially reinforced, and so consistently rewarded that the old behavior becomes harder than the new behavior.

---

## MVP Goal

Validate that users return because STREM helps them:

- define a transformation identity
- log training, running, and nutrition
- receive AI transformation coaching and weekly missions
- earn XP and progress through ranks
- join a small accountability tribe with collective XP
- see enough proof of change to continue

---

## Primary Users

- hybrid athletes
- busy professionals
- transformation seekers

---

## MVP Product Loop

1. User signs up and completes identity-first onboarding (target: under 5 minutes).
2. User logs training, running, and nutrition — earns XP per session.
3. AI transformation coach generates weekly missions and delivers narrative coaching recap.
4. User completes missions and challenges — earns XP and medals.
5. User joins or creates a small tribe — checks in daily, earns Tribe Power collectively.
6. Tribe accountability, visible rank progression, and mission completion bring the user back.

---

## MVP Functional Scope

### Included

- authentication
- user profile and identity capture
- onboarding (identity-first, under 5 minutes)
- training log
- running log
- nutrition log
- basic AI transformation coach
- weekly mission generation (structured objects, not chat messages)
- small accountability tribes (invite-only, 4–8 members)
- basic XP system (5 ranks: Initiate → Warrior)
- 10 milestone medals
- 2 challenge types (individual discipline + tribe collective)

### Excluded

- supplements
- marketplace
- coach marketplace
- advanced wearables
- advanced analytics dashboards
- advanced social network
- meal-prep marketplace
- Titan and Ascended ranks (✅ shipped post-MVP — P2-01; see implementation-status.md)
- path ranks (V2 — not built)
- seasonal arcs (🟡 foundation shipped — P2-03; multipliers/challenges queued)
- tribe vs. tribe challenges (⬜ queued — P2-05; the Tribe Power leaderboard shipped in P2-02)
- audio generation (V3)
- video generation (V4)
- AI avatar (V4)

See `product/mvp-scope.md` for the complete inclusion and exclusion list.

---

## Game Systems Requirements

The game progression layer is a core product requirement for MVP — not a future feature. It makes transformation visible and emotionally real.

### XP System

- Users earn XP for logged sessions across all pillars (training, running, nutrition, recovery, tribe check-ins)
- XP is never removed or decreased
- XP is displayed as cumulative total and as progress within current rank
- Streak bonuses: 7-day (200 XP), 30-day (1,000 XP)
- XP is stored in a single progression ledger (in `strem-user-service` for MVP)
- XP events are fired from domain services via RabbitMQ — orchestrator maintains the ledger

See `product/game-systems.md` for full XP weight table.

### Level System

- 5 ranks in MVP: Initiate (0–999 XP), Builder (1,000–4,999 XP), Forged (5,000–14,999 XP), Hybrid (15,000–39,999 XP), Warrior (40,000–99,999 XP)
- Rank is displayed on user profile
- Rank-up triggers a personalized AI coach message acknowledging what was built
- Rank history is stored — users can see when they reached each rank

### Mission System

- AI coach generates 1–3 missions per user per week (Monday trigger)
- Re-entry mission generated after 3+ consecutive days with no logging
- Missions are structured objects: title, description, duration_days, xp_reward, type, completion_condition, difficulty
- Mission types: performance, recovery, tribe, discipline, nutrition, hybrid
- Mission completion triggers XP award and AI coach narrative acknowledgment
- Mission states: active, completed, expired, skipped
- No punishment for expired or skipped missions

### Challenge System

- Individual discipline challenge: personal commitment with defined scope and duration
- Tribe collective challenge: shared goal for the full tribe
- Challenge states: active, completed, failed, abandoned (no punishment for failed)
- Challenge completion triggers XP award and medal eligibility
- Users can restart failed challenges without penalty

### Medal System

- 10 MVP medals covering the core transformation arc
- Medals displayed on user profile: earned in full color, unearned visible but greyed with earn condition
- Medal earn events trigger AI coach acknowledgment
- Medal history is permanent — medals earned are never removed

See `product/game-systems.md` for MVP medal set earn conditions.

### Tribe System

- Tribe size: 4–8 members, hard cap of 10
- MVP formation: invite-only via invite code
- Daily optional check-in prompt with structured format (what completed + one sentence)
- Tribe collective XP (Tribe Power) accumulates from all member activity
- AI-generated weekly tribe summary delivered Sunday
- Accountability nudge: tribe members see "check on [Name]" prompt after 3+ days of member inactivity
- Tribe admin can invite, approve, and remove members
- Tribe check-ins visible only to tribe members (never public)

See `product/tribe-design.md` for full tribe specification.

### AI Coach Requirements

- Coach generates missions based on context bundle (see `architecture/ai-architecture.md`)
- Coach delivers weekly narrative coaching recap (not a data report)
- Behavioral adaptation engine monitors patterns and triggers proactive missions
- Safety escalation protocol for disordered eating signals, injury signals, burnout, and mental health language
- Coach never provides medical diagnosis, injury diagnosis, or unsafe certainty

---

## Success Metrics

MVP success is measured by transformation signals, not engagement metrics.

### Primary

- D1, D7, D30 retention
- Weekly active loggers
- Users with at least 3 logged days per week
- XP earning rate across multiple pillars (not just training)
- Rank progression rate
- Mission completion rate
- Tribe participation rate (check-ins per active member per week)
- Missed-day recovery rate

### Supporting

- Onboarding completion rate and time
- Time to first log
- Time to first mission received and completed
- Time to first tribe check-in
- Medal earning rate (are users hitting meaningful milestones?)
- AI transformation coach weekly recap open rate

### Qualitative

- User-reported clarity, discipline, and identity shift
- Tribe quality signals (substantive check-ins, distributed participation)

---

## Non-Goals

The MVP is not a full social network, marketplace, wearable platform, coach SaaS, medical product, analytics suite, or generic AI chat product.

---

## Product Principle

Build the transformation retention loop first. Prove the identity system works. Then expand the ecosystem.

The order: Foundation → Identity → Immersion → Cinematic.

See `product/roadmap.md` for the full phase sequence and gate criteria.
