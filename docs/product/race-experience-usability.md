# Race Experience Usability Protocol

**Status:** Required validation protocol  
**Owner:** Product/design  
**Minimum sample:** Five target athletes per material Mission redesign

## Decision This Test Makes

The experience passes only when target athletes can understand their Race Mission quickly and accurately. Visual preference alone is not a passing result.

The primary test is whether an athlete can identify the event, phase, leading risk, supporting evidence gap, and next action within 15 seconds of seeing Mission. Secondary tasks test course comprehension, plan rationale, AI control, media truthfulness, and recovery from failure states.

## Participant Profile

Recruit at least five people who:

- are registered for or seriously preparing for a 20-50 km trail or mountain event;
- train mostly without a personal coach;
- use a watch, Strava, a health platform, or manual training records;
- coordinate training with work or family constraints;
- are not STREM contributors and have not seen the design work.

Include a mix of first serious-race and repeat-race athletes, at least two compact Android users, at least two iPhone users, and at least one participant who regularly uses large text, reduced motion, a screen reader, or another accessibility setting where recruitment permits. Accessibility evaluation is also performed separately and is not waived if the sample lacks a disabled participant.

## Test Materials

- a realistic interactive prototype or functional build;
- one synthetic but plausible 20-50 km mission, labelled as test data outside the participant view;
- approved event media plus an atmospheric fallback variant;
- complete, incomplete, stale, offline, AI-unavailable, and media-unavailable states;
- compact and wide layouts;
- a timer, observation sheet, and consented recording setup;
- no facilitator script that teaches STREM's vocabulary before the first-impression task.

The synthetic mission must contain internally consistent facts. It must not reuse a real athlete's data.

## Session Structure

Allow 35-45 minutes per participant:

1. context and consent: 5 minutes;
2. unmoderated first impression: 1 minute;
3. core tasks: 20-25 minutes;
4. trust and value interview: 10 minutes;
5. closing and data-use reminder: 2 minutes.

Do not sell the concept before testing comprehension. Ask the participant to think aloud after the timed first-impression task, not during it.

## Facilitator Script

### Introduction

> We are testing the product, not you. This is an unfinished preparation tool for trail runners. Some content is simulated for the test. Please act as if this were your race, and tell us when something is unclear or untrustworthy. I will not explain the interface unless a task is blocked.

Confirm recording consent and remind the participant not to reveal sensitive health or account information.

### Task 1: 15-second Mission read

Show Mission in its default compact state. Start the timer when the stable first viewport appears. After 15 seconds, remove or cover the screen.

Ask:

1. What race are you preparing for, and how long remains?
2. Which preparation phase are you in?
3. What is the most important concern now?
4. What fact or missing evidence caused that concern?
5. What should you do next?

Do not accept a guessed answer that the interface did not support. Record exact answers and confidence from 1-5.

### Task 2: Verify the concern

> Show me how you would check whether that concern is justified.

Success requires opening the supporting evidence, identifying its source/freshness, and distinguishing recorded or calculated evidence from an assumption or unknown.

### Task 3: Understand the course

> Find the part of the course most likely to create a cutoff or execution problem. Explain what makes it difficult and what you would rehearse.

Success requires connecting a course section to at least two relevant facts such as elevation, grade, terrain, daylight, cutoff, aid, or conditions. The participant must be able to complete the task without a map gesture.

### Task 4: Inspect a plan adaptation

Present a missed key session or high-fatigue check-in that creates a proposal.

> Decide whether you would accept this change. Show me what changed, why, what the system is assuming, and how you would keep or modify the original plan.

Success requires locating the before/after diff, at least one cited input, an uncertainty, and accept/edit/reject controls. The participant must understand that no change occurs before confirmation.

### Task 5: Prepare an operation

> You have one weekend to test race fueling and mandatory gear. Use Race Lab to decide what to rehearse and what result you need to record.

Success requires identifying a working decision, rehearsal protocol, missing evidence, and the effect of a result. Browsing a generic checklist without connecting it to the mission is not sufficient.

### Task 6: Recover from a failure

Switch to an offline or stale-source state.

> You are away from reliable signal. What information can you trust, how old is it, and what can you safely do now?

Success requires recognizing cached/stale state, locating saved-at/source information, and continuing a safe local task or deliberately retrying. The participant must not mistake stale weather or readiness evidence for current data.

