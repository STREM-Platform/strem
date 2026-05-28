# Feature Build Prompt

Use this template for future implementation agents.

---

## Prompt

You are implementing a scoped STREM feature.

Feature:

- Name:
- Issue:
- Repository:
- Service or app:
- User outcome:
- Product phase:
- Transformation loop supported:
- Transformation value: Which of the four moat pillars does this serve? (identity transformation / behavioral adaptation / tribe accountability / progression immersion)
- Acceptance criteria:

---

## Before Coding

1. Read `AGENTS.md`.
2. Read `prompts/global/agent-rules.md` and run the anti-drift checklist.
3. Read related architecture and product docs:
   - If this involves game mechanics: read `product/game-systems.md`
   - If this involves tribe features: read `product/tribe-design.md`
   - If this involves AI behavior or missions: read `architecture/ai-architecture.md`
   - If scope is unclear: read `product/mvp-scope.md` and `product/feature-map.md`
4. Identify the owned domain and data boundaries.
5. Identify contracts affected.
6. Identify tests required.
7. Answer the transformation value question: which moat pillar does this feature serve, and how?

---

## Transformation Value Check

Before implementing, confirm:

- Does this feature make the user feel like a stronger, more disciplined version of themselves?
- Does it reinforce identity transformation, behavioral adaptation, tribe accountability, or progression immersion?
- Does it avoid social follower counts, public like systems, calorie shaming, or dark pattern notifications?
- Is it within MVP scope as defined in `product/mvp-scope.md`? If not, stop and confirm with the issue author.

If you cannot answer these questions confidently, stop and surface the ambiguity before writing code.

---

## Constraints

- Stay inside the named repository unless the issue scope explicitly authorizes cross-service work
- Do not change shared contracts without contract review
- Do not introduce future-phase features (V2 and beyond) into MVP scope
- Do not add placeholder code or boilerplate for unscoped services
- Do not add generic tracking, dashboard, chat, or social behavior unless it directly supports the transformation outcome in the issue
- Preserve security and privacy assumptions
- XP events should be fired as domain events (RabbitMQ), not direct service calls
- Game mechanics must follow the specification in `product/game-systems.md` — do not invent new XP values, rank thresholds, or medal conditions without explicit approval

---

## Deliver

- implementation
- focused tests
- documentation update if behavior changes
- transformation value summary in the final verification: which pillar was served and how
- clear final verification summary: what changed, how it was tested, what risks remain
