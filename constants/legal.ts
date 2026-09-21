/**
 * Legal policy presentation metadata, paired with the bundled canonical text in
 * `constants/legal-docs.ts` (a mirror of `strem-docs/legal/*.md`). The version
 * shown + accepted is the one in the bundled doc; the backend
 * (`GET /users/me/legal`) is the source of truth for what is *required*.
 */

import { LEGAL_DOCS } from "@/constants/legal-docs";
import type { LegalDocumentType } from "@/lib/api/types";

interface LegalPolicy {
  type: LegalDocumentType;
  title: string;
  blurb: string;
  version: string;
  body: string;
}

const META: Record<LegalDocumentType, { title: string; blurb: string }> = {
  terms: {
    title: "Terms of Service",
    blurb: "How you can use STREM, and the limits of what we promise.",
  },
  privacy: {
    title: "Privacy Policy",
    blurb: "What we collect, why, and the control you keep over it.",
  },
  medical: {
    title: "Medical Disclaimer",
    blurb: "STREM is not a medical device — coaching and insights are estimates.",
  },
};

/** Order shown in the accept gate: the medical disclaimer first (most consequential). */
const LEGAL_ORDER: LegalDocumentType[] = ["medical", "terms", "privacy"];

export const LEGAL_POLICIES: LegalPolicy[] = LEGAL_ORDER.map((type) => ({
  type,
  title: META[type].title,
  blurb: META[type].blurb,
  version: LEGAL_DOCS[type].version,
  body: LEGAL_DOCS[type].body,
}));

export function policyFor(type: LegalDocumentType): LegalPolicy {
  return LEGAL_POLICIES.find((p) => p.type === type) ?? LEGAL_POLICIES[0];
}
