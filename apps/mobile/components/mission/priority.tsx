/** A/B/C race priority: a badge everywhere a race appears, and a sheet to change it. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, ErrorBanner, Notice } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import { PRIORITY, priorityOf, type Priority } from "@/lib/race/priority";

export const PRIORITY_COLOR: Record<Priority, string> = { A: C.flame, B: C.accent, C: C.textMuted };

export function PriorityBadge({ priority, size = 22, onPress }: { priority: Priority; size?: number; onPress?: () => void }) {
  const color = PRIORITY_COLOR[priority];
  const badge = (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}26` }]}>
      <Text style={[ui(Math.round(size * 0.5), 900), { color }]}>{priority}</Text>
    </View>
  );
  if (!onPress) return <View accessibilityLabel={PRIORITY[priority].label}>{badge}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${PRIORITY[priority].label} — change priority`} onPress={onPress} hitSlop={10}>
      {badge}
    </Pressable>
  );
}

/**
 * Change a race's priority. Saving updates the mission; the caller re-plans
 * (the race team rebuilds the affected plans) when the athlete asks.
 */
export function PrioritySheet({
  mission,
  onClose,
  onSaved,
  onReplan,
  replanning,
}: {
  mission: RaceMission | null;
  onClose: () => void;
  onSaved: (mission: RaceMission) => void;
  onReplan: (mission: RaceMission) => void;
  replanning: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<RaceMission | null>(null);
  const current = saved ?? mission;
  if (!current) return null;
  const pick = async (priority: Priority) => {
    if (priority === priorityOf(current)) return;
    setBusy(true);
    setError(null);
    try {
      const next = await raceMissions.update(current, { goal: { ...current.goal, priority } }, `Priority changed to ${priority}`);
      setSaved(next);
      onSaved(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The change was not saved. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    setSaved(null);
    setError(null);
    onClose();
  };
  return (
    <Sheet visible={mission != null} onClose={close} title={`Priority · ${current.event.name}`}>
      <View style={{ gap: 10 }}>
        {(Object.keys(PRIORITY) as Priority[]).map((p) => {
          const on = priorityOf(current) === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: busy }}
              accessibilityLabel={`${PRIORITY[p].label}: ${PRIORITY[p].short}`}
              disabled={busy}
              onPress={() => void pick(p)}
              style={({ pressed }) => [styles.option, on && { borderColor: PRIORITY_COLOR[p] }, pressed && { opacity: 0.85 }]}
            >
              <PriorityBadge priority={p} size={32} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ui(15, 800), { color: C.text }]}>
                  {PRIORITY[p].label} · {PRIORITY[p].short}
                </Text>
                <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>{PRIORITY[p].body}</Text>
              </View>
            </Pressable>
          );
        })}
        {error ? <ErrorBanner message={error} /> : null}
        {saved ? (
          <Notice
            icon="refresh"
            tone="accent"
            title={`Now a ${PRIORITY[priorityOf(saved)].label}`}
            body="Your plans were built with the old priority. Re-plan so the race team fits the taper and recovery around it."
            action={<Button label="Re-plan around this" icon="sparkles" size="sm" loading={replanning} onPress={() => onReplan(saved)} style={{ alignSelf: "flex-start", marginTop: 6 }} />}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
});
