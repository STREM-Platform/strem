# ADR 0010: The race team on LangGraph, with an athlete context that uses everything the athlete tells us

## Status and scope

Proposed for founder review, 2026-11-01 (`strem-docs#36`). Founder direction: the AI
layer should be built mainly with LangGraph/LangChain, and it must use all the
context the athlete gives — "that is the main idea".

Extends [ADR 0008](0008-race-os-layers-and-race-engine.md) (race engine first, AI
personalises) and [ADR 0009](0009-athlete-timeline-seasons.md). Implementation:
`strem-ai-orchestrator#58` (LangGraph) and `#59` (athlete context), with `#35`
(evidence snapshot), `#37` (evals) and `#45` (race memory) folded in.

Review gates that apply: AI behaviour that affects athlete safety; privacy and
health-data handling (athlete memory is new derived health data); a new Postgres
table and checkpoint tables in the orchestrator's own database.

## Where we are

- **Orchestration is hand-written.** `service.py` calls the engine, then one of
  two hand-written provider clients (`ai/client.py` for Anthropic,
  `ai/openai_client.py` for OpenAI) with a JSON schema, then validates. Each
  feature (brief, chat, layers, plan, adapt, import) repeats that pattern.
- **Context is one text block.** `load_context()` reads mission, profile, plan,
  progress, layers, sessions, check-ins, recovery, race history and conditions from
  the owning services into a `RaceContext`; `render()` flattens it into about 15
  provenance-labelled sections sent with every call.
- **Fixed caps decide what the AI sees**: the last 12 sessions, 7 check-ins, 7
  recovery days, 12 past races and 20 chat turns. Nothing is retrieved for the
  question being asked.
- **The athlete's own words fade.** What they say in chat is gone after 20 turns;
  check-in notes, debrief lessons and setup answers are only partly included.
- **Legacy tables remain.** `missions`, `weekly_recaps`, `behavioral_trigger_state`,
  `agent_memory` and `agent_actions` are pre-pivot leftovers.
- **AI-held athlete data is outside export/purge.** `race_chat_messages`,
  `race_briefs` and `race_proposals` are not covered by the ADR 0007 export and
  deletion flow.

## Decision

### 1. LangGraph orchestrates the race team

One compiled graph per capability, sharing nodes and tools:

```
                 ┌──────────── core context (always) ────────────┐
athlete message → router ─┬→ coach ──┐
                          ├→ fuel ───┤   tools: training, check-ins, recovery,
                          ├→ course ─┼─→ races, course, layers, plan week,
                          ├→ gear ───┤   conditions, search_memory, engine.*
                          ├→ logistics┤
                          └→ strategy ┘→ composer → guard → answer
                                                    └→ proposal? → interrupt (athlete reviews)
after every turn: memory extractor → athlete memory (see 3)
```

- **Specialists are nodes**, not prompts glued into one call. Each has its own
  instructions, the tools it may use and an output schema. The router picks one or
  more; the composer merges their answers into one reply with citations.
- **The race engine stays.** Its functions (`build_plan`, `build_fuel`,
  `adapt.missed`, `checkpoint_plan`, …) become tools and fixed nodes. Builds are
  subgraphs: *engine draft → AI personalise → validate*, with today's guards
  (protected sections, volume and taper limits, `KEEP_SECTIONS`). When no model is
  available the graph runs the engine path only and says so (`origin: engine`,
  `ai_reason`) — the offline behaviour does not change.
