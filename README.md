# strem-mobile

The primary user-facing STREM app — React Native + Expo + TypeScript, targeting
iOS and Android (with web support via Expo). See
`strem-docs/architecture/adr/0003-use-react-native-expo.md`.

Authentication and session handling are implemented (`strem-mobile#3`): a typed
API client, email + password login/register, secure token storage with
transparent refresh, and an onboarding-aware route guard. The remaining MVP
screens (onboarding, home/profile/log, tribe, missions) land in later issues.

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
├── (onboarding)/
│   └── index.tsx        # onboarding entry (full 7-screen flow lands in #4)
└── (app)/
    ├── home.tsx         # /home — dashboard stub
    ├── log.tsx          # /log — training log stub
    ├── tribe.tsx        # /tribe — tribe stub
    └── profile.tsx      # /profile — profile / rank stub
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
constants/Colors.ts       # STREM color tokens (brand-identity.md)
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
