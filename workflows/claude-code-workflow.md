# Claude Code Workflow

Claude Code can be used for planning, implementation, review, large-context refactoring, and future subagent coordination.

## Usage Pattern

1. Provide scoped issue.
2. Point Claude Code to `AGENTS.md`.
3. Provide relevant docs or ask it to inspect them.
4. Require a plan for broad changes.
5. Limit implementation to named repositories and files.
6. Require tests and final verification.

## Strong Claude Code Tasks

- analyze architecture tradeoffs
- inspect large code areas
- coordinate multi-file refactors
- draft detailed test plans
- review security-sensitive changes
- update documentation sets

## Subagent Future

Future Claude Code subagents may include:

- architecture reviewer
- backend implementer
- frontend implementer
- QA engineer
- security reviewer
- DevOps reviewer
- documentation maintainer

## Guardrails

- no cross-service changes without explicit scope
- no contract changes without review
- no migration changes without review
- no AI safety changes without review
- no postponed MVP features unless approved

## Output Standard

Require:

- concise summary
- files changed
- tests run
- risks
- unresolved questions
