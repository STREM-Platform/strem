# strem-mobile

The primary user-facing STREM app — React Native + Expo + TypeScript, targeting
iOS and Android (with web support via Expo). See
`strem-docs/architecture/adr/0003-use-react-native-expo.md`.

Authentication and session handling are implemented (`strem-mobile#3`): a typed
API client, email + password login/register, secure token storage with
transparent refresh, and an onboarding-aware route guard. The remaining MVP
screens (onboarding, home/profile/log, tribe, missions) land in later issues.

## Run the full local MVP demo (web)

The app is backend-driven (no mock data), so it needs the local service stack
running. Bring up the backend first from the sibling `strem-infra` repo
(`docker compose ... up -d --build` → `migrate-stack.py` → `smoke-health.py` →
`seed-demo.py`; see `strem-infra/README.md` → **MVP demo on a laptop**). Then:

```bash
npm install
npm run web             # opens the Expo web build at http://localhost:8081
```

Sign in with the seeded account — `demo@strem.app` / `NeverSettle123!` — and you
land on the dashboard (rank, XP, AI missions), with Log, Nutrition, Tribe, Coach
recap, and Profile all populated from the real services. The app targets the
gateway at `http://localhost:8000/v1` by default (`EXPO_PUBLIC_API_URL` overrides
it). If port `8081` is busy Expo offers `8082+` — that works too (the gateway
allows any localhost origin).

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
├── _layout.tsx          # root: AuthProvider + onboarding-aware route guard
├── index.tsx            # / — loading / splash (shown while the session restores)
├── (auth)/
│   ├── login.tsx        # email + password login
│   └── register.tsx     # account creation
├── (onboarding)/        # the 7-screen identity flow (welcome … launch) + resume
└── (app)/
    ├── home.tsx         # rank/XP/identity + this week's AI missions + CTAs
    ├── log.tsx          # training/running/mobility logging
    ├── nutrition.tsx    # daily nutrition logging + recent days
    ├── tribe.tsx        # tribe state (none/pending/member/admin), join, check-ins
    ├── coach.tsx        # weekly AI coaching recap (narrative)
    └── profile.tsx      # rank, XP progress, and medals
```

Supporting:

```
lib/
├── config.ts            # API base URL (EXPO_PUBLIC_API_URL → gateway)
├── validation.ts        # email / password validation
├── api/
│   ├── types.ts         # auth + onboarding types (mirror the contracts)
│   └── client.ts        # typed fetch client: bearer + 401 refresh-and-retry
└── session/
    ├── tokens.ts        # expo-secure-store token storage
    └── auth-context.tsx # session state, sign in/up/out, route-guard signals
components/form.tsx       # shared TextField / PrimaryButton / FormError
components/ui/            # shared surfaces, headers, status pills, progress, empty states
components/tribe/         # tribe screen-specific presentation components
constants/theme.ts        # STREM design tokens (colors, spacing, type, radius, elevation)
constants/Colors.ts       # compatibility re-export for older imports
```

## Auth & session (`strem-mobile#3`)

- **Typed client** (`lib/api/client.ts`) — configurable base URL, attaches
  `Authorization: Bearer`, and on `401` refreshes via `POST /auth/refresh` and
  retries once; on refresh failure it clears tokens and the session signs out.
- **Secure storage** — access/refresh tokens live in `expo-secure-store`.
- **Route guard** (`app/_layout.tsx`) — unauthenticated → `(auth)`; authenticated
  but onboarding incomplete → `(onboarding)`; complete → `(app)`. Onboarding
  status comes from `GET /users/onboarding/status`.

Set `EXPO_PUBLIC_API_URL` to point at the API gateway (which routes to the auth
and user services); it defaults to the local gateway port.
