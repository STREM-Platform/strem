/** Pure helpers for the legal accept gate (kept separate so they're unit-testable). */

import type { LegalAcceptanceInput, LegalStatus } from "@/lib/api/types";

/**
 * The acceptances to POST: every document that still needs accepting, each at
 * its current *required* version (the backend's source of truth). Returns an
 * empty list when nothing is pending — callers can then skip the write.
 */
export function pendingAcceptances(status: LegalStatus): LegalAcceptanceInput[] {
  return status.documents
    .filter((doc) => doc.needs_acceptance)
    .map((doc) => ({ document_type: doc.document_type, version: doc.required_version }));
}
