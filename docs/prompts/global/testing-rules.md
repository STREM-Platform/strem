# Testing Rules

Use this prompt when implementing or reviewing tests.

## Prompt

Testing should scale with risk and blast radius.

For backend services, cover:

- domain behavior
- API validation
- authorization paths
- database persistence
- migration behavior where relevant
- event publishing and consumption
- error handling

For mobile, cover:

- key user flows
- form validation
- loading and error states
- accessibility-relevant interactions
- API integration boundaries

For AI behavior, cover:

- prompt policy boundaries
- unsafe request handling
- insufficient context behavior
- deterministic fixtures where possible
- evaluation cases for core coaching responses

Rules:

- do not write tests that only assert implementation details
- do not weaken tests to make code pass
- add regression tests for bugs
- contract changes require contract tests later
- security-sensitive changes require negative tests

Report what was tested and what was not tested.
