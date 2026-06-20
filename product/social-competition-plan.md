# Social Competition — Duels, Tribe-vs-Tribe, and Proof

_Created 2026-06-19. Design for the social-competition layer requested by the
founder. Extends [`tribe-design.md`](tribe-design.md); planned in
[`next-steps-plan.md`](next-steps-plan.md) §6. Owning service:
`strem-community-service`._

Today accountability is **intra-tribe** only: a tribe sets one collective
challenge and members contribute toward a shared target
(`tribe_challenges` + `challenge_contributions`). This plan adds **head-to-head
competition** — one athlete vs another, and one tribe vs another — plus a
**proof** mechanic so wins are real, not claimed.

## Brand guardrail (read first)

Competition is the easiest way to violate STREM's no-shame, no-vanity principles
(A8). Every mechanic below is therefore constrained:

- **Opt-in, both sides.** No one is entered into a duel or match without accepting.
- **No loss-shaming.** Both participants earn XP for showing up; copy celebrates
  effort and consistency, never ridicules the loser. There is no public "you lost"
  broadcast.
- **Effort over output.** Where possible, scoring weights consistency/effort
  (days active, sessions completed) over raw output (max weight, fastest time), so
  a beginner can win a duel against an advanced athlete.
- **Proof is pride, not surveillance.** Proof is framed as *"show your work,"* is
  never required for private logging, and only applies to competitive entries the
  user opted into.
- **Data-verified beats media.** The strongest proof is the metric coming straight
  from a logged session or a connected source — it can't be faked and needs no
  photo. Media proof is the fallback for things we can't auto-track.

---

## 1. 1v1 Duels — challenge another athlete

**What:** One user challenges another to a head-to-head over a metric and a
window. Examples: *most training days this week*, *longest single run this
weekend*, *first to 300 total pushups*, *higher 7-day consistency*.

**Scope (phased):**
- **v1 — within a tribe.** You can only duel a tribemate. This reuses the existing
  membership graph and keeps it accountable (you know them) without building a
  full friend system.
- **v2 — friends / invite link.** A lightweight connection graph (follow/friend or
  a shareable duel link) lets you duel anyone. Deferred until v1 validates.

**Lifecycle:** `proposed → accepted | declined → active → complete` (also
`expired` if never accepted, `cancelled` by proposer before accept). The
challenged athlete must **accept** before it starts. On completion both get a
celebratory recap; the winner gets a duel medal / XP, the participant gets effort
XP.

**Scoring:** each duel has a `metric` (enum) resolved from existing data —
`training_days`, `total_distance_km`, `total_xp`, `longest_run`, `sessions`,
`consistency` — computed from the same events that already drive XP and Tribe
Power, so most duels are **data-verified with zero manual proof**.

**Data model (`strem-community-service`):**

```
duel(
  id, scope[tribe|friend], tribe_id?,        -- tribe_id for v1 within-tribe
  challenger_id, opponent_id,
  metric, target_value?, window_start, window_end,
  state, winner_id?, challenger_score, opponent_score,
  created_at, accepted_at?, completed_at?
)
```

**Endpoints:**
- `POST /tribes/{id}/duels` `{ opponent_id, metric, target?, window }` → propose.
- `POST /duels/{id}/accept` · `POST /duels/{id}/decline` · `POST /duels/{id}/cancel`.
- `GET /duels` (mine, by state) · `GET /duels/{id}` (live scores).
- Resolution: a worker (or on-read) tallies each side's metric from domain events
  in the window; on `window_end` → set `winner_id`, publish `duel.completed`.

**Events:** `duel.proposed`, `duel.accepted`, `duel.completed` → Redis Streams.
`strem-user-service` awards XP/medals on `duel.completed`; the agent (B3) can
surface a duel as a Today nudge ("Maria accepted your duel — 3 days each, go").

---

## 2. Tribe-vs-Tribe — head-to-head matches

**What:** Two tribes agree to compete over a collective metric and window
(*which tribe logs more training days this week*, *higher total Tribe Power
gain*, *most check-ins*). Builds on `tribe_power_ledger` and the existing
leaderboard.

**Matchmaking:**
- **Direct:** a tribe leader challenges a specific tribe (by name/code); the other
  tribe's leader accepts.
- **Tiered (later):** auto-match tribes of similar size/Tribe Power from the
  leaderboard, so matches are fair.

**Fairness:** score by **per-member average**, not raw totals, so a 4-person tribe
can beat an 8-person tribe. Effort-weighted metrics preferred.

**Lifecycle:** `proposed → accepted | declined → active → complete`. Outcome:
winning tribe earns collective Tribe Power + (in a season) a permanent
tribe-vs-tribe seasonal medal; both tribes get a shared recap. No tribe is
publicly shamed for losing.

