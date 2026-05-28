# Game Systems — Transformation Engine

STREM's game systems are not entertainment mechanics. They are behavioral architecture designed to make identity change visible, measurable, and emotionally real. Every mechanic exists to answer one question: does this make the user feel more like the person they are becoming?

This is identity engineering through disciplined progression — not a fitness points scheme.

See also: `vision/transformation-psychology.md` for the behavioral science behind these decisions.

---

## Why Game Systems Belong Here

Users who feel progress are users who return. Users who feel stuck churn silently.

The problem with most fitness apps is that progress is invisible or fragmented: a streak counter here, a chart there, a badge that feels meaningless. STREM's game systems make the entire transformation arc — across strength, endurance, nutrition, recovery, tribe, and discipline — visible as a single evolving identity.

The design principle: every interaction should leave the user feeling more like the athlete and disciplined person they want to become. If a mechanic makes them feel weaker, judged, or manipulated, it does not belong.

---

## Character Evolution Framework

Each user has a STREM Identity that evolves based on consistent action across five pillars:

| Pillar | What It Measures |
|--------|-----------------|
| Movement | Training sessions, running sessions, mobility work |
| Nutrition | Logged meals, daily nutrition consistency |
| Recovery | Recovery logs, sleep notes, rest days |
| Tribe | Check-ins, contributions, challenge participation |
| Discipline | Consistency streaks, mission completion, habit adherence |

Pillar activity feeds XP. XP determines rank. Rank represents who the user is becoming — not just what they have tracked.

The character does not regress when users miss days. Transformation is cumulative. The system tracks the best version of the user's consistency, not their worst.

---

## XP Economy

### Sources and Weights

XP is earned through meaningful behaviors. XP represents effort, discipline, and growth — not engagement time or clicks.

| Action | XP |
|--------|----|
| Strength/training session logged | 50 XP |
| Running session logged | 40 XP |
| Mobility or active recovery logged | 30 XP |
| Nutrition day fully logged | 25 XP |
| Tribe check-in completed | 20 XP |
| Recovery day logged | 20 XP |
| Mission completed (text-only, MVP) | 75–150 XP |
| Challenge completed (individual) | 100–300 XP |
| Challenge completed (tribe) | 150–500 XP |
| 7-day consistency streak bonus | 200 XP |
| 30-day consistency streak bonus | 1,000 XP |
| 90-day consistency streak bonus | 5,000 XP |
| Rank advancement | 500–2,000 XP acknowledgment (narrative, not added XP) |

### XP Design Principles

- XP never decreases. Missed days slow progression but do not remove earned proof.
- XP weights intentionally reward variety: training only, running only, or nutrition only is slower than multi-pillar engagement.
- Tribe participation is explicitly valued. Accountability is not optional to the transformation system.
- Streaks are bonuses, not the core mechanic. Users who log inconsistently still earn meaningful XP per session.
- XP is displayed as a cumulative number and as progress within the current rank. Both views matter: total XP shows the full journey, rank progress shows what is immediately ahead.

### What XP Is Not

XP is not a manipulation tool. STREM does not use variable reward manipulation, dark patterns, or artificial XP inflation to drive compulsive behavior. XP should feel proportional to real effort. If users feel the system is dishonest, the identity mechanic collapses.

---

## Levels and Ranks

Ranks are named identity stages, not arbitrary numbers. Each name is chosen to reflect a real phase of transformation.

### The Seven Ranks

| Rank | XP Range | Identity |
|------|----------|----------|
| Initiate | 0–999 | Beginning the path. Establishing the first habits. |
| Builder | 1,000–4,999 | Foundations forming. Consistency becoming possible. |
| Forged | 5,000–14,999 | Tempered by repetition. Identity starting to solidify. |
| Hybrid | 15,000–39,999 | Balancing multiple domains. The hybrid athlete emerges. |
| Warrior | 40,000–99,999 | Proven through hardship and return. A serious commitment. |
| Titan | 100,000–249,999 | Elite transformation. Rare consistency over months and years. |
| Ascended | 250,000+ | Living proof of the STREM philosophy. A different kind of person. |

### Rank-Up Experience

Reaching a new rank is a meaningful moment, not a pop-up notification. The AI coach delivers a personalized narrative message acknowledging what the user has built — referencing their specific activity patterns and pillar strengths — and sets the expectation for what comes next.

Rank-up is one of the few moments where STREM should feel cinematic.

### Path Ranks (V2 — after MVP)

At Warrior rank and above, users who demonstrate dominant pillar activity earn a secondary path identity alongside their rank:

| Path Rank | Earned By |
|-----------|-----------|
| Iron Mind | Dominant discipline pillar: high mission completion, habit consistency, recovery focus |
| Mountain Runner | Dominant movement pillar: running and endurance volume |
| Iron Body | Dominant movement pillar: strength training volume and consistency |
| Tribe Anchor | Dominant tribe pillar: consistent check-ins, challenge leadership, peer encouragement |
| Iron Nutrition | Dominant nutrition pillar: long-term consistent logging |

