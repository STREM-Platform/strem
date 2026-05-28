# AI Architecture

STREM's AI system augments human effort, reduces decision fatigue, and makes user progress easier to understand and act on. It is a narrative coaching system, not a data analysis tool. It must not act as an unbounded medical, injury, or nutrition authority.

---

## Service Boundary

AI behavior belongs in `strem-ai-orchestrator`.

The orchestrator owns:

- AI transformation coach conversations
- mission generation pipeline
- behavioral adaptation engine
- prompt policy and safety filters
- context assembly
- AI response logging metadata
- future RAG
- future multi-agent orchestration

It does not own:

- user profile records
- training logs
- nutrition logs
- tribe records
- payments
- coach-client records

Domain services remain the source of truth. The orchestrator requests approved context through service APIs or contract-defined interfaces.

---

## MVP AI Transformation Coach

The MVP AI transformation coach:

- summarizes recent logs across all pillars (movement, nutrition, recovery, tribe)
- identifies behavioral patterns and friction
- connects actions to the user's chosen identity from onboarding
- identifies re-entry opportunities after missed days
- suggests next actions and systems
- generates weekly missions (structured objects, not chat messages)
- delivers weekly narrative coaching recaps
- asks clarifying questions when context is insufficient
- avoids diagnosis, medical claims, and unsafe certainty

The AI coach is not a chatbot. It is a narrative companion that knows the user's transformation story and reflects it back with clarity.

---

## Mission Generation Pipeline

Missions are structured AI-generated behavioral objectives covering all transformation pillars — not only training recommendations.

### Context Bundle

When generating missions, the orchestrator assembles a context bundle from approved service APIs:

| Context Source | Data Window |
|----------------|-------------|
| Training and running logs | Last 14 days |
| Nutrition logs | Last 7 days |
| Recovery logs | Last 7 days |
| Tribe check-in activity | Last 7 days |
| Current rank and XP | Current state |
| Active challenges | Current state |
| Past mission completion rate | Last 30 days |
| Stated identity goal (from onboarding) | Persistent |
| Consistency streak status | Current state |
| Pillar XP breakdown (last 30 days) | Last 30 days |

### Context Priority

When context signals conflict (e.g., high training volume but poor recovery), the coach applies this priority order:

1. Identity goal — what is this user trying to become?
2. Safety signals — is there a physical or mental health risk signal present?
3. Recent performance — what has the user actually done in the last 14 days?
4. Tribe state — is the tribe active, cold, or in an active challenge?
5. Consistency score — how consistent has logging been?
6. Nutrition and recovery — are the supporting pillars being addressed?

The AI coach always grounds its response in the user's identity first, then data. "You said you want to become a hybrid athlete. This week your strength consistency is strong but your running has dropped. Here is the mission that keeps both pillars moving."

### Mission Output Structure

Missions are stored as structured objects, not chat messages:

```
{
  title: string,
  description: string,
  duration_days: number,
  xp_reward: number,
  type: "performance" | "recovery" | "tribe" | "discipline" | "nutrition" | "hybrid",
  completion_condition: string,
  difficulty: "re-entry" | "maintenance" | "growth" | "challenge"
}
```

Missions are tracked, completed, expired, or skipped — not just displayed and forgotten.

### Mission Generation Cadence

- Weekly mission generation: every Monday, 1–3 missions generated per active user
- Re-entry mission: triggered when user has not logged in 3+ days — difficulty set to "re-entry" (smallest achievable step)
- Milestone-triggered mission: when user is close to rank advancement or challenge completion, a targeted mission is generated

### Mission Difficulty Adaptation

Mission difficulty adapts to recent consistency:

- Consistent user (5–7 active days last week): difficulty = "growth" or "challenge"
- Moderate user (3–4 active days last week): difficulty = "maintenance"
- Inconsistent user (1–2 active days last week): difficulty = "maintenance" or "re-entry"
- Returning user (0 active days last week): difficulty = "re-entry" only

The system never prescribes an aggressive mission to a returning user. The re-entry door must be small enough to actually walk through.

---

## Behavioral Adaptation Engine

The behavioral adaptation engine monitors patterns over time and triggers proactive interventions — not just in response to user requests.

### Trigger Conditions

| Signal | Action |
|--------|--------|
| 3+ consecutive days with no logging | Generate re-entry mission, send gentle return nudge |
| 7+ consecutive days with no logging | Escalate to AI coach re-engagement message referencing tribe activity and identity goal |
| High volume (5+ sessions/week) + declining recovery scores | Prescribe recovery week mission; temporarily reduce intensity recommendations |
| Consecutive high-intensity weeks without recovery logging | Burnout risk alert; mandatory recovery focus mission |
| Tribe going cold (no tribe check-ins for 5+ days) | Generate tribe-focused mission to re-engage collective |
| User within 500 XP of rank advancement | Generate milestone-proximity mission; surface rank progress clearly in coaching response |
| 7-day streak approaching | Surface streak bonus information to maintain momentum |
| 30-day streak approaching | Surface streak bonus and coach delivers narrative acknowledgment |
| Mission completion rate dropping below 50% | Reduce mission difficulty automatically; investigate friction via coach question |

