# Frontend Implementation — Forge prototype-sync

Brings the existing `strem-mobile` app up to the finished AI prototype
(`prototype/`, mapped to the roadmap in `prototype/README.md`). The thesis: the
coach feels omniscient because **one context graph feeds every surface**, and the
AI is **one autonomous agent (Forge), not a set of chatbots**.

Branch: `strem-fe/prototype-sync` (off `mvp-20-premium-ui-claude`).

## KEEP / CHANGE / ADD

### KEEP — already match or untouched by the prototype
- `app/(auth)/*`, `app/(onboarding)/*` — no auth/onboarding surface in the prototype.
- `app/(app)/nutrition.tsx` (**Fuel**) — no standalone Fuel screen in the prototype
  (its photo→meal capture lives in Train via the agent). Not contradicted.
- `app/(app)/tribe.tsx` (**Tribe**) — real community backend; the prototype's
  League/Season is a *new Profile tab on different data*, not a Tribe rewrite.
- `app/(app)/recaps.tsx` — no recap viewer in the prototype; still reached via share.
- Design system: `primitives`, `icon`/`PATHS`, `theme`/`T`, `ring`, `ascent`,
  `hero-backdrop`, `medals/*`, `celebration`, `recaps/*`, `tribe/*`. Reused first.

### CHANGE — exist but differ (edited in place; routing/props/real wiring preserved)
- **`home.tsx` (Home→"Today")** — leads with the agent: proactive nudge + 10s
  check-in, Today's Climb readiness card + one coached action, "What your coach
  sees" (sources + signals), Ask-Forge teaser. Ascent hero / week ridge / missions
  kept below.
- **`log.tsx` (Train)** — Forge live-workout intelligence (per-set coaching, RPE,
  autoregulated rest, PR-detect → celebration, debrief) + AI capture
  (photo→workout, photo→meal, voice→log). Quick-log + recent proof preserved; the
  debrief still persists a real `POST /training/sessions`.
- **`coach.tsx` (Coach→"Forge")** — rebuilt from a one-shot recap reader into the
  standing agent: Chat (cited) · Plan (adaptive missions + import-a-plan-from-image
  → adapt) · Insights. Real recap/mission endpoints stay live via Home's teaser and
  the Recaps screen.
- **`profile.tsx` (You→Profile)** — added a Proof / Story / League section (proof
  timeline charts, PR history, medal rarity %, narrative chapters, tribe league +
  season). Rank ring, stat tiles, consistency calendar, trophy case kept.
- **`bottom-nav.tsx`** — Home→**Today**; added **Coach** as a permanent tab (6
  tabs: Today · Train · Coach · Fuel · Tribe · You).

### ADD — new in the prototype / agent spec
- **`lib/agent/`** — the one AGENT layer: `types` (contract incl. `AgentAction`,
  autonomy), `context` (assembler A6), `capabilities` (registry + autonomy
  defaults), `guardrails` (A8), `runtime` (always-on loop, action log, autonomy
  store + hooks), `index` (the `forge` facade every surface calls).
- **`lib/services/agent.mock.ts`** — flag-gated mock returning the exact
  `strem-ai-data*.jsx` shapes.
- **`app/(app)/privacy.tsx`** — "What your coach knows" (A7): source toggles +
  per-capability autonomy + export/delete.
- **`app/(app)/agent.tsx`** — Agent Activity feed: every autonomous/proposed action
  with reasoning + cited data + Undo/Approve (the proof it's an agent).
- **Components** — `agent/{today,forge-coach,activity,shared}`,
  `workout/{live-session,capture-flow}`, `profile/proof-story-league`.
- **Assets** — athlete photography (`assets/img/`) with `HeroBackdrop` fallback.

## The agent (one brain, many surfaces)
`src/agent/` in the brief maps to **`lib/agent/`** here (repo convention). Forge is
a standing service, not a Coach-screen feature:
- **Context assembler** (`context.ts`, A6) — one snapshot per call, filtered by the
  user's A7 source toggles.
- **Tool registry** (`index.ts` + `runtime.ts`) — typed, logged, **reversible**
  actions (`adjustTodayPlan`, `generateMissions`, `adjustTargets`, `importPlanFromImage`,
  `logCapture`, `updateReadiness`, `flagNutrition`, …), each gated by per-capability
  **autonomy** (AUTO acts+tells, ASK proposes, OFF never; defaults: low-risk = AUTO,
  plan-change / message = ASK).
- **Always-on loop** (`runtime.observe`) — reacts to graph events and decides when
  to act unprompted; every action lands in the Activity feed with Undo.
- **Guardrails** (`guardrails.ts`, A8) — no shame / vanity / faked progress / medical
  diagnosis.
- **Many surfaces, one call** — the Today nudge, live-workout autoregulation, mission
  generation, plan import and chat are all calls into `forge`, not separate bots.

## Mocked-vs-live ledger
All Forge data is behind `FLAGS.forgeAgentMock`. Identity/XP/streak, training
persistence, nutrition days, tribe and recaps stay on their **existing live APIs**.

| Surface | Live today | Mocked (flag) | Backend issue |
|---|---|---|---|
| Today's Climb / readiness / check-in | rank·XP·streak (`/users/me`,`/xp`) | brief, readiness, nudge, check-in | A4 #44, B3 #49 |
| What your coach sees (sources+signals) | — | context graph | A6 #43, A4 #44, A3 #46 |
| Long-term memory | — | memory items | A1/A5 #45 |
| Coach chat (cited) | — | conversation | B1 #48 |
| Plan — adaptive missions | `/ai/missions/*` exists | adaptive plan | B4 #50 |
| Plan — import-from-image → adapt | — | OCR/parse + adapt | B4 #50 |
| Insights | — | correlations | B8 #51 |
| Live workout (per-set, RPE, rest, PR) | session persist on finish | autoregulation + PR | D1/D2 #52 |
| AI capture (photo/voice) | — | scan→parse→confirm | D3/D4/D6 #53 |
| Proof timeline / story / league | medals·XP·tribe (partial) | charts, PRs, rarity, season, league | A1 #45, B8 #51 |
| Privacy toggles / export / delete / autonomy | — | consent + autonomy | A7 #54 |
| Guardrail filter | UI backstop (`guardrails.ts`) | — | A8 #47 |
| Proactive run-loop + Agent Activity | — | runtime + action log | B3 #49 |

Each mock block carries `// TODO(BE-…): swap mock — see issue #NN`; swap point is
`lib/agent/index.ts`. The UI shapes don't change when the real endpoints land.

## Guardrails honoured
No shame, no vanity/follower metrics, no faked server progress, no medical
diagnosis. Every agent answer/action cites the user's own data. Entrance states
settle fully visible (never `opacity:0` at rest). Every autonomous action is
reversible and shown in the Activity feed.
