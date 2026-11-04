"""Legal & policy acceptance (issue #58): the registry of currently required
policy versions, and the read/write helpers behind the legal router.

The required version for each document lives here in code — not by parsing the
strem-docs Markdown — so the service can compare what a user accepted against what
is required cheaply and deterministically. The values in `REQUIRED_VERSIONS` MUST
match the `Version:` headers of the policies in `docs/legal/*.md`; when a
policy's version is bumped there, bump it here in the same change (see
`docs/legal/README.md`).

Acceptance is append-only: recording an acceptance always inserts a new row, so the
full history of what each user agreed to and when is preserved for audit.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LegalAcceptance

if TYPE_CHECKING:
    from app.schemas.legal import LegalStatus


class DocumentType(StrEnum):
    """The legal documents a user must accept. Values are the canonical keys used
    across the backend, the OpenAPI contract, and the mobile accept gates, and map
    to the files in `docs/legal/`.
    """

    TERMS = "terms"
    PRIVACY = "privacy"
    MEDICAL = "medical"


# Currently required version per document. MUST match the `Version:` headers in
# docs/legal/{terms-of-service,privacy-policy,medical-disclaimer}.md.
REQUIRED_VERSIONS: dict[DocumentType, str] = {
    DocumentType.TERMS: "2026-06-20",
    DocumentType.PRIVACY: "2026-06-20",
    DocumentType.MEDICAL: "2026-06-20",
}

# Version strings are calendar dates (`YYYY-MM-DD`), optionally with a single
# lowercase suffix for a second material release on the same day (`2026-06-20a`).
_VERSION_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[a-z]?$")


def is_valid_version_format(version: str) -> bool:
    return bool(_VERSION_RE.match(version))


def required_version(document_type: DocumentType) -> str:
    return REQUIRED_VERSIONS[document_type]


async def accepted_versions(session: AsyncSession, user_id: uuid.UUID) -> dict[DocumentType, str]:
    """The latest accepted version per document type for the user.

    With append-only rows a user may have several acceptances for one document
    (one per version they have ever accepted); we keep the most recent by
    `accepted_at`.
    """
    rows = await session.scalars(
        select(LegalAcceptance)
        .where(LegalAcceptance.user_id == user_id)
        .order_by(LegalAcceptance.accepted_at)
    )
    latest: dict[DocumentType, str] = {}
    for row in rows:
        try:
            doc = DocumentType(row.document_type)
        except ValueError:
            # Unknown/retired document type stored historically — ignore it.
            continue
        # Iterating in ascending accepted_at order means the last write wins.
        latest[doc] = row.version
    return latest


async def record_acceptance(
    session: AsyncSession,
    user_id: uuid.UUID,
    document_type: DocumentType,
    version: str,
    accepted_at: datetime | None = None,
) -> None:
    """Insert one acceptance row (append-only; never updates an existing row)."""
    row = LegalAcceptance(
        user_id=user_id,
        document_type=document_type.value,
        version=version,
    )
    if accepted_at is not None:
        row.accepted_at = accepted_at
    session.add(row)


async def get_status(session: AsyncSession, user_id: uuid.UUID) -> LegalStatus:
    """Build the per-document status: required vs accepted version, plus the
    aggregate `needs_acceptance` flag.
    """
    # Imported here to avoid a circular import (schemas import this module).
    from app.schemas.legal import LegalDocumentStatus, LegalStatus

    accepted = await accepted_versions(session, user_id)
    documents: list[LegalDocumentStatus] = []
    needs_any = False
    for document_type in DocumentType:
        required = REQUIRED_VERSIONS[document_type]
        accepted_version = accepted.get(document_type)
        needs = accepted_version != required
        needs_any = needs_any or needs
        documents.append(
            LegalDocumentStatus(
                document_type=document_type,
                required_version=required,
                accepted_version=accepted_version,
                needs_acceptance=needs,
            )
        )
    return LegalStatus(documents=documents, needs_acceptance=needs_any)
