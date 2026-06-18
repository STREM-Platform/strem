"""AI mission enums, matching ai-architecture.md and contracts/ai/openapi.yml."""

from __future__ import annotations

from enum import StrEnum


class MissionType(StrEnum):
    PERFORMANCE = "performance"
    RECOVERY = "recovery"
    TRIBE = "tribe"
    DISCIPLINE = "discipline"
    NUTRITION = "nutrition"
    HYBRID = "hybrid"


class MissionDifficulty(StrEnum):
    RE_ENTRY = "re-entry"
    MAINTENANCE = "maintenance"
    GROWTH = "growth"
    CHALLENGE = "challenge"


class MissionState(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    SKIPPED = "skipped"


class AgentCapability(StrEnum):
    """The agent's typed, logged, reversible actions (mirrors AgentCapability in
    strem-mobile/lib/agent/types.ts)."""

    UPDATE_READINESS = "updateReadiness"
    SURFACE_INSIGHT = "surfaceInsight"
    ADJUST_TARGETS = "adjustTargets"
    SWAP_EXERCISE = "swapExercise"
    FLAG_NUTRITION = "flagNutrition"
    WRITE_MEMORY = "writeMemory"
    ADJUST_TODAY_PLAN = "adjustTodayPlan"
    RESCHEDULE_WEEK = "rescheduleWeek"
    GENERATE_MISSIONS = "generateMissions"
    IMPORT_PLAN = "importPlan"
    LOG_CAPTURE = "logCapture"
    SEND_NUDGE = "sendNudge"


class AutonomyLevel(StrEnum):
    AUTO = "auto"
    ASK = "ask"
    OFF = "off"


class AgentActionStatus(StrEnum):
    PROPOSED = "proposed"
    DONE = "done"
    UNDONE = "undone"


# Default per-capability autonomy — low-risk = AUTO; plan-change / message = ASK.
# Matches lib/agent/capabilities.ts. TODO(A7 #54): read the user's overrides from
# strem-user-service instead of these defaults.
DEFAULT_AUTONOMY: dict[AgentCapability, AutonomyLevel] = {
    AgentCapability.UPDATE_READINESS: AutonomyLevel.AUTO,
    AgentCapability.SURFACE_INSIGHT: AutonomyLevel.AUTO,
    AgentCapability.ADJUST_TARGETS: AutonomyLevel.AUTO,
    AgentCapability.SWAP_EXERCISE: AutonomyLevel.AUTO,
    AgentCapability.FLAG_NUTRITION: AutonomyLevel.AUTO,
    AgentCapability.WRITE_MEMORY: AutonomyLevel.AUTO,
    AgentCapability.ADJUST_TODAY_PLAN: AutonomyLevel.ASK,
    AgentCapability.RESCHEDULE_WEEK: AutonomyLevel.ASK,
    AgentCapability.GENERATE_MISSIONS: AutonomyLevel.ASK,
    AgentCapability.IMPORT_PLAN: AutonomyLevel.ASK,
    AgentCapability.LOG_CAPTURE: AutonomyLevel.ASK,
    AgentCapability.SEND_NUDGE: AutonomyLevel.ASK,
}