**Data model:**

```
tribe_match(
  id, tribe_a_id, tribe_b_id, metric, window_start, window_end,
  state, tribe_a_score, tribe_b_score, winner_tribe_id?,
  created_by, created_at, accepted_at?, completed_at?
)
```

**Endpoints:**
- `POST /tribes/{id}/matches` `{ opponent_tribe_id | opponent_code, metric, window }`.
- `POST /matches/{id}/accept` · `/decline`.
- `GET /tribes/{id}/matches` · `GET /matches/{id}` (live, per-member-avg scores).
- Resolution worker tallies from `tribe_power_ledger` / check-ins / session events;
  publishes `tribe_match.completed`.

**Surfacing:** a live match banner on the Tribe screen; the AI tribe-summary
(MVP-16) narrates the match ("Iron Circle pulled ahead Thursday — two of you
haven't logged yet this week").

---

## 3. Proof — make wins real

The founder's point: challenges need proof. We use a **three-tier** model, always
preferring the strongest available:

### Tier 1 — Data-verified (default, un-fakeable)
The metric comes from a **logged session, a connected-source sync, or a detected
PR** — STREM already owns the data, so the entry verifies itself. No photo needed.
This is the default for duels/matches scored on training days, distance, XP, PRs,
etc. Ties directly to the A8 "no faked progress" guardrail: if it's not in the
data, it didn't count.

### Tier 2 — Media proof (photo / video)
For entries we **can't auto-track** (a specific lift at a specific weight, a
physique-neutral effort shot, a location check-in, a meal), the user attaches a
**photo or short video**. Proof is:
- **Stored** in object storage (S3-compatible) — *new infra dependency*; the API
  returns a signed upload URL, the client uploads directly, and the entry
  references the object key. Media is private to the tribe/duel context.
- **Confirmed lightly** by the counterpart or tribemates (a one-tap "verified" /
  reaction) — social trust, not heavy moderation. A challenge can require N
  confirmations.
- **Captioned/parsed** later by the capture-vision pipeline (D3/D4) to auto-read
  the lift/meal from the photo, blending Tier 2 toward Tier 1.

### Tier 3 — Honor (self-reported)
Low-stakes consistency challenges where proof would add friction without value —
self-reported, no media. Used sparingly.

**Per-challenge config:** each duel/match/challenge declares a `proof_policy`
(`data | media | media+confirm(N) | honor`) and, for media, the allowed kinds
(`photo | video`) and how many confirmations close it.

**Data model:**

```
challenge_proof(
  id, context_type[challenge|duel|match], context_id, user_id,
  kind[data|photo|video], media_key?, caption?,
  status[pending|verified|rejected], confirmations, created_at
)
```

**Endpoints (object-storage flow):**
- `POST /proofs/upload-url` `{ kind, content_type }` → `{ upload_url, media_key }`.
- `POST /{context}/{id}/proof` `{ kind, media_key?, caption? }` → records proof.
- `POST /proofs/{id}/confirm` (a tribemate/opponent confirms) → increments;
  auto-`verified` at the required count.
- Media moderation + retention governed by the Privacy Policy / Medical work in
  `next-steps-plan.md` §3.4.

**Anti-cheat & safety:**
- Prefer Tier 1; only fall back to media when necessary.
- Media proof is **opt-in and contextual** — never required to log privately.
- Report/hide path for inappropriate media; tie retention + takedown to the legal
  framework (§3.4 of the next-steps plan).
- No biometric/physique judging by the agent (A8 vanity guardrail) — proof media
  is for *the tribe to celebrate*, not for Forge to score a body.

---

## 4. New infrastructure this introduces

- **Object storage** (S3-compatible) for proof media + signed-URL upload — first
  media-storage need in the platform; also unlocks profile/recap media later.
- **Resolution workers** in `strem-community-service` (Redis-scheduled, same
  pattern as existing workers) to tally duel/match scores on window close.
- **A connection graph** (friends/follow) — only for duel v2; v1 avoids it by
  scoping to tribemates.

## 5. Suggested build order

1. **1v1 duels v1 (within-tribe), data-verified only** — highest value, lowest
   new infra (no object storage, no friend graph). Validates the mechanic.
2. **Tribe-vs-tribe, data-verified, per-member-avg** — reuses Tribe Power.
3. **Proof Tier 2 (media)** — once object storage + the legal/retention framework
   (§3.4) are in place.
4. **Duel v2 (friends/invite)** + tiered match-making.

Each step is gated by the brand guardrail at the top and the Anti-Roadmap
Principle: ship competition only as *shared commitment made visible*, never as a
vanity scoreboard.
