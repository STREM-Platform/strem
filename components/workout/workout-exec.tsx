/**
 * Guided set-by-set execution — ported from `WorkoutExec` in
 * `design-spec/workout-exec.jsx`. A work/rest state machine: log reps/weight per
 * set, complete it, run a rest countdown (skippable / +15s), advance to the next
 * set or exercise, then finish. Segmented all-sets progress, set dots, live
 * volume — all computed locally.
 *
 * This is a flagged *preview*: nothing is persisted set-by-set. The final
 * session is saved once, from the summary, via `POST /training/sessions`.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, MountainMark } from "@/components/ui/icon";
import { Btn, IconTile, Panel } from "@/components/ui/primitives";
import { Ring } from "@/components/ui/ring";
import { Stepper } from "@/components/workout/stepper";
import { T, disp, mono, ui } from "@/constants/theme";
import { fmtClock, totalSets, type Workout, type WorkoutResult } from "@/lib/workout";

export function WorkoutExec({
  workout,
  onFinish,
  onCancel,
}: {
  workout: Workout;
  onFinish: (result: WorkoutResult) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const tot = totalSets(workout);

  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [restLeft, setRestLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(0);
  const [volume, setVolume] = useState(0);

  const ex = workout.exercises[exIdx];
  const target = ex.sets[setIdx];
  const [reps, setReps] = useState(target.reps);
  const [kg, setKg] = useState(target.kg ?? 0);

  // overall elapsed clock
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loadSet = (ei: number, si: number) => {
    const t = workout.exercises[ei].sets[si];
    setReps(t.reps);
    setKg(t.kg ?? 0);
  };

  const advance = () => {
    let ei = exIdx;
    let si = setIdx;
    if (si < ex.sets.length - 1) {
      si += 1;
    } else if (ei < workout.exercises.length - 1) {
      ei += 1;
      si = 0;
    } else {
      onFinish({ workout, elapsed, volume, sets: done });
      return;
    }
    setExIdx(ei);
    setSetIdx(si);
    setPhase("work");
    loadSet(ei, si);
  };

  // rest countdown — the tick (and the final advance) run in the timer callback,
  // not synchronously in the effect body, so no cascading setState-in-effect.
  useEffect(() => {
    if (phase !== "rest" || restLeft <= 0) return;
    const id = setTimeout(() => {
      if (restLeft <= 1) {
        advance();
      } else {
        setRestLeft((r) => r - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance is captured fresh each tick via restLeft dep
  }, [phase, restLeft]);

  const completeSet = () => {
    const newDone = done + 1;
    const newVol = volume + reps * kg;
    setDone(newDone);
    setVolume(newVol);
    const isLast = exIdx === workout.exercises.length - 1 && setIdx === ex.sets.length - 1;
    if (isLast) {
      onFinish({ workout, elapsed, volume: newVol, sets: newDone });
      return;
    }
    setRestLeft(ex.rest);
    setPhase("rest");
  };

  const next =
    phase === "rest"
      ? setIdx < ex.sets.length - 1
        ? { ex, si: setIdx + 1 }
        : { ex: workout.exercises[exIdx + 1], si: 0 }
      : null;

  return (
    <View style={[styles.root, phase === "rest" ? styles.rootRest : styles.rootWork, { paddingTop: insets.top + 14 }]}>
      <MountainMark size={300} color="#9fb0a8" style={styles.watermark} />

      {/* top bar */}
      <View style={styles.topBar}>
        <Btn kind="ghost" label="" icon="chevronL" onPress={onCancel} style={styles.iconBtn} />
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>{workout.title.toUpperCase()}</Text>
          <Text style={styles.topClock}>{fmtClock(elapsed)}</Text>
        </View>
        <View style={styles.boltTile}>
          <Icon name="bolt" size={16} color={T.green} fill />
        </View>
      </View>

      {/* segmented progress over all sets */}
      <View style={styles.segments}>
        {Array.from({ length: tot }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < done ? styles.segDone : i === done ? styles.segCurrent : styles.segIdle,
            ]}
          />
        ))}
      </View>

      {phase === "work" ? (
        <View style={styles.workBody}>
          <View style={styles.exMeta}>
            <Text style={styles.exMetaGreen}>EXERCISE {exIdx + 1} / {workout.exercises.length}</Text>
            <Text style={styles.exMetaSub}>{ex.sets.length} SETS · {ex.rest}s REST</Text>
          </View>
          <Text style={styles.exName}>{ex.name}</Text>
          {ex.note ? <Text style={styles.exNote}>{ex.note}</Text> : null}

          {/* set dots */}
          <View style={styles.setDots}>
            {ex.sets.map((_, j) => (
              <View
                key={j}
                style={[
                  styles.setDot,
                  j < setIdx ? styles.setDotDone : j === setIdx ? styles.setDotCurrent : styles.setDotIdle,
                ]}
              >
                {j < setIdx ? (
                  <Icon name="check" size={16} color={T.green} sw={2.6} />
                ) : (
                  <Text style={[styles.setDotNum, { color: j === setIdx ? T.green : T.sub }]}>{j + 1}</Text>
                )}
              </View>
            ))}
          </View>

          {/* big set logger */}
          <View style={styles.logger}>
            <Text style={styles.setTarget}>
              SET {setIdx + 1} OF {ex.sets.length} · TARGET {target.reps}
              {target.kg != null ? ` × ${target.kg}kg` : ""}
            </Text>
            <Panel pad={16} style={styles.loggerPanel}>
              <View style={styles.loggerRow}>
                <Text style={styles.loggerLabel}>REPS</Text>
                <Stepper value={reps} onChange={setReps} suffix="reps" />
              </View>
              {target.kg != null ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.loggerRow}>
                    <Text style={styles.loggerLabel}>WEIGHT</Text>
                    <Stepper value={kg} onChange={setKg} step={2.5} suffix="kg" accent={T.green} />
                  </View>
                </>
              ) : null}
            </Panel>
          </View>

          <Btn kind="primary" full icon="check" label="Complete set" onPress={completeSet} />
        </View>
      ) : (
        // REST phase
        <View style={styles.restBody}>
          <Text style={styles.restLabel}>REST</Text>
          <Ring size={186} stroke={12} pct={ex.rest ? restLeft / ex.rest : 0}>
            <Text style={styles.restNum}>{restLeft}</Text>
            <Text style={styles.restUnit}>SECONDS</Text>
          </Ring>
          {next && next.ex ? (
            <Panel pad={14} style={styles.nextPanel}>
              <IconTile name="dumbbell" size={40} iconSize={19} />
              <View style={styles.shrink}>
                <Text style={styles.nextLabel}>NEXT UP</Text>
                <Text style={styles.nextName}>{next.ex.name}</Text>
                <Text style={styles.nextSub}>
                  Set {next.si + 1} · {next.ex.sets[next.si].reps} reps
                  {next.ex.sets[next.si].kg != null ? ` × ${next.ex.sets[next.si].kg}kg` : ""}
                </Text>
              </View>
            </Panel>
          ) : null}
          <View style={styles.restActions}>
            <Btn kind="ghost" icon="plus" label="15s" onPress={() => setRestLeft((r) => r + 15)} style={styles.restAdd} />
            <Btn kind="primary" icon="play" label="Skip rest" onPress={advance} style={styles.restSkip} />
          </View>
        </View>
      )}

      {/* live stats */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <FooterStat label="SETS" value={`${done}/${tot}`} />
        <FooterStat label="VOLUME" value={`${(volume / 1000).toFixed(1)}t`} green />
      </View>
    </View>
  );
}

