import {
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { Michroma_400Regular } from "@expo-google-fonts/michroma";
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
import type { TextStyle } from "react-native";

/**
 * STREM Race OS design tokens.
 *
 * Neutral night canvas so race photography carries the colour; white is the
 * primary action; brand green marks progress and the active state; brand red is
 * reserved for the finish line and critical alerts (from the logo's tricolour).
 * Layer colours are the validated categorical dark steps (CVD-checked against
 * `surface`); status colours are fixed and always paired with an icon + label.
 */
export const C = {
  ink: "#08090B",
  night: "#0D0F12",
  surface: "#14171B",
  surface2: "#1B1F24",
  surface3: "#252A31",
  line: "rgba(255,255,255,0.07)",
  lineStrong: "rgba(255,255,255,0.14)",
  glass: "rgba(12,14,17,0.72)",
  scrim: "rgba(8,9,11,0.92)",
  text: "#F4F5F6",
  textMuted: "#A3AAB4",
  textDim: "#6D7580",
  white: "#FFFFFF",
  accent: "#4ADE80",
  accentSoft: "rgba(74,222,128,0.12)",
  accentLine: "rgba(74,222,128,0.34)",
  accentInk: "#04210F",
  flame: "#FF5A4E",
  flameSoft: "rgba(255,90,78,0.12)",
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  unknown: "#7d8590",
} as const;

export type LayerKey = "training" | "fuel" | "course" | "gear" | "logistics" | "strategy";

export const LAYER_COLOR: Record<LayerKey, string> = {
  training: "#3987e5",
  fuel: "#d95926",
  course: "#199e70",
  gear: "#c98500",
  logistics: "#d55181",
  strategy: "#9085e9",
};

/** Legacy token names kept so older screens adopt the new palette unchanged. */
export const Trail = {
  bg: C.ink,
  bgRaised: C.night,
  panel: C.surface,
  panelRaised: C.surface2,
  panelSoft: C.surface3,
  line: C.line,
  lineStrong: C.lineStrong,
  text: C.text,
  textMuted: C.textMuted,
  textDim: C.textDim,
  lime: C.accent,
  limeInk: C.accentInk,
  limeSoft: C.accentSoft,
  limeLine: C.accentLine,
  orange: C.serious,
  orangeSoft: "rgba(236,131,90,0.12)",
  orangeLine: "rgba(236,131,90,0.32)",
  sky: LAYER_COLOR.training,
  skySoft: "rgba(57,135,229,0.12)",
} as const;

export const R = { sm: 10, md: 16, lg: 22, xl: 30 } as const;

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
  Michroma_400Regular,
};

type WeightTable = readonly (readonly [number, string])[];

