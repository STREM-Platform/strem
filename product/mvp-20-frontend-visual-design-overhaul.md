# MVP-20 Frontend Visual Design Overhaul

- **Status:** approved design direction
- **GitHub issue:** `STREM-Platform/strem-mobile#38`
- **Repository affected:** `strem-mobile`
- **Design direction:** Training Command Center base with Ascent Atlas moments

## Purpose

MVP-20 gives the shipped mobile app the visual credibility layer it needs for users, investors, and collaborators. The app already has the core transformation loop built: auth, onboarding, training/running/mobility logging, nutrition logging, AI missions and recap, tribes, XP, ranks, medals, streaks, and notification preferences. This work changes how those capabilities are presented.

The goal is a premium, modern product UI that makes STREM feel like a serious training command center: visual-first, structured, fast to scan, and emotionally connected to identity progression.

This is presentation work only. It must not change API contracts, authentication behavior, route guards, navigation destinations, onboarding data flow, XP rules, tribe rules, AI behavior, or backend ownership.

## Source Material

Use these as the source of truth while implementing:

- `vision/brand-identity.md`
- `vision/product-philosophy.md`
- `product/mvp-scope.md`
- `product/game-systems.md`
- `product/tribe-design.md`
- `product/onboarding-flow.md`
- `product/implementation-status.md`
- `strem-mobile` issue `#38`

Brand constraints:

- Preserve the premium black/white base with Bulgarian green and red accents.
- Use the approved logo assets only from `assets/brand/`.
- Do not make glow-heavy logo styling the everyday product surface.
- Do not drift toward a social feed, generic fitness tracker, calorie app, or generic AI chat.

## Approved Visual Direction

The app-wide base is **Training Command Center**:

- dark premium shell
- strong screen hierarchy
- icon-led navigation and actions
- compact visual stats
- visible XP, rank, streak, mission, and tribe proof
- fewer paragraphs and shorter helper text
- restrained elevation, radius, and color

The special progression layer is **Ascent Atlas**:

- rank artwork and medal art use mountain, ascent, arrow, north-star, and forged-metal motifs
- earned states feel cinematic but not childish
- locked states remain aspirational without shame
- celebration moments get a fuller visual treatment than ordinary cards

This combination keeps the everyday app serious and fast, while allowing rank-ups, medals, empty states, and profile progression to feel memorable.

## Screen Audit

| Area | Current issue | MVP-20 treatment |
|---|---|---|
| Auth | Clean but static: logo, title, paragraph, fields. | Add branded visual field, smaller copy, stronger hierarchy, and concise trust/action cues. |
| Onboarding | Seven-step flow is structurally strong, but each step feels like text plus controls. | Add step-specific emblems, icon option rows, stronger progress framing, and shorter subtitles. |
| Bottom navigation | Label-only tabs make the app feel unfinished and slow to scan. | Add consistent icons, active state, press state, and clearer current-location treatment. |
| App shell loading/error | Spinner and text-only error states feel generic. | Add visual state components with concise copy and action affordances. |
| Home | Dashboard expresses identity, XP, streaks, and missions mostly as text cards. | Make this the transformation command center: rank progress ring, stat tiles, visual streak, mission cards with icons, and clear primary CTAs. |
| Log | Form works, but session choices are radio rows with text hints. | Turn into a fast action workbench with icon session tiles, compact fields, and visual success state. |
| Nutrition | Consistency-first positioning is right, but recent days are rows of dates and pills. | Add nutrition consistency tile, target toggle visual, recent-day strip, and empty state art. |
| Tribe | Tribe Power, members, check-ins, and challenges are text-heavy. | Add Tribe Power gauge, member capacity visual, icon check-in actions, activity timeline, challenge progress cards. |
| Coach | Narrative recap dominates; proof is two numeric cards and mission history rows. | Pair narrative with weekly proof bars, mission outcome icons, and shorter history rows. |
| Profile | Has rank progress and celebration, but medals are rows with logo marks and streak is numeric. | Make profile the progression showcase: rank artwork, progress ring/bar, streak calendar strip, medal art grid, elevated celebration overlay. |

## Design System Decisions

### Icon Library

Use `lucide-react-native` with `react-native-svg` as the primary icon system.

Reasons:

- consistent premium outline style
- strong coverage for nav, action, status, mission, tribe, and data concepts
- works cleanly with React Native and Expo web
- aligns with the product need for restrained command-center UI

Create a small local icon adapter rather than importing icons ad hoc across screens. The adapter should map semantic names to icons, for example:

- `home`, `log`, `nutrition`, `tribe`, `profile`, `coach`
- `strength`, `running`, `mobility`, `recovery`, `nutrition`, `rest`, `discipline`
- `mission`, `medal`, `rank`, `streak`, `xp`, `power`, `members`
- `success`, `warning`, `error`, `empty`, `locked`

