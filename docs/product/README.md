# STREM Product Source Of Truth

STREM is the AI race team for self-coached endurance athletes preparing for a real race or challenge. Trail running is the first validation market and the depth benchmark.

Read these documents in order:

1. [`race-os.md`](race-os.md) - active direction since 2026-10-23: any race or challenge, the Race Mission, the layers (training, course, fuel, gear, logistics, strategy), the race team, the tracker and what stays out of scope.
2. [`trail-running-pivot.md`](trail-running-pivot.md) - product thesis, first customer, Race Mission, surfaces, data strategy, commercial hypothesis, and exclusions (sport scope superseded by `race-os.md`).
3. [`trail-running-delivery-plan.md`](trail-running-delivery-plan.md) - paid validation gate, implementation stages, repository packages, contract vocabulary, issue triage, and stop conditions.
4. [`race-experience-blueprint.md`](race-experience-blueprint.md) - advanced race-command hierarchy, responsive screens, components, motion, accessibility, states, and acceptance rules.
5. [`race-media-policy.md`](race-media-policy.md) - media acquisition hierarchy, rights evidence, attribution, `EventMedia` contract proposal, fallbacks, and takedown workflow.
6. [`race-experience-usability.md`](race-experience-usability.md) - five-athlete protocol and the 15-second comprehension gate.
7. [`implementation-status.md`](implementation-status.md) - what is actually built, what is prototype-only, and what must happen next.

These are the only active product documents. The experience, media, and usability documents are subordinate to the Race OS direction, the pivot and the delivery plan; they specify how that direction is designed and validated. Previous hybrid-athlete, XP, rank, medal, Tribe, Crew, generic tracking, social-competition, and cinematic roadmaps were removed on 2026-09-20. Git history preserves them if a future evidence-based decision needs to reference them.

## Product Test

Every proposed capability must answer yes to at least one question:

- Does it help the athlete understand whether they are prepared for their chosen event?
- Does it turn fragmented evidence into an explainable decision?
- Does it help rehearse terrain, fueling, equipment, conditions, or logistics before race day?
- Does it make the solo athlete safer or more confident without pretending certainty?
- Does it create paid value that a tracker or generic plan does not already provide?

If not, it does not belong in the active product.