Path ranks are supplementary identity markers, not a replacement for the primary rank. They appear on the user's profile alongside their rank. They reflect the athlete the user has actually become, not just total XP.

Path ranks are V2 only. Do not build in MVP.

---

## Medals and Achievements

Medals are earned, difficult, and identity-building. They are not participation trophies.

The design principle: a medal should feel like a real athletic achievement. Rare is better than abundant. Users should feel genuine pride when earning a medal — not mild satisfaction from a pop-up.

### MVP Medal Set (10 Medals)

These 10 medals ship with MVP. They cover the core transformation arc.

| Medal | Earn Condition |
|-------|---------------|
| First Steps | Complete your first training or running session log |
| Committed | Log 7 consecutive days (any combination of pillars) |
| Tribe Member | Join a tribe and complete your first check-in |
| Iron Week | Log training AND running AND nutrition in the same week |
| 30-Day Mark | Reach 30 days of active engagement (not necessarily consecutive) |
| Accountability Anchor | Complete 14 tribe check-ins total |
| Nutrition Consistent | Log nutrition for 14 days in a row |
| First Mile | Log your first running session |
| First Iron | Log your first strength training session |
| Identity Forged | Complete full onboarding and remain active for 30 days |

### Full Medal Catalogue (V2+)

Expanded medal set for Version 2:

**Endurance Milestones**
- First 5K (logged running session reaching or exceeding 5km)
- First 10K
- First half-marathon distance
- 100K Month (cumulative running distance in a calendar month)
- The Long Game (500km cumulative running logged)

**Strength Milestones**
- 30-Day Iron (30 consecutive days with at least one strength session)
- The Grind (100 strength sessions logged total)

**Discipline Awards**
- Unbreakable (365-day streak — any combination of pillars — a lifetime achievement)
- The Comeback (return to active logging after a 14+ day gap and log 7 days straight)

**Recovery Awards**
- Iron Rest (30 days of logged recovery)
- Body Aware (log recovery the same day as an intense session, 10 times)

**Tribe Awards**
- Tribe Founder (create a tribe)
- Tribe Champion (complete a tribe challenge)
- Tribe Legend (complete 5 tribe challenges, any type)

**Transformation Milestones**
- The Ascent (reach Titan rank)
- Ascended (reach Ascended rank — rare, high-status, permanent)

### Medal Display

Medals are displayed on the user's profile. Earned medals are shown in full color. Locked medals are visible but greyed with the earn condition — the proximity effect drives aspiration without shame.

---

## Missions System

Missions are the primary AI-generated behavioral objectives. They are not just workout prescriptions. They cover all pillars of transformation.

### Mission Philosophy

A mission asks: what is the one behavioral commitment that will most move the user toward their identity goal this week?

Missions bridge the gap between logging (what the user did) and transformation (who the user is becoming). The AI coach generates missions based on context — it does not just repeat the same generic targets.

### Mission Types

| Type | Focus | Example |
|------|-------|---------|
| Performance | Training or running output | "Complete 3 strength sessions and log each one." |
| Recovery | Rest, sleep, mobility | "Log recovery on your two hardest training days this week." |
| Tribe | Accountability engagement | "Check in with your tribe every day for 5 days." |
| Discipline | Habit and consistency | "Log every day this week, no matter how small the action." |
| Nutrition | Consistency and quality | "Log your nutrition for 5 of 7 days this week." |
| Hybrid | Multi-pillar objective | "Run twice, lift twice, and log nutrition for 4 days." |

### Mission Generation (MVP)

MVP missions are generated weekly, text-only. The AI coach creates 1–3 missions per user based on:

- last 14 days of training logs
- last 7 days of nutrition logs
- last 7 days of tribe activity
- current rank and XP position
- past mission completion rate
- stated identity goal from onboarding

Missions are structured objects with: title, description, duration (in days), XP reward, type, and completion condition. They are stored and tracked — not just chat messages.

Mission difficulty is adaptive: users who consistently complete missions receive harder targets; users who miss missions receive smaller, re-entry-focused missions.

### Mission Completion

When a mission is completed, the AI coach delivers a narrative completion acknowledgment — connecting the achievement to the user's stated identity. XP is awarded automatically.

When a mission is not completed, there is no punishment. The coach sends a gentle acknowledgment and generates a scaled-down re-entry mission.

### Mission States

- Active: In progress, not yet expired
- Completed: All conditions met, XP awarded
- Expired: Time elapsed without completion, no punishment, re-entry offered
- Skipped: User explicitly passes (no shame, no XP loss)

---

## Challenges System

Challenges are finite-duration goals with a defined completion condition. They are central to STREM's identity system.

### Challenge Types (MVP — 2 types)

**Individual Discipline Challenges**

User commits to a personal challenge with a defined scope and duration.

Examples:
- 7-Day Discipline: Log at least one action across any pillar every day for 7 days
- 30-Day Commitment: Log training, nutrition, or recovery for 30 of 31 days
- First 5K: Log a running session of 5km or more within 14 days

