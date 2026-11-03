/**
 * Shared stroke-icon driven by the compact `PATHS` set in `constants/theme`.
 *
 * Web `currentColor` has no RN equivalent, so `color` defaults to the text token;
 * call sites pass an explicit color as the kit does. Multi-stroke icons (paths
 * stored as an array) render as stacked <Path>s.
 */

import { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { C, PATHS, type IconName } from "@/constants/theme";

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke width (the kit's `sw`). */
  sw?: number;
  /** Fill the paths with `color` instead of stroking them. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Icon = memo(function Icon({
  name,
  size = 20,
  color = C.text,
  sw = 2,
  fill = false,
  style,
}: IconProps) {
  const raw: string | readonly string[] = PATHS[name] ?? PATHS.mountain;
  const arr: readonly string[] = Array.isArray(raw) ? raw : [raw];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {arr.map((p, i) => (
        <Path
          key={i}
          d={p}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill ? color : "none"}
        />
      ))}
    </Svg>
  );
});

interface MountainMarkProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline STREM mountain mark — peak + ascending ridge. Pure SVG so it renders
 * crisply at any size and survives view-shot capture. The web kit's optional
 * `glow` drop-shadow is applied at the container level in the screens that need
 * it (RN/`react-native-svg` filters are inconsistent across platforms).
 */
export const MountainMark = memo(function MountainMark({
  size = 40,
  color = "#ffffff",
  style,
}: MountainMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={style}>
      {/* back peak */}
      <Path d="M50 14 L84 78 L60 78 L50 58 Z" fill={color} opacity={0.32} />
      {/* front peak with snow-notch */}
      <Path d="M50 14 L60 78 L16 78 Z" fill={color} />
      {/* ascending ridge accent */}
      <Path
        d="M50 14 L41 44 L48 40 L57 60"
        stroke="#08090B"
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
    </Svg>
  );
});
