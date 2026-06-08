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
