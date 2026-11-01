/**
 * Unit tests for the legal accept-gate logic (issue #58): the pure
 * `pendingAcceptances` selector and the integrity of the bundled policies.
 */

import { describe, expect, it } from "@jest/globals";

import { LEGAL_POLICIES } from "@/constants/legal";
import type { LegalStatus } from "@/lib/api/types";
import { pendingAcceptances } from "@/lib/legal";
import { inlineRuns, parsePolicy, policyLink } from "@/lib/legal-doc";

function status(
  docs: { type: "terms" | "privacy" | "medical"; required: string; accepted: string | null }[],
): LegalStatus {
  const documents = docs.map((d) => ({
    document_type: d.type,
    required_version: d.required,
    accepted_version: d.accepted,
    needs_acceptance: d.accepted !== d.required,
  }));
  return { documents, needs_acceptance: documents.some((d) => d.needs_acceptance) };
}

describe("pendingAcceptances", () => {
  it("returns only the docs that need accepting, each at its required version", () => {
    const s = status([
      { type: "terms", required: "2026-06-20", accepted: null },
      { type: "privacy", required: "2026-06-20", accepted: "2026-06-20" }, // up to date
      { type: "medical", required: "2026-07-01", accepted: "2026-06-20" }, // bumped
    ]);
    expect(pendingAcceptances(s)).toEqual([
      { document_type: "terms", version: "2026-06-20" },
      { document_type: "medical", version: "2026-07-01" },
    ]);
  });

  it("is empty when everything is already accepted", () => {
    const s = status([
      { type: "terms", required: "2026-06-20", accepted: "2026-06-20" },
      { type: "privacy", required: "2026-06-20", accepted: "2026-06-20" },
      { type: "medical", required: "2026-06-20", accepted: "2026-06-20" },
    ]);
    expect(pendingAcceptances(s)).toEqual([]);
  });
});

describe("bundled policies", () => {
  it("ships all three documents with a version and non-trivial body", () => {
    const types = LEGAL_POLICIES.map((p) => p.type).sort();
    expect(types).toEqual(["medical", "privacy", "terms"]);
    for (const p of LEGAL_POLICIES) {
      expect(p.version).toMatch(/^\d{4}-\d{2}-\d{2}[a-z]?$/);
      expect(p.body.length).toBeGreaterThan(500);
      expect(p.title.length).toBeGreaterThan(0);
    }
  });
});

describe("parsePolicy", () => {
  it("reads dates, summary, sections and nested lists from every bundled policy", () => {
    for (const policy of LEGAL_POLICIES) {
      const doc = parsePolicy(policy.body);
      expect(doc.meta.Version).toBe(policy.version);
      expect(doc.summary).toBeTruthy();
      expect(doc.summary).not.toMatch(/^\*\*/);
      expect(doc.sections.length).toBeGreaterThanOrEqual(4);
      expect(doc.blocks.some((b) => b.kind === "heading" && b.text.startsWith("#"))).toBe(false);
    }
    const privacy = parsePolicy(LEGAL_POLICIES.find((p) => p.type === "privacy")!.body);
    const items = privacy.blocks.flatMap((b) => (b.kind === "list" ? b.items : []));
    expect(items.some((i) => i.depth === 1)).toBe(true);
  });

  it("splits bold and links, and maps policy links to the in-app viewer", () => {
    expect(inlineRuns("See the **Terms** and [Privacy Policy](privacy-policy.md#5).")).toEqual([
      { text: "See the " },
      { text: "Terms", bold: true },
      { text: " and " },
      { text: "Privacy Policy", href: "privacy-policy.md#5" },
      { text: "." },
    ]);
    expect(inlineRuns("*(tracked as HARDEN-09.)*")).toEqual([{ text: "(tracked as HARDEN-09.)", italic: true }]);
    expect(policyLink("medical-disclaimer.md")).toBe("medical");
    expect(policyLink("https://example.com")).toBeNull();
  });
});
