# Roadmap

> **Implementation status:** Phase 1 (the transformation loop) is built, and
> Phase-2 *foundations* have shipped ahead of the gate at the team's direction
> (7-rank ladder, leaderboard, season model, behavioral adaptation). The
> expansion gates below still govern when the remaining Phase-2/3 work is taken
> on. See [`implementation-status.md`](implementation-status.md) for the live state.

Each phase has a name, a purpose, and a gate. No phase begins until the previous phase's evidence threshold is met.

---

## Anti-Roadmap Principle

Before every phase planning session, ask: does this roadmap item deepen identity, accountability, or progression? Or does it just add surface area?

Features that add surface area without deepening transformation belong on the "later" list, not the roadmap. STREM's value comes from depth in the transformation arc, not breadth of feature coverage.

---

## Phase 0 — Engineering Foundation

**Theme:** Make STREM buildable by a small team and safe for AI-assisted development.

**Goal:** Establish the canonical documentation, architecture decisions, and AI-agent workflows that will govern the platform for years.

Deliverables:

- documentation source of truth (`strem-docs`)
- repository strategy
- architecture decisions and ADRs
- AI-agent workflows and prompt hierarchy
- issue and PR templates
- runbooks for features, services, reviews, releases, and incidents
- service boundary map

This phase is complete when: a developer or AI agent can read the docs and understand exactly what to build, in what order, with what constraints — without asking for clarification.

---

## Phase 1 — Foundation

**Theme:** Establish the core transformation loop.

**Goal:** Validate that users return because STREM helps them act like the person they want to become — not because the product is feature-rich.

Scope:

- authentication
- user profiles and identity capture
- onboarding (under 5 minutes, identity-first)
- training log
- running log
- nutrition log
- basic AI transformation coach with weekly mission generation
- small accountability tribes (invite-only, 4–8 members, collective XP)
- MVP game progression (basic XP, 5 ranks, 10 medals, 2 challenge types)

Core question to validate:

> Do users return because STREM helps them feel like the athlete and disciplined person they want to become?

Gate to Phase 2: D30 retention benchmarks met, weekly active loggers consistent, tribe participation meaningful, XP system showing engagement (users earning XP across multiple pillars, not just training), missed-day recovery rate positive.

---

## Phase 2 — Identity

**Theme:** Deepen the progression system and validate the transformation arc at scale.

**Goal:** Grow the progression system to its full depth, establish the seasonal arc system, and expand tribe mechanics — only after Phase 1 proves the core loop.

Candidates:

**Progression Depth**
- Full 7-rank system: Titan (100,000–249,999 XP) and Ascended (250,000+ XP) ranks added
- Path ranks unlocked: Iron Mind, Mountain Runner, Iron Body, Tribe Anchor, Iron Nutrition
- Full medal catalogue (30+ medals across endurance, strength, discipline, recovery, tribe, transformation)

**Tribe Expansion**
- Tribe discovery: browse public tribes by theme
- AI-assisted tribe matching based on goals, timezone, training style
- Tribe vs. tribe challenges
- Tribe leaderboard (ranked by collective Tribe Power within tier)

**Challenge Expansion**
- Global STREM Events: monthly flagship challenges available to all users
- AI-generated personal challenges: dynamically created based on trajectory and gap analysis
- Seasonal challenges: exclusive to active seasons with permanent exclusive medals

**Seasonal Arcs (V2 Launch)**
- Two seasons launched per year
- Each season: 8–12 weeks, thematic name, visual identity, exclusive challenges, XP multipliers
- AI coach narrative adapts to season theme throughout the arc
- Season trailer generated at launch (text/image — audio version follows in V3)
- Season examples: Iron October, Winter Ascension, Mountain Arc

**AI Coach Depth**
- Improved context memory: coach references multi-week patterns, not just last 7 days
- Multi-week mission arcs: connected missions that build toward a larger transformation objective
- Behavioral adaptation engine: coach proactively triggers re-engagement missions, burnout detection, milestone-proximity nudges

