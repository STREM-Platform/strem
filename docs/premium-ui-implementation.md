# Premium UI Implementation — Mocked vs Live

Running log of the premium visual overhaul (`design-spec/`) as it lands in
`strem-mobile`. Tracks what is wired to real backend APIs vs. mocked/flag-gated,
per `docs/premium-gamified-frontend-gap-analysis.md`.

## Status by step

| Step | Area | State |
|------|------|-------|
| 1 | Tokens, type system, icon set, fonts | ✅ Done |
| 2 | Medal artwork engine | ✅ Done |
| 3 | Home (Ascent hero + rank ring) | ⏳ Not started |
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

## Data wiring ledger (filled in as screens land)

_Nothing wired yet. Each screen step records here which fields come from real
endpoints vs. mocks, and which mocks are gated behind flags pending backend work
(structured workout tracking, meal-level macros, photo→workout, photo→food)._

## Guardrails (unchanged, enforced throughout)

No calorie-shaming, no vanity/follower metrics, no faked server progress.
