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
| 3 | Profile (trophy case + celebration) | ⏳ Not started |
| 3 | Workout execution | ⏳ Not started |
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

## Data wiring ledger (filled in as screens land)

_Each subsequent screen step appends its own table above this line._

## Guardrails (unchanged, enforced throughout)

No calorie-shaming, no vanity/follower metrics, no faked server progress.
