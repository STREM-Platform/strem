"""Legal & policy acceptance endpoints (issue #58), under `/v1/users/me/legal`.

These let the app record that a user has accepted the current Terms, Privacy
Policy, and Medical Disclaimer (versioned, append-only) and check whether any
re-acceptance is required. They power the accept gates at onboarding and in Profile.

The mobile accept-gate UI and in-app disclaimer surfacing are a deliberately
deferred follow-up slice (strem-mobile#58-mobile); this service exposes the two
endpoints that follow-up will call.
"""

from fastapi import APIRouter

from app import legal
from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.schemas.legal import LegalAcceptRequest, LegalStatus

router = APIRouter(prefix="/v1", tags=["legal"])


@router.get("/users/me/legal", response_model=LegalStatus)
async def get_legal_status(current: CurrentUserDep, session: SessionDep) -> LegalStatus:
    return await legal.get_status(session, current.user_id)


@router.post("/users/me/legal/accept", response_model=LegalStatus)
async def accept_legal(
    body: LegalAcceptRequest, current: CurrentUserDep, session: SessionDep
) -> LegalStatus:
    seen: set[legal.DocumentType] = set()
    for item in body.acceptances:
        required = legal.required_version(item.document_type)
        if item.version != required:
            raise AppError(
                400,
                "validation_error",
                f"Version '{item.version}' is not the current required version "
                f"'{required}' for '{item.document_type.value}'.",
            )
        if item.document_type in seen:
            raise AppError(
                400,
                "validation_error",
                f"Duplicate acceptance for '{item.document_type.value}' in one request.",
            )
        seen.add(item.document_type)

    for item in body.acceptances:
        await legal.record_acceptance(session, current.user_id, item.document_type, item.version)
    await session.commit()
    return await legal.get_status(session, current.user_id)