**Accountability and Notifications**
- Milestone proximity alerts: "You're 3 sessions away from your next rank"
- Tribe accountability nudges: gentle "check on [Name]" prompts after 3 days of inactivity
- Recovery recommitment: compassionate re-entry missions after missed streaks

Gate to Phase 3: progression system driving meaningful engagement increases, seasonal arcs showing strong participation and completion, tribe vs. tribe mechanic validating, AI coach demonstrating improved retention metrics.

---

## Phase 3 — Immersion

**Theme:** Add the audio layer and deepen the transformation experience into something that feels alive.

**Goal:** Make STREM's AI coach a voice, not just a text interface — while deepening the seasonal system and enabling wearable integration.

Candidates:

**Audio Layer**
- AI-generated mission briefings (60–90 seconds, pre-session)
- Running guidance audio (real-time pacing, encouragement, distance milestones)
- Recovery meditations (5, 10, 20 minute guided sessions calibrated to training intensity)
- Transformation recap audio (weekly narrative delivered Sunday evening)
- Breathwork and focus protocols (pre-session mental preparation)
- AI mentor personalities (Stoic, Mountain Guide, Sparring Partner, Builder, Iron Coach)

**Wearable Integration**
- Apple Watch, Garmin, Whoop, Oura, COROS native integration
- HRV-aware mission adaptation: coach reads readiness and adjusts mission difficulty in real time
- Training load management: proactive deload prescriptions before overtraining signals appear
- Recovery Protocol triggered automatically by biometric signals

**Seasonal System Maturation**
- Eight seasons per year (from two)
- Each season: full narrative arc with AI coach persona alignment
- Season community events (tribe-wide season missions, collective season leaderboards)

**Coach Marketplace (Early)**
- Verified coach profiles
- Coach-led tribes
- Paid programs linked to user's STREM identity and progression

Gate to Phase 4: audio layer showing meaningful engagement, wearable integration driving improved mission relevance, seasonal system running smoothly at 8 per year.

---

## Phase 4 — Cinematic

**Theme:** Make transformation visible as a story — not just a dashboard.

**Goal:** Build the cinematic layer that makes STREM feel unlike anything else in the space and creates the deepest possible emotional attachment.

Candidates:

**Video Generation**
- Cinematic weekly recaps: 30–60 second auto-generated personalized recap video (stats, coach narration, cinematic score)
- Transformation montage: monthly or milestone-triggered longer-form montage
- Tribe challenge highlights: auto-generated tribe challenge recap video
- Quarterly journey summaries: "your transformation story" video
- Season trailers: AI-generated personalized season trailer at each season launch

**The Chronicle**
- User's permanent, auto-curated transformation story
- Narrative document: key moments, rank advancements, medals, tribe milestones — written in coach voice
- Exportable and permanent. Deleting the app does not delete The Chronicle.

**AI Avatar Evolution**
- Stylized athletic identity marker that evolves with rank and achievement
- Distinctive aesthetic, not game character
- Seasonal cosmetics earned permanently during active seasons

**Advanced AI Orchestration**
- Multi-agent system: training agent, nutrition agent, recovery agent operating in coordination under the orchestrator
- Deeper personalization across all pillars simultaneously

**Ecosystem Expansion**
- STREM Academy (training education content)
- STREM Labs (experimental features)
- STREM events (in-person and virtual)
- Advanced marketplace: meal prep, equipment, partner integrations

---

## Expansion Gate (All Phases)

Each phase requires evidence before the next phase begins:

- retention improves
- user trust remains high (no negative pattern in qualitative feedback or user-reported identity shift)
- support burden is manageable
- security and privacy risk is controlled
- service boundaries remain clear and understandable
- the product has not drifted toward generic fitness tracking

Build the Foundation. Earn Identity. Then Immersion. Then Cinematic.

In that order. No shortcuts.

See `product/future-immersion.md` for the full long-arc vision. See `product/game-systems.md` for game system specification by phase.
