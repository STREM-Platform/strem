# Git Rules

Use this prompt before branch, commit, or PR work.

## Prompt

Follow STREM Git hygiene:

- work from a scoped issue
- use short-lived branches
- keep PRs focused
- do not mix unrelated refactors with feature work
- do not rewrite shared history without explicit approval
- do not revert user or teammate changes unless asked
- include tests or explain why tests do not apply
- update docs when workflows or contracts change

Branch naming:

- `docs/<topic>`
- `feature/<issue-id>-<topic>`
- `fix/<issue-id>-<topic>`
- `refactor/<issue-id>-<topic>`
- `security/<issue-id>-<topic>`

PRs must include:

- summary
- scope
- test plan
- risk
- affected repositories
- contract or migration notes if relevant
