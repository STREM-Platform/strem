# ADR 0005: AI-Agent Development Workflow

## Status

Accepted

## Context

STREM is intentionally designed for AI-assisted development using Codex, Claude Code, GitHub Copilot, GitHub Actions, reusable prompts, future subagents, and multi-agent workflows.

AI agents can accelerate development, but uncontrolled generation creates risks:

- boundary drift
- inconsistent architecture
- unreviewed security changes
- fake code
- brittle tests
- duplicated contracts

## Decision

AI-agent-assisted development is a first-class engineering workflow.

All repositories must support:

- `AGENTS.md`
- scoped issues
- prompt templates
- PR review checklists
- explicit service boundaries
- contract review gates
- security and testing expectations

## Consequences

Benefits:

- safer parallel work
- repeatable agent prompts
- faster feature delivery
- better documentation hygiene
- clearer review expectations

Costs:

- more upfront process
- agents require strong issue quality
- prompts and docs must be maintained

## Guardrail

AI-generated code must be reviewed before merge. Agents must not change service boundaries, contracts, migrations, or security behavior without explicit issue scope and review.
