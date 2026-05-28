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

## MVP Release Checks

Verify:

- onboarding works
- logging flows work
- AI transformation coach fails safely
- tribe flow works
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
- AI transformation coach errors
- onboarding drop-off
- logging failures

## Rollback

Prefer reversible deployments. If rollback is unsafe because of migrations, use a forward-fix plan documented before release.
