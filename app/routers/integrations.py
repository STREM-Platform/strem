"""Connected-source endpoints (A3), under `/v1/integrations`.

Connect/disconnect external sources, read the connection registry, trigger a
sync, and read recovery samples. Provider OAuth tokens are stored encrypted; the
orchestrator never sees them — it only reads `/integrations/sources` and
`/integrations/recovery`.
"""

from typing import Annotated

from fastapi import APIRouter, Query, status

from app.crypto import get_token_cipher
from app.deps import (
    CurrentUserDep,
    ProviderRegistryDep,
    PublisherDep,
    SessionDep,
    SettingsDep,
)
from app.integrations import service
from app.schemas import (
    ConnectRequest,
    IntegrationSource,
    IntegrationSourceList,
    RecoverySampleList,
    RecoverySampleResponse,
    SyncResponse,
)

router = APIRouter(prefix="/v1", tags=["integrations"])


@router.get("/integrations/sources", response_model=IntegrationSourceList)
async def list_sources(current: CurrentUserDep, session: SessionDep) -> IntegrationSourceList:
    sources = await service.list_sources(session, user_id=current.user_id)
    return IntegrationSourceList(items=[IntegrationSource(**s) for s in sources])  # type: ignore[arg-type]


@router.post(
    "/integrations/{provider}/connect",
    status_code=status.HTTP_201_CREATED,
    response_model=IntegrationSource,
)
async def connect_source(
    provider: str,
    body: ConnectRequest,
    current: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
    registry: ProviderRegistryDep,
) -> IntegrationSource:
    cipher = get_token_cipher(settings)
    await service.connect(
        session,
        registry,
        cipher,
        user_id=current.user_id,
        provider=provider,
        code=body.code,
        redirect_uri=body.redirect_uri,
    )
    await session.commit()
    sources = await service.list_sources(session, user_id=current.user_id)
    return next(IntegrationSource(**s) for s in sources if s["id"] == provider)  # type: ignore[arg-type]


@router.delete("/integrations/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_source(
    provider: str, current: CurrentUserDep, session: SessionDep
) -> None:
    await service.disconnect(session, user_id=current.user_id, provider=provider)
    await session.commit()


@router.post("/integrations/{provider}/sync", response_model=SyncResponse)
async def sync_source(
    provider: str,
    current: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
    registry: ProviderRegistryDep,
    publisher: PublisherDep,
) -> SyncResponse:
    cipher = get_token_cipher(settings)
    counts = await service.sync(
        session, publisher, registry, cipher, user_id=current.user_id, provider=provider
    )
    await session.commit()
    return SyncResponse(**counts)


@router.get("/integrations/recovery", response_model=RecoverySampleList)
async def list_recovery(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=90)] = 30,
) -> RecoverySampleList:
    rows = await service.list_recovery(session, user_id=current.user_id, limit=limit)
    return RecoverySampleList(
        items=[RecoverySampleResponse.model_validate(r, from_attributes=True) for r in rows]
    )
