# Code Style Rules

Use this prompt when implementation repositories exist.

## Prompt

Follow the local repository style before introducing new patterns.

Backend defaults:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic-style request/response validation where appropriate
- explicit service boundaries
- typed functions where useful
- structured error handling

Mobile defaults:

- React Native
- Expo
- TypeScript
- accessible UI
- mobile-first flows
- no premature web/admin assumptions

General rules:

- write simple code first
- avoid clever abstractions
- keep modules cohesive
- name domain concepts clearly
- make errors observable
- avoid leaking secrets or personal data
- avoid placeholder comments that do not explain intent
- do not generate unused files

Do not implement code in `strem-docs`.
