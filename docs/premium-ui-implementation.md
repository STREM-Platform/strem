# Premium UI Implementation — Mocked vs Live

Running log of the premium visual overhaul (`design-spec/`) as it lands in
`strem-mobile`. Tracks what is wired to real backend APIs vs. mocked/flag-gated,
per `docs/premium-gamified-frontend-gap-analysis.md`.

## Status by step

| Step | Area | State |
|------|------|-------|
| 1 | Tokens, type system, icon set, fonts | ✅ Done |
| 2 | Medal artwork engine | ✅ Done |
| 3 | Home (Ascent hero + rank ring) | ✅ Done |
| 3 | Profile (trophy case + celebration) | ✅ Done |
| 3 | Workout execution | ✅ Done |
| 3 | Fuel (macros + hydration + logging) | ⏳ Not started |
| 3 | Recaps + share/export | ⏳ Not started |
| 3 | Onboarding + celebrations | ⏳ Not started |

## Step 1 — Tokens & type (foundation)

Pure presentation; no data. Ported from `design-spec/strem-kit.jsx`:

- `constants/theme.ts` — token object `T`, `RARITY`, `PATHS` icon set, and the
  `disp`/`ui`/`mono` type helpers (translated to RN `TextStyle`). Legacy
  `Colors`/`Spacing`/`Typography` exports retained for not-yet-migrated screens.
- `components/ui/icon.tsx` — shared `<Icon>` + `MountainMark` on
  `react-native-svg`.
- Fonts: Saira Condensed / Saira / JetBrains Mono via `@expo-google-fonts/*`,
  loaded in `app/_layout.tsx`.

## Step 2 — Medal artwork engine

Pure presentation. Ported from `design-spec/medal-art.jsx`:

- `lib/medals.ts` — added `MEDAL_META` (per-rarity rim/core/accent/glow/rays),
  `rarity` + `emblem` static display metadata on every catalogue medal, and a
  `medalDefinitionFor(type)` lookup to hydrate the earned-medals API response.
- `components/medals/medal.tsx` — `<Medal>` SVG engine (metallic rims, knurled
  ticks, glowing core, ribbon + star, sport emblem, sunburst rays on
  epic/legendary, holographic sheen, desaturated locked state).
- `components/medals/medal-card.tsx` — `<MedalCard>` (art + title + rarity/locked
  label), tappable.

RN translation: web `transform` rotate strings → `rotation`/`originX`/`originY`;
composed `translate/scale/translate` → nested `<G>`; the CSS `blur()` halo and
svg `drop-shadow` → a soft `RadialGradient` halo (cross-platform).

Not yet mounted in any screen — the Profile trophy case swaps onto this engine in
step 3. **Data:** still earned-vs-locked only from the existing medals API;
rarity/emblem are static display metadata (no faked progress).

## Step 3a — Home

Shared primitives ported from `design-spec/strem-kit.jsx`:
`components/ui/primitives.tsx` (Bar, Chip, Panel, SectionHead, ScreenHead,
IconTile), `components/ui/ascent.tsx` (AscentTrack), `components/ui/hero-backdrop.tsx`
(mountain PhotoSlot → SVG ridges + glow). `app/(app)/home.tsx` rebuilt as the
full-bleed Ascent hero + week ridge + missions + coach teaser.

New dep: `expo-linear-gradient` (faithful translation of the design's CSS
gradients — hero scrim, altitude fill).

**Home data ledger**

| UI element | Source | Live / mock |
|---|---|---|
| Rank, rank index, % into rank, XP to next | `GET /users/me/xp` + `/users/me` | **Live** |
| Total XP, streak chip | `GET /users/me/xp` | **Live** |
| Identity statement, greeting name | `GET /users/me` | **Live** |
| This-week ridge (days trained + type) | `GET /training/sessions` (filtered to current week) | **Live** |
| Missions (type, condition, reward, days left) | `GET /ai/missions/active` | **Live** |
| Mission **progress bars** | — | **Omitted** — no per-mission progress in contract; not fabricated |
| Coach recap teaser line | `GET /ai/coach/recap` (first sentence) | **Live** (falls back to a prompt if none) |
| Hero photo / avatar image | — | **Decorative** stylized mountain backdrop + initials (no user photo slot wired on Home) |