function FooterStat({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.footerStat}>
      <Text style={[styles.footerValue, { color: green ? T.green : T.text }]}>{value}</Text>
      <Text style={styles.footerLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: 8 },
  rootWork: { backgroundColor: "#0a0f16" },
  rootRest: { backgroundColor: "#0a140f" },
  watermark: { position: "absolute", top: 150, right: -90, opacity: 0.05 },
  shrink: { flexShrink: 1 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  iconBtn: { paddingVertical: 0, paddingHorizontal: 0, width: 34, height: 34, borderRadius: 10, backgroundColor: T.surf, borderColor: T.line },
  topCenter: { alignItems: "center" },
  topTitle: { ...mono(9, 700), letterSpacing: 1.2, color: T.sub },
  topClock: { ...disp(18, 800), color: "#fff" },
  boltTile: { width: 34, height: 34, borderRadius: 10, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center" },

  segments: { flexDirection: "row", gap: 3, paddingHorizontal: 18, paddingTop: 16 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  segDone: { backgroundColor: T.green, boxShadow: "0px 0px 6px rgba(52,226,160,0.5)" },
  segCurrent: { backgroundColor: "rgba(52,226,160,0.35)" },
  segIdle: { backgroundColor: "rgba(255,255,255,0.08)" },

  workBody: { flex: 1, paddingHorizontal: 18 },
  exMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22 },
  exMetaGreen: { ...mono(10, 700), letterSpacing: 1.2, color: T.green },
  exMetaSub: { ...mono(10, 700), letterSpacing: 1.2, color: T.sub },
  exName: { ...disp(34, 800), color: "#fff", marginTop: 8 },
  exNote: { ...ui(13, 500), color: T.mut, marginTop: 6 },
  setDots: { flexDirection: "row", gap: 7, marginTop: 18 },
  setDot: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  setDotDone: { backgroundColor: T.greenSoft, borderColor: T.greenLine },
  setDotCurrent: { backgroundColor: "rgba(52,226,160,0.16)", borderColor: T.green },
  setDotIdle: { backgroundColor: T.surf, borderColor: T.line },
  setDotNum: { ...disp(16, 800) },

  logger: { flex: 1, justifyContent: "center", gap: 16, marginVertical: 8 },
  setTarget: { ...mono(11, 700), letterSpacing: 1.6, color: T.green, textAlign: "center" },
  loggerPanel: { gap: 14 },
  loggerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loggerLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub },
  divider: { height: 1, backgroundColor: T.line },

  restBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  restLabel: { ...mono(11, 700), letterSpacing: 1.8, color: T.green, marginBottom: 18 },
  restNum: { ...disp(56, 800), color: "#fff" },
  restUnit: { ...mono(10, 700), color: T.sub, letterSpacing: 1.2, marginTop: 2 },
  nextPanel: { marginTop: 26, width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  nextLabel: { ...mono(9, 700), letterSpacing: 1, color: T.green },
  nextName: { ...ui(15, 700), color: T.text, marginTop: 2 },
  nextSub: { ...ui(12, 500), color: T.sub },
  restActions: { flexDirection: "row", gap: 12, marginTop: 22, width: "100%" },
  restAdd: { flex: 1 },
  restSkip: { flex: 1.6 },

  footer: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 14 },
  footerStat: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  footerValue: { ...disp(20, 800) },
  footerLabel: { ...mono(8, 600), color: T.sub, letterSpacing: 1, marginTop: 4 },
});
