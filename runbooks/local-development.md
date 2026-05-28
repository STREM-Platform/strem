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

## Future Local Stack

`strem-infra` will eventually provide Docker Compose for:

- PostgreSQL
- Redis
- RabbitMQ
- local service dependencies

## Environment Files

Example environment files may be committed later. Real secrets must never be committed.

## Verification

Each repository should document:

- install command
- run command
- test command
- lint command
- build command if applicable

## Current Phase

For the documentation foundation, local development means Markdown edits only.
