import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { Surface } from "@/components/ui/surface";
import { Colors, Spacing, Typography } from "@/constants/theme";
import type { XPSummary } from "@/lib/api/types";
import {
  DEFAULT_PREFS,
  loadNotificationPrefs,
  milestonePrompt,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: Colors.accentGreen, false: Colors.border }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

/**
 * Accountability reminder preferences: an explicit, honest opt-in with per-type
 * control, plus the milestone-proximity nudge derived from real progression.
 */
export function NotificationsCard({ xp }: { xp: XPSummary }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    let active = true;
    void loadNotificationPrefs().then((loaded) => {
      if (active) {
        setPrefs(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<NotificationPrefs>): void => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    void saveNotificationPrefs(next);
  };

  const prompt = prefs.enabled && prefs.milestones ? milestonePrompt(xp) : null;

  return (
    <Surface variant="raised" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Accountability reminders</Text>
          <Text style={styles.subtitle}>Gentle nudges to keep showing up — you stay in control.</Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(value) => update({ enabled: value })}
          accessibilityLabel="Accountability reminders"
          trackColor={{ true: Colors.accentGreen, false: Colors.border }}
          thumbColor={Colors.text}
        />
      </View>

      {prefs.enabled ? (
        <>
          <ToggleRow
            label="Weekly recap (Sunday)"
            value={prefs.weeklyRecap}
            onChange={(value) => update({ weeklyRecap: value })}
          />
          <ToggleRow
            label="Milestone proximity"
            value={prefs.milestones}
            onChange={(value) => update({ milestones: value })}
          />
          <ToggleRow
            label="Tribe nudges"
            value={prefs.tribeNudges}
            onChange={(value) => update({ tribeNudges: value })}
          />
          {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}
        </>
      ) : (
        <Text style={styles.optInNote}>
          Turn these on for a Sunday recap, a heads-up as you near a new rank, and a nudge when your
          tribe needs you.
        </Text>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    color: Colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  rowLabel: {
    ...Typography.label,
    color: Colors.text,
  },
  prompt: {
    ...Typography.body,
    color: Colors.accentGreenBright,
    fontWeight: "700",
  },
  optInNote: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});
