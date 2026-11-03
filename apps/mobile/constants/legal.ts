/**
 * Legal policy presentation metadata, paired with the bundled canonical text in
 * `constants/legal-docs.ts` (a mirror of `strem-docs/legal/*.md`). The version
 * shown + accepted is the one in the bundled doc; the backend
 * (`GET /users/me/legal`) is the source of truth for what is *required*.
 */

import { LEGAL_DOCS } from "@/constants/legal-docs";
import type { IconName } from "@/constants/theme";
import type { LegalDocumentType } from "@/lib/api/types";

interface LegalPolicy {
  type: LegalDocumentType;
  title: string;
  blurb: string;
  icon: IconName;
  /** Plain-language "what this means for you" lines on the agreement gate (mobile#139). */
  points: string[];
  version: string;
  body: string;
}

const META: Record<LegalDocumentType, { title: string; blurb: string; icon: IconName; points: string[] }> = {
  terms: {
    title: "Terms of Service",
    blurb: "How you can use STREM, and the limits of what we promise.",
    icon: "edit",
    points: ["Use STREM for your own preparation, lawfully.", "Your account is yours to keep secure, and to leave any time."],
  },
  privacy: {
    title: "Privacy Policy",
    blurb: "What we collect, why, and the control you keep over it.",
    icon: "lock",
    points: ["Your data prepares your races. It is never sold or used for ads.", "Export it, disconnect sources or delete it whenever you want."],
  },
  medical: {
    title: "Medical Disclaimer",
    blurb: "STREM is not a medical device — coaching and insights are estimates.",
    icon: "heart",
    points: ["The limits of estimates, biomarkers and supplements, and when to stop and get help."],
  },
};

/** Order shown in the accept gate: the medical disclaimer first (most consequential). */
const LEGAL_ORDER: LegalDocumentType[] = ["medical", "terms", "privacy"];

export const LEGAL_POLICIES: LegalPolicy[] = LEGAL_ORDER.map((type) => ({
  type,
  ...META[type],
  version: LEGAL_DOCS[type].version,
  body: LEGAL_DOCS[type].body,
}));

export function policyFor(type: LegalDocumentType): LegalPolicy {
  return LEGAL_POLICIES.find((p) => p.type === type) ?? LEGAL_POLICIES[0];
}
