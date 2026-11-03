# Runbook: Local Development

This runbook defines expectations before implementation repositories exist.

## Workspace Layout

Local workspace:

- `C:\strem-platform\strem-docs`
- `C:\strem-platform\strem-shared-contracts`
- `C:\strem-platform\strem-infra`
- future service and app repositories

Each repository owns its own Git history.

## Before Working

1. Pull latest repository changes.
2. Read `AGENTS.md`.
3. Confirm the issue scope.
4. Check repository status.
5. Avoid touching unrelated files.

## Local Stack

`strem-infra` runs the whole platform with Docker Compose: PostgreSQL, Redis, auth,
user, training, the AI orchestrator and the gateway on `http://localhost:8000/v1`.

```bash
cd strem-infra
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
python scripts/migrate-stack.py
python scripts/seed-demo.py          # demo athlete: race-demo@strem.app
```

Then start the app from `strem-mobile` with `npm run web`. See the infra and mobile
READMEs for details.

## Environment Files

Example environment files may be committed later. Real secrets must never be committed.

## Verification

Each repository should document:

- install command
- run command
- test command
- lint command
- build command if applicable

## This Repository

In `strem-docs`, local development means Markdown edits only.
