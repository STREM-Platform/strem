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

## How it is built

```
apps/mobile        Expo / React Native app (iOS, Android, web)
services/gateway   FastAPI — the single public API, routes /v1/* to the services
services/auth      FastAPI — accounts and tokens
services/user      FastAPI — profile, race missions, Race Lab layers, race history
services/training  FastAPI — sessions, check-ins, plans, courses, Strava
services/ai        FastAPI + LangGraph — the race team (OpenAI or Anthropic)
deploy/            Docker Compose stack, scripts (migrate, seed demo)
docs/              product.md, architecture decisions (adr/), legal texts
```

Each service has its own Postgres database. The AI service reads athlete data
through the other services' APIs with the athlete's own token.

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
