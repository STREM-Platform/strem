/**
 * Post-session summary — adapted from `WorkoutSummary` in workout-exec.jsx.
 *
 * Shows locally-measured results (time, volume, sets). The web prototype's
 * fabricated "+XP" and "NEW PERSONAL RECORD" callouts are intentionally dropped:
 * the contract returns neither per-session XP nor PR data, so we don't invent
 * them. Saving runs the only real persistence — `POST /training/sessions` — after
 * which XP updates through the backend progression ledger.
 */

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Btn, Panel } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { fmtClock, type WorkoutResult } from "@/lib/workout";

export function WorkoutSummary({
  result,
  onSave,
  onDone,
}: {
  result: WorkoutResult;
  onSave: () => Promise<void>;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { workout, elapsed, volume, sets } = result;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const tiles: { label: string; value: string; icon: IconName; green?: boolean }[] = [
    { label: "TIME", value: fmtClock(elapsed), icon: "clock" },
    { label: "VOLUME", value: `${(volume / 1000).toFixed(1)}t`, icon: "dumbbell", green: true },
    { label: "SETS", value: String(sets), icon: "check" },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}>
      <MountainMark size={300} color="#9fb0a8" style={styles.watermark} />
      <View style={styles.badge}>
        <Icon name="check" size={42} color={T.green} sw={2.6} />
      </View>
      <Text style={styles.eyebrow}>SESSION COMPLETE</Text>
      <Text style={styles.title}>{workout.title.toUpperCase()}</Text>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Panel key={t.label} style={styles.tile} pad={12}>
            <Icon name={t.icon} size={15} color={t.green ? T.green : T.mut} fill={t.green} />
            <Text style={[styles.tileValue, { color: t.green ? T.green : T.text }]}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </Panel>
        ))}
      </View>

      <Panel style={styles.note} accent={T.greenLine}>
        <Text style={styles.noteText}>
          {status === "saved"
            ? "Saved to your training log. XP updates through the progression ledger."
            : "A preview of structured training. Save it to add a real entry to your training log — XP updates through the progression ledger."}
        </Text>
      </Panel>

      {status === "error" ? <Text style={styles.error}>Couldn’t save that. Please try again.</Text> : null}

      <View style={styles.actions}>
        {status === "saved" ? (
          <Btn kind="primary" full icon="check" label="Done" onPress={onDone} />
        ) : (
          <>
            <Btn
              kind="primary"
              full
              icon="download"
              label={status === "saving" ? "Saving…" : "Save to training log"}
              onPress={save}
            />
            <Btn kind="ghost" full label="Done" onPress={onDone} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a140f" },
  content: { alignItems: "center", paddingHorizontal: 18 },
  watermark: { position: "absolute", top: 40, right: -80, opacity: 0.06 },
  badge: {
    width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center",
    backgroundColor: T.greenSoft, borderWidth: 2, borderColor: T.green,
    boxShadow: "0px 0px 36px rgba(52,226,160,0.35)",
  },
  eyebrow: { ...mono(11, 700), letterSpacing: 1.6, color: T.green, marginTop: 18 },
  title: { ...disp(32, 800), color: "#fff", marginTop: 6, textAlign: "center" },
  tiles: { flexDirection: "row", gap: 10, marginTop: 24, alignSelf: "stretch" },
  tile: { flex: 1, alignItems: "center" },
  tileValue: { ...disp(22, 800), marginTop: 6 },
  tileLabel: { ...mono(8, 600), color: T.sub, letterSpacing: 0.8, marginTop: 4 },
  note: { marginTop: 12, alignSelf: "stretch" },
  noteText: { ...ui(13, 500), color: T.mut, lineHeight: 19 },
  error: { ...ui(13, 600), color: T.red, marginTop: 12, textAlign: "center" },
  actions: { marginTop: 18, alignSelf: "stretch", gap: 10 },
});