### Task 7: Interpret media truthfully

Show one official-event hero and one stock-atmosphere fallback in randomized order.

> What do you believe each image represents? Who supplied it? Would you assume either image shows the actual race?

Success requires correct interpretation from the visible labels/credit treatment. Any participant reasonably mistaking stock or generated media for official event imagery is a critical failure.

### Task 8: Understand the offer

Show the Race Pass boundary after the participant has seen the real preview.

> In your own words, what would you pay for, what would still depend on you, and what would make this worth or not worth the shown price?

Success requires naming concrete race-specific outputs, not `more data`, `premium tracking`, or `AI messages`.

## Debrief Questions

- At what moment did the product feel different from your watch, Strava, a plan app, or a generic AI coach?
- Which conclusion did you trust most? Which did you trust least, and why?
- What did the product appear to know that you did not provide?
- Which information felt like noise?
- Would this change a real preparation decision? Describe one.
- When would you open it during a normal week?
- Would you pay per race? What outcome would justify the price?
- What would make you stop using it or request a refund?
- Did any photo, label, score, or animation imply more certainty than the evidence supported?

Avoid asking only whether the participant `likes` the design.

## Observation Scorecard

Score each task independently:

| Score | Meaning |
|---:|---|
| 0 | Failed, abandoned, or confidently reached a harmful/false conclusion |
| 1 | Completed only after facilitator help or with material misunderstanding |
| 2 | Completed independently with hesitation or one minor error |
| 3 | Completed independently, accurately, and could explain why |

Record alongside each score:

- completion time;
- path and wrong turns;
- exact terms the participant used;
- source/provenance interpretation;
- confidence from 1-5;
- severity of observed issue;
- whether the issue is content, hierarchy, interaction, visual, accessibility, or trust.

## Pass Criteria

The design passes the initial gate only if:

- all five participants correctly identify the event and next action within 15 seconds;
- at least four of five correctly identify the phase, leading risk, and evidence gap within 15 seconds;
- all five understand that an AI proposal is not applied before confirmation;
- at least four of five can identify source and freshness without facilitator help;
- all five distinguish official event media from atmosphere or illustration;
- all five can complete critical course and plan tasks without relying on drag, color alone, or loaded photography;
- no participant reaches a safety-relevant false conclusion because of hierarchy, stale state, or missing provenance;
- median task score is at least 2.5, with no critical task below 2 for more than one participant.

Failure is a design input, not a reason to reinterpret the criteria. Fix critical confusion and retest with new target athletes.

## Severity

| Severity | Definition | Release decision |
|---|---|---|
| Critical | Could cause unsafe action, unwanted plan change, false official-media belief, payment misunderstanding, or loss of data control | Blocks implementation/release |
| High | Prevents core task or obscures risk/evidence/next action | Blocks feature acceptance |
| Medium | Causes recoverable delay, repeated wrong turn, or avoidable distrust | Fix before pilot where practical |
| Low | Cosmetic or preference issue without task impact | Prioritize with supporting evidence |

## Accessibility Verification

Run these checks on the same build or prototype in addition to participant sessions:

- screen-reader traversal and accessible names for the full Mission-to-decision flow;
- external-keyboard navigation with visible, unobscured focus;
- 200% text/browser zoom and largest supported mobile text sizes;
- reduced motion and reduced transparency;
- grayscale and high-contrast checks;
- 44 by 44 logical-pixel target inspection;
- course and evidence comprehension without color or map gestures;
- offline and stale-state announcements;
- error identification and recovery without losing entered data.

Automated checks supplement, but do not replace, manual evaluation.

## Reporting Template

Publish one concise test report:

```markdown
# Race Experience Test - YYYY-MM-DD

Build/prototype:
Participants:
Devices/settings:

## Gate result
Pass / fail and why

## 15-second results
Event: x/5
Phase: x/5
Leading risk: x/5
Evidence gap: x/5
Next action: x/5

## Critical and high findings
Finding, evidence, affected task, severity, owner, target issue

## Trust and value evidence
Changed-decision examples, payment interpretation, repeated objections

## Accessibility findings
Manual checks and participant evidence

## Decision
Proceed, revise and retest, or stop/reframe
```

Store recordings and personal information only with consent, restricted access, and an explicit deletion date. Product documentation should contain synthesized findings, not participant identifiers or raw health details.

