"""Biomarker / blood-result endpoints (issue #63), under `/v1/users/me/biomarkers`.

Highly sensitive, so every endpoint enforces the consent + Medical Disclaimer
gate before touching data. Forge surfaces trends/context from these, never a
diagnosis (A8). Depends on the legal/medical-disclaimer work (#58).
"""

import uuid

from fastapi import APIRouter, status

from app import biomarkers
from app.deps import CurrentUserDep, SessionDep
from app.schemas.biomarker import Biomarker, BiomarkerCreate, BiomarkerList

router = APIRouter(prefix="/v1", tags=["biomarkers"])


@router.post(
    "/users/me/biomarkers", status_code=status.HTTP_201_CREATED, response_model=Biomarker
)
async def create_biomarker(
    body: BiomarkerCreate, current: CurrentUserDep, session: SessionDep
) -> Biomarker:
    await biomarkers.require_biomarker_access(session, current.user_id)
    result = await biomarkers.create_biomarker(session, current.user_id, body)
    await session.commit()
    return result


@router.get("/users/me/biomarkers", response_model=BiomarkerList)
async def list_biomarkers(current: CurrentUserDep, session: SessionDep) -> BiomarkerList:
    await biomarkers.require_biomarker_access(session, current.user_id)
    return await biomarkers.list_biomarkers(session, current.user_id)


@router.delete("/users/me/biomarkers/{biomarker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_biomarker(
    biomarker_id: uuid.UUID, current: CurrentUserDep, session: SessionDep
) -> None:
    await biomarkers.require_biomarker_access(session, current.user_id)
    await biomarkers.delete_biomarker(session, current.user_id, biomarker_id)
    await session.commit()