## Step 3b — Profile (trophy case + celebration)

Ported from `design-spec/screen-profile.jsx`. New components:
`components/ui/ring.tsx` (conic `Ring` → react-native-svg arc), `Btn` added to
`components/ui/primitives.tsx`, and `components/ui/celebration.tsx` rebuilt to the
premium `Celebration` (rank hex with the mountain mark, or the Medal engine; RN
`Animated` spring pop-in that settles fully visible). `app/(app)/profile.tsx`
rebuilt: header, rank `Ring` showcase, stat tiles, consistency calendar, the
medal **trophy case** (mounts the step-2 Medal engine), recap teaser, and the
existing accountability card.

**Profile data ledger**

| UI element | Source | Live / mock |
|---|---|---|
| Rank, rank index, % into rank, total XP | `GET /users/me/xp` | **Live** |
| Trophy case earned vs. locked, earned dates | `GET /users/me/medals` + static rarity/emblem metadata | **Live** (no fabricated locked progress) |
| Consistency calendar (last 5 weeks) | real activity dates from `GET /training/sessions` + `/nutrition/days`; current-streak highlight from `xp.current_streak_days` | **Live** |
| Longest streak tile, streak status line | `GET /users/me/xp` | **Live** |
| "MEDALS" stat tile | earned medal count | **Live** (substituted for the prototype's "active days", which the contract doesn't expose) |
| Rank-up / new-medal celebration | fires on real advancement via `detectMoment` (unchanged) | **Live** |
| "PREVIEW … UNLOCK" button | shows the next rank's celebration, explicitly labelled a preview | **Preview** (not server progress) |
| Recap teaser | — | **Placeholder** → routes to Coach; real recap share lands in the Recaps step |
| Accountability reminders card | existing `NotificationsCard` (local prefs) | **Live** (kept, layered into new layout) |

## Step 3c — Workout execution (Train)

Ported from `design-spec/workout-exec.jsx` + `screen-train.jsx`. New:
`lib/workout.ts` (types, helpers, `SAMPLE_WORKOUT`), `lib/flags.ts`,
`components/workout/{stepper,workout-exec,workout-summary,workout-preview}.tsx`,
and `app/(app)/log.tsx` rebuilt as the Train orchestrator
(landing → preview → guided exec → summary, plus the real quick-log).

**Train data ledger**

| UI element | Source | Live / mock |
|---|---|---|
| Quick-log a completed session | `POST /training/sessions` | **Live** |
| Recent proof list | `GET /training/sessions` | **Live** |
| Guided set-by-set execution (reps/weight/rest/volume) | local state machine on `SAMPLE_WORKOUT` | **Preview** (flag `guidedWorkoutsPreview`); no server-side workout tracking exists |
| Guided session persistence | on "Save to training log" → `POST /training/sessions` (final session only: type + elapsed minutes + note) | **Live** |
| Photo / text / voice import | — | **Unsupported, honest** (flag `workoutImport` off): shown as "SOON"; tapping explains it isn't live; no extracted data fabricated |
| Summary "+XP" and "NEW PERSONAL RECORD" | — | **Dropped** — contract returns neither per-session XP nor PR data, so not invented |

Guardrails: structured tracking is clearly a *preview*; the only persistence is
the real final session; imports never fabricate parsed workouts; no fake PR/XP.

## Data wiring ledger (filled in as screens land)

_Each subsequent screen step appends its own table above this line._

## Guardrails (unchanged, enforced throughout)

No calorie-shaming, no vanity/follower metrics, no faked server progress.
