# Runbook: Code Review

## Purpose

Code review protects STREM's architecture, user trust, and product discipline.

## Review Order

1. Scope: does the PR match the issue?
2. Product: does it respect MVP boundaries?
3. Architecture: does ownership stay correct?
4. Security: are auth, privacy, and secrets safe?
5. Data: are migrations and contracts safe?
6. Behavior: does the implementation work?
7. Tests: do tests cover meaningful risk?
8. Docs: are changed workflows documented?

## Required Attention Areas

- service boundary drift
- direct database coupling
- unversioned contract changes
- AI safety regressions
- logging sensitive data
- weak authorization
- overbroad refactors
- fake placeholder logic

## Review Output

Use severity:

- P0: must fix before merge
- P1: should fix before merge
- P2: fix or explain
- P3: minor

Keep findings specific and actionable.

## Approval Standard

Approve only when the PR is scoped, tested, understandable, and safe to operate.
