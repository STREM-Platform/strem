/**
 * Stylized mountain backdrop for the Home hero — the RN translation of the web
 * `PhotoSlot` peaks + glow (design-spec/strem-kit.jsx). CSS `clip-path` polygons
 * become react-native-svg `<Polygon>`s (stretched to the box with
 * preserveAspectRatio="none"); the radial green glow is an SVG RadialGradient;
 * ridge fills use SVG LinearGradients.
 *
 * The faint mountain-mark watermark and the readability scrim are layered by the
 * Home hero itself (it needs them above its own content order). The very subtle
 * CSS scanline texture is omitted (negligible at device scale).
 */

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

interface HeroBackdropProps {
  tone?: "green" | "red";
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Polygon point sets from the web PhotoSlot clip-paths (x,y as 0–100).
const BACK_RIDGE = "0,100 0,56 17,70 33,30 46,52 59,20 75,60 88,40 100,64 100,100";
const FRONT_RIDGE = "0,100 0,74 22,84 40,54 56,78 70,48 84,76 100,60 100,100";

export function HeroBackdrop({ tone = "green", glow = true, style }: HeroBackdropProps) {
  const glowColor = tone === "red" ? "rgba(229,64,42,0.16)" : "rgba(52,226,160,0.14)";
  return (
    <View style={[styles.fill, style]} pointerEvents="none">
      {/* base + glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="hb-base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10141a" />
            <Stop offset="100%" stopColor="#0a0c10" />
          </LinearGradient>
          <RadialGradient id="hb-glow" cx="68%" cy="4%" r="75%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity={glow ? 1 : 0} />
            <Stop offset="58%" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#hb-base)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#hb-glow)" />
      </Svg>

      {/* back ridge (taller layer) */}
      <View style={[styles.ridge, { height: "60%" }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="hb-back" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#171d25" />
              <Stop offset="100%" stopColor="#0b0e12" />
            </LinearGradient>
          </Defs>
          <Polygon points={BACK_RIDGE} fill="url(#hb-back)" opacity={0.9} />
        </Svg>
      </View>

      {/* front ridge */}
      <View style={[styles.ridge, { height: "42%" }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="hb-front" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#1f262f" />
              <Stop offset="100%" stopColor="#0d1116" />
            </LinearGradient>
          </Defs>
          <Polygon points={FRONT_RIDGE} fill="url(#hb-front)" opacity={0.95} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  ridge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
