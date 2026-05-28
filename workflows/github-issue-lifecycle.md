# GitHub Issue Lifecycle

Issues are the unit of work for humans and AI agents.

## States

- Triage
- Ready
- In Progress
- Review
- Blocked
- Done

## Triage

Clarify:

- user outcome
- repository
- scope
- acceptance criteria
- product phase
- security/data implications
- contracts affected

## Ready

An issue is ready when:

- owner can start without guessing
- repo and subsystem are named
- out-of-scope items are clear
- acceptance criteria are testable
- review gates are identified

## In Progress

The assignee:

- creates a branch
- reads `AGENTS.md`
- keeps the change focused
- updates the issue when scope changes

## Review

PR links back to issue and includes:

- summary
- test plan
- risk
- contract/migration notes
- screenshots if UI exists later

## Done

Done means:

- acceptance criteria met
- PR merged
- docs updated
- follow-ups captured

## Agent Rule

Do not give AI agents vague issues. A vague issue creates vague architecture.
