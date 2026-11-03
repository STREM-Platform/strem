# Runbook: Incident Response

Use this when production systems exist.

## Severity

- SEV1: user data exposure, widespread outage, unsafe AI behavior at scale
- SEV2: major feature unavailable, degraded auth, high error rate
- SEV3: localized bug with workaround
- SEV4: minor operational issue

## First Response

1. Identify impact.
2. Assign incident lead.
3. Open incident channel or issue.
4. Stop the bleeding.
5. Preserve evidence.
6. Communicate status.

## STREM-Specific Risks

- authentication outage
- data privacy incident
- nutrition/training data corruption
- unsafe AI transformation coaching response
- tribe moderation failure
- payment incident later

## Containment

Options:

- disable feature flag
- rollback
- pause queue consumer
- block unsafe AI prompt path
- revoke compromised credential
- isolate affected service

## Post-Incident

Create a written review:

- timeline
- root cause
- user impact
- detection gap
- action items
- owner and deadline

Avoid blame. Improve the system.
