# Agentic Development Strategy

STREM is designed for AI-assisted development from the beginning. The goal is not to let agents generate uncontrolled code. The goal is to make AI work safe, reviewable, parallel, and aligned with the product architecture.

Agents must protect the product moat as much as they protect the codebase. A technically correct change is still wrong if it pushes STREM toward a generic fitness tracker, calorie logger, dashboard, chatbot, or social feed.

## Supported Agent Types

- architecture agents
- backend agents
- frontend agents
- QA/testing agents
- security review agents
- DevOps agents
- refactoring agents
- documentation agents

## Core Rule

Every agent works from a scoped issue, reads the relevant `AGENTS.md`, and stays inside the repository and subsystem named by the task.

Every agent must also state how the task supports the current product phase. For MVP work, that means supporting identity, consistency, AI transformation coaching, or tribe accountability.

## Agent Boundaries

### Architecture Agents

May propose service boundaries, ADRs, contracts, and tradeoffs. Must not implement code unless explicitly assigned. Must actively challenge premature service creation.

### Backend Agents

May work inside one service at a time. Must not edit another service or shared contracts unless the issue explicitly allows it.

### Frontend Agents

May work inside mobile, web, admin, or dashboard repositories. Must follow existing design system and API contracts.

### QA Agents

May add or improve tests, acceptance criteria, and validation workflows. Must avoid rewriting production behavior unless assigned.

### Security Agents

Review authentication, authorization, privacy, secrets, AI safety, data handling, and dependency risk.

### DevOps Agents

Own CI/CD, environments, deployment, observability, and operational runbooks.

### Refactoring Agents

Must preserve behavior, tests, public contracts, and migration safety.

### Documentation Agents

Maintain docs, prompts, runbooks, ADRs, and templates.

## Parallel Work Rules

- one issue per agent
- one repository per implementation agent unless explicitly coordinated
- no empty repository creation without scoped implementation work
- contract changes reviewed before dependent work merges
- migrations reviewed before deployment
- AI-generated code reviewed before merge
- no hidden cross-service coupling

## Prompt Hierarchy

Agents must apply instructions in this order:

1. system and developer instructions
2. workspace `AGENTS.md`
3. repository `AGENTS.md`
4. service or directory-specific instructions later
5. issue prompt
6. task-specific prompt

## Review Gates

Required review areas:

- shared contracts
- database migrations
- event schemas
- auth/security
- AI coaching behavior
- payment
- marketplace
- deployment

## Future Multi-Agent Workflow

Large features may use:

- architect agent to refine spec
- contract agent to update API/event definitions
- backend agent to implement service behavior
- frontend agent to implement UX
- QA agent to add tests
- security agent to review risk
- docs agent to update runbooks
- release agent to prepare rollout

The coordinator must merge work in dependency order.