**Tribe Collective Challenges**

The tribe commits to a shared goal. Collective XP is earned by the tribe.

Examples:
- Tribe Effort: Tribe collectively logs 50 training sessions in 2 weeks
- Tribe Distance: Tribe collectively logs 100km of running in a month
- Accountability Pact: All tribe members check in every day for 7 days

### Challenge States

- Active: In progress
- Completed: Conditions met, medals and XP awarded
- Failed: Time elapsed without completion (no punishment, restart offered)
- Abandoned: User or tribe explicitly withdraws

No shame mechanics on failed challenges. The system should offer a lower-stakes restart, not a penalty screen.

### Future Challenge Types (V2+)

- Tribe vs. Tribe: Two tribes compete on a shared metric (total distance, total sessions, collective XP)
- Global STREM Events: Monthly platform-wide flagship challenges (e.g., "STREM Iron October — 50 sessions in 31 days")
- AI-Generated Personal Challenges: Dynamically created by AI coach based on user trajectory and gap analysis
- Seasonal Challenges: Exclusive to the current season, with seasonal medals

---

## Immersive Seasons (V2+)

Seasons are the long-arc transformation experience. They give users a narrative container for their effort — a reason to train through December, not just when motivation is high.

### Season Philosophy

Each season is an 8–12 week thematic transformation arc with a name, visual identity, exclusive challenge set, XP bonuses, and narrative progression. Seasons feel like chapters in the user's story — not promotional campaigns.

Seasons are not MVP. They require the full XP system, rank system, and tribe system to be operational first. Do not build seasons until MVP retention is validated.

### Season Examples

| Season Name | Theme | Duration |
|-------------|-------|----------|
| Iron October | Strength and discipline — build before winter | 8 weeks |
| Winter Ascension | Endurance and mental fortitude — run through the dark | 10 weeks |
| Mountain Arc | Hybrid athlete challenge — build strength and distance simultaneously | 12 weeks |
| Spartan Rebuild | Recovery and foundation — repair, rest, rebuild | 8 weeks |
| Hybrid Foundation | All-pillar balanced challenge — the complete athlete | 10 weeks |
| Iron Summer | Peak conditioning — highest intensity season | 10 weeks |

### Season Structure

Each season contains:
- A named thematic identity (what this season is about)
- A visual palette (unique UI color, imagery, typography accent)
- A flagship challenge available to all users
- A tribe-specific season mission
- XP multiplier bonuses for the season's focus pillar
- Exclusive medals available only during the season
- An AI coach narrative that adapts to the season theme ("We're in Iron October. This is the month you build what others can't.")

### Season Progression

Users advance through the season arc by earning XP, completing missions, and completing challenges. The further they progress, the more exclusive the achievements they can unlock.

Season medals are permanent — they cannot be earned after the season ends. This creates healthy motivation without artificial urgency.

---

## Anti-Patterns and Boundaries

The game system must never:

- Remove XP or lower ranks as punishment for missed days
- Show public shame mechanics (leaderboards without opt-in, missed-day notifications to others, public failure states)
- Award XP for passive behaviors (opening the app, watching content, clicking buttons)
- Inflate XP to make the system feel generous — honesty is the foundation of trust
- Build seasonal features or path ranks before MVP retention is validated
- Confuse entertainment gamification with identity engineering

The test for every game mechanic: does this help the user build a real, lasting identity as a stronger, more disciplined person? If the answer is uncertain, the mechanic does not belong in the system.

---

## MVP Game System Scope

| Mechanic | MVP | V2 | V3+ |
|----------|-----|-----|-----|
| XP system (all sources) | Yes | — | — |
| 5 base ranks (Initiate → Warrior) | Yes | — | — |
| 10 milestone medals | Yes | — | — |
| Text missions (weekly, AI-generated) | Yes | — | — |
| Individual discipline challenges | Yes | — | — |
| Tribe collective challenges | Yes | — | — |
| Full 7-rank system (Titan, Ascended) | — | Yes | — |
| Path ranks (Iron Mind, Mountain Runner, etc.) | — | Yes | — |
| Full medal catalogue (30+ medals) | — | Yes | — |
| Tribe vs. tribe challenges | — | Yes | — |
| Global STREM events | — | Yes | — |
| Immersive seasonal arcs | — | Yes | — |
| AI-generated personal challenges | — | Yes | — |
| Seasonal exclusive medals | — | Yes | — |
| Audio mission briefings | — | — | Yes |
| Cinematic rank-up sequences | — | — | Yes |
| Avatar evolution | — | — | Yes |

---

## XP Service Architecture Note

XP events are fired from multiple services (training, nutrition, community). To ensure consistency and prevent drift, XP must be tracked in a single progression ledger. In MVP, this belongs inside `strem-user-service` as a progression module. If progression complexity grows substantially in V2, extract to a dedicated `strem-xp-service`.

XP is identity data. Treat it with the same integrity as training logs — with backup, audit trail, and no silent modifications.