### Illustration And Art Approach

Use a code-native illustration system for MVP-20:

- rank panels
- medal tiles
- empty-state emblems
- loading/error visuals
- celebration background accents

These should be composed from simple gradients, rings, strokes, geometric mountain/ascent motifs, and approved brand colors. Do not create a new logo. Do not stretch, recolor, or crop the approved logo into generic decoration.

Raster artwork can be added later for app-store, launch, or campaign surfaces, but the MVP-20 product UI should stay lightweight, accessible, and maintainable.

### Typography And Copy

Keep copy short and scannable:

- one clear screen title
- one concise subtitle only when needed
- section headers with icon and action context
- cards use label, value, and one short support line
- long narrative text stays mostly in Coach, where it is the product value

Do not add feature-explaining marketing copy inside the app.

### Color And Surface Rules

Keep the current dark premium base, but make token usage more semantic:

- background: black/dark neutral
- surface: raised command panels
- muted surface: inputs, rows, inactive states
- green: progress, active proof, earned states
- red: danger/error and Bulgarian accent, not general decoration
- white/inverse: primary CTA and high-emphasis marks

Avoid one-note green screens. Green should highlight proof and progress, not flood the interface.

### Radius And Elevation

Maintain a disciplined surface system:

- small controls: 8-10px radius
- action tiles and rows: 12-16px radius
- hero/progression panels: 18-24px radius
- bottom nav: pill-like shell is acceptable because it is a persistent mobile control

Do not nest cards inside cards unless the inner element is a real control or repeated item.

## Reusable Components

Build reusable visual primitives before replacing screens:

| Component | Purpose |
|---|---|
| `AppIcon` | Semantic icon adapter over the selected icon library. |
| `VisualStatTile` | Icon, label, value, trend/support text, tone. Replaces text-only metric cards. |
| `SectionHeader` upgrade | Optional icon, title, short subtitle, action slot. |
| `RankProgressVisual` | Progress ring or ring-plus-bar for current rank and next rank. |
| `StreakVisual` | Compact streak strip/calendar/flame treatment with active, at-risk, broken, none states. |
| `WeeklyProofChart` | Compact bars for training, nutrition, missions, and tribe proof. |
| `TribePowerGauge` | Visual gauge for cumulative tribe power and member capacity. |
| `ActionOptionTile` | Icon-led selectable option for onboarding, log types, nutrition, and check-ins. |
| `MissionVisualCard` | Mission type icon, reward, duration, completion proof, complete/skip actions. |
| `MedalArtTile` | Earned and locked medal artwork with title, condition/date, and state. |
| `EmptyIllustration` | Reusable branded empty/loading/error emblem with concise message. |
| `CelebrationOverlay` upgrade | Rank/medal art, motion, concise coach line, and dismiss action. |

Component ownership should stay in `components/*` and `components/ui/*`. Screen files should compose these primitives rather than duplicating visual styles.

## Screen Designs

### Auth

Use the approved logo lockup as the brand anchor, but reduce visual dependence on the glow asset. Add a restrained command-panel background or ascent emblem behind the form. Keep login/register forms functionally unchanged.

Required changes:

- stronger top visual hierarchy
- shorter subtitle copy
- button and input focus states remain accessible
- error state uses icon plus concise message
- responsive width remains appropriate on phone and Expo web

### Onboarding

Onboarding must still complete in under five minutes. The visual overhaul should make each step feel intentional without adding decisions.

Required changes:

- add a step emblem to the onboarding hero
- make `SegmentedProgress` more premium and readable
- convert option lists to icon-led action tiles
- keep required/skippable behavior unchanged
- preserve route order and saved-answer flow

Step visual anchors:

| Step | Visual anchor |
|---|---|
| Welcome | STREM ascent mark and first-rank path. |
| Identity | North-star / identity signal. |
| Training background | Strength, running, mobility pillar icons. |
| Commitment | Weekly cadence/streak strip. |
| Nutrition | Consistency plate/check visual, not calories. |
| Tribe | Small-group accountability emblem. |
| Launch | Initiate rank card and first-proof cue. |

### Home

Home becomes the central transformation command center.

Required changes:

- replace the identity card with a rank-progress hero
- show total XP, current rank, next rank, and streak visually
- use visual stat tiles for active missions, streak, weekly proof, and tribe CTA when available
- mission list uses `MissionVisualCard`
- next proof actions are icon buttons or icon-led CTAs
- empty mission state uses branded visual state and one short CTA

### Log

The log screen should feel like a quick workbench, not a form page.

Required changes:

- session type options become icon action tiles
- selected type changes the visual tone and helper fields
- running distance field appears as today, but with better visual grouping
- notes remain optional and de-emphasized
- success state uses visual proof/XP language and clear next actions

### Nutrition

Nutrition must stay consistency-first and avoid calorie-app drift.

Required changes:

