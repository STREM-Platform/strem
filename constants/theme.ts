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
import type { TextStyle } from "react-native";

/** The only visual token set used by STREM's trail Race Mission interface. */
export const Trail = {
  bg: "#07100C",
  bgRaised: "#0A1510",
  panel: "#101D17",
  panelRaised: "#14241C",
  panelSoft: "#192A21",
  line: "rgba(224, 239, 229, 0.10)",
  lineStrong: "rgba(224, 239, 229, 0.20)",
  text: "#EEF5EF",
  textMuted: "#A7B6AA",
  textDim: "#708076",
  lime: "#B7ED62",
  limeInk: "#142208",
  limeSoft: "rgba(183, 237, 98, 0.11)",
  limeLine: "rgba(183, 237, 98, 0.34)",
  orange: "#FF8A4C",
  orangeSoft: "rgba(255, 138, 76, 0.11)",
  orangeLine: "rgba(255, 138, 76, 0.32)",
  sky: "#78C7D6",
  skySoft: "rgba(120, 199, 214, 0.11)",
} as const;

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

export function disp(size: number, weight = 800): TextStyle {
  return { fontFamily: nearestFamily(DISPLAY_WEIGHTS, weight), fontSize: size };
}

export function ui(size: number, weight = 600): TextStyle {
  return { fontFamily: nearestFamily(UI_WEIGHTS, weight), fontSize: size };
}

export function mono(size: number, weight = 700): TextStyle {
  return { fontFamily: nearestFamily(MONO_WEIGHTS, weight), fontSize: size };
}

/** Compact 24 x 24 stroke-icon paths used by active screens. */
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
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  route: ["M6 19a3 3 0 1 0 0-6h12a3 3 0 1 0 0-6", "M6 19h0M18 7h0"],
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  play: "M7 4l13 8-13 8z",
  star: "M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7L12 3z",
  heart:
    "M12 20s-7-4.3-9.3-8.1C1 9 2.2 5.5 5.5 5.5c2 0 3.2 1.2 3.5 2 .3-.8 1.5-2 3.5-2 3.3 0 4.5 3.5 2.8 6.4C19 15.7 12 20 12 20z",
  compass: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M15.5 8.5l-2 5-5 2 2-5z"],
  bot: ["M9 3h6v3H9zM5 8h14v11H5zM5 8l-2 3M19 8l2 3", "M9 13h0M15 13h0"],
  utensils: "M5 3v7a2 2 0 0 0 2 2M9 3v18M7 3v7M16 3c-1.5 0-2 2-2 5s.5 4 2 4v9",
  clock: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3 2"],
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: [
    "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z",
    "M12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ],
  send: "M5 12h14M13 6l6 6-6 6",
} as const;

export type IconName = keyof typeof PATHS;
