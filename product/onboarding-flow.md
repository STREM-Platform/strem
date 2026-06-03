# Onboarding Flow

Onboarding is the start of the transformation arc, not a registration form. Authentication has already created the account by the time onboarding begins. Onboarding's only job is to capture the **identity** STREM will reflect back to the user for the rest of their journey — quickly, with as little friction as possible.

The AI transformation coach references the identity captured here in every mission, recap, and rank-up message. A weak or skipped identity capture degrades every downstream coaching moment. Treat this flow as the single most important screen sequence in the product.

This spec is implementation-ready: a frontend engineer or AI agent can build the onboarding screens and the `strem-user-service` onboarding endpoints from it without follow-up questions.

**Read alongside:**
- `product/prd.md` — onboarding sits inside the MVP product loop (step 1)
- `product/mvp-scope.md` — onboarding inclusion and the under-5-minute target
- `product/game-systems.md` — the rank, XP, and first-mission state the user lands in
- `architecture/ai-architecture.md` — what the coach receives and how onboarding feeds the context bundle

---

## Design Principles

- **Identity-first.** The first substantive screen captures who the user is becoming. Everything else supports that.
- **Under 5 minutes.** Total completion target is under 5 minutes. Every screen must justify its place against that budget.
- **Required is minimal.** Only capture what the coach genuinely needs to personalize the first week. Everything else is optional and skippable without penalty.
- **No dead ends.** Skipping an optional screen always produces a sensible default, never a blocked state.
- **Resumable.** Onboarding answers persist per screen. A user who abandons mid-flow resumes where they left off — they never re-enter completed answers.
- **Not a form.** Copy, pacing, and framing must feel like the beginning of a transformation, consistent with `vision/brand-identity.md`. This spec defines structure and data, not final copy.

---

## Entry Point

Onboarding begins immediately after first successful authentication (account just created, `onboarding.status = not_started`).

- On every app launch, the client checks onboarding status via `GET /users/onboarding/status` (see `strem-shared-contracts` user contract).
- If status is `not_started` or `in_progress`, the user is routed into the onboarding flow and cannot reach the main app until onboarding is `completed`.
- If status is `completed`, the user is routed to the home/dashboard.

Onboarding answers are owned by `strem-user-service` (see `architecture/service-map.md`). Authentication identity (email, password, tokens) stays in `strem-auth-service` and is never re-captured here.

---

## Screen Sequence

Seven screens, in order. Screen names are stable identifiers for routing and analytics.

### 1. `welcome` — Framing

**Purpose:** Set the tone. Make it clear this is the start of a transformation, not a sign-up form.

**Data captured:** None.

**Actions:** Single primary CTA to begin. No skip.

---

### 2. `identity` — Identity Statement

**Purpose:** Capture the core identity the coach will reference for the entire journey. This is the highest-value screen in onboarding.

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `identity_statement` | **Required** | free text (max 280 chars) | — | The user's "who I am becoming" statement. Prompted, e.g. "I am becoming someone who…". |
| `transformation_goal` | **Required** | enum | — | `build_strength`, `build_endurance`, `hybrid_athlete`, `lean_and_strong`, `build_discipline`, `general_health` |

**Branching:** None. Both fields must be answered before continuing — this is the one screen with no skip.

---

### 3. `training-background` — Starting Point

**Purpose:** Calibrate first-week mission difficulty. Feeds the coach's difficulty adaptation (see `architecture/ai-architecture.md`).

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `training_level` | **Required** | enum | — | `beginner`, `intermediate`, `advanced` |
| `preferred_modalities` | Optional | multi-select enum | `[]` | `strength`, `running`, `mobility`, `nutrition` — the pillars the user wants to prioritize first |

**Branching:** `preferred_modalities` may be skipped. If empty, the coach treats all pillars as equal weight when generating the first mission.

---

### 4. `commitment` — Weekly Target

**Purpose:** Establish the first small, realistic commitment. This is the "first small commitment" the PRD requires onboarding to produce, and it anchors the first mission's scope.

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `weekly_target_days` | **Required** | integer (2–7) | `3` | Active days per week the user commits to. Pre-selected at `3`; user confirms or adjusts. |

**Branching:** None. Pre-filled default means the user can advance with a single tap, so this screen does not threaten the time budget.

---

### 5. `nutrition` — Nutrition Preference

**Purpose:** Light-touch nutrition context. MVP nutrition is consistency-first, not macro automation (see `product/mvp-scope.md`), so this screen stays minimal.

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `nutrition_preference` | Optional | enum | `general_consistency` | `general_consistency`, `high_protein`, `plant_based`, `no_focus` |

**Branching:** Fully skippable. If skipped, defaults to `general_consistency`. The coach will not push nutrition missions hard for a user who selected `no_focus` or skipped.

---

### 6. `tribe` — Tribe Preference

**Purpose:** Capture accountability intent. Tribes are core to retention (see `product/tribe-design.md`), but joining one is never forced during onboarding.

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `tribe_preference` | Optional | enum | `join_later` | `join_now`, `join_later`, `solo_for_now` |

**Branching:**
- `join_now` → after onboarding completes, the post-onboarding state surfaces the tribe join/invite flow as the primary CTA.
- `join_later` (default, also used when skipped) → the home dashboard shows a persistent but non-blocking tribe CTA.
- `solo_for_now` → tribe CTA is de-emphasized for the first week, then re-surfaced in the first weekly recap.

No branch blocks completion. Onboarding never requires tribe membership.

---

### 7. `launch` — Confirm and Begin

