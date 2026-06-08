import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

interface StatusPillProps {
  label: string;
  tone?: "neutral" | "green" | "red" | "inverse";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.label, tone === "inverse" ? styles.inverseLabel : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  neutral: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.borderStrong,
  },
  green: {
    backgroundColor: Colors.accentGreenSoft,
    borderColor: Colors.accentGreen,
  },
  red: {
    backgroundColor: Colors.accentRedSoft,
    borderColor: Colors.accentRed,
  },
  inverse: {
    backgroundColor: Colors.surfaceInverse,
    borderColor: Colors.surfaceInverse,
  },
  label: {
    ...Typography.caption,
    color: Colors.text,
    textTransform: "uppercase",
  },
  inverseLabel: {
    color: Colors.background,
  },
});
