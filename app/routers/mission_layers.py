"""Mission layer endpoints: fuel, gear, logistics and strategy documents."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Response, status

from app import mission_layers as store
from app.deps import CurrentUserDep, SessionDep
from app.schemas.mission_layer import ItemPatch, MissionLayer, MissionLayerList, MissionLayerWrite

router = APIRouter(prefix="/v1/race-missions", tags=["mission-layers"])
OptionalMatch = Annotated[str | None, Header(alias="If-Match")]


def _with_etag(response: Response, layer: MissionLayer) -> MissionLayer:
    response.headers["ETag"] = f'"{layer.version}"'
    response.headers["Cache-Control"] = "no-store"
    return layer


@router.get("/{mission_id}/layers", response_model=MissionLayerList)
async def list_layers(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, response: Response
) -> MissionLayerList:
    response.headers["Cache-Control"] = "no-store"
    return MissionLayerList(items=await store.list_layers(session, current.user_id, mission_id))


@router.get("/{mission_id}/layers/{kind}", response_model=MissionLayer)
async def get_layer(
    mission_id: uuid.UUID,
    kind: str,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
) -> MissionLayer:
    return _with_etag(response, await store.get_layer(session, current.user_id, mission_id, kind))


@router.put("/{mission_id}/layers/{kind}", response_model=MissionLayer)
async def put_layer(
    mission_id: uuid.UUID,
    kind: str,
    body: MissionLayerWrite,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    if_match: OptionalMatch = None,
) -> MissionLayer:
    layer = await store.put_layer(
        session, current.user_id, mission_id, kind, body, store.parse_if_match(if_match)
    )
    return _with_etag(response, layer)


@router.patch("/{mission_id}/layers/{kind}/items/{item_id}", response_model=MissionLayer)
async def patch_item(
    mission_id: uuid.UUID,
    kind: str,
    item_id: str,
    body: ItemPatch,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    if_match: OptionalMatch = None,
) -> MissionLayer:
    layer = await store.patch_item(
        session, current.user_id, mission_id, kind, item_id, body, store.parse_if_match(if_match)
    )
    return _with_etag(response, layer)


@router.delete("/{mission_id}/layers/{kind}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_layer(
    mission_id: uuid.UUID, kind: str, current: CurrentUserDep, session: SessionDep
) -> Response:
    await store.delete_layer(session, current.user_id, mission_id, kind)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
