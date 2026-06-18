"""Forge consent and autonomy endpoints (A7), under `/v1/users/me`.

These power the Privacy screen: which data sources Forge may read
(`agent-consent`) and how much latitude it has per capability (`agent-autonomy`).
The orchestrator reads these to gate context assembly and action autonomy.
"""

from fastapi import APIRouter

from app import agent_prefs
from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.schemas.agent_prefs import AutonomyUpdate, ConsentUpdate, PrivacyData
from app.schemas.enums import AgentCapability, AutonomyLevel

router = APIRouter(prefix="/v1", tags=["agent"])


@router.get("/users/me/agent-consent", response_model=PrivacyData)
async def get_agent_consent(current: CurrentUserDep, session: SessionDep) -> PrivacyData:
    return await agent_prefs.get_privacy(session, current.user_id)


@router.put("/users/me/agent-consent", response_model=PrivacyData)
async def update_agent_consent(
    body: ConsentUpdate, current: CurrentUserDep, session: SessionDep
) -> PrivacyData:
    if not agent_prefs.is_known_source(body.source_id):
        raise AppError(400, "validation_error", f"Unknown data source '{body.source_id}'.")
    await agent_prefs.set_consent(session, current.user_id, body.source_id, body.enabled)
    await session.commit()
    return await agent_prefs.get_privacy(session, current.user_id)


@router.get(
    "/users/me/agent-autonomy",
    response_model=dict[AgentCapability, AutonomyLevel],
)
async def get_agent_autonomy(
    current: CurrentUserDep, session: SessionDep
) -> dict[AgentCapability, AutonomyLevel]:
    return await agent_prefs.get_autonomy(session, current.user_id)


@router.put(
    "/users/me/agent-autonomy",
    response_model=dict[AgentCapability, AutonomyLevel],
)
async def update_agent_autonomy(
    body: AutonomyUpdate, current: CurrentUserDep, session: SessionDep
) -> dict[AgentCapability, AutonomyLevel]:
    await agent_prefs.set_autonomy(session, current.user_id, body.capability, body.level)
    await session.commit()
    return await agent_prefs.get_autonomy(session, current.user_id)
