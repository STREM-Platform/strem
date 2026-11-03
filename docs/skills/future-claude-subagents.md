# Future Claude Subagents

STREM can later use Claude Code subagents for parallel workflows.

## Proposed Subagents

### Architecture Reviewer

Responsibilities:

- service boundaries
- ADR consistency
- contract ownership
- data ownership
- roadmap alignment

### Backend Implementer

Responsibilities:

- one backend service at a time
- FastAPI behavior
- SQLAlchemy models inside service boundary
- Alembic migrations
- tests

### Frontend Implementer

Responsibilities:

- React Native/Expo screens
- TypeScript components
- API integration
- loading, error, empty states
- accessibility

### QA Engineer

Responsibilities:

- test plans
- regression tests
- acceptance criteria
- coverage of risk areas

### Security Reviewer

Responsibilities:

- auth
- authorization
- secrets
- privacy
- AI safety
- dependency risk

### DevOps Engineer

Responsibilities:

- GitHub Actions
- Docker Compose
- environment strategy
- deployment
- observability

### Documentation Maintainer

Responsibilities:

- docs updates
- runbooks
- templates
- prompts
- ADR hygiene

## Coordination Model

Subagents should not all edit freely. A coordinator assigns scoped work, orders dependencies, and resolves conflicts.

## Merge Order

Recommended order:

1. architecture and contracts
2. backend
3. frontend
4. tests and security
5. docs
6. release
