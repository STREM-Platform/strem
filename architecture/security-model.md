# Security Model

STREM handles identity, performance, nutrition, community, and health-adjacent data. Trust is a core product feature.

## Security Principles

- least privilege
- secure defaults
- explicit consent
- data minimization
- auditability
- defense in depth
- privacy by design
- human review for sensitive automation

## Authentication And Authorization

`strem-auth-service` owns authentication.

Authorization must be explicit at service boundaries. Do not rely on mobile clients or gateway-only checks for sensitive access control.

## Data Sensitivity

Sensitive categories include:

- identity data
- training history
- running history
- nutrition behavior
- health-adjacent signals
- tribe interactions
- AI coach conversations

These require careful access control, retention policy, deletion support, and auditability.

## AI Security

AI-specific risks:

- prompt injection
- unsafe advice
- leakage of personal data
- overconfident recommendations
- unreviewed autonomous actions
- training on private user data without consent

Controls:

- context minimization
- prompt and response policy
- logging metadata without excessive sensitive content
- safety escalation language
- review gates for new AI capabilities

## Secrets

Secrets must never be committed. Use environment variables and secret stores. Documentation may define names and purpose, but not real values.

## GDPR And User Rights

The architecture must support:

- consent tracking
- data export later
- data deletion later
- purpose limitation
- clear privacy policy later
- regional compliance review

## Review Gates

Security review is required for:

- authentication changes
- authorization changes
- user deletion/export flows
- AI context expansion
- payment or subscription systems
- marketplace systems
- health-data integrations
- public API exposure

The current state of boundary authorization (every service verifies the JWT and
scopes ownership itself) is recorded in
[`security-boundary-audit.md`](security-boundary-audit.md), which also holds the
reusable per-endpoint security checklist. Re-run that audit on any
authentication or authorization change.
