# strem-mobile

React Native + Expo client for the STREM trail Race Mission.

## Product

STREM is the AI race team for self-coached trail runners preparing for a real event. The active mobile navigation is:

- **Mission** — race countdown, preparation evidence, current risk, and today's decision;
- **Plan** — purposeful trail weeks, sessions, rehearsals, and adaptation rules;
- **Race Lab** — course, pacing, fuel, equipment, weather assumptions, logistics, and calendar handoff;
- **AI** — one cited Race Team, not multiple personas;
- **Athlete** — baseline, connected sources, consent, action receipts, and account controls.

Product authority lives in `../strem-docs/product/trail-running-pivot.md`. Delivery order and validation gates live in `../strem-docs/product/trail-running-delivery-plan.md`.

## Data honesty

Mission, Plan, and Race Lab currently use one centralized fixture in `lib/trail/mission-preview.ts`. Every screen using it displays a prototype label. Delete the fixture when approved Race Mission contracts land.

Authentication, legal acceptance, athlete profile, consent, AI chat, action history, and integration status use live APIs. If those APIs fail, the app shows unavailable or empty states and never substitutes fictional personal data.

## Active routes

```text
app/
  (auth)/             login and registration
  (legal)/            policy acceptance and policy reader
  (onboarding)/       focused trail onboarding
  (app)/
    home.tsx          Mission
    plan.tsx          Plan
    race.tsx          Race Lab
    coach.tsx         AI Race Team
    profile.tsx       Athlete
    athlete-profile.tsx
    integrations.tsx
    privacy.tsx
    agent.tsx         AI action receipts
```

Generic training, Fuel, Tribe, Crew, XP, medals, biomarker, recap, workout-execution, proof-upload, and mock-agent UI code has been removed. Git history is the recovery path; it is not a parallel product source.

## Run

Start the backend stack described in `../strem-infra/README.md`, then:

```bash
npm install
npm run web
```

The gateway defaults to `http://localhost:8000/v1`. Override it with `EXPO_PUBLIC_API_URL`.

Native development:

```bash
npm run ios
npm run android
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo export --platform web
```

## Review gates

Race Mission contracts, source ingestion, calendar access, privacy behavior, health-adjacent AI behavior, and production deployment require the reviews defined in the workspace `AGENTS.md`.
