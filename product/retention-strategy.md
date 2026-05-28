# Retention Strategy

STREM's early business viability depends on transformation retention, not feature volume.

---

## Retention Thesis

Users return when the product helps them feel:

- clear about what to do next
- proud of visible progress
- connected to people who expect them back
- supported after missed days
- guided without being overwhelmed
- emotionally attached to the person they are becoming

See `vision/transformation-psychology.md` for the behavioral science foundation. The mechanics below are applications of those principles, not arbitrary product choices.

---

## The Core Retention Loop

```
Log → earn XP + receive AI coaching → feel progress → complete mission
→ earn medal or rank advancement → connect with tribe → return to log
```

This is not engagement bait. It is the behavioral architecture of identity-based transformation.

Each step in the loop serves a specific psychological function:

- **Logging** is the act of identity proof. It says: "I am someone who takes this seriously."
- **XP + AI coaching** converts the proof into visible progress and narrative reinforcement.
- **Mission completion** adds directed agency — the user isn't just logging randomly, they are advancing toward an objective.
- **Medals and rank advancement** create identity investment — psychological sunk cost in the evolving self.
- **Tribe connection** adds social accountability — belonging to people who expect you back.
- **Return** is the only output that matters. Everything else is in service of this.

---

## Progression As Identity Investment

Each XP earned, each level reached, each medal unlocked represents psychological investment in the user's evolving identity. Stopping feels like abandoning a version of yourself you have already proven is real.

This is not manipulation. It is the honest consequence of real effort. Users who have logged 300 sessions and reached Warrior rank have genuinely built something. The product reflects that reality back to them clearly.

The key design implication: progression must feel earned, not inflated. If XP is given away cheaply, it loses its identity signal. If medals are too easy, they lose their achievement weight. The system must be honest — or the identity investment collapses.

---

## MVP Retention Loop

1. Onboarding creates a chosen identity and first commitment.
2. Logs create visible proof of that identity.
3. AI transformation coach converts proof and friction into missions, next systems, and narrative coaching.
4. Tribe creates social accountability without social noise.
5. Game progression (XP, ranks, medals) makes the full transformation arc visible over time.
6. Weekly reflection reinforces the user's story of change.

---

## Product Mechanics

### Fast First Value

Users should reach their first meaningful experience quickly:

- first identity statement in onboarding
- first log
- first XP earned
- first AI coach response
- first mission generated
- first tribe check-in

Target: first meaningful action within 10 minutes of account creation.

Every step added to this path is a retention risk. The faster users feel something real, the more likely they return.

### Flexible Consistency

STREM must avoid punishing users for real life. Missed days trigger recovery and recommitment — not shame.

When a streak breaks, the AI coach sends a compassionate re-entry message: "You maintained a 23-day streak. That was real. Let's build the next one." The coach then generates a smaller, achievable re-entry mission — not a guilt-trip about what was missed.

Users who feel punished by an app develop avoidance behavior: they stop opening it. Compassionate accountability serves retention better than punitive loss mechanics.

### Milestone Proximity Effect

The AI coach proactively surfaces progress at meaningful moments:

- "You're 3 sessions away from reaching Forged rank."
- "Your tribe is 50km away from completing their challenge."
- "One more logged day completes your 7-day streak bonus."

Proximity to milestones drives action. The behavioral science is consistent: humans accelerate effort as they approach a goal. STREM should surface these moments intentionally, not leave users to discover them accidentally.

### Tribe Retention

The social contract of the tribe is the strongest retention mechanism in the system. Users who miss days are letting their tribe down — not just missing a personal goal. This is accountability without shame because it is voluntary and relational, not algorithmic and punitive.

Tribe retention works through:
- **Passive visibility**: seeing your tribe log activity creates behavioral pressure without direct pressure
- **Active encouragement**: tribe members can send encouragement when a member goes quiet
- **Collective XP**: the tribe's Tribe Power grows with each member's contribution, creating shared identity investment
- **Shared challenge progress**: collective challenges make individual effort visibly meaningful to the group

