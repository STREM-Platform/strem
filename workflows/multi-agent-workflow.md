# Multi-Agent Workflow

STREM is designed for safe parallel AI-agent development.

Parallelism is a tool, not a goal. Do not split work across agents or repositories unless the split reduces risk or cycle time.

## When To Use Multi-Agent Work

Use multiple agents when a feature spans independent responsibilities:

- architecture
- contracts
- backend
- frontend
- tests
- security
- docs
- release

Do not use multiple agents for small changes that one engineer can safely complete.

## Coordinator Role

Every multi-agent effort needs a coordinator. The coordinator owns:

- issue breakdown
- dependency order
- repository boundaries
- contract review timing
- merge order
- final acceptance

## Standard Flow

1. Architecture agent clarifies design.
2. Contract agent proposes API/event changes.
3. Backend agent implements service behavior.
4. Frontend agent implements user experience.
5. QA agent adds tests and acceptance checks.
6. Security agent reviews risk.
7. Docs agent updates documentation.
8. Coordinator merges in dependency order.

## Parallel Safety Rules

- one repository per implementation agent when possible
- one real deliverable per agent
- no agent changes another agent's files without coordination
- contract changes merge before consumers
- migrations merge before dependent behavior only when safe
- review agents do not silently edit implementation

## Required Artifacts

- issue breakdown
- dependency map
- contract notes
- test plan
- risk review
- release notes

## Stop Conditions

Pause multi-agent work if:

- service boundary becomes unclear
- contract changes conflict
- security risk appears
- implementation reveals product ambiguity
- agents are editing the same files repeatedly
- the work is creating process instead of product evidence
