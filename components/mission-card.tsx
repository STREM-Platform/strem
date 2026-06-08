/** A single active mission with complete / skip actions. */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { titleizeEnum } from "@/lib/format";
import type { Mission } from "@/lib/api/types";

interface MissionCardProps {
  mission: Mission;
  onComplete: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}

export function MissionCard({ mission, onComplete, onSkip }: MissionCardProps) {
  const [busy, setBusy] = useState(false);

  const act = async (fn: (id: string) => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await fn(mission.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface variant="raised" style={styles.card}>
      <View style={styles.meta}>
        <StatusPill label={titleizeEnum(mission.type)} tone="green" />
        <StatusPill label={titleizeEnum(mission.difficulty)} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{mission.title}</Text>
        <Text style={styles.description}>{mission.description}</Text>
      </View>

      <View style={styles.conditionBox}>
        <Text style={styles.conditionLabel}>Completion proof</Text>
        <Text style={styles.condition}>{mission.completion_condition}</Text>
      </View>

      <View style={styles.rewardRow}>
        <Text style={styles.duration}>{mission.duration_days}-day mission</Text>
        <Text style={styles.xp}>+{mission.xp_reward} XP</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Complete"
          onPress={() => void act(onComplete)}
          disabled={busy}
          loading={busy}
          style={styles.actionButton}
        />
        <PrimaryButton
          label="Skip"
          onPress={() => void act(onSkip)}
          disabled={busy}
          variant="ghost"
          style={styles.actionButton}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  titleBlock: {
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
  },
  description: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  conditionBox: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accentGreenBright,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xxs,
  },
  conditionLabel: {
    ...Typography.caption,
    color: Colors.textSubtle,
    textTransform: "uppercase",
  },
  condition: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  duration: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  xp: {
    color: Colors.accentGreenBright,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
