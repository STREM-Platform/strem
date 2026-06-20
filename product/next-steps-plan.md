# STREM — Next-Steps Plan

_Created 2026-06-19. The strategic view after the Forge agent backend shipped._
_Pairs with [`implementation-status.md`](implementation-status.md) (what's built) and
[`social-competition-plan.md`](social-competition-plan.md) (the social mechanics below)._

This plan is governed by the **Anti-Roadmap Principle** ([`roadmap.md`](roadmap.md)):
every item must deepen **identity, accountability, or progression**. Where a
competitor feature is generic surface area, we either skip it or reframe it so it
serves the transformation arc. STREM's moat is depth, not breadth.

---

## 1. Where we are

The MVP transformation loop (auth → identity onboarding → log training/running/
nutrition → XP/ranks/medals → weekly AI recap → accountability tribes) is built,
merged, and runs end-to-end. As of 2026-06-19 the **Forge agent backend is live**
across the services: one omniscient, cited, guard-railed agent (context graph +
signals + memory + chat + adaptive plan + insights + live-workout autoregulation +
PR detection + photo/voice capture + consent/autonomy + an Activity feed of
reversible actions), plus **connected-source ingestion** (Whoop/Strava OAuth +
sync, tokens encrypted at rest). The mobile app reaches the live endpoints behind
the `forgeAgentMock` flag (`strem-mobile#57`).

So the build is no longer "MVP vs not built" — the core and most of Phase-2 depth
exist. The work ahead is **completion, trust, premium polish, and the social
competition layer**.

---

## 2. Is the MVP complete? — verdict

**Yes for the core loop.** Every Phase-1 scope item in [`roadmap.md`](roadmap.md)
is shipped, and several Phase-2/3 items were pulled forward (7-rank ladder,
leaderboard, seasons, behavioral adaptation, the whole Forge agent, wearable
ingestion).

**Genuinely still missing / open:**

| Gap | Why it matters | Tracking |
|---|---|---|
| OS push delivery | Re-engagement loop is silent without it | MVP-19 |
| Visual overhaul (imagery, less text density) | First-impression "premium" feel | MVP-20 |
| FE live-endpoint cutover (flip `forgeAgentMock`) | App still on mock data by default | #57 + per-getter follow-ups |
| Wearable → readiness loop closure | We ingest recovery but A4 doesn't read it yet | A3 follow-up |
| **Athlete baseline / deeper intake** (§3.1) | Agent can't coach the whole person | new |
| **Supplements & current stack** (§3.2) | Fuel is blind to what they actually take | new |
| **Biomarker / lab intake + analysis** (§3.3) | Highest-signal health context, untapped | new |
| **Legal & policy** (§3.4) | We ship health guidance with **no ToS / privacy / medical disclaimer** | new (blocks public launch) |
| Social competition (tribe-vs-tribe, 1v1, proof) | Accountability today is intra-tribe only | `social-competition-plan.md` |
| GDPR export / account deletion | Legal + trust | HARDEN-09 |

The two **launch-blocking** items are the **legal/policy framework** (§3.4) and
**GDPR export/delete** — we surface AI health guidance and store sensitive data,
so these are non-negotiable before a public release.

---

## 3. New product requirements (this round)

These came from the founder and all share one thread: **give the agent the whole
person, and earn the trust required to hold that data.**

### 3.1 Athlete Baseline — let Forge understand the whole person

**Problem.** Onboarding is deliberately identity-first and under five minutes
([`onboarding-flow.md`](onboarding-flow.md)) — it captures *who you're becoming*,
not *where you are*. So the agent starts blind to body metrics, training history,
PRs, injuries, equipment, and constraints. That weakens readiness, autoregulation,
mission scoping, and PR detection (a "first" lift looks like a PR when it isn't).

**Design — a progressive Athlete Profile, not a longer onboarding.** Keep
onboarding fast. Add an optional, resumable **"Athlete Profile"** the user
completes after the first session (and that Forge can fill over time via
`writeMemory` whenever the user mentions something):

- **Body & basics:** height, weight (trend, not vanity), age band, sex (for HR/HRV
  norms and load math) — clearly framed as *coaching inputs*, never as a "look"
  metric (A8: no vanity).
- **Training history & PRs:** years training, current PRs per main lift / race
  times. **Seeds the D1/D2 PR baseline** so early PRs are real, and grounds
  autoregulation loads.
- **Injuries & limitations:** so `swapExercise` and plan changes protect the body
  (this capability already exists; today it has nothing to read).
- **Equipment & access:** home/gym/barbell/none → mission and plan feasibility.
- **Dietary constraints:** allergies, preferences → fuel guidance.

**Where:** extend `strem-user-service` profile; surface as a "Complete your athlete
profile" card (post-onboarding, non-blocking) that raises a small XP reward and a
visible "Forge now knows X" confirmation, tying data-sharing to better coaching.
Everything flows into the A6 context graph and is shown under "what your coach
sees" (A7), so the user always controls it.

### 3.2 Supplements & current stack (Fuel)

A Fuel section for **what you take now** — name, dose, timing, purpose
(e.g. creatine 5g daily, whey post-session, magnesium PM). This lets Forge reason
about protein timing, recovery support, and gaps **without prescribing** — the
existing supplement care-redirect in `safety.py` stays: Forge informs and flags,
it never doses or recommends specific products. Stored as a simple per-user list
(`strem-nutrition-service`), surfaced on Fuel, readable by the agent as context.

### 3.3 Biomarkers / blood results → trend analysis (never diagnosis)

The highest-signal, least-tapped health context. Let a user **enter lab values**
(ferritin, vitamin D, lipids, glucose/HbA1c, testosterone, etc.) — manually now,
photo→parse via the capture-vision pipeline later. Forge surfaces **trends and
context**, e.g. *"Your ferritin has trended down over two tests — low ferritin is
common in endurance athletes and can blunt recovery. Worth raising with a
clinician."* It **never diagnoses, never prescribes, always disclaims, and
redirects to a professional** — exactly what the A8 guardrail and the medical
care-redirect already enforce (`safety.py` `_MEDICAL`/`_DIAGNOSIS`). This is gated
behind explicit consent **and** acknowledgement of the medical disclaimer (§3.4),
and the data is a first-class A7 source the user can revoke.

> Design rule: biomarker analysis is **decision-support for a conversation with a
> professional**, not a substitute for one. Every surface says so.

### 3.4 Legal & policy framework — currently missing entirely

There are **no legal documents** in the product today (the `privacy.tsx` screen is
the *agent-consent* UI, not a policy). Shipping AI-assisted health guidance and
storing training, nutrition, recovery, and now **biomarker** data without these is
a launch blocker. We need:

- **Terms of Service** — acceptable use, account, liability.
- **Privacy Policy** — what we collect (incl. wearable tokens, biomarkers), how
  it's used, retention, third parties (Anthropic, Whoop, Strava), and user rights.
- **Medical Disclaimer** — *STREM is not a medical device and not a substitute for
  professional medical advice; coaching, readiness, and biomarker insights are
  estimates and may be wrong; consult a qualified professional.* Surfaced at
  onboarding (explicit accept), before first biomarker entry, and in Profile.
- **Consent & acknowledgement gates** + versioning (re-accept on material change).
- **GDPR export & deletion** (HARDEN-09) — the "export everything / delete my data"
  the Privacy screen already promises in its footer.

This work also closes the loop on the A7 Privacy screen's footer CTA and the
existing no-diagnosis guardrails — it's the trust contract that makes §3.3
responsible to ship.

---

## 4. Premium-quality adjustments

What separates "works" from "feels premium," in priority order:

1. **Close the wearable → readiness loop.** We ingest Whoop recovery (sleep/HRV/
   RHR) but A4 still computes readiness from training load alone. Feeding real
   recovery into `/ai/context` signals is the single biggest credibility upgrade —
   readiness stops being a guess.
2. **Real capture vision.** Swap the honest stub for the Anthropic-vision provider
   (photo→sets, photo→macros) with prompts + evals. The flagship "scan it" moment
   only lands when it actually reads the photo.
3. **Cinematic "moments."** Rank-up, PR, medal, season-start, and challenge-win
   deserve full-screen, haptic, sound-designed moments — the emotional payoff the
   brand promises. Today they're functional, not memorable.
4. **Push delivery (MVP-19).** Without it the proactive agent and tribe nudges are
   mute.
5. **Visual density + imagery (MVP-20).** Less text, more photographic identity;
   the prototype set this direction.
6. **Foundations:** empty/loading/offline states, perceived performance, and
   shareable highlight cards (the recap story-card component already exists — make
   every milestone shareable; organic growth + identity reinforcement).

---

## 5. Competitive gap analysis

What the best apps do, what STREM can learn, and where STREM is already different.
The lens stays the Anti-Roadmap Principle — adopt the *mechanic*, not the
vanity.

| App | Does well | What STREM can take | STREM's edge to keep |
|---|---|---|---|
| **Strava** | Clubs, club challenges, segments/KOM, kudos + activity feed, photos on activities, monthly badges | Team challenges; an **activity feed with lightweight reactions**; **photo proof** on efforts | Identity over leaderboards; no public vanity ranking by default |
| **Apple Fitness** | 7-day ring **competitions between friends**, awards | **1:1 friend competitions** (§social plan) | Framed as shared commitment, not a win/lose scoreboard |
| **Whoop** | Recovery/strain/sleep coaching, **teams**, weekly performance, AI coach, journal | Close the recovery→readiness loop (§4.1); a behavioral **journal** that feeds the agent | One agent across all pillars, not a recovery silo |
| **Hevy / Strong** | Fast set logging, templates/routines, PR history, follow friends' workouts | **Routine/template library**; richer PR surfacing (we just built PR detection) | Autoregulation + coaching, not just a logbook |
| **Fitbod** | AI workouts from recovery + **muscle-fatigue heatmap** | Muscle-load/freshness view feeding plan changes | Cross-pillar (running + nutrition + recovery), not strength-only |
| **Duolingo** (gamification benchmark) | Leagues, streak freeze, **friend quests (co-op)**, daily goal | **Streak protection** (we have compassionate re-entry — make it tangible); **co-op duo challenges** | No dark-pattern guilt; "no shame" is a hard guardrail |
| **Garmin / COROS** | Badges, device challenges, training-load & recovery insights | Connected-source breadth (we have Whoop/Strava; add device families) | Narrative coach, not a data dashboard |
| **Future / Ladder / Centr** | Human coach-led programs, community | Coach marketplace (already Phase-3); program structure | AI omniscient coach at a fraction of the cost |
| **Gentler Streak / Athlytic** | Kind, recovery-aware framing | Tone validation — our no-shame stance is a differentiator, not a compromise | Already core to brand |

**The headline gaps** STREM should close (all reframed to serve accountability,
not vanity): **(a) 1:1 and team competition**, **(b) an activity feed with
reactions**, **(c) proof/authenticity on challenges**, **(d) the recovery→readiness
loop**, **(e) shareable highlights**. (a)–(c) are designed in
[`social-competition-plan.md`](social-competition-plan.md).

**The brand tension to hold:** competition can pull toward shaming and vanity —
the exact things A8 forbids. So every competitive surface is framed as **shared
commitment and celebration**: opt-in, no public loss-shaming, "no-shame" copy,
effort and consistency weighted over raw output, and proof framed as *"show your
work"* pride, not surveillance.

---

## 6. Prioritized roadmap

Three buckets. Sequencing favors **trust and credibility first** (you can't grow
on a health product people don't trust), then **the social layer the founder
asked for**, then immersion.

### Now (launch-readiness & credibility)
1. **Legal & policy framework + GDPR export/delete** (§3.4, HARDEN-09) — launch blocker.
2. **Close the wearable → readiness loop** (§4.1) — make Forge's flagship signal real.
3. **FE live-endpoint cutover** — flip `forgeAgentMock`, wire the remaining getters + the runtime action/autonomy path (sync→async).
4. **Push delivery (MVP-19).**

### Next (depth the founder asked for)
5. **Athlete Baseline / deeper intake** (§3.1) — including PR seeding.
6. **Social competition v1** — **1:1 duels** + **tribe-vs-tribe**, with **proof** (`social-competition-plan.md`).
7. **Supplements & current stack** (§3.2).
8. **Real capture vision** (§4.2) — unlocks photo→biomarker entry too.

### Later (trust-gated depth)
9. **Biomarker / lab intake + trend analysis** (§3.3) — after §3.4 ships.
10. **Cinematic moments + visual overhaul** (§4.3, MVP-20), shareable highlights.
11. **Activity feed with reactions**; routine/template library; muscle-freshness view.
12. Seasonal depth (XP multipliers, seasonal challenges/medals), audio layer (Phase 3).

---

When an item here ships, reconcile it into `implementation-status.md` and the
owning product doc (`game-systems.md`, `tribe-design.md`, `feature-map.md`).
