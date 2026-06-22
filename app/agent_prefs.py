"""Forge consent and autonomy (A7): the catalog of data sources, default
autonomy levels, and the read/write helpers behind the agent-settings router.

Storage records only deviations from the defaults. A user with no rows sees the
catalog defaults; toggling a source or capability upserts one row. This keeps the
defaults in code (so adding a source is a code change, not a backfill) and means
`GET` always reflects the current catalog.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AgentAutonomy, AgentSourceConsent
from app.schemas.agent_prefs import ConsentGroup, ConsentItem, PrivacyData
from app.schemas.enums import AgentCapability, AutonomyLevel

INTRO = (
    "Forge can only coach what it can see. You decide what that is. Toggle "
    "anything off and it's gone from every recommendation."
)
FOOTER = "Export everything · Delete my data — anytime, no friction."


@dataclass(frozen=True)
class ConsentSource:
    """A single toggleable data source in the consent catalog."""

    id: str
    group: str
    label: str
    default_on: bool


# Order here is the order rendered on the Privacy screen. Mirrors the FE
# PRIVACY mock in strem-mobile/lib/services/agent.mock.ts.
SOURCE_CATALOG: tuple[ConsentSource, ...] = (
    ConsentSource("whoop", "Recovery", "Sleep & HRV (Whoop)", True),
    ConsentSource("resting_hr", "Recovery", "Resting heart rate", True),
    ConsentSource("workouts", "Training", "Workouts & sets", True),
    ConsentSource("strava", "Training", "Strava runs & routes", True),
    ConsentSource("pr_history", "Training", "PR history", True),
    ConsentSource("meals", "Fuel", "Meals & macros", True),
    ConsentSource("hydration", "Fuel", "Hydration", False),
    # Lab/blood results (#63): highly sensitive, so OFF by default and revocable
    # here at any time. Reading biomarkers also requires Medical Disclaimer
    # acceptance — consent alone is not enough.
    ConsentSource("biomarkers", "Health", "Lab & blood results", False),
    ConsentSource("memory_prefs", "Memory", "Stated preferences & injuries", True),
    ConsentSource("memory_convos", "Memory", "Past conversations", True),
)

# The A7 source id that gates biomarker access (must exist in SOURCE_CATALOG).
BIOMARKER_SOURCE_ID = "biomarkers"

_SOURCE_IDS = frozenset(source.id for source in SOURCE_CATALOG)

# Group order, derived from first appearance in the catalog.
_GROUP_ORDER: tuple[str, ...] = tuple(
    dict.fromkeys(source.group for source in SOURCE_CATALOG)
)

# Default autonomy per capability: low-risk = auto; plan changes / messages = ask.
# Mirrors CAPABILITIES[].default in strem-mobile/lib/agent/capabilities.ts.
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


def is_known_source(source_id: str) -> bool:
    return source_id in _SOURCE_IDS


_DEFAULT_ON: dict[str, bool] = {s.id: s.default_on for s in SOURCE_CATALOG}


async def is_source_enabled(
    session: AsyncSession, user_id: uuid.UUID, source_id: str
) -> bool:
    """Whether a data source is currently ON for the user (default + override)."""
    overrides = await _consent_overrides(session, user_id)
    return overrides.get(source_id, _DEFAULT_ON.get(source_id, False))


async def _consent_overrides(
    session: AsyncSession, user_id: uuid.UUID
) -> dict[str, bool]:
    rows = await session.scalars(
        select(AgentSourceConsent).where(AgentSourceConsent.user_id == user_id)
    )
    return {row.source_id: row.enabled for row in rows}


async def get_privacy(session: AsyncSession, user_id: uuid.UUID) -> PrivacyData:
    """Build the consent surface: catalog defaults overlaid with the user's toggles."""
    overrides = await _consent_overrides(session, user_id)
    groups: list[ConsentGroup] = []
    for label in _GROUP_ORDER:
        items = [
            ConsentItem(
                id=source.id,
                k=source.label,
                on=overrides.get(source.id, source.default_on),
            )
            for source in SOURCE_CATALOG
            if source.group == label
        ]
        groups.append(ConsentGroup(label=label, items=items))
    return PrivacyData(intro=INTRO, groups=groups, footer=FOOTER)


async def set_consent(
    session: AsyncSession, user_id: uuid.UUID, source_id: str, enabled: bool
) -> None:
    """Upsert one source toggle for the user."""
    row = await session.get(AgentSourceConsent, (user_id, source_id))
    if row is None:
        session.add(
            AgentSourceConsent(user_id=user_id, source_id=source_id, enabled=enabled)
        )
    else:
        row.enabled = enabled


async def get_autonomy(
    session: AsyncSession, user_id: uuid.UUID
) -> dict[AgentCapability, AutonomyLevel]:
    """Return the full autonomy map: defaults overlaid with the user's settings."""
    rows = await session.scalars(
        select(AgentAutonomy).where(AgentAutonomy.user_id == user_id)
    )
    overrides = {row.capability: row.level for row in rows}
    result: dict[AgentCapability, AutonomyLevel] = {}
    for capability, default in DEFAULT_AUTONOMY.items():
        stored = overrides.get(capability.value)
        result[capability] = AutonomyLevel(stored) if stored is not None else default
    return result


async def set_autonomy(
    session: AsyncSession,
    user_id: uuid.UUID,
    capability: AgentCapability,
    level: AutonomyLevel,
) -> None:
    """Upsert one capability's autonomy level for the user."""
    row = await session.get(AgentAutonomy, (user_id, capability.value))
    if row is None:
        session.add(
            AgentAutonomy(user_id=user_id, capability=capability.value, level=level.value)
        )
    else:
        row.level = level.value
