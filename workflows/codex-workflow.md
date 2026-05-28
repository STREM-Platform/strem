# Codex Workflow

Codex should be used as an implementation, review, refactoring, documentation, and planning agent with explicit scope.

## Before Work

Codex must read:

- workspace `AGENTS.md`
- repository `AGENTS.md`
- issue or user request
- relevant architecture docs

## Good Codex Tasks

- implement a scoped feature
- write tests
- review PRs
- update docs
- refactor inside one module
- generate migration plan
- debug failing tests
- draft ADRs

## Bad Codex Tasks

- "build STREM"
- "create all services"
- "make the app production-ready"
- "refactor everything"
- "add AI everywhere"

## Codex Prompt Shape

Include:

- repository
- issue
- exact scope
- files or subsystem
- acceptance criteria
- test expectations
- out-of-scope items

## Completion Standard

Codex should report:

- changed files
- verification run
- risks
- follow-ups

For docs-only work, Codex must not add runtime code.