- **Plan changes pause for the athlete.** Adaptations, missed-training
  adjustments, season drafts and B/C race fitting end in a LangGraph *interrupt*:
  the proposal is stored, the cockpit shows it (mobile#119), and only
  accept/adjust/dismiss resumes the graph. Nothing is written to a plan without
  that review.
- **Conversations persist** in the LangGraph Postgres checkpointer (orchestrator
  database, one thread per athlete and mission). The 20-turn window goes away;
  long threads are summarised into the checkpoint state.
- **Answers stream** to the app.

### 2. LangChain is the model layer

`ChatAnthropic` and `ChatOpenAI` (with structured output and a fallback chain)
replace both hand-written clients. The configured provider and model stay
environment settings (`AI_PROVIDER`, model ids), as today; quotas and failover
follow `ai#47`. LangChain is used for models, messages, tools and structured
output. Its higher-level chains and agents are not used: LangGraph owns the control
flow.

### 3. Athlete context: core, retrieval and memory

The AI should use everything the athlete gives, without dumping all of it into
every call.

- **Core context, always sent** (a token budget of about 1.5k): race, date and days
  to go, priority, goal and motivation in the athlete's words, constraints
  (schedule, equipment, diet), injuries and medical flags, current phase and week,
  today's check-in read, and the newest race-memory lessons.
- **Retrieval tools for everything else.** The specialist asks for what the
  question needs instead of fixed caps:
  - `training(start, end, sport?)` and `long_sessions(n)`
  - `checkins(days)` and `recovery(days)`
  - `races(filter)`, for example every race where GI issues were reported
  - `course(section?)`, `layer(kind)` and `plan_week(date)`
  - `conditions()` and `search_memory(query)`

  Tools read through the owning services, exactly as `load_context()` does today.
  No service boundary changes.
- **Athlete memory** (new table `athlete_memory` in the orchestrator database). A
  memory item is a short statement such as "left knee hurts on long descents" or
  "prefers training before work". It carries:
  - a kind: `injury`, `preference`, `constraint`, `goal`, `lesson`, `context` or
    `other`;
  - its source (a chat message, check-in note, debrief, setup answer or race
    result) with the date;
  - a confidence;
  - a `superseded_by` link, so a newer statement replaces an older one.

  An extractor node runs after each chat turn and when check-in notes, debriefs or
  setup answers are saved. Retrieval starts with keyword, kind and recency in
  Postgres; vector search (pgvector) comes only if evals show the need, so no new
  infrastructure is required.
- **Long histories are summarised**: per-week training digests and per-race
  summaries are cached and refreshed when their inputs change, using the same
  digest idea as today's brief cache.
- **Provenance stays visible.** Every fact keeps its tag (`athlete`, `recorded`,
  `calculated`, `plan`, `official`, `assumption`), and answers cite the memory
  items and data they used.

### 4. Transparency, control and privacy

- "What your race team knows" lists the memory items. The athlete can correct or
  delete any of them, and deleting one removes it from future context immediately.
- Athlete memory, chat checkpoints, briefs and proposals join the ADR 0007
  export and purge. Deleting the account or mission data removes them.
- **Tracing never sends health data to a third party by default.** LangSmith stays
  off; local OpenTelemetry spans carry ids and timings, not content. Enabling a
  hosted tracer needs its own privacy review (docs#33).
- Safety guards stay deterministic and run after the model: illness and pain route
  to rest and professional advice, volume and ramp limits apply, and the medical
  disclaimer is respected.

### 5. Evals decide each step

`ai#37` becomes the gate. A fixed set of athlete scenarios is run against the
legacy path and the graph, and the graph replaces a capability only when it is at
least as grounded and safe. The set includes:
- a knee issue mentioned once in chat two months ago;
- three poor nights before a key session;
- GI trouble in a past race;
- a B race inside an A-race build.

## Migration (each phase one PR, legacy path kept until parity)

1. Model layer on LangChain; delete `ai/client.py` and `ai/openai_client.py`.
2. Chat as the graph, with core context, retrieval tools and the Postgres
   checkpointer, behind `RACE_TEAM_GRAPH=1`. Run the evals.
3. Athlete memory: extraction, the store, the app view with delete, and
   export/purge.
4. Proposals with interrupts (adapt, missed training, seasons) feeding the cockpit.
5. Layer and plan builds as subgraphs; brief and cockpit read the same core context.
6. Remove the legacy path, `render()`'s fixed caps and the pre-pivot tables.

Dependencies to add: `langgraph`, `langgraph-checkpoint-postgres`, `langchain-core`,
`langchain-anthropic` and `langchain-openai`. Local Docker images cannot reach PyPI
through the Avast TLS proxy, so installing them needs the CA bundle passed to pip.

## Consequences

- One orchestration model instead of per-feature glue. Most of `service.py` and
  both provider clients go away, which feeds the code-health epic (`docs#35`).
- The AI sees what the question needs, including things said months ago, and
  every answer shows where its facts came from.
- New derived health data (athlete memory) is created. It is visible, editable,
  deletable and exported, but it needs the privacy review before launch.
- Two new framework dependencies that need upgrade discipline. Pin them, and let the
  eval set catch behaviour drift on upgrades.
- Not decided here: hosted tracing, vector search, and moving any engine logic
  into prompts. The engine remains the source of numbers.
