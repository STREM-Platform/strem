# strem-mobile

The primary user-facing STREM app — React Native + Expo + TypeScript, targeting
iOS and Android (with web support via Expo). See
`strem-docs/architecture/adr/0003-use-react-native-expo.md`.

This repository is a **navigable shell**: file-based routing with `expo-router`
and placeholder screens. No business logic, API calls, state management, or auth
flows yet — those land in later issues.

## Run it (Expo Go)

```bash
npm install
npx expo start          # scan the QR code with Expo Go (iOS/Android)
```

Other targets:

```bash
npm run ios             # iOS simulator
npm run android         # Android emulator
npm run web             # web browser
```

## Checks (what CI runs)

```bash
npx tsc --noEmit        # type check (TypeScript strict mode)
npm run lint            # eslint (eslint-config-expo)
npm test -- --passWithNoTests   # jest (no tests yet)
```

CI runs these on every push and PR to `main` (`.github/workflows/ci.yml`,
based on `strem-docs/templates/ci/react-native-ci.yml`). There is no test
runner preset configured yet; `npm test` uses plain `jest --passWithNoTests`
and stays green until real tests are added.

## Screen structure

Routing is file-based (`expo-router`). Route groups `(auth)` and `(app)`
organize the two areas of the app without changing the URL path.

```
app/
├── _layout.tsx          # root Stack navigator
├── index.tsx            # / — loading / splash
├── (auth)/
│   ├── login.tsx        # /login — login stub
│   └── register.tsx     # /register — register stub
└── (app)/
    ├── home.tsx         # /home — dashboard stub
    ├── log.tsx          # /log — training log stub
    ├── tribe.tsx        # /tribe — tribe stub
    └── profile.tsx      # /profile — profile / rank stub
```

Supporting:

```
components/               # shared components (empty for now)
constants/Colors.ts       # STREM color tokens (brand-identity.md)
app.json                  # Expo config (expo-router plugin)
tsconfig.json             # TypeScript strict, "@/*" path alias
eslint.config.js          # eslint-config-expo (flat)
```

## Out of scope (shell)

No API calls, no state management (Redux/Zustand evaluated when needed), no real
auth flow, and no UI component library decision yet. Stubs use basic React
Native components only.