- add a daily alignment visual tile above or around the form
- make `targets_met` toggle feel like a proof action, not a settings switch
- recent days become compact visual rows or a seven-day strip
- empty state reinforces honest consistency, not macro perfection

### Tribe

Tribe should feel like a small locker room, not a social feed.

Required changes:

- tribe header includes member capacity and role as visual chips
- Tribe Power becomes a gauge or progress-style power panel
- check-in action options use icons for training, running, nutrition, recovery, rest, and nothing today
- recent activity becomes a timeline with action icons
- challenge cards use visual progress and target type icons
- join/pending/error states use tribe-specific empty illustrations

Do not add follower mechanics, public social affordances, or shame language.

### Coach

Coach is allowed to keep more text because narrative is core to the product. The overhaul should frame narrative with proof rather than replacing it.

Required changes:

- recap card gets clearer date/state hierarchy and coach visual mark
- weekly proof becomes a compact chart
- mission history rows use mission type/state icons and less text
- empty state uses an AI coach emblem and one CTA
- generation errors remain honest and concise

### Profile

Profile becomes the progression showcase.

Required changes:

- rank hero uses `RankProgressVisual` and ascent artwork
- streak card becomes `StreakVisual`
- metric cards become visual stat tiles
- medal gallery becomes an art grid or compact tile layout
- locked medals are visible but subdued with earn condition
- earned medals use richer color, icon/art, and earned date
- notification preferences remain clear and accessible

### Celebration

Rank-up and medal moments should feel earned.

Required changes:

- add rank or medal art to the modal
- use subtle motion and backdrop treatment
- include one concise coach line
- keep dismiss action clear
- respect reduced-motion settings
- do not block core navigation longer than necessary

## Motion And Feedback

Use motion sparingly:

- pressed scale/opacity on buttons and tiles
- selected-state transitions where supported
- progress fill animation on initial screen load
- celebration fade/scale for rank and medal moments

Motion must respect `prefers-reduced-motion` on web where practical and should not be required to understand state.

## Accessibility And Responsive Requirements

MVP-20 must preserve or improve accessibility:

- AA contrast for text and key controls
- icons never carry meaning without labels or accessibility labels
- touch targets remain at least 44px
- dynamic text should not overlap fixed cards
- phone layout remains primary
- Expo web layout uses constrained widths and avoids stretched mobile cards
- focus/hover states work on web
- loading/error/empty states are readable by screen readers

## Implementation Phases

1. **Foundation**
   - Add icon dependencies.
   - Extend tokens if needed.
   - Build `AppIcon`, upgraded section headers, visual stat tiles, progress/streak/gauge/chart primitives, and visual states.

2. **Primary App Shell**
   - Upgrade bottom nav.
   - Upgrade loading/error/empty states.
   - Apply visual headers and stat tiles.

3. **Core Screens**
   - Home
   - Log
   - Nutrition
   - Tribe
   - Coach
   - Profile

4. **Entry And Progression Polish**
   - Auth
   - Onboarding
   - Medal gallery
   - Celebration overlay

5. **Responsive And Verification**
   - phone viewport
   - Expo web viewport
   - lint
   - TypeScript
   - Jest
   - manual route/auth smoke check

## Verification Plan

Run these before considering MVP-20 complete:

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- Expo web visual pass
- phone-size visual pass
- auth route guard smoke check
- onboarding completion/resume smoke check
- log/nutrition submit smoke check with existing API behavior
- tribe check-in and challenge UI smoke check
- coach recap/mission history UI smoke check
- profile rank/medal/streak/notification UI smoke check

Expected result: presentation improves, behavior remains unchanged.

## Acceptance Criteria

MVP-20 is complete when:

- every main screen uses icons, visual hierarchy, and reusable visual components
- dense text has been reduced without losing product meaning
- XP, rank, streak, missions, Tribe Power, weekly proof, and medals are visualized
- auth and onboarding feel premium without adding friction
- empty, loading, error, and success states are branded and concise
- celebration moment feels earned and polished
- phone and Expo web layouts are responsive
- `lint`, `tsc`, and `jest` pass
- no API/auth/navigation/data behavior regresses

## Non-Goals

Do not include:

- backend or API changes
- new app routes
- new XP/rank/medal rules
- season UI unless covered by a separate scoped issue
- mobile tribe leaderboard surfacing unless covered by P2-09
- social feed mechanics
- follower counts, likes, or public vanity metrics
- calorie-counting or macro-dashboard drift
- generated runtime APIs or stub services

## Open Implementation Notes

- If dependency installation is blocked, implementation should stop and ask for approval rather than hand-roll a weak icon system.
- If a screen needs more data than its current API response provides, the UI should degrade gracefully instead of changing contracts under MVP-20.
- If rank or medal artwork risks becoming too decorative, prefer a simpler code-native emblem over heavy raster art.
