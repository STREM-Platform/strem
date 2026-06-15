# Premium UI Implementation — Mocked vs Live

Running log of the premium visual overhaul (`design-spec/`) as it lands in
`strem-mobile`. Tracks what is wired to real backend APIs vs. mocked/flag-gated,
per `docs/premium-gamified-frontend-gap-analysis.md`.

## Status by step

| Step | Area | State |
|------|------|-------|
| 1 | Tokens, type system, icon set, fonts | ✅ Done |
| 2 | Medal artwork engine | ⏳ Not started |
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

## Data wiring ledger (filled in as screens land)

_Nothing wired yet. Each screen step records here which fields come from real
endpoints vs. mocks, and which mocks are gated behind flags pending backend work
(structured workout tracking, meal-level macros, photo→workout, photo→food)._

## Guardrails (unchanged, enforced throughout)

No calorie-shaming, no vanity/follower metrics, no faked server progress.
