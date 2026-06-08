import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";

interface SurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "raised" | "muted" | "outline";
}

export function Surface({ children, style, variant = "default" }: SurfaceProps) {
  return <View style={[styles.surface, styles[variant], style]}>{children}</View>;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "green" | "red";
}

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <Surface variant="muted" style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === "green" ? styles.green : null, tone === "red" ? styles.red : null]}>
        {value}
      </Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </Surface>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  children?: ReactNode;
}

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <Surface variant="raised" style={styles.empty}>
      <View style={styles.emptyMark}>
        <View style={styles.emptyMarkInner} />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignSelf: "stretch",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  default: {
    backgroundColor: Colors.surface,
  },
  raised: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.borderStrong,
    ...Shadows.card,
  },
  muted: {
    backgroundColor: Colors.backgroundElevated,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: Colors.border,
  },
  metric: {
    flex: 1,
    minHeight: 100,
    justifyContent: "space-between",
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSubtle,
    textTransform: "uppercase",
  },
  metricValue: {
    color: Colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  metricDetail: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  green: {
    color: Colors.accentGreenBright,
  },
  red: {
    color: Colors.accentRed,
  },
  empty: {
    alignItems: "flex-start",
  },
  emptyMark: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentGreenSoft,
  },
  emptyMarkInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreenBright,
  },
  emptyText: {
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  emptyBody: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});
