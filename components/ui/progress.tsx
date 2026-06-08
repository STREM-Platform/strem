import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

interface ProgressBarProps {
  value: number;
  label?: string;
  helper?: string;
}

export function ProgressBar({ value, label, helper }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <View style={styles.group}>
      {label || helper ? (
        <View style={styles.row}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {helper ? <Text style={styles.helper}>{helper}</Text> : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

interface SegmentedProgressProps {
  total: number;
  currentIndex: number;
}

export function SegmentedProgress({ total, currentIndex }: SegmentedProgressProps) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.segment, index <= currentIndex ? styles.segmentActive : null]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.text,
  },
  helper: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreenBright,
  },
  segments: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  segmentActive: {
    backgroundColor: Colors.accentGreenBright,
  },
});
