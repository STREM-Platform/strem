# STREM

**The AI race team for self-coached trail runners.** You commit to a race; STREM
turns your training data, your race and what you tell it into a week-by-week plan,
a race-day kit (fuel, gear, logistics, strategy) and a race team you can talk to.

The name comes from the Bulgarian *стремеж* — striving, upward movement.

## What it does

- **Race Mission** — pick a race (date, distance, climbing, checkpoints) and a goal.
- **Training plan** — built from your race and the training you already do, adapted
  when you miss sessions (every change waits for your review).
- **Race Lab** — course analysis from your GPX, plus fuel, gear, logistics and a
  checkpoint-by-checkpoint race strategy.
- **Race team** — specialists (coach, fuel, course, gear, logistics) that answer
  from your own data and remember what you tell them.
- **Race-day mode** — an offline race pack with live station cues; the finish feeds
  the debrief and your race history.
- **Your data** — export or delete everything, including your account.

## Architecture

```mermaid
flowchart LR
    subgraph CLIENTS["Athletes"]
        direction TB
        MOB["📱 STREM app<br/>Expo · React Native<br/>iOS · Android"]
        WEB["🌐 STREM web<br/>Expo web build<br/>Vercel CDN"]
    end

    subgraph VM["Server · Docker Compose"]
        direction LR
        CADDY["🔒 Caddy<br/>HTTPS · auto certificates"]
        GW["API gateway<br/>FastAPI · /v1 routing<br/>CORS · rate limits"]

        subgraph SERVICES["Domain services · FastAPI"]
            direction TB
            AUTH["auth<br/>accounts · JWT<br/>rotating refresh tokens"]
            USER["user<br/>profile · race missions<br/>Race Lab layers · history"]
            TRAIN["training<br/>sessions · check-ins · plans<br/>GPX courses · sync"]
            AI["🧠 ai · LangGraph race team<br/>race engine · specialists<br/>memory · plan review<br/>daily AI limit"]
        end

        subgraph DATA["Data"]
            direction TB
            PG[("PostgreSQL 16<br/>one database<br/>per service")]
            REDIS[("Redis<br/>rate limits")]
            BACKUP["🗄️ Nightly backup<br/>7 days kept"]
        end
    end

    subgraph EXT["External APIs"]
        direction TB
        LLM["OpenAI · Anthropic<br/>language models"]
        METEO["Open-Meteo<br/>weather · geocoding"]
        PHOTOS["Openverse · Wikimedia<br/>race photos"]
        SOURCES["Strava · Whoop<br/>activities · recovery"]
    end

    MOB -->|"HTTPS · bearer token"| CADDY
    WEB -->|"HTTPS · bearer token"| CADDY
    CADDY --> GW
    GW --> AUTH & USER & TRAIN & AI
    GW -.-> REDIS
    AUTH & USER & TRAIN & AI --> PG
    AI -->|"athlete context"| USER
    AI --> TRAIN
    USER <-->|"deletion fence"| TRAIN
    AI --> LLM & METEO & PHOTOS
    TRAIN --> SOURCES
    PG -.-> BACKUP

    classDef client fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef edge fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef svc fill:#ecfdf5,stroke:#059669,color:#064e3b
    classDef ai fill:#f5f3ff,stroke:#7c3aed,color:#3b0764
    classDef data fill:#f1f5f9,stroke:#475569,color:#0f172a
    classDef ext fill:#fff1f2,stroke:#e11d48,color:#881337
    class MOB,WEB client
    class CADDY,GW edge
    class AUTH,USER,TRAIN svc
    class AI ai
    class PG,REDIS,BACKUP data
    class LLM,SOURCES,METEO,PHOTOS ext
    style CLIENTS fill:#f8fafc,stroke:#94a3b8,color:#334155
    style VM fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#334155
    style SERVICES fill:#ffffff,stroke:#cbd5e1,color:#334155
    style DATA fill:#ffffff,stroke:#cbd5e1,color:#334155
    style EXT fill:#f8fafc,stroke:#94a3b8,color:#334155
```

**How a request flows.** The app sends every call to one public address. Caddy
terminates HTTPS and hands it to the gateway, which rate-limits per client and token
and forwards `/v1/<area>/…` to the service that owns that data. Services never read
each other's databases: the AI service reads the athlete's missions, plans and
check-ins through the other services' APIs, using the athlete's own token, so it can
only ever see what that athlete can see.

**How the race team thinks.** A deterministic race engine always builds the plan and
every Race Lab layer first. When an AI provider is available, a LangGraph graph routes
the question to specialists (coach, fuel, course, gear, logistics) that answer from the
athlete's data and long-term memory, and a review graph pauses every plan change until
the athlete approves it. Every output carries its origin (engine, AI or athlete), and
without an API key, credit or daily allowance the engine carries on and the app says so.

### Delivery

```mermaid
flowchart LR
    PR["Pull request"] --> CI["CI · GitHub Actions<br/>ruff · mypy · pytest<br/>tsc · eslint · jest"]
    CI -->|"owner tests and merges"| MAIN["main"]
    MAIN -->|"CI green"| IMG["Build 5 images<br/>linux/arm64"]
    IMG --> GHCR[("GHCR<br/>strem-*:commit")]
    GHCR --> DEPLOY["SSH deploy<br/>pull → migrate → up --wait<br/>→ /health check"]
    DEPLOY --> SERVER["Oracle server"]
    MAIN -->|"every push"| VERCEL["Vercel<br/>web build and CDN"]

    classDef step fill:#ecfdf5,stroke:#059669,color:#064e3b
    classDef target fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    class PR,CI,MAIN,IMG,DEPLOY step
    class GHCR,SERVER,VERCEL target
```

### Code layout

| Path | What it is | Database |
|---|---|---|
| `apps/mobile` | Expo / React Native app for iOS, Android and web | — |
| `services/gateway` | The single public API: routes `/v1/*`, CORS, rate limits | Redis |
| `services/auth` | Accounts, JWT access tokens, rotating refresh tokens | `strem_auth` |
| `services/user` | Profile, race missions, Race Lab layers, race history, legal acceptance | `strem_user` |
| `services/training` | Sessions, check-ins, plans, GPX courses, Strava and Whoop | `strem_training` |
| `services/ai` | LangGraph race team, race engine, memory, daily AI limit (OpenAI or Anthropic) | `strem_ai` |
| `deploy/` | Docker Compose (local and production), Caddy, scripts (migrate, seed, backup) | — |
| `docs/` | Product description and legal texts | — |

Each service owns its database and its schema migrations (Alembic, one initial
revision plus whatever comes after it).

## Run it locally

Needs Docker and Node 20.

```bash
cp deploy/.env.example deploy/.env        # add OPENAI_API_KEY for the AI race team
docker compose --env-file deploy/.env -f deploy/docker/docker-compose.yml up -d --build
python deploy/scripts/migrate-stack.py    # database migrations
python deploy/scripts/seed-demo.py        # demo athlete: race-demo@strem.app / NeverSettle123!

cd apps/mobile && npm ci
EXPO_PUBLIC_API_URL=http://localhost:8000/v1 npx expo start --web
```

Without an AI key everything still works: the rule-based engine builds plans and
Race Lab, and the app says when the AI was not used.

## Tests

- Services: `cd services/<name> && pip install -r requirements.txt -r requirements-dev.txt && ruff check . && mypy . && pytest`
- App: `cd apps/mobile && npm ci && npx tsc --noEmit && npm run lint && npm test`
- End to end (starts every service on SQLite): `cd apps/mobile && npx playwright test`

CI runs all of this on every pull request.

## License

[MIT](LICENSE)