### Burnout Detection

Burnout signal: any combination of:
- 21+ consecutive days of logged high-intensity training
- Declining recovery logs in the same period
- Decreasing session quality signals (if available)
- Increasing missed days despite recent consistency

Response: mandatory recovery week mission (XP bonus for completing recovery actions, not training). Coach delivers acknowledgment: "You've pushed hard for three weeks. The next step forward is rest — not more volume."

### What the Engine Does Not Do

The adaptation engine does not:
- Send notifications more than once per day per user
- Generate missions for users who have not opted into the mission system
- Override user-stated rest days or vacation periods
- Create urgency around streak preservation (the goal is return, not anxiety)

---

## Narrative Coaching

The AI coach is designed to narrate transformation, not just analyze data.

### Weekly Coaching Recap

Delivered Sunday evening. Contains:
- Summary of the week's activity across all pillars
- Pattern recognition: what was consistent, where friction appeared
- Connection to identity: how this week's behavior aligns with or challenges the stated identity goal
- Narrative framing: this week as a chapter in the user's ongoing transformation arc
- Next week setup: preview of upcoming missions and any active challenges

The weekly recap is the product's highest-value retention touchpoint. It must feel like a coach who knows your story, not a metrics report.

### Response Style

The AI coach:
- uses first-person-aware language ("you've been building toward this for 8 weeks")
- references the user's stated identity goal explicitly
- names difficulty honestly without shame ("missing three days happens — here's how we return")
- celebrates progress with specificity ("you ran 45km this month, 17km more than last month")
- sets forward-looking tension with ambition ("next week's challenge moves you to Hybrid rank")

The AI coach does not:
- use generic motivational language without personalization
- repeat the same framing week after week
- avoid naming friction
- overpraise minor behaviors

---

## Safety Rules and Escalation Protocol

AI responses must be bounded by available data, honest about uncertainty, and calibrated to avoid harm.

### General Rules

- Disclose uncertainty when data is insufficient: "I don't have enough context to give you a specific recommendation — here's what I do know."
- Respect user autonomy: offer, don't prescribe
- Avoid extreme diets, unsafe training volume jumps, and unsupported supplement claims
- Do not claim medical authority on any topic

### Escalation Triggers and Responses

| Signal | Response |
|--------|----------|
| Language suggesting disordered eating in nutrition logs or coach conversation | Immediately redirect to professional guidance. Disable calorie-focused recommendations for 7 days. Do not frame it as punishment — frame it as care. |
| Injury signals in training logs (explicit pain mention, "can't train", injury language) | Prescribe recovery. Disable intensity recommendations for 3 days. Surface a recovery protocol. Recommend professional evaluation. |
| Burnout signals (21+ high-intensity days + declining recovery) | Mandatory recovery week mission. Coach delivers explicit acknowledgment of overtraining risk. |
| Mental health language or crisis signals in tribe or coach interactions | Immediately surface professional resources (crisis lines, mental health support). Do not attempt to provide mental health coaching. Exit coaching mode until user re-engages. |
| Requests for medical diagnosis | Redirect clearly: "I'm not able to provide medical advice — please consult a qualified professional." |
| Requests for specific supplement dosage or medical nutrition therapy | Redirect to registered dietitian or physician. |

Escalation responses are logged for safety audit. They must never feel punitive — they must feel like care.

---

## Context Privacy

The orchestrator assembles context from domain services via approved interfaces. It does not retain raw log data. It stores:

- coach conversation summaries (with user consent)
- mission history (generated, completed, expired)
- behavioral trigger state (last nudge sent, escalation history)
- AI response metadata (model version, prompt hash, response flags)

Raw training logs, nutrition logs, tribe messages, and personal data are never copied into the orchestrator's database. They are fetched per-request via approved API calls.

---

## Future RAG

RAG may be introduced after MVP for:

- STREM knowledge base (training education, nutrition guidance)
- coach content and programs
- internal support documentation
- training and recovery science references

Future RAG requires:

- curated and reviewed source documents
- source attribution in responses
- evaluation sets for quality and safety validation
- hallucination detection checks
- privacy controls (no personal user data in RAG index)

---

## Future Multi-Agent System

Possible future AI agents (all subordinate to the orchestrator):

- training agent: specialized in movement science, programming, periodization
- nutrition agent: specialized in practical nutrition, meal planning, adherence
- recovery agent: specialized in sleep, mobility, HRV interpretation (within bounds)
- tribe moderation agent: content safety, participation health monitoring
- coach assistant agent: supporting human coaches with client data summaries
- support agent: product and feature questions
- documentation agent: maintaining internal knowledge

No autonomous agent may take user-impacting action without explicit user permission and a logged audit trail. Multi-agent orchestration requires explicit safety review before implementation.