const DISPLAY_WEIGHTS: WeightTable = [
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

function nearestFamily(table: WeightTable, weight: number): string {
  let best = table[0];
  for (const row of table) {
    if (Math.abs(row[0] - weight) < Math.abs(best[0] - weight)) best = row;
  }
  return best[1];
}

/** Condensed display: race names, countdown, section titles. */
export function disp(size: number, weight = 800): TextStyle {
  return { fontFamily: nearestFamily(DISPLAY_WEIGHTS, weight), fontSize: size };
}

/** Interface text. */
export function ui(size: number, weight = 600): TextStyle {
  return { fontFamily: nearestFamily(UI_WEIGHTS, weight), fontSize: size };
}

/** Tabular data: distances, times, cutoffs. */
export function mono(size: number, weight = 700): TextStyle {
  return { fontFamily: nearestFamily(MONO_WEIGHTS, weight), fontSize: size };
}

/** Wide brand face (echoes the STREM wordmark) — overlines and the wordmark only. */
export function brand(size: number): TextStyle {
  return { fontFamily: "Michroma_400Regular", fontSize: size };
}

/** 24 × 24 stroke icon paths. */
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
  sparkles:
    "M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z",
  shield: "M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z",
  check: "M5 12.5l4.5 4.5L19 7",
  lock: ["M6 11h12v9H6z", "M9 11V8a3 3 0 0 1 6 0v3"],
  chevron: "M9 6l6 6-6 6",
  chevronL: "M15 6l-6 6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  route: ["M6 19a3 3 0 1 0 0-6h12a3 3 0 1 0 0-6", "M6 19h0M18 7h0"],
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  star: "M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7L12 3z",
  heart:
    "M12 20s-7-4.3-9.3-8.1C1 9 2.2 5.5 5.5 5.5c2 0 3.2 1.2 3.5 2 .3-.8 1.5-2 3.5-2 3.3 0 4.5 3.5 2.8 6.4C19 15.7 12 20 12 20z",
  compass: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M15.5 8.5l-2 5-5 2 2-5z"],
  clock: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3 2"],
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: [
    "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z",
    "M12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ],
  send: "M5 12h14M13 6l6 6-6 6",
  run: [
    "M14.5 4.5m-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0",
    "M7 21l3.5-6",
    "M10.5 15l3 2.5V21",
    "M10.5 15l1.6-5 3.4 2.5 3 .5",
    "M12.1 10l-3.6 1-2 3",
  ],
  bike: [
    "M5.5 17.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
    "M18.5 17.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
    "M5.5 17.5L9 9h5l4.5 8.5",
    "M9 9l3.5 8.5M14 9l-1-3h3",
  ],
  swim: [
    "M2 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0",
    "M2 14c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0",
    "M7 10l4-3 2.5 2 3-2.5",
    "M18 5.5m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0",
  ],
  hike: [
    "M13 4.5m-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0",
    "M9 21l2-7 3 2v5",
    "M11 14l1-5 3 2.5",
    "M18 9v12",
    "M9.5 9.5L8 12",
  ],
  ski: ["M4 20l16-6", "M14 4.5m-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0", "M8 15l4-6 3 3 2-1"],
  row: ["M3 19c2 1 4 1 6 0s4-1 6 0 4 1 6 0", "M5 15l14-10", "M16 7l3 3"],
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  pack: ["M5 21V10a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v11z", "M9 5V3h6v2", "M8 14h8v4H8z"],
  calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4M16 3v4"],
  map: ["M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z", "M9 4v14M15 6v14"],
  sun: [
    "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
    "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  ],
  cloud: "M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z",
  rain: [
    "M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 8 3.5 3.5 0 0 0 7 15z",
    "M8 18l-1 2M12 18l-1 2M16 18l-1 2",
  ],
  wind: ["M3 8h11a3 3 0 1 0-3-3", "M3 12h16a3 3 0 1 1-3 3", "M3 16h7"],
  sunrise: ["M3 18h18", "M7 18a5 5 0 0 1 10 0", "M12 3v5M9 6l3-3 3 3"],
  user: ["M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0", "M4 21a8 8 0 0 1 16 0"],
  image: [
    "M3 5h18v14H3z",
    "M3 16l5-5 4 4 3-3 6 6",
    "M15.5 9m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0",
  ],
  search: ["M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0", "M21 21l-5-5"],
  edit: ["M4 20h4l11-11-4-4L4 16z", "M13 6l4 4"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"],
  refresh: ["M20 11a8 8 0 0 0-14.9-3M4 4v4h4", "M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"],
  info: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 11v5M12 8h0"],
  alert: ["M12 3l10 18H2L12 3z", "M12 10v4M12 17h0"],
  upload: ["M12 16V4M7 9l5-5 5 5", "M4 16v4h16v-4"],
  download: ["M12 4v12M7 11l5 5 5-5", "M4 20h16"],
  checkCircle: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M8 12.5l3 3 5-6"],
  circle: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
  halfCircle: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 3v18"],
  xCircle: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M9 9l6 6M15 9l-6 6"],
  trophy: [
    "M8 4h8v5a4 4 0 0 1-8 0V4z",
    "M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4",
    "M12 13v4M8 21h8M9 17h6",
  ],
  message: "M4 5h16v11H9l-5 4z",
  home: ["M3 11l9-7 9 7", "M5 10v10h14V10"],
  layers: ["M12 3l9 5-9 5-9-5 9-5z", "M3 13l9 5 9-5"],
  sliders: ["M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12", "M16 4v4M10 10v4M18 16v4"],
  link: [
    "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1",
    "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  ],
  logout: ["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h10"],
  watch: ["M7 7h10v10H7z", "M9 7V3h6v4M9 17v4h6v-4", "M12 10v2l1.5 1"],
  stopwatch: ["M12 13m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0", "M12 9v4l2 2", "M10 2h4"],
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  list: ["M8 6h12M8 12h12M8 18h12", "M4 6h0M4 12h0M4 18h0"],
  database: ["M12 5m-8 0a8 3 0 1 0 16 0a8 3 0 1 0-16 0", "M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
} as const;

export type IconName = keyof typeof PATHS;
