import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "@/constants/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  overline?: string;
  children?: ReactNode;
}

export function ScreenHeader({ title, subtitle, overline, children }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {overline ? <Text style={styles.overline}>{overline}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}

export function SectionHeader({ title, action, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.sm,
  },
  overline: {
    ...Typography.caption,
    color: Colors.accentGreenBright,
    textTransform: "uppercase",
  },
  title: {
    ...Typography.screenTitle,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.subtitle,
    color: Colors.textMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
