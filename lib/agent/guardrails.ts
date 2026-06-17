/**
 * Forge guardrail filter (A8).
 *
 * Every answer or action the agent emits passes through here. The guardrails are
 * the product's non-negotiables, ported from the roadmap:
 *   - no shame                (never frame a miss as a failure of character)
 *   - no vanity metrics       (no weight/BMI/appearance scoring)
 *   - no faked progress       (never invent a number the user didn't earn)
 *   - no medical diagnosis    (no clinical claims; signals, not diagnoses)
 *
 * The mock returns already-clean copy, so this is a lightweight UI-side backstop
 * (and a clear contract for the real B1/A8 server filter). It flags rather than
 * silently rewrites, so problems surface in development.
 */

const SHAME_PATTERNS = [
  /\blaz(y|iness)\b/i,
  /\byou failed\b/i,
  /\bno excuses\b/i,
  /\bpathetic\b/i,
  /\bdisappointing\b/i,
];

const VANITY_PATTERNS = [/\bbmi\b/i, /\bskinny\b/i, /\bbeach body\b/i, /\bflab\b/i];

const DIAGNOSIS_PATTERNS = [
  /\byou have (a |an )?(injury|condition|disease|deficiency)\b/i,
  /\bdiagnos(e|is|ed)\b/i,
  /\byou are (anemic|depressed|overtrained clinically)\b/i,
];

export interface GuardrailVerdict {
  ok: boolean;
  violations: string[];
}

/** Check a piece of agent copy. Returns the violations (empty = clean). */
export function checkGuardrails(text: string): GuardrailVerdict {
  const violations: string[] = [];
  if (SHAME_PATTERNS.some((p) => p.test(text))) violations.push("shame");
  if (VANITY_PATTERNS.some((p) => p.test(text))) violations.push("vanity-metric");
  if (DIAGNOSIS_PATTERNS.some((p) => p.test(text))) violations.push("medical-diagnosis");
  return { ok: violations.length === 0, violations };
}

/**
 * Pass agent copy through the guardrail. In __DEV__ a violation warns loudly so
 * it's caught before it ships; in production the original is returned unchanged
 * (the server-side A8 filter is the real gate). Never fabricates replacement copy.
 */
export function guard(text: string, source = "agent"): string {
  const verdict = checkGuardrails(text);
  if (!verdict.ok && typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[Forge:guardrail] ${source} tripped: ${verdict.violations.join(", ")} — "${text}"`);
  }
  return text;
}
