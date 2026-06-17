/**
 * STREM design tokens.
 *
 * Premium dark product UI with a disciplined monochrome base and restrained
 * Bulgarian green/red accents. The glow-heavy brand assets are inspiration,
 * not a default product surface treatment.
 *
 * The premium overhaul (`design-spec/strem-kit.jsx`) layer — token object `T`,
 * the `disp/ui/mono` type helpers, `RARITY`, and the `PATHS` icon set — lives at
 * the bottom of this file. The legacy `Colors`/`Spacing`/`Typography` exports
 * below are kept intact so existing screens keep compiling until they migrate.
 */

import type { TextStyle } from "react-native";

import {
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  Saira_400Regular,
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
} from "@expo-google-fonts/saira";
import {
  SairaCondensed_600SemiBold,
  SairaCondensed_700Bold,
  SairaCondensed_800ExtraBold,
} from "@expo-google-fonts/saira-condensed";

export const Colors = {
  background: "#070809",
  backgroundElevated: "#0B0D10",
  surface: "#121418",
  surfaceRaised: "#181B20",
  surfaceMuted: "#20242A",
  surfaceInverse: "#F5F7F5",
  text: "#F6F7F2",
  textMuted: "#A8AFB5",
  textSubtle: "#707982",
  border: "#2A3036",
  borderStrong: "#3A4149",
  accentGreen: "#00966E",
  accentGreenBright: "#20C997",
  accentGreenSoft: "#0E241D",
  accentRed: "#D62612",
  accentRedSoft: "#301411",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorToken = keyof typeof Colors;

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

export const Typography = {
  brand: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 3,
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
} as const;

// Use the cross-platform `boxShadow` (RN 0.85 + react-native-web) instead of the
// deprecated `shadow*` props; keep `elevation` for legacy Android.
export const Shadows = {
  card: {
    boxShadow: "0px 14px 24px rgba(0, 0, 0, 0.26)",
    elevation: 8,
  },
  nav: {
    boxShadow: "0px -10px 20px rgba(0, 0, 0, 0.24)",
    elevation: 16,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.xl,
  appBottomInset: 112,
} as const;

// ── Premium overhaul layer (design-spec/strem-kit.jsx) ───────────────────────
//
// `T` is the spec's token object ported verbatim. Surfaces ramp #08090B →
// #1F252D; green #34E2A0 marks proof/XP, red #E5402A marks legendary & at-risk
// (used sparingly). These drive the new visual system; screens migrate onto `T`
// in the screen steps.
export const T = {
  bg: "#08090B",
  bg2: "#0E1116",
  surf: "#12161C",
  surf2: "#181D24",
  surf3: "#1F252D",
  line: "rgba(255,255,255,0.07)",
  line2: "rgba(255,255,255,0.13)",
  text: "#F4F6F4",
  mut: "#9AA3AB",
  sub: "#6B747C",
  green: "#34E2A0",
  greenD: "#0C8F63",
  greenSoft: "rgba(52,226,160,0.10)",
  greenLine: "rgba(52,226,160,0.28)",
  red: "#E5402A",
  redSoft: "rgba(229,64,42,0.12)",
  redLine: "rgba(229,64,42,0.30)",
} as const;

export type ThemeToken = keyof typeof T;

// Rarity palette for medals / collectibles.
export const RARITY = {
  common: { c: "#9AA3AB", glow: "none", label: "Common" },
  rare: { c: "#37C6F2", glow: "rgba(55,198,242,0.30)", label: "Rare" },
  epic: { c: "#34E2A0", glow: "rgba(52,226,160,0.32)", label: "Epic" },
  legendary: { c: "#E5402A", glow: "rgba(229,64,42,0.34)", label: "Legendary" },
  mythic: { c: "#F4F6F4", glow: "rgba(255,255,255,0.4)", label: "Mythic" },
} as const;

export type Rarity = keyof typeof RARITY;

// ── Type system ──────────────────────────────────────────────────────────────
//
// The web kit's `disp/ui/mono` return CSS `font` shorthands. Custom fonts in RN
// encode weight in the family name, so these helpers return a `TextStyle` whose
// `fontFamily` is the loaded variant nearest the requested weight. `fontWeight`
// is deliberately omitted — setting it alongside a weighted family causes faux
// bolding on some platforms. `letterSpacing`/`lineHeight` are applied per call
// site, exactly as the web kit does.
//
// Display = Saira Condensed, UI = Saira, labels/numerals = JetBrains Mono.

// Loaded variants, keyed by their @expo-google-fonts export name. Loaded in
// `app/_layout.tsx` via `useFonts(FontAssets)`.
export const FontAssets = {
  SairaCondensed_600SemiBold,
  SairaCondensed_700Bold,
  SairaCondensed_800ExtraBold,
  Saira_400Regular,
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
};

type WeightTable = readonly (readonly [number, string])[];

const DISP_WEIGHTS: WeightTable = [
  [600, "SairaCondensed_600SemiBold"],
  [700, "SairaCondensed_700Bold"],
  [800, "SairaCondensed_800ExtraBold"],
];
const UI_WEIGHTS: WeightTable = [
  [400, "Saira_400Regular"],
  [500, "Saira_500Medium"],
  [600, "Saira_600SemiBold"],
  [700, "Saira_700Bold"],
];
const MONO_WEIGHTS: WeightTable = [
  [600, "JetBrainsMono_600SemiBold"],
  [700, "JetBrainsMono_700Bold"],
];

/** Pick the loaded font variant nearest a requested numeric weight. */
function nearestFamily(table: WeightTable, weight: number): string {
  let best = table[0];
  for (const row of table) {
    if (Math.abs(row[0] - weight) < Math.abs(best[0] - weight)) {
      best = row;
    }
  }
  return best[1];
}

/** Display type — Saira Condensed. Default weight 800 (ExtraBold). */
export function disp(size: number, weight = 800): TextStyle {
  return { fontFamily: nearestFamily(DISP_WEIGHTS, weight), fontSize: size };
}

/** UI type — Saira. Default weight 600 (SemiBold). */
export function ui(size: number, weight = 600): TextStyle {
  return { fontFamily: nearestFamily(UI_WEIGHTS, weight), fontSize: size };
}

/** Mono labels & numerals — JetBrains Mono. Default weight 700 (Bold). */
export function mono(size: number, weight = 700): TextStyle {
  return { fontFamily: nearestFamily(MONO_WEIGHTS, weight), fontSize: size };
}

// ── Icon set (design-spec/strem-kit.jsx) ─────────────────────────────────────
//
// 24×24 stroke paths. A value is either a single path string or an array of
// path strings (multi-stroke icons). Rendered by the shared <Icon> in
// `components/ui/icon.tsx`.
export const PATHS = {
  mountain: "M3 20h18L14.5 7.5 11 13 8.5 9 3 20z",
  flame:
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2 2.5z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  target: [
    "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
    "M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0",
    "M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0",
  ],
  dumbbell: "M6 8v8M4 6.5v11M18 8v8M20 6.5v11M6 12h12",
  leaf: "M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 7-4 16-9 16zM4 20c3-4 6-6 10-7",
  users: [
    "M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11z",
    "M2.5 19a5.5 5.5 0 0 1 11 0",
    "M16 5.2a3 3 0 0 1 0 5.8M17 13.5a5.5 5.5 0 0 1 4 5.2",
  ],
  sparkles:
    "M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z",
  shield: "M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z",
  check: "M5 12.5l4.5 4.5L19 7",
  lock: ["M6 11h12v9H6z", "M9 11V8a3 3 0 0 1 6 0v3"],
  chevron: "M9 6l6 6-6 6",
  chevronL: "M15 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trophy:
    "M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14.5V19M15 14.5V19M8 21h8",
  medal: "M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M9 3l3 5 3-5M8 3h8",
  timer: ["M12 13m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0", "M12 13V8M9 2h6"],
  route: ["M6 19a3 3 0 1 0 0-6h12a3 3 0 1 0 0-6", "M6 19h0M18 7h0"],
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  bell: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 0 0 4 0",
  arrowUR: "M7 17 17 7M8 7h9v9",
  download: "M12 3v12M8 11l4 4 4-4M5 20h14",
  share: "M16 6l-4-4-4 4M12 2v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7",
  play: "M7 4l13 8-13 8z",
  pause: "M8 5v14M16 5v14",
  stop: "M7 7h10v10H7z",
  home: "M4 11.5 12 4l8 7.5M6 10v10h12V10",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z",
  star: "M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7L12 3z",
  heart:
    "M12 20s-7-4.3-9.3-8.1C1 9 2.2 5.5 5.5 5.5c2 0 3.2 1.2 3.5 2 .3-.8 1.5-2 3.5-2 3.3 0 4.5 3.5 2.8 6.4C19 15.7 12 20 12 20z",
  chart: "M5 4v16h16M9 16V11M13 16V8M17 16v-3",
  compass: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M15.5 8.5l-2 5-5 2 2-5z"],
  bot: ["M9 3h6v3H9zM5 8h14v11H5zM5 8l-2 3M19 8l2 3", "M9 13h0M15 13h0"],
  utensils: "M5 3v7a2 2 0 0 0 2 2M9 3v18M7 3v7M16 3c-1.5 0-2 2-2 5s.5 4 2 4v9",
  clock: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3 2"],
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: [
    "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z",
    "M12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ],
  settings: [
    "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
    "M12 3v3M12 18v3M5 5l2 2M17 17l2 2M3 12h3M18 12h3M5 19l2-2M17 7l2-2",
  ],
  refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  send: "M5 12h14M13 6l6 6-6 6",
  edit: "M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4",
} as const;

export type IconName = keyof typeof PATHS;
