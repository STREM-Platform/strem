# CI Workflow Templates

Canonical GitHub Actions CI workflows for STREM repositories. Keeping them here
keeps every service's CI consistent instead of drifting per repo. These mirror
`strem-docs/templates/ci/` — `strem-infra` holds the operational reference copies.

## Templates

| Template | For | Steps |
|----------|-----|-------|
| `python-fastapi-ci.yml` | Backend services (`strem-auth-service`, `strem-user-service`, and future FastAPI services) | ruff → mypy → pytest on Python 3.12 |
| `react-native-ci.yml` | The mobile app (`strem-mobile`) | `tsc --noEmit` → lint → test on Node 20 |

## How to use

1. Copy the matching template into the target repo at `.github/workflows/ci.yml`:
   ```bash
   # backend service
   cp ci-templates/python-fastapi-ci.yml <service-repo>/.github/workflows/ci.yml
   # mobile
   cp ci-templates/react-native-ci.yml strem-mobile/.github/workflows/ci.yml
   ```
2. Commit it in the target repo. CI runs on pushes and PRs to `main`.

Both workflows trigger on `push` and `pull_request` to `main` and fail fast —
the first failing step (lint, type check, or test) stops the run.

## What to customize per repo

**Python (`python-fastapi-ci.yml`)**
- `python-version` — bump if a service pins a newer Python.
- Test step — add coverage flags or markers if the service needs them.
- The workflow expects `requirements.txt` and `requirements-dev.txt`, with `ruff`, `mypy`, and `pytest` available from the dev requirements.

**React Native (`react-native-ci.yml`)**
- `node-version` — align with the Expo SDK's supported Node version.
- The workflow expects `npm ci` (a committed `package-lock.json`), an `npm run lint` script, and `npm test`. `--passWithNoTests` keeps it green before tests exist.

## Out of scope

Deployment workflows, secrets management, and contract/security scanning are
separate concerns handled per repo or in a later phase.
