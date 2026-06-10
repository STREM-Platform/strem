# MVP Scope

> **Implementation status:** the MVP scope below is **built** end-to-end (auth,
> onboarding, training/nutrition logging, AI coach + missions + recap, tribes +
> check-ins + challenges, XP/ranks/medals/streaks). Several Phase-2 items have
> also shipped. See [`implementation-status.md`](implementation-status.md) for the
> capability-by-capability status.

The MVP is intentionally narrow. STREM has a large ecosystem vision, but the first release must prove one thing: users return because STREM helps them behave like the person they are trying to become.

The MVP is not a miniature version of the full platform. It is a test of the transformation loop:

identity → daily proof → AI reflection → tribe accountability → return.

---

## Included

### Authentication

Users can create an account, sign in, sign out, and maintain a secure session.

### User Profiles

Users can define basic transformation identity and preference data:

- name
- age range or date of birth if legally required later
- transformation goal
- identity statement
- training level
- preferred training modalities
- nutrition preferences
- community preferences

### Onboarding

Onboarding captures enough information to personalize the first experience without overwhelming the user.

The onboarding outcome is a clear starting identity, a first small commitment, and the first recommended actions.

Target completion time: under 5 minutes. Onboarding must feel like the beginning of a transformation arc, not a registration form.

### Training Log

Users can log strength and general training sessions. The MVP should capture enough structure to create daily proof and useful summaries without building a full exercise science platform.

### Running Log

Running belongs inside `strem-training-service` for the MVP. It should not become a separate endurance service yet.

### Nutrition Log

Users can log basic meals and daily nutrition behavior. The MVP should prioritize consistency, reflection, and identity alignment over perfect macro automation.

### Basic AI Transformation Coach

The AI transformation coach provides simple summaries, friction analysis, encouragement, next-step suggestions, and weekly mission generation using available user logs and onboarding data.

It must not provide medical diagnosis, injury diagnosis, or unsafe certainty.

See `architecture/ai-architecture.md` for mission generation, behavioral adaptation, and safety escalation specification.

### Small Accountability Tribes

Users can join small accountability tribes. The MVP tribe system supports belonging, daily check-ins, tribe XP, and respectful accountability — not broad social networking.

See `product/tribe-design.md` for full tribe specification.

### Game Progression — MVP Tier

The MVP includes the minimum viable version of the identity progression system. These mechanics are not optional additions — they are core to making transformation visible and emotionally real.

**XP System (MVP)**

Users earn XP for meaningful behaviors across all transformation pillars. XP represents proof of discipline and identity growth — not engagement points.

Core MVP XP sources:
- Training session logged: 50 XP
- Running session logged: 40 XP
- Mobility or recovery logged: 30 XP
- Nutrition day logged: 25 XP
- Tribe check-in completed: 20 XP
- Mission completed: 75–150 XP
- Individual challenge completed: 100–300 XP
- Tribe collective challenge completed: 150–500 XP (distributed to participating members)
- 7-day consistency streak bonus: 200 XP
- 30-day consistency streak bonus: 1,000 XP

XP never decreases. Missed days slow progression — they do not punish it.

**Level System (MVP — 5 Ranks)**

MVP ships with five ranks covering the first major transformation arc:

| Rank | XP Range |
|------|----------|
| Initiate | 0–999 XP |
| Builder | 1,000–4,999 XP |
| Forged | 5,000–14,999 XP |
| Hybrid | 15,000–39,999 XP |
| Warrior | 40,000–99,999 XP |

Rank-up triggers a personalized AI coach message acknowledging what the user has built. Rank is displayed on the user profile.

**Missions (MVP)**

The AI coach generates 1–3 text-based missions per week for each user. Missions cover all transformation pillars (movement, nutrition, recovery, tribe, discipline) — not only training.

Missions are structured objects (title, description, duration, XP reward, type, completion condition) — not chat messages.

See `product/game-systems.md` for mission types and generation specification.

**Challenges (MVP — 2 Types)**

- Individual discipline challenge: personal commitment with a defined scope and duration
- Tribe collective challenge: the tribe commits to a shared goal

**Medals (MVP — 10 Medals)**

Ten milestone medals covering the core transformation arc. See `product/game-systems.md` for the full MVP medal set.

Medals should feel earned and identity-building. Not participation trophies.

---

## Excluded From MVP

Do not include in MVP:

**Game System (Future Phases)**
- Titan and Ascended ranks (V2 — ranks 6 and 7)
- Path ranks: Iron Mind, Mountain Runner, Iron Body (V2)
- Full medal catalogue with 30+ medals (V2)
- Immersive seasonal arcs (V2)
- Tribe vs. tribe challenges (V2)
- Global STREM events and monthly flagship challenges (V2)
- AI-generated personal challenges (V2)
- Seasonal exclusive medals (V2)

**Audio and Video (Future Phases)**
- AI audio mission briefings (V3)
- Running guidance audio (V3)
- Recovery meditations and breathwork (V3)
- AI mentor voice personalities (V3)
- Cinematic weekly recap videos (V4)
- Transformation montage videos (V4)
- AI avatar evolution (V4)
- The Chronicle (V4)

**Platform Ecosystem (Future Phases)**
- Supplements marketplace
- Coach marketplace and coach dashboards
- Advanced wearables integration
- Advanced analytics dashboards
- Advanced social network features
- Meal-prep marketplace and grocery automation
- Payments and subscription infrastructure
- Admin dashboards
- Web app
- Complex dashboards and reporting suites
- Follower counts and public vanity metrics
- Generic AI chat without transformation context

---

## MVP Acceptance Criteria

The MVP is ready to expand only when:

- users reliably complete onboarding
- users log multiple days per week
- the AI transformation coach increases clarity, recommitment, or return behavior
- tribes show meaningful participation (check-ins, collective challenge attempts)
- users recover after missed days instead of silently churning
- users are earning XP and progressing through ranks (indicating the progression system is working)
- retention data supports continued investment

---

## Expansion Rule

A future feature must either improve retention, increase monetization without damaging trust, or unlock a validated strategic phase. Otherwise it waits.

The order matters: prove the transformation loop first. Then deepen progression. Then add immersion. Then add the cinematic layer.

See `product/roadmap.md` for the full phase sequence.
