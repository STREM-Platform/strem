# Feature Map

This map separates MVP transformation mechanics from future ecosystem systems. It exists to prevent scope creep and category drift.

STREM's MVP features are not valuable because they are trackers. They are valuable only if they reinforce identity, consistency, and accountability.

---

## MVP Systems

### Identity And Onboarding

- account creation
- profile setup
- transformation goal capture
- identity statement (who are you becoming?)
- training level capture
- preferred training modalities
- nutrition preference capture
- tribe preference capture

Target onboarding completion time: under 5 minutes. Onboarding must feel like the start of a transformation arc, not a registration form.

### Training And Running

- training session log
- running session log
- weekly training summary
- basic progress history
- simple proof-of-consistency history

### Nutrition

- basic meal logging
- daily nutrition notes
- simple adherence reflection

Future macro detail, photo logging, grocery automation, and meal planning are not MVP requirements.

### Basic AI Transformation Coach

- summarize recent activity across all pillars
- connect actions to the user's chosen identity goal
- identify friction patterns and missed-day signals
- suggest next action
- generate weekly missions (structured objects, not chat messages)
- reflect missed logs without shame
- answer bounded transformation and performance questions
- escalate health-risk situations to professional advice
- deliver weekly narrative coaching recap (Sunday delivery)

See `architecture/ai-architecture.md` for mission generation pipeline, behavioral adaptation engine, and safety escalation specification.

### Small Accountability Tribes

- tribe creation (invite-only)
- tribe membership (4–8 members, hard cap 10)
- daily structured check-in prompt
- shared tribe collective XP (Tribe Power)
- AI-generated weekly tribe summary
- accountability nudge for inactive members
- tribe challenge participation
- basic admin tools (invite, remove, report)

See `product/tribe-design.md` for full tribe specification.

### Game And Progression Layer — MVP

The game progression layer is a core MVP system, not a future phase addition. It makes transformation visible and emotionally real.

| Mechanic | MVP Specification |
|----------|--------------------|
| XP System | Earn XP across 5 pillars (movement, nutrition, recovery, tribe, discipline). No decay. 7-day and 30-day streak bonuses. |
| Rank System | 5 ranks: Initiate → Builder → Forged → Hybrid → Warrior. Rank displayed on profile. AI coach rank-up message. |
| Mission System | AI-generated weekly missions (1–3 per week). 6 mission types. Structured objects. Completion tracked and XP awarded. |
| Challenge System | 2 types: individual discipline challenge + tribe collective challenge. |
| Medal System | 10 milestone medals. Earned medals permanent. Unearned medals visible as aspiration. |

---

## Phase 2 — Identity Deepening

Full game progression and seasonal arc system.

| Feature Area | Phase 2 Scope |
|-------------|---------------|
| Progression depth | Titan (rank 6) and Ascended (rank 7) added |
| Path ranks | Iron Mind, Mountain Runner, Iron Body, Tribe Anchor, Iron Nutrition |
| Expanded medals | Full catalogue: 30+ medals across endurance, strength, discipline, recovery, tribe, transformation |
| Seasonal arcs | Launch: 2 seasons per year. 8–12 week arcs with thematic identity, exclusive challenges, XP multipliers |
| Tribe discovery | Public tribe browsing by theme. AI-assisted matching. |
| Tribe vs. tribe | Competing tribes on distance, sessions, or collective XP |
| Tribe leaderboard | Tribes ranked by Tribe Power within tier |
| Global STREM Events | Monthly flagship challenges available to all users |
| AI-generated personal challenges | Dynamically created by AI coach based on trajectory and gap analysis |
| Seasonal challenges | Exclusive to active seasons. Medals permanent after season ends. |
| Advanced AI missions | Multi-week connected mission arcs |
| Behavioral adaptation maturation | Burnout detection, milestone-proximity nudges, sophisticated re-engagement |
| Accountability notifications | Milestone proximity alerts, tribe activity nudges |
| Recovery signals | Recovery-aware recommitment, recovery pillar expansion |
| Richer AI coach memory | Multi-week pattern recognition, identity arc narration |

### Phase 2 Anti-Scope

Phase 2 does not include:
- audio generation
- video generation
- wearable deep integration
- coach marketplace
- payments infrastructure

---

## Phase 3 — Immersion

Audio layer, wearable integration, and mature seasonal system.

| Feature Area | Phase 3 Scope |
|-------------|---------------|
| Audio missions | Pre-session AI-generated mission briefings |
| Running audio guidance | Real-time coaching audio during runs |
| Recovery meditations | AI-generated guided recovery and breathwork |
| Transformation audio recaps | Weekly narrative audio summary |
| AI mentor personalities | Stoic, Mountain Guide, Sparring Partner, Builder, Iron Coach |
| Wearable integration | Apple Watch, Garmin, Whoop, Oura, COROS |
| HRV-aware coaching | Missions adapt to physiological readiness in real time |
| Training load management | Proactive deload prescriptions |
| Seasonal system maturation | 8 seasons per year. Full narrative arcs. Season trailers. |
| Coach marketplace (early) | Verified coach profiles. Coach-led tribes. Paid programs. |

---

## Phase 4 — Cinematic

Video generation, The Chronicle, and avatar evolution.

| Feature Area | Phase 4 Scope |
|-------------|---------------|
| Cinematic weekly recaps | 30–60 second auto-generated personalized recap videos |
| Transformation montage | Monthly milestone cinematic montage |
| Tribe challenge highlights | Auto-generated tribe challenge recap video |
| Quarterly journey summaries | "Your transformation story" video |
| Season trailers | AI-generated personalized season trailer at launch |
| The Chronicle | User's permanent, auto-curated narrative transformation story |
| AI avatar evolution | Stylized athletic identity marker evolving with rank and achievements |
| Advanced AI orchestration | Multi-agent coordination (training, nutrition, recovery, moderation agents) |
| Ecosystem expansion | STREM Academy, STREM Labs, STREM events, advanced marketplace |

---

## Later Ecosystem

Features that require sustained retention, trust, and business maturity before introduction:

- meal-prep marketplace
- coach marketplace (full)
- creator marketplace
- supplements
- advanced wearable analytics
- STREM Academy (education content)
- STREM Labs (experimental)
- STREM events (in-person and virtual)
- advanced RAG and agent orchestration
- web app
- admin dashboards

---

## Explicit Anti-Features

Do not prioritize, now or ever:

- calorie precision as the main value proposition (nutrition exists to support identity, not to enable calorie obsession)
- public feeds and follower mechanics (tribe over social media)
- generic dashboards without behavior change (data without transformation)
- generic AI chat detached from user logs, identity, and missions (chatbots are not coaches)
- service creation without validated product pressure (no empty repositories)
- session-time or daily-open optimization (these are not transformation metrics)
- manufactured urgency or scarcity (all scarcity in STREM is real and honest)

---

## Service Mapping

| Domain | Service |
|--------|---------|
| Authentication | `strem-auth-service` |
| Profiles, onboarding, XP ledger, rank, medals | `strem-user-service` |
| Training and running logs | `strem-training-service` |
| Nutrition logs | `strem-nutrition-service` |
| Tribes, check-ins, Tribe Power, challenges | `strem-community-service` |
| AI coach, missions, behavioral adaptation | `strem-ai-orchestrator` |
| Mobile experience | `strem-mobile` |
| External entrypoint | `strem-api-gateway` |
| Contracts | `strem-shared-contracts` |
| Local and deployment infrastructure | `strem-infra` |
