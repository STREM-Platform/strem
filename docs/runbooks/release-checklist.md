# Runbook: Release Checklist

## Before Release

- issue scope completed
- PR approved
- tests pass
- contracts checked
- migrations reviewed
- security-sensitive changes reviewed
- docs updated
- rollback or forward-fix path known
- release notes drafted

## Race Mission Release Checks

Verify:

- onboarding works
- manual evidence and connected-source flows fail honestly
- AI Race Team fails safely and never substitutes fictional athlete data
- Race Mission navigation and live trust controls work
- auth/session behavior is stable
- no sensitive data is exposed in logs

## Deployment Checks

- environment variables configured
- secrets present in the correct store
- database migrations planned
- queues available if needed
- health checks pass
- monitoring signals available

## After Release

Watch:

- errors
- latency
- auth failures
- queue failures
- AI Race Team errors
- onboarding drop-off
- evidence import and consent failures

## Rollback

Prefer reversible deployments. If rollback is unsafe because of migrations, use a forward-fix plan documented before release.