See `product/tribe-design.md` for full tribe accountability mechanic specification.

### Tribe Rituals

Tribes should have lightweight, consistent rituals:

- daily check-in prompt (optional, not mandatory)
- weekly tribe summary (AI-generated, delivered Sunday)
- active challenge progress tracking
- encouragement messages on milestone achievements

Rituals create temporal anchors — habitual moments when users engage with the product as part of a social routine, not because they consciously decided to open an app.

### AI Coach Reflection and Narrative

The AI coach does two things beyond data analysis:

1. **Pattern recognition**: summarizes multi-week behavioral patterns, identifies friction, names the gap between current behavior and stated identity goal
2. **Narrative coaching**: connects recent behavior to the user's longer arc, writes the user's progress as a story, not a report

"Week 12. You've logged your strongest running month yet — 45km, up from 28km in month one. You're not the same person who started in January. Next week: the endurance challenge that pushes you to Hybrid rank."

This is the coaching that creates emotional attachment to the product — because the product knows the user's story and reflects it back with clarity and honesty.

The weekly coaching reflection is delivered every Sunday. It is the product's most important retention mechanism in the MVP phase.

### Streak Mechanics Done Right

Streaks leverage loss aversion psychology — humans feel the potential loss of a streak more strongly than the gain of continuing it. But this same dynamic, misused, produces shame and avoidance.

STREM's streak design:
- **Building streaks generates positive XP bonuses** (7-day: 200 XP, 30-day: 1,000 XP, 90-day: 5,000 XP) — building feels rewarding
- **Breaking streaks does not remove XP or generate punishment** — missing a day does not undo what was built
- **The system focuses on rebuilding** — the AI coach sends a compassionate message and offers a smaller re-entry mission
- **Streaks represent best-case consistency**, not the norm — users who log 4 days a week still make real progress

The test: does a missed day make the user want to re-engage, or does it make them feel the product has judged them? Only the former serves retention.

### Season FOMO (V2+)

Seasonal challenges with exclusive medals create earned scarcity. A medal earned during Iron October cannot be earned after Iron October ends. This is healthy competitive pressure: the desire to participate in something meaningful while it exists.

Season FOMO is distinct from dark pattern FOMO: the scarcity is real (the season genuinely ends), the value is real (the medal represents real effort during a defined arc), and no manufactured urgency is used to manufacture pressure.

---

## Anti-Patterns

Avoid:

- noisy or guilt-based notifications
- follower-count mechanics and public vanity metrics
- shame-based streak systems (punishing missed days instead of celebrating return)
- complex dashboards before habit formation is proven
- excessive onboarding questions (target: under 5 minutes)
- premature marketplace features before trust and retention are established
- optimizing for session time or daily opens (these are not transformation metrics)

---

## Metrics

### Primary (Transformation Signals)

- D1 retention
- D7 retention
- D30 retention
- Weekly active loggers
- Average logged days per active user per week
- XP earning rate (are users engaging across multiple pillars?)
- Rank progression rate (are users advancing through the progression system?)

### Supporting (Leading Indicators)

- Onboarding completion rate and time
- Time to first log
- AI transformation coach interaction rate and weekly recap open rate
- Mission generation and completion rate
- Tribe participation rate (check-ins per active member per week)
- Missed-day recovery rate (percentage of users who return after a 3+ day gap)
- Medal earning rate (are users hitting meaningful milestones?)
- Weekly reflection completion

### Qualitative

- User-reported discipline improvement
- User-reported identity shift ("I am becoming the person I want to be")
- Tribe quality signals: are check-ins substantive? Is participation distributed or dependent on one member?

### What We Do Not Optimize For

- Raw session time or screen time
- Daily active user count without retention context
- Feature click rate
- Social content creation volume
- Notification open rate (this measures disruption, not transformation)
