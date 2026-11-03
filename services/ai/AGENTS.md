# strem-ai-orchestrator — Agent Guide

This service is the MVP AI transformation coach. It owns structured weekly
missions, weekly narrative coaching recaps, behavioral trigger state, and AI
response metadata. Read this before any change, along with `strem-docs/AGENTS.md`,
`strem-docs/architecture/ai-architecture.md`, and
`strem-docs/prompts/global/agent-rules.md`.

It is a **narrative coaching system, not a chatbot or data tool**.

## Owned vs. not owned

- **Owns**: missions + their state history, weekly recaps, trigger state, and AI
  response metadata; the `ai.mission_generated`, `ai.mission_completed`, and
  `ai.coach_summary_created` events.
- **Does not own**: training, nutrition, tribe, or XP records. It **never copies
  raw logs** into its own database (ai-architecture.md "Context Privacy"); it
  reads identity context per request from approved service APIs. XP is awarded by
  `strem-user-service` (which consumes `ai.mission_completed`).

## Rules

1. **Contract is the source of truth.** Endpoints, mission fields, and enums
   match `strem-shared-contracts/contracts/ai/openapi.yml`. Event payloads match
   `events/ai.*.schema.json` (version 1). Mission `type`/`difficulty`/`state`
   enums come from `ai-architecture.md` — do not invent values.
2. **Bounded generation.** Missions are structured objects, not free-form chat.
   There is no open chat surface in MVP. Difficulty adapts to recent consistency;
   a returning user only ever gets a `re-entry` first mission.
3. **Safety is non-negotiable.** No medical or injury diagnosis, extreme-diet
   prescription, supplement dosing, or crisis counseling — redirect to a
   professional, framed as care, never punishment (`app/safety.py`).
4. **No raw-log storage.** Fetch context via approved APIs; store only summaries,
   mission state, trigger state, and response metadata.
5. **Gates must pass.** `ruff check .`, `mypy .` (strict), and `pytest`.

## Boundaries (MVP)

In scope: structured weekly missions (generate/complete/skip/expire), the weekly
narrative recap, safety filters, and the AI events. Out of scope: LLM provider
selection, RAG, audio/video, AI avatar, push notifications, autonomous
multi-agent behavior, and unbounded chat.
