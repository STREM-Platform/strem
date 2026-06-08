/** A single active mission with complete / skip actions. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
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
    <View style={styles.card}>
      <View style={styles.meta}>
        <Text style={styles.tag}>{mission.type}</Text>
        <Text style={styles.tagMuted}>{mission.difficulty}</Text>
        <Text style={styles.xp}>+{mission.xp_reward} XP</Text>
      </View>
      <Text style={styles.title}>{mission.title}</Text>
      <Text style={styles.description}>{mission.description}</Text>
      <Text style={styles.condition}>{mission.completion_condition}</Text>
      <Text style={styles.duration}>{mission.duration_days}-day mission</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void act(onComplete)}
          style={[styles.button, styles.complete, busy ? styles.disabled : null]}
        >
          <Text style={styles.completeLabel}>Complete</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void act(onSkip)}
          style={[styles.button, styles.skip, busy ? styles.disabled : null]}
        >
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: {
    color: Colors.accentGreen,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tagMuted: { color: Colors.textMuted, fontSize: 12, textTransform: "uppercase" },
  xp: { color: Colors.textMuted, fontSize: 12, fontWeight: "700", marginLeft: "auto" },
  title: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  description: { color: Colors.textMuted, fontSize: 14, lineHeight: 20 },
  condition: { color: Colors.text, fontSize: 13 },
  duration: { color: Colors.textMuted, fontSize: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  button: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  complete: { backgroundColor: Colors.text },
  completeLabel: { color: Colors.background, fontWeight: "700" },
  skip: { borderColor: Colors.border, borderWidth: 1 },
  skipLabel: { color: Colors.textMuted, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
