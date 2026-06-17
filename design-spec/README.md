# STREM — Premium UI Reference Prototype (design spec)

This folder is a high-fidelity **reference prototype** of the STREM premium visual
overhaul, built in React (web) + inline styles. It is a **visual + interaction
contract** — do NOT copy the web code; translate it faithfully to React Native.

## Run it
Open `STREM Prototype.html` in a browser. Top toggle switches **The App** /
**Onboarding**. Tap the bottom nav; open missions, start a workout (import →
guided sets → rest timers → summary), log fuel, tap medals, create/share recaps.

## File map
| File | What it specifies |
|------|------|
| `strem-kit.jsx` | Design tokens (`T`), type system (Saira Condensed / Saira / JetBrains Mono), icon set, primitives (`Ring`, `Bar`, `Btn`, `Panel`, `Slot`…) |
| `strem-data.jsx` | All data shapes (mirror `strem-shared-contract`) |
| `medal-art.jsx` | **Premium SVG medal engine** — ports near-1:1 to `react-native-svg` |
| `workout-exec.jsx` | Set-by-set execution state machine + rest timers + summary |
| `screen-train.jsx` | Import → structured-workout preview |
| `screen-fuel.jsx` | Macros + hydration + photo/voice/manual logging |
| `story-recaps.jsx` | 6 IG-story recap templates + viewer + PNG export |
| `screen-home / profile / tribe / coach / onboarding.jsx` | Remaining screens |
| `app-shell.jsx` | Nav shell, router, celebration + recap overlays |
| `ios-frame.jsx`, `image-slot.js` | Web-only harness (device frame, drop-slots) — NOT part of the RN port |

## Guardrails (keep)
No calorie-shaming, no vanity/follower metrics, no faked server progress.
See the repo's `docs/premium-gamified-frontend-gap-analysis.md`.

---

## Prompt to give Codex

> You are implementing a premium visual overhaul of the STREM mobile app
> (React Native + Expo + TypeScript) on top of branch `mvp-20-visual-overhaul`.
>
> A complete high-fidelity REFERENCE PROTOTYPE is in `design-spec/` (React web +
> inline styles). It is the visual + interaction CONTRACT. Do NOT copy its web
> code; TRANSLATE it faithfully to React Native. Preserve all existing product
> guardrails from `docs/premium-gamified-frontend-gap-analysis.md` (no
> calorie-shaming, no vanity/follower metrics, no faked server progress).
>
> SETUP
> - Branch off the current branch: `git checkout -b mvp-20-premium-ui`.
> - Do not delete codex's existing IA; layer the new visual system on top.
>
> STEP 1 — Tokens & type (foundation, one PR)
> - Port `design-spec/strem-kit.jsx`: token object `T`, type helpers
>   (disp/ui/mono), RARITY, and the icon set → `constants/theme.ts` + a shared
>   `<Icon>` using react-native-svg.
> - Load fonts via expo-font: Saira Condensed (display), Saira (UI),
>   JetBrains Mono (labels).
> - Accents: green #34E2A0 = proof/XP, red #E5402A = legendary & at-risk, used
>   sparingly. Surface ramp #08090B → #1F252D.
>
> STEP 2 — Medal artwork engine (highest ROI, self-contained PR)
> - Port `design-spec/medal-art.jsx` to react-native-svg. It is already pure SVG
>   (Defs/LinearGradient/RadialGradient/Circle/Path) so it maps ~1:1. Keep:
>   metallic rim gradients per rarity, knurled coin ticks, glowing core, ribbon,
>   sport emblem, locked/desaturated state. Drive from `lib/medals.ts`.
>
> STEP 3 — Screens, each its own PR, in order:
>   Home (Ascent hero + rank ring), Profile (trophy case + celebration),
>   Workout execution (`workout-exec.jsx` state machine ports directly),
>   Fuel (macros + hydration + logging), Recaps + share/export, Onboarding +
>   celebration moments.
>
> PLATFORM TRANSLATION RULES
> - div→View, text→Text, onClick→onPress, CSS flex/grid→flexbox.
> - Conic/SVG rings & medals → react-native-svg.
> - backdrop-filter → expo-blur BlurView.
> - Image drop slots → expo-image-picker / expo-camera; food photo → existing
>   image-import endpoint.
> - Recap PNG export → react-native-view-shot (captureRef) + expo-sharing /
>   expo-media-library.
> - Transitions/celebration overlays → react-native-reanimated. Entrance
>   animations MUST settle to a visible end state (never leave content at
>   opacity 0).
>
> DATA & BACKEND
> - `design-spec/strem-data.jsx` mirrors `lib/api/types.ts` — wire to real API
>   where endpoints exist; mock the rest.
> - These need backend first (build UI against mocks, gate behind flags):
>   structured workout tracking, meal-level macros, photo→workout and photo→food
>   estimation. Match the gap-analysis doc.
>
> DELIVERABLES
> - One PR per step, each referencing the matching `design-spec/` file.
> - A short `docs/premium-ui-implementation.md` tracking mocked vs live.
> Ask before adding any content/sections not present in the prototype.
