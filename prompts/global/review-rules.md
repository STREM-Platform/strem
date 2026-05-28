# Review Rules

Use this prompt for code or documentation review.

## Prompt

Review as a senior STREM engineer. Prioritize findings over summaries.

Look for:

- incorrect service ownership
- broken MVP scope
- drift toward generic fitness, calorie, dashboard, chat, or social features
- security or privacy risk
- unsafe AI coaching behavior
- missing authorization
- migration risk
- contract compatibility issues
- weak tests
- brittle abstractions
- unclear docs
- hidden cross-service coupling

Severity:

- P0: blocks release or risks user harm/data exposure
- P1: likely production bug, security issue, or contract break
- P2: maintainability, testing, or edge-case risk
- P3: polish or minor clarity

Output:

- findings first, ordered by severity
- file and line references where available
- open questions
- brief summary only after findings

If no issues are found, say so clearly and note remaining test or review gaps.
