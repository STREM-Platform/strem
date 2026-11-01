/**
 * Parses the bundled policy markdown (a mirror of `strem-docs/legal`) into
 * blocks the policy viewer can lay out as a document (mobile#139). Pure, so it
 * is unit-tested; it only understands the subset the legal docs use.
 */

import type { LegalDocumentType } from "@/lib/api/types";

export type Inline = { text: string; bold?: boolean; italic?: boolean; href?: string };

export type DocBlock =
  | { kind: "heading"; level: 2 | 3; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: { text: string; depth: number; marker: string }[] }
  | { kind: "callout"; text: string };

export interface ParsedPolicy {
  /** `Version`, `Effective`, `Last-updated` from the fenced header. */
  meta: Record<string, string>;
  /** The plain-language summary quote at the top, without its bold lead-in. */
  summary: string | null;
  blocks: DocBlock[];
  sections: { id: string; text: string }[];
}

const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

export function parsePolicy(body: string): ParsedPolicy {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const meta: Record<string, string> = {};
  const blocks: DocBlock[] = [];
  let summary: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || /^#\s/.test(trimmed) || /^-{3,}$/.test(trimmed)) {
      i += 1;
    } else if (trimmed.startsWith("```")) {
      for (i += 1; i < lines.length && !lines[i].trim().startsWith("```"); i += 1) {
        const pair = lines[i].match(/^\s*([\w-]+):\s*(.+)$/);
        if (pair) meta[pair[1]] = pair[2].trim();
      }
      i += 1;
    } else if (/^#{2,3}\s/.test(trimmed)) {
      const level = trimmed.startsWith("###") ? 3 : 2;
      const text = trimmed.replace(/^#+\s*/, "");
      blocks.push({ kind: "heading", level, text, id: slug(text) });
      i += 1;
    } else if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      for (; i < lines.length && lines[i].trim().startsWith(">"); i += 1) quote.push(lines[i].trim().replace(/^>\s?/, ""));
      const text = quote.join(" ").trim();
      if (summary == null && !blocks.some((b) => b.kind === "heading")) {
        summary = text.replace(/^\*\*[^*]*\*\*\s*/, "");
      } else {
        blocks.push({ kind: "callout", text });
      }
    } else if (LIST.test(line)) {
      const items: { text: string; depth: number; marker: string }[] = [];
      while (i < lines.length && lines[i].trim()) {
        const item = lines[i].match(LIST);
        if (item) {
          items.push({ text: item[3].trim(), depth: item[1].length >= 2 ? 1 : 0, marker: /\d/.test(item[2]) ? item[2] : "•" });
        } else if (items.length) {
          items[items.length - 1].text += ` ${lines[i].trim()}`;
        }
        i += 1;
      }
      blocks.push({ kind: "list", items });
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i].trim() && !isBlockStart(lines[i]); i += 1) para.push(lines[i].trim());
      blocks.push({ kind: "paragraph", text: para.join(" ") });
    }
  }
  const sections = blocks.flatMap((b) => (b.kind === "heading" && b.level === 2 ? [{ id: b.id, text: b.text }] : []));
  return { meta, summary, blocks, sections };
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  return /^#{1,3}\s/.test(t) || t.startsWith(">") || t.startsWith("```") || /^-{3,}$/.test(t) || LIST.test(line);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** `**bold**`, `*italic*` and `[label](href)` runs; everything else is plain text. */
export function inlineRuns(text: string): Inline[] {
  const runs: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) runs.push({ text: text.slice(last, at) });
    runs.push(match[1] != null ? { text: match[1], bold: true } : match[4] != null ? { text: match[4], italic: true } : { text: match[2], href: match[3] });
    last = at + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs;
}

const DOC_FILES: Record<string, LegalDocumentType> = {
  "terms-of-service.md": "terms",
  "privacy-policy.md": "privacy",
  "medical-disclaimer.md": "medical",
};

/** A link between the policies (`privacy-policy.md#...`) opens the in-app viewer. */
export function policyLink(href: string): LegalDocumentType | null {
  return DOC_FILES[href.split("#")[0]] ?? null;
}
