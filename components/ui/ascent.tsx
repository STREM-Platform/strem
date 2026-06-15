/**
 * Vertical ascent/altitude track — ported from `AscentTrack` in
 * `design-spec/strem-kit.jsx`. A glowing fill rises from BASE toward the next
 * rank, with a marker knob at the current altitude. The CSS fill gradient is
 * rendered with expo-linear-gradient; the glow uses `boxShadow`.
 */

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { T, mono } from "@/constants/theme";

interface AscentTrackProps {
  pct?: number;
  nextRank?: string;
  height?: number;
}

const TRACK_W = 6;
const KNOB = 13;

export function AscentTrack({ pct = 0.41, nextRank = "HYBRID", height = 150 }: AscentTrackProps) {
  const clamped = Math.min(1, Math.max(0, pct));
  const fillH = clamped * height;

  return (
    <View style={styles.col}>
      <Icon name="mountain" size={15} color={T.green} />
      <Text style={styles.next} numberOfLines={1}>{nextRank}</Text>
      <View style={[styles.track, { height }]}>
        <LinearGradient
          colors={["#34E2A0", "#0C8F63"]}
          style={[styles.fill, { height: fillH }]}
        />
        <View style={[styles.knob, { bottom: fillH - KNOB / 2 }]} />
      </View>
      <Text style={styles.base}>BASE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    alignItems: "center",
    width: 46,
  },
  next: {
    ...mono(8, 700),
    color: T.green,
    letterSpacing: 0.5,
    marginTop: 3,
    marginBottom: 6,
  },
  track: {
    width: TRACK_W,
    borderRadius: TRACK_W,
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: TRACK_W,
    boxShadow: "0px 0px 10px rgba(52,226,160,0.5)",
  },
  knob: {
    position: "absolute",
    left: "50%",
    marginLeft: -KNOB / 2,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: "#F4F6F4",
    borderWidth: 3,
    borderColor: "#0a0c10",
    boxShadow: "0px 0px 12px rgba(52,226,160,0.7)",
  },
  base: {
    ...mono(8, 700),
    color: T.sub,
    letterSpacing: 0.5,
    marginTop: 6,
  },
});
