/**
 * Build-your-own live session.
 *
 * Lets the user compose a session from scratch — many exercises, each with its
 * own sets, target reps/load, and rest (the "defined pause") — then hands a
 * `LiveWorkout` to the existing guided live-session runner, which autoregulates
 * rest set by set (D1/D2). Pure local state; nothing is persisted until the
 * session finishes (the debrief logs the real session).
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Btn, Panel, ScreenHead } from "@/components/ui/primitives";
import { T, mono, ui } from "@/constants/theme";
import type { LiveWorkout } from "@/lib/agent/types";

interface DraftExercise {
  id: number;
  name: string;
  sets: string;
  reps: string;
  kg: string;
  rest: string;
}

let SEQ = 1;
const blank = (): DraftExercise => ({ id: SEQ++, name: "", sets: "3", reps: "8", kg: "", rest: "90" });

const num = (v: string, min: number, fallback: number) => {
  const n = Math.floor(Number.parseFloat(v));
  return Number.isFinite(n) && n >= min ? n : fallback;
};

function toLiveWorkout(title: string, drafts: DraftExercise[]): LiveWorkout {
  const exercises = drafts
    .filter((e) => e.name.trim())
    .map((e) => {
      const sets = num(e.sets, 1, 1);
      const reps = num(e.reps, 1, 8);
      const kg = Math.max(0, Number.parseFloat(e.kg) || 0);
      const rest = num(e.rest, 0, 90);
      return {
        name: e.name.trim(),
        target: `${sets}×${reps}${kg ? ` @ ${kg}kg` : ""}`,
        rest,
        sets: Array.from({ length: sets }, () => ({
          reps,
          kg,
          ai: "Your target — push to it, Forge autoregulates the rest.",
          done: false,
          rpe: null,
        })),
      };
    });
  return {
    title: title.trim() || "My session",
    tag: "Custom",
    note: "Your own session — Forge autoregulates rest set by set.",
    exercises,
    prDetected: { lift: "", val: "", note: "" },
  };
}

export function WorkoutBuilder({
  onStart,
  onBack,
}: {
  onStart: (w: LiveWorkout) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([blank()]);

  const update = (id: number, key: keyof DraftExercise, value: string) =>
    setExercises((list) => list.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  const remove = (id: number) => setExercises((list) => list.filter((e) => e.id !== id));
  const add = () => setExercises((list) => [...list, blank()]);

  const ready = exercises.some((e) => e.name.trim());

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sideMargin}>
        <Btn kind="ghost" icon="chevronL" label="Back" onPress={onBack} style={styles.back} />
      </View>
      <ScreenHead overline="Compose your session" title="Build a session" />

      <View style={styles.sideMargin}>
        <Text style={styles.fieldLabel}>SESSION NAME</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Upper Push"
          placeholderTextColor={T.mut}
          style={styles.titleInput}
        />
      </View>

      {exercises.map((e, i) => (
        <Panel key={e.id} style={styles.sideMargin} pad={14}>
          <View style={styles.exHead}>
            <Text style={styles.exIndex}>EXERCISE {i + 1}</Text>
            {exercises.length > 1 ? (
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Icon name="minus" size={16} color={T.mut} />
              </Pressable>
            ) : null}
          </View>
          <TextInput
            value={e.name}
            onChangeText={(v) => update(e.id, "name", v)}
            placeholder="Exercise name (e.g. Back Squat)"
            placeholderTextColor={T.mut}
            style={styles.nameInput}
          />
          <View style={styles.numRow}>
            {([
              ["sets", "SETS"],
              ["reps", "REPS"],
              ["kg", "KG"],
              ["rest", "REST s"],
            ] as const).map(([key, label]) => (
              <View key={key} style={styles.numCell}>
                <Text style={styles.numLabel}>{label}</Text>
                <TextInput
                  value={e[key]}
                  onChangeText={(v) => update(e.id, key, v)}
                  keyboardType="numeric"
                  placeholder={key === "kg" ? "—" : ""}
                  placeholderTextColor={T.mut}
                  style={styles.numInput}
                />
              </View>
            ))}
          </View>
        </Panel>
      ))}

      <View style={styles.sideMargin}>
        <Btn kind="ghost" full icon="plus" label="Add exercise" onPress={add} />
      </View>

      <View style={[styles.sideMargin, styles.startWrap]}>
        <Btn
          kind="primary"
          full
          icon="play"
          label="Start live session"
          onPress={() => onStart(toLiveWorkout(title, exercises))}
          disabled={!ready}
        />
        {!ready ? <Text style={styles.readyHint}>Name at least one exercise to start.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 32, gap: 12 },
  sideMargin: { marginHorizontal: 16 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  fieldLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub, marginBottom: 6 },
  titleInput: {
    ...ui(15, 600),
    color: T.text,
    backgroundColor: T.surf,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  exHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  exIndex: { ...mono(10, 700), letterSpacing: 1.2, color: T.sub },
  nameInput: {
    ...ui(15, 600),
    color: T.text,
    backgroundColor: T.surf2,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  numRow: { flexDirection: "row", gap: 8 },
  numCell: { flex: 1, gap: 4 },
  numLabel: { ...mono(9, 700), letterSpacing: 0.6, color: T.sub },
  numInput: {
    ...ui(15, 700),
    color: T.text,
    textAlign: "center",
    backgroundColor: T.surf2,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 10,
    paddingVertical: 9,
  },
  startWrap: { marginTop: 4, gap: 8 },
  readyHint: { ...ui(12, 500), color: T.mut, textAlign: "center" },
});
