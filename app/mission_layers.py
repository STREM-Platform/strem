"""Persistence for mission layers (fuel, gear, logistics, strategy).

Writes are versioned with If-Match. Regenerating a layer (by the race engine or
the AI) must not erase the athlete's work: any item whose id survives keeps the
status and note the athlete gave it.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppError
from app.race_missions import MissionLayerRecord, lock_account, owned
from app.schemas.mission_layer import (
    LAYER_KINDS,
    ItemPatch,
    LayerContent,
    MissionLayer,
    MissionLayerWrite,
)

ANY_VERSION = -1


def parse_if_match(value: str | None) -> int | None:
    """None = no precondition given; ANY_VERSION for `*`; 0 = must not exist yet."""
    if value is None:
        return None
    value = value.strip()
    if value == "*":
        return ANY_VERSION
    if len(value) >= 3 and value[0] == value[-1] == '"' and value[1:-1].isdigit():
        number = int(value[1:-1])
        if number <= 10**9:
            return number
    raise AppError(400, "invalid_if_match", 'If-Match must be "*", or a quoted version like "3".')


def require_kind(kind: str) -> str:
    if kind not in LAYER_KINDS:
        raise AppError(404, "unknown_layer", f"Layers are: {', '.join(LAYER_KINDS)}.")
    return kind


def to_layer(record: MissionLayerRecord) -> MissionLayer:
    return MissionLayer.model_validate(
        {
            "mission_id": record.mission_id,
            "kind": record.kind,
            "version": record.version,
            "origin": record.origin,
            "model": record.model,
            "inputs_digest": record.inputs_digest,
            "content": record.content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    )


def preserve_progress(previous: dict[str, Any], incoming: LayerContent) -> dict[str, Any]:
    """Carry athlete-owned item state (status, note) into a regenerated layer."""
    kept: dict[str, dict[str, Any]] = {}
    for section in previous.get("sections", []):
        for item in section.get("items", []):
            if item.get("status", "todo") != "todo" or item.get("note"):
                kept[str(item.get("id"))] = item
    content = incoming.model_dump(mode="json")
    for section in content["sections"]:
        for item in section["items"]:
            old = kept.get(item["id"])
            if old is None:
                continue
            if item["status"] == "todo":
                item["status"] = old.get("status", "todo")
            if not item.get("note") and old.get("note"):
                item["note"] = old["note"]
    return content


async def _active_mission(session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID) -> None:
    record = await owned(session, user_id, mission_id)
    if record.state != "active":
        raise AppError(409, "mission_not_active", "Layers of a finished mission are read-only.")


async def _record(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, kind: str
) -> MissionLayerRecord | None:
    record: MissionLayerRecord | None = await session.scalar(
        select(MissionLayerRecord).where(
            MissionLayerRecord.mission_id == mission_id,
            MissionLayerRecord.user_id == user_id,
            MissionLayerRecord.kind == kind,
        )
    )
    return record


async def list_layers(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID
) -> list[MissionLayer]:
    await owned(session, user_id, mission_id)
    rows = await session.scalars(
        select(MissionLayerRecord).where(
            MissionLayerRecord.mission_id == mission_id, MissionLayerRecord.user_id == user_id
        )
    )
    order = {kind: index for index, kind in enumerate(LAYER_KINDS)}
    return sorted((to_layer(row) for row in rows), key=lambda layer: order[layer.kind])


async def get_layer(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, kind: str
) -> MissionLayer:
    await owned(session, user_id, mission_id)
    record = await _record(session, user_id, mission_id, require_kind(kind))
    if record is None:
        raise AppError(404, "layer_not_found", "This layer has not been built yet.")
    return to_layer(record)


async def put_layer(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    kind: str,
    body: MissionLayerWrite,
    expected: int | None,
) -> MissionLayer:
    require_kind(kind)
    await lock_account(session, user_id)
    await _active_mission(session, user_id, mission_id)
    record = await _record(session, user_id, mission_id, kind)
    now = datetime.now(UTC)
    if record is None:
        if expected not in (None, 0, ANY_VERSION):
            raise AppError(412, "version_conflict", "This layer does not exist yet.")
        record = MissionLayerRecord(
            mission_id=mission_id,
            user_id=user_id,
            kind=kind,
            version=1,
            origin=body.origin,
            model=body.model,
            inputs_digest=body.inputs_digest,
            content=body.content.model_dump(mode="json"),
            created_at=now,
            updated_at=now,
        )
        session.add(record)
    else:
        if expected is None or (expected != ANY_VERSION and expected != record.version):
            raise AppError(412, "version_conflict", "This layer changed. Reload it before saving.")
        record.content = preserve_progress(record.content, body.content)
        record.version += 1
        record.origin = body.origin
        record.model = body.model
        record.inputs_digest = body.inputs_digest
        record.updated_at = now
    await session.commit()
    return to_layer(record)


async def patch_item(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    kind: str,
    item_id: str,
    body: ItemPatch,
    expected: int | None,
) -> MissionLayer:
    require_kind(kind)
    await lock_account(session, user_id)
    await _active_mission(session, user_id, mission_id)
    record = await _record(session, user_id, mission_id, kind)
    if record is None:
        raise AppError(404, "layer_not_found", "This layer has not been built yet.")
    if expected is not None and expected != ANY_VERSION and expected != record.version:
        raise AppError(412, "version_conflict", "This layer changed. Reload it before saving.")
    previous: dict[str, Any] = dict(record.content)
    content: dict[str, Any] = {**previous, "sections": []}
    found = False
    for section in previous.get("sections", []):
        items = []
        for item in section.get("items", []):
            if item.get("id") == item_id:
                found = True
                item = {**item}
                if "status" in body.model_fields_set:
                    item["status"] = body.status
                if "note" in body.model_fields_set:
                    item["note"] = body.note
            items.append(item)
        content["sections"].append({**section, "items": items})
    if not found:
        raise AppError(404, "item_not_found", "That item is not part of this layer.")
    # Validate the result so a patch can never store an invalid document.
    record.content = LayerContent.model_validate(content).model_dump(mode="json")
    record.version += 1
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_layer(record)


async def delete_layer(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, kind: str
) -> None:
    require_kind(kind)
    await lock_account(session, user_id)
    await _active_mission(session, user_id, mission_id)
    record = await _record(session, user_id, mission_id, kind)
    if record is not None:
        await session.delete(record)
        await session.commit()


async def export_layers(session: AsyncSession, user_id: uuid.UUID) -> list[dict[str, object]]:
    rows = await session.scalars(
        select(MissionLayerRecord)
        .where(MissionLayerRecord.user_id == user_id)
        .order_by(MissionLayerRecord.mission_id, MissionLayerRecord.kind)
    )
    return [to_layer(row).model_dump(mode="json") for row in rows]
