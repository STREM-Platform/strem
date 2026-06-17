/**
 * Structured workout preview — ported from `WorkoutPreview` in screen-train.jsx.
 * Shows the parsed/templated session (exercises, sets, reps, load, rest) before
 * the guided run. Framed as a sample/preview since structured workouts aren't
 * server-backed yet.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon } from "@/components/ui/icon";
import { Btn, Chip, Panel } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { totalSets, type Workout } from "@/lib/workout";

export function WorkoutPreview({
  workout,
  onStart,
  onBack,
}: {
  workout: Workout;
  onStart: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
      {/* hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <HeroBackdrop tone="green" />
        <LinearScrim />
        <View style={styles.heroContent}>
          <Btn kind="ghost" icon="chevronL" label="Back" onPress={onBack} style={styles.back} />
          <View>
            <Chip label="SAMPLE · PREVIEW" icon="check" style={styles.previewChip} />
            <Text style={styles.title}>{workout.title.toUpperCase()}</Text>
            <View style={styles.heroChips}>
              <Chip label={`${workout.exercises.length} EXERCISES`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
              <Chip label={`${totalSets(workout)} SETS`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
              <Chip label={`~${workout.est} MIN`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
            </View>
          </View>
        </View>
      </View>

      {/* exercises */}
      <View style={styles.list}>
        {workout.exercises.map((ex, i) => (
          <Panel key={i} pad={14}>
            <View style={styles.exHead}>
              <View style={styles.exNum}>
                <Text style={styles.exNumText}>{i + 1}</Text>
              </View>
              <View style={styles.shrink}>
                <Text style={styles.exName}>{ex.name}</Text>
                {ex.note ? <Text style={styles.exNote}>{ex.note}</Text> : null}
              </View>
              <View style={styles.restTag}>
                <Icon name="timer" size={12} color={T.sub} />
                <Text style={styles.restText}>{ex.rest}s</Text>
              </View>
            </View>
            <View style={styles.setChips}>
              {ex.sets.map((st, j) => (
                <View key={j} style={styles.setChip}>
                  <Text style={styles.setChipNum}>{j + 1}</Text>
                  <Text style={styles.setChipReps}>
                    {st.reps}
                    <Text style={styles.setChipUnit}> reps</Text>
                  </Text>
                  {st.kg != null ? <Text style={styles.setChipKg}>· {st.kg}kg</Text> : null}
                </View>
              ))}
            </View>
          </Panel>
        ))}
      </View>

      <View style={styles.cta}>
        <Btn kind="primary" full icon="play" label="Begin guided session" onPress={onStart} />
      </View>
    </ScrollView>
  );
}

function LinearScrim() {
  return <View style={styles.scrim} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  shrink: { flexShrink: 1 },
  hero: { height: 196, overflow: "hidden", justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,9,11,0.45)" },
  heroContent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, justifyContent: "space-between" },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  previewChip: { marginBottom: 8 },
  title: { ...disp(30, 800), color: "#fff", letterSpacing: 0.4 },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 9, flexWrap: "wrap" },

  list: { gap: 11, marginHorizontal: 16, marginTop: 16 },
  exHead: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 11 },
  exNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine, alignItems: "center", justifyContent: "center" },
  exNumText: { ...disp(15, 800), color: T.green },
  exName: { ...ui(16, 700), color: T.text },
  exNote: { ...ui(12, 500), color: T.sub, marginTop: 1 },
  restTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  restText: { ...mono(10, 700), color: T.sub },
  setChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  setChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line },
  setChipNum: { ...mono(9, 700), color: T.sub },
  setChipReps: { ...ui(13, 700), color: T.text },
  setChipUnit: { ...ui(13, 500), color: T.sub },
  setChipKg: { ...ui(13, 700), color: T.green },

  cta: { marginHorizontal: 16, marginTop: 18 },
});
