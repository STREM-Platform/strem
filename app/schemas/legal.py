"""Schemas for legal & policy acceptance (issue #58), mirroring
contracts/user/openapi.yml.

`POST /users/me/legal/accept` takes `LegalAcceptRequest` (one or more
acceptances); `GET /users/me/legal` returns `LegalStatus` (current required
versions, what the user has accepted, and a top-level `needs_acceptance` flag).
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.legal import DocumentType


class LegalAcceptanceInput(BaseModel):
    """One acceptance: a document type and the version being accepted."""

    document_type: DocumentType = Field(
        description="Which policy is being accepted (terms | privacy | medical)."
    )
    version: str = Field(
        description="The version string being accepted; must match the current "
        "required version for that document."
    )


class LegalAcceptRequest(BaseModel):
    """Record one or more acceptances in a single call (e.g. all three at onboarding)."""

    acceptances: list[LegalAcceptanceInput] = Field(
        min_length=1, description="The acceptances to record."
    )


class LegalDocumentStatus(BaseModel):
    """Acceptance status for a single document type."""

    document_type: DocumentType
    required_version: str = Field(description="The version the user must currently accept.")
    accepted_version: str | None = Field(
        default=None, description="The version the user has accepted, if any."
    )
    needs_acceptance: bool = Field(
        description="True when the accepted version is missing or not the required version."
    )


class LegalStatus(BaseModel):
    """The user's full legal-acceptance status across all documents."""

    documents: list[LegalDocumentStatus]
    needs_acceptance: bool = Field(description="True when any document still needs acceptance.")
