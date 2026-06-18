"""System prompt + grounding chips for the agent.

The prompt encodes the guardrails and feeds the assembled context (A6) to the
model. The grounding chips are the data the answer is grounded in — built from
the user's own signals/memory so the UI can show what the agent cited.
"""

from __future__ import annotations

from app.context import GraphSnapshot
from app.schemas import CitedDatum, ContextSignals, MemoryItem

SYSTEM_RULES = (
    "You are Forge, STREM's omniscient AI coach. You can see the athlete's whole "
    "context (below). Ground every answer in their own data. Be direct, specific and "
    "encouraging. Use your tools to act — remember a stated preference/injury, flag a "
    "fuelling gap, surface a cross-domain insight, or propose a plan change (plan "
    "changes wait for the athlete's approval). Never shame, never use vanity metrics, "
    "never give a medical diagnosis, never invent a number you cannot see."
)


def build_system_prompt(
    identity: str | None, signals: ContextSignals, memory: list[MemoryItem]
) -> str:
    lines = [SYSTEM_RULES]
    if identity:
        lines.append(f"Identity: {identity}")
    lines.append(
        f"Signals: readiness {signals.readiness} ({signals.readiness_label}); "
        f"7-day load {signals.load7}, ACWR {signals.acwr} ({signals.load_label}); "
        f"momentum {signals.momentum}."
        + (f" Sleep {signals.sleep_hours}." if signals.sleep_hours else "")
        + (f" HRV {signals.hrv}ms {signals.hrv_delta or ''}." if signals.hrv is not None else "")
    )
    if memory:
        lines.append("Memory: " + "; ".join(m.text for m in memory[:6]))
    return "\n".join(lines)


def grounding_chips(signals: ContextSignals, memory: list[MemoryItem]) -> list[CitedDatum]:
    """The data the answer is grounded in — only fields that are actually present."""
    chips: list[CitedDatum] = []
    if signals.sleep_hours:
        chips.append(CitedDatum(icon="moon", text=f"Sleep {signals.sleep_hours}"))
    if signals.hrv is not None:
        delta = f" {signals.hrv_delta}" if signals.hrv_delta else ""
        chips.append(CitedDatum(icon="heart", text=f"HRV {signals.hrv}ms{delta}"))
    chips.append(CitedDatum(icon="bolt", text=f"Load {signals.acwr} ({signals.load_label})"))
    chips.append(
        CitedDatum(icon="flame", text=f"Readiness {signals.readiness} ({signals.readiness_label})")
    )
    if memory:
        chips.append(CitedDatum(icon=memory[0].icon, text=memory[0].text))
    return chips[:4]


__all__ = ["build_system_prompt", "grounding_chips", "GraphSnapshot"]
