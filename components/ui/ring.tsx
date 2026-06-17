/**
 * Circular progress ring — the RN translation of the web kit's conic-gradient
 * `Ring` (design-spec/strem-kit.jsx). A track circle + a progress arc drawn with
 * react-native-svg (strokeDasharray), starting at 12 o'clock, with centered
 * children.
 */

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { T } from "@/constants/theme";

interface RingProps {
  size?: number;
  stroke?: number;
  pct?: number;
  track?: string;
  color?: string;
  children?: ReactNode;
}

export function Ring({
  size = 150,
  stroke = 12,
  pct = 0.41,
  track = "rgba(255,255,255,0.07)",
  color = T.green,
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, pct)) * circumference;

  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* rotate -90° via an SVG group transform (web-safe; avoids the RN-svg
            transform-origin prop that errors on web). */}
        <G transform={`rotate(-90 ${cx} ${cx})`}>
          <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
          />
        </G>
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
