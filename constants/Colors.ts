/**
 * STREM color tokens.
 *
 * Premium black/white base with restrained Bulgarian green and red accents,
 * per `strem-docs/vision/brand-identity.md`. Product UI stays clean, legible,
 * and restrained — accents are used sparingly, not as a glow-heavy default.
 */
export const Colors = {
  background: "#0B0B0C",
  surface: "#15161A",
  text: "#F5F5F7",
  textMuted: "#9BA1A6",
  border: "#2A2C31",
  accentGreen: "#00966E", // Bulgarian flag green
  accentRed: "#D62612", // Bulgarian flag red
} as const;

export type ColorToken = keyof typeof Colors;
