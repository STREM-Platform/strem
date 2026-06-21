"""Athlete Baseline domain logic (issue #61).

The athlete profile is created lazily on first access (keyed by `user_id`) and
upserted field-by-field: only fields present in the request are applied, so the
mobile form can send a partial or a full state, and a field can be cleared by
sending it explicitly null.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AthleteProfile
from app.schemas.athlete import AthleteProfileResponse, AthleteProfileUpdate, Injury, PersonalRecord

_SCALAR_FIELDS = (
    "height_cm",
    "weight_kg",
    "age_band",
    "biological_sex",
    "years_training",
    "equipment_access",
)


async def get_or_create_athlete_profile(
    session: AsyncSession, user_id: uuid.UUID
) -> AthleteProfile:
    profile = await session.get(AthleteProfile, user_id)
    if profile is None:
        profile = AthleteProfile(user_id=user_id)
        session.add(profile)
        await session.flush()
    return profile


def apply_update(profile: AthleteProfile, body: AthleteProfileUpdate) -> None:
    """Apply only the fields the client provided (partial upsert; lists replace)."""
    fields = body.model_fields_set
    if "height_cm" in fields:
        profile.height_cm = body.height_cm
    if "weight_kg" in fields:
        profile.weight_kg = body.weight_kg
    if "age_band" in fields:
        profile.age_band = body.age_band.value if body.age_band is not None else None
    if "biological_sex" in fields:
        profile.biological_sex = (
            body.biological_sex.value if body.biological_sex is not None else None
        )
    if "years_training" in fields:
        profile.years_training = body.years_training
    if "equipment_access" in fields:
        profile.equipment_access = (
            body.equipment_access.value if body.equipment_access is not None else None
        )
    if "personal_records" in fields:
        profile.personal_records = [
            pr.model_dump(mode="json") for pr in (body.personal_records or [])
        ]
    if "injuries" in fields:
        profile.injuries = [inj.model_dump(mode="json") for inj in (body.injuries or [])]
    if "dietary_constraints" in fields:
        profile.dietary_constraints = list(body.dietary_constraints or [])


def build_response(profile: AthleteProfile) -> AthleteProfileResponse:
    started = (
        any(getattr(profile, field) is not None for field in _SCALAR_FIELDS)
        or bool(profile.personal_records)
        or bool(profile.injuries)
        or bool(profile.dietary_constraints)
    )
    return AthleteProfileResponse(
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        age_band=profile.age_band,  # type: ignore[arg-type]
        biological_sex=profile.biological_sex,  # type: ignore[arg-type]
        years_training=profile.years_training,
        equipment_access=profile.equipment_access,  # type: ignore[arg-type]
        personal_records=[PersonalRecord.model_validate(pr) for pr in profile.personal_records],
        injuries=[Injury.model_validate(inj) for inj in profile.injuries],
        dietary_constraints=list(profile.dietary_constraints),
        is_started=started,
    )