**Purpose:** Confirm display identity, lock timezone for scheduling (weekly missions and recaps depend on it — see `architecture/ai-architecture.md`), and trigger completion.

| Field | Required | Type | Default | Notes |
|-------|----------|------|---------|-------|
| `display_name` | Optional | text (max 40 chars) | name from registration | Pre-filled from the auth/registration name; user may edit. |
| `timezone` | **Required** | IANA timezone string | device-detected timezone | Auto-detected and pre-filled; user confirms. Required because mission and recap scheduling depend on it. |

**Action:** Confirming this screen submits the full onboarding payload via `POST /users/onboarding`, which sets `onboarding.status = completed` and emits the onboarding-complete domain event (see `architecture/event-driven-strategy.md`).

**Branching:** `display_name` may be left at its default. `timezone` is pre-filled, so confirmation is a single tap.

---

## Onboarding Data Model

The complete set of answers persisted by `strem-user-service`. This is the source of truth for the `POST /users/onboarding` request body in `strem-shared-contracts`.

| Field | Required | Captured On |
|-------|----------|-------------|
| `identity_statement` | Required | `identity` |
| `transformation_goal` | Required | `identity` |
| `training_level` | Required | `training-background` |
| `preferred_modalities` | Optional | `training-background` |
| `weekly_target_days` | Required | `commitment` |
| `nutrition_preference` | Optional | `nutrition` |
| `tribe_preference` | Optional | `tribe` |
| `display_name` | Optional | `launch` |
| `timezone` | Required | `launch` |

**Completion criteria:** onboarding is marked `completed` only when all five required fields are present: `identity_statement`, `transformation_goal`, `training_level`, `weekly_target_days`, `timezone`. Optional fields may be absent or defaulted.

---

## What the AI Coach Receives

On completion, the persisted onboarding answers become the **identity layer** of the coach's context bundle (`architecture/ai-architecture.md` → "Stated identity goal (from onboarding) — Persistent").

The coach receives, via approved service contract:

- `identity_statement` and `transformation_goal` — the identity the coach grounds every response in
- `training_level` — calibrates first-mission difficulty (a beginner never receives an aggressive first mission)
- `preferred_modalities` — pillar weighting for the first mission
- `weekly_target_days` — scopes the first mission's volume
- `nutrition_preference` and `tribe_preference` — shape whether early missions lean nutrition or tribe
- `timezone` — schedules the weekly mission (Monday) and recap (Sunday) cadence

The coach uses identity first, then data, per the context priority order in `architecture/ai-architecture.md`. The first mission is generated at difficulty `re-entry` or `maintenance` — never `growth` or `challenge` — because there is no logging history yet.

---

## Post-Onboarding State

On completion the user lands on the home/dashboard, not a confirmation screen. They immediately see:

1. **Starting identity confirmed** — their rank is `Initiate` (0 XP), shown with the `identity_statement` they wrote. This makes the identity feel real and owned. (Ranks and XP per `product/game-systems.md`.)
2. **First mission prompt** — the coach's first generated mission (1 mission for a brand-new user), scoped to `weekly_target_days` and `training_level`. This is the first concrete action.
3. **First log CTA** — a clear path to log the first training, running, or nutrition action, so the user can earn their first XP within minutes of finishing onboarding.
4. **Tribe CTA** — surfaced per `tribe_preference`: primary if `join_now`, persistent-but-secondary if `join_later`, de-emphasized if `solo_for_now`.

The intent: the user finishes onboarding and within one more action has a stated identity, a starting rank, a first mission, and a clear next step — the full "identity → first proof" entry into the product loop.

---

## Recovery Path — Abandon and Return

Onboarding must survive interruption without losing progress or forcing a restart.

- **Per-screen persistence.** Each screen's answers are saved to `strem-user-service` as the user advances, not only at the final submit. Status moves from `not_started` to `in_progress` after the first screen with captured data.
- **Resume point.** On return, `GET /users/onboarding/status` reports `in_progress` and the last completed screen. The client resumes at the next incomplete screen. Already-answered fields are pre-filled and never re-asked.
- **No re-entry tax.** A user who completed screens 1–4 and left returns directly to screen 5. They do not re-confirm identity, background, or commitment.
- **Hard gate until complete.** Until status is `completed`, the app routes to onboarding on every launch. The user cannot reach the main app with a partial identity.
- **Completion is explicit.** Only the `launch` screen submission (with all required fields present) flips status to `completed`. Partial answers never auto-complete onboarding.

---

## Time Budget

Target: **under 5 minutes.** Justification by screen, assuming an average new user:

| Screen | Estimated time | Why it fits |
|--------|----------------|-------------|
| `welcome` | ~10s | One CTA, no input |
| `identity` | ~90s | The only screen requiring real thought; this is where time should be spent |
| `training-background` | ~30s | One required tap + optional multi-select |
| `commitment` | ~10s | Single pre-filled value to confirm or nudge |
| `nutrition` | ~15s | One optional tap, skippable |
| `tribe` | ~15s | One optional tap, skippable |
| `launch` | ~20s | Pre-filled name and timezone; confirm |

Estimated total: **~3 minutes**, leaving headroom under the 5-minute target. The budget is protected by keeping only `identity` cognitively heavy and pre-filling defaults everywhere else so most screens are single-tap confirmations.

---

## Out of Scope

- UI mockups, wireframes, and final copy (this spec defines structure, data, and behavior only)
- Implementation code (screens and endpoints are built from this spec elsewhere)
- Any onboarding step capturing data not in MVP scope (no payment, no wearables, no advanced preferences)
- Re-onboarding or identity-revision flows after completion (post-MVP; identity edits happen via `PATCH /users/me`)
