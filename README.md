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

The Race Mission foundation uses authenticated user-service APIs: create a race,
reload it, correct facts with version protection, archive it, and export/delete
mission records and revisions. It contains no runtime sample race. Empty,
unavailable and conflict states do not substitute fixture data. Optional elevation
and cutoff remain unknown when omitted; entered facts are not organizer-verified.

Plan, course analysis and race-specific AI decisions are explicitly unavailable
until their reviewed backends exist. Generic chat was removed from the Race Team
screen because it does not know the saved mission. No AI use or new integration
permission is implied by saving a race. The navigation describes the product
direction, not a claim that every capability is complete.

Authentication, legal acceptance, athlete profile, consent, action history, and integration status retain their existing API paths.

## Active routes

```text
app/
  (auth)/             login and registration
  (legal)/            policy acceptance and policy reader
  (onboarding)/       focused trail onboarding
  (app)/
    home.tsx          Mission
    mission-setup.tsx  Create/edit real race facts and goal
    mission-data.tsx   Mission-only export, history and permanent deletion
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

Requires the foundation in user-service issue #24: migration `0008_race_missions`
and the gateway `/race-missions` mapping. An older backend shows an unavailable
API state, not an empty account. See the user-service README for safe migration
and rollback. Form drafts exist only while the form is open; saved facts live on
the server. This increment is not a completed Race Pass or production deployment.

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
