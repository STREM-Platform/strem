/**
 * Live workout intelligence — ported from `prototype/screens/screen-train-ai.jsx`.
 *
 * Forge coaches the session set by set (D1/D2): a per-set target with its
 * reasoning, RPE capture, and AUTOREGULATED rest (RPE 9 → +45s, RPE ≤6 → −30s).
 * On finish it debriefs and detects a PR → a celebration (reusing the shared
 * `Celebration`). The autoregulation decisions are recorded as agent actions.
 *
 * The prototype's CSS keyframes become plain visible states (no opacity:0 at
 * rest); the celebration uses the existing Animated spring that settles to 1.
 */

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Medal } from "@/components/medals/medal";
import { Celebration, type CelebrationData } from "@/components/ui/celebration";
import { Icon, MountainMark } from "@/components/ui/icon";
import { Btn, Panel } from "@/components/ui/primitives";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import type { LiveWorkout as LiveWorkoutData } from "@/lib/agent/types";

interface FlatSet {
  reps: number;
  kg: number;
  ai: string;
  exName: string;
  target: string;
  rest: number;
  si: number;
  setCount: number;
}

function flatten(w: LiveWorkoutData): FlatSet[] {
  const flat: FlatSet[] = [];
  w.exercises.forEach((ex) =>
    ex.sets.forEach((st, si) =>
      flat.push({ reps: st.reps, kg: st.kg, ai: st.ai, exName: ex.name, target: ex.target, rest: ex.rest, si, setCount: ex.sets.length }),
    ),
  );
  return flat;
}

export function LiveWorkout({ workout, onFinish, onCancel }: { workout: LiveWorkoutData; onFinish: () => void; onCancel: () => void }) {
  const flat = flatten(workout);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [rpe, setRpe] = useState(8);
  const [rest, setRest] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [restMsg, setRestMsg] = useState("");
  const cur = flat[idx];

  useEffect(() => {
    if (phase !== "rest") return;
    if (rest <= 0) {
      goNext();
      return;
    }
    const t = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, rest]);

  const logSet = () => {
    if (idx >= flat.length - 1) {
      onFinish();
      return;
    }
    let add = 0;
    let msg = "";
    if (rpe >= 9) {
      add = 45;
      msg = "RPE 9 — added 45s. Protect the quality of the next set.";
    } else if (rpe <= 6) {
      add = -30;
      msg = "Felt easy at RPE 6 — trimmed 30s. You've got more in the tank.";
    } else {
      msg = "RPE 8, right in the zone. Standard rest holds the line.";
    }
    const total = Math.max(45, cur.rest + add);
    // The agent autoregulates and records why (AUTO → Activity feed).
    if (add !== 0) {
      forge.adjustTargets(`Rest ${add > 0 ? "+" : ""}${add}s after ${cur.exName}`, msg, [
        { icon: "flame", text: `RPE ${rpe}` },
        { icon: "dumbbell", text: cur.exName },
      ]);
    }
    setRestTotal(total);
    setRest(total);
    setRestMsg(msg);
    setRpe(8);
    setPhase("rest");
  };

  const goNext = () => {
    setPhase("work");
    setIdx((i) => Math.min(flat.length - 1, i + 1));
  };

  return (
    <View style={[styles.root, phase === "rest" ? styles.rootRest : styles.rootWork]}>
      <MountainMark size={300} color="#9fb0a8" style={styles.watermark} />
      <View style={styles.head}>
        <Btn kind="ghost" icon="chevronL" label="" onPress={onCancel} style={styles.headBtn} />
        <View style={styles.headCenter}>
          <Text style={styles.headTitle}>{workout.title.toUpperCase()}</Text>
          <View style={styles.headTagRow}>
            <View style={styles.headDot} />
            <Text style={styles.headTag}>{workout.tag}</Text>
          </View>
        </View>
        <View style={styles.headBtn} />
      </View>

      <View style={styles.rail}>
        {flat.map((_, i) => (
          <View
            key={i}
            style={[styles.railSeg, { backgroundColor: i < idx ? T.green : i === idx ? "rgba(52,226,160,0.4)" : "rgba(255,255,255,0.08)" }]}
          />
        ))}
      </View>

      {phase === "work" ? (
        <View style={styles.work}>
          <Text style={styles.setMeta}>
            SET {cur.si + 1} OF {cur.setCount} · TARGET {cur.target}
          </Text>
          <Text style={styles.exName}>{cur.exName}</Text>

          <Panel raised accent={T.greenLine} style={styles.forgeSet} pad={14}>
            <View style={styles.forgeSetHead}>
              <Icon name="bot" size={15} color={T.green} />
              <Text style={styles.forgeSetLabel}>FORGE · THIS SET</Text>
            </View>
            <View style={styles.prescription}>
              <View style={styles.presNumRow}>
                <Text style={styles.presNum}>{cur.reps}</Text>
                <Text style={styles.presUnit}>reps</Text>
              </View>
              {cur.kg > 0 ? (
                <>
                  <Text style={styles.presX}>×</Text>
                  <View style={styles.presNumRow}>
                    <Text style={[styles.presNum, { color: T.green }]}>{cur.kg}</Text>
                    <Text style={styles.presUnit}>kg</Text>
                  </View>
                </>
              ) : null}
            </View>
            <Text style={styles.forgeSetText}>{cur.ai}</Text>
          </Panel>

          <View style={styles.rpeBlock}>
            <View style={styles.rpeHead}>
              <Text style={styles.rpeLabel}>HOW HARD? · RPE {rpe}</Text>
              <Text style={[styles.rpeState, { color: rpe >= 9 ? T.red : rpe <= 6 ? T.mut : T.green }]}>
                {rpe >= 9 ? "Near failure" : rpe <= 6 ? "Comfortable" : "Working hard"}
              </Text>
            </View>
            <View style={styles.rpeRow}>
              {[5, 6, 7, 8, 9, 10].map((n) => {
                const on = rpe === n;
                return (
                  <Text
                    key={n}
                    onPress={() => setRpe(n)}
                    style={[styles.rpeCell, { color: on ? "#06130D" : T.mut, backgroundColor: on ? T.green : T.surf, borderColor: on ? T.green : T.line }]}
                  >
                    {n}
                  </Text>
                );
              })}
            </View>
            <Btn
              kind="primary"
              full
              icon="check"
              label={idx >= flat.length - 1 ? "Finish session" : "Log set"}
              onPress={logSet}
              style={styles.logBtn}
            />
          </View>
        </View>
      ) : (
        <View style={styles.restView}>
          <Text style={styles.restLabel}>AUTOREGULATED REST</Text>
          <Ring size={176} stroke={12} pct={restTotal ? rest / restTotal : 0} color={T.green}>
            <Text style={styles.restNum}>{rest}</Text>
            <Text style={styles.restUnit}>SECONDS</Text>
          </Ring>
          <Panel raised accent={T.greenLine} style={styles.restMsg} pad={13}>
            <View style={styles.restMsgRow}>
              <Icon name="bot" size={15} color={T.green} />
              <Text style={styles.restMsgText}>{restMsg}</Text>
            </View>
          </Panel>
          <View style={styles.restActions}>
            <Btn kind="ghost" icon="plus" label="15s" onPress={() => setRest((r) => r + 15)} style={styles.restAddBtn} />
            <Btn kind="primary" icon="play" label="Skip rest" onPress={goNext} style={styles.restSkipBtn} />
          </View>
        </View>
      )}
    </View>
  );
}

// ── Finish debrief (PR detection → celebration) ──────────────────────────────
export function Debrief({ workout, onDone }: { workout: LiveWorkoutData; onDone: () => void }) {
  const pr = workout.prDetected;
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const stats = [
    { l: "TIME", v: "47:20", i: "clock" as const, g: false },
    { l: "VOLUME", v: "8.4t", i: "dumbbell" as const, g: true },
    { l: "AVG RPE", v: "8.1", i: "flame" as const, g: false },
    { l: "XP", v: "+220", i: "bolt" as const, g: true },
  ];

  return (
    <View style={styles.debrief}>
      <MountainMark size={300} color="#9fb0a8" style={styles.debriefWatermark} />
      <View style={styles.debriefHead}>
        <View style={styles.debriefCheck}>
          <Icon name="check" size={40} color={T.green} sw={2.6} />
        </View>
        <Text style={styles.debriefEyebrow}>SESSION COMPLETE</Text>
        <Text style={styles.debriefTitle}>{workout.title.toUpperCase()}</Text>
      </View>

      <View style={styles.statRow}>
        {stats.map((s) => (
          <Panel key={s.l} style={styles.stat} pad={11}>
            <Icon name={s.i} size={14} color={s.g ? T.green : T.mut} fill={s.g} style={styles.statIcon} />
            <Text style={[styles.statV, { color: s.g ? T.green : T.text }]}>{s.v}</Text>
            <Text style={styles.statL}>{s.l}</Text>
          </Panel>
        ))}
      </View>

      <Panel raised accent={T.greenLine} style={styles.debriefForge} pad={14}>
        <View style={styles.debriefForgeHead}>
          <Icon name="bot" size={15} color={T.green} />
          <Text style={styles.debriefForgeLabel}>FORGE DEBRIEF</Text>
        </View>
        <Text style={styles.debriefForgeText}>
          Bar speed held even on the top set — a real PR on a low-recovery day. I'm moving Thursday lighter to bank the
          adaptation. Eat, sleep, and we keep the streak intact.
        </Text>
      </Panel>

      <Pressable
        onPress={() =>
          setCelebration({ kind: "medal", title: pr.lift, line: pr.note, rarity: "legendary", emblem: "bolt", xp: 220 })
        }
        style={styles.prCard}
      >
        <Panel raised accent={T.redLine} pad={14}>
          <View style={styles.prRow}>
            <Medal rarity="legendary" emblem="bolt" size={54} earned />
            <View style={styles.shrink}>
              <Text style={styles.prEyebrow}>NEW PERSONAL RECORD</Text>
              <Text style={styles.prLift}>
                {pr.lift} · {pr.val}
              </Text>
              <Text style={styles.prNote}>{pr.note} · tap to celebrate</Text>
            </View>
            <Icon name="chevron" size={18} color={T.sub} />
          </View>
        </Panel>
      </Pressable>

      <View style={styles.debriefActions}>
        <Btn kind="ghost" full icon="arrowUR" label="Share recap" onPress={onDone} style={styles.shrink} />
        <Btn kind="primary" full icon="check" label="Done" onPress={onDone} style={styles.shrink} />
      </View>

      <Celebration data={celebration} onClose={() => setCelebration(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 54, paddingBottom: 22 },
  rootWork: { backgroundColor: "#0b0f15" },
  rootRest: { backgroundColor: "#0a1410" },
  watermark: { position: "absolute", top: 140, right: -90, opacity: 0.05 },
  shrink: { flexShrink: 1, flex: 1 },

  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  headBtn: { width: 44, paddingVertical: 4, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  headCenter: { alignItems: "center" },
  headTitle: { ...mono(9, 700), letterSpacing: 1.4, color: T.sub },
  headTagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  headDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber, boxShadow: "0px 0px 8px #F4B740" },
  headTag: { ...mono(9, 700), color: T.amber, letterSpacing: 0.6 },

  rail: { flexDirection: "row", gap: 3, paddingHorizontal: 18, paddingTop: 14 },
  railSeg: { flex: 1, height: 5, borderRadius: 3 },

  work: { flex: 1, paddingHorizontal: 18 },
  setMeta: { ...mono(10, 700), letterSpacing: 1.4, color: T.green, marginTop: 18 },
  exName: { ...disp(31, 800), color: "#fff", marginTop: 6, lineHeight: 32 },
  forgeSet: { marginTop: 16 },
  forgeSetHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  forgeSetLabel: { ...mono(9, 700), letterSpacing: 1.4, color: T.green },
  prescription: { flexDirection: "row", alignItems: "baseline", gap: 14 },
  presNumRow: { flexDirection: "row", alignItems: "baseline" },
  presNum: { ...disp(40, 800), color: "#fff", lineHeight: 40 },
  presUnit: { ...ui(14, 600), color: T.sub, marginLeft: 4 },
  presX: { ...disp(24, 700), color: T.line2 },
  forgeSetText: { ...ui(13.5, 500), color: "#cdd3d8", lineHeight: 20, marginTop: 11 },

  rpeBlock: { marginTop: "auto", paddingTop: 16 },
  rpeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  rpeLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub },
  rpeState: { ...ui(12, 600) },
  rpeRow: { flexDirection: "row", gap: 5 },
  rpeCell: {
    flex: 1,
    height: 42,
    lineHeight: 42,
    borderRadius: 10,
    textAlign: "center",
    borderWidth: 1,
    overflow: "hidden",
    ...disp(18, 800),
  },
  logBtn: { marginTop: 14, paddingVertical: 15 },

  restView: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  restLabel: { ...mono(11, 700), letterSpacing: 2, color: T.green, marginBottom: 16 },
  restNum: { ...disp(54, 800), color: "#fff", lineHeight: 54 },
  restUnit: { ...mono(10, 700), color: T.sub, letterSpacing: 1 },
  restMsg: { marginTop: 24, width: "100%" },
  restMsgRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  restMsgText: { ...ui(13.5, 500), color: "#cdd3d8", lineHeight: 20, flex: 1 },
  restActions: { flexDirection: "row", gap: 12, marginTop: 20, width: "100%" },
  restAddBtn: { flex: 1 },
  restSkipBtn: { flex: 1.6 },

  // debrief
  debrief: { flex: 1, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 18, backgroundColor: "#0a1410", alignItems: "center" },
  debriefWatermark: { position: "absolute", top: 40, right: -80, opacity: 0.06 },
  debriefHead: { alignItems: "center" },
  debriefCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greenSoft,
    borderWidth: 2,
    borderColor: T.green,
    boxShadow: "0px 0px 34px rgba(52,226,160,0.35)",
  },
  debriefEyebrow: { ...mono(11, 700), letterSpacing: 2.2, color: T.green, marginTop: 16 },
  debriefTitle: { ...disp(30, 800), color: "#fff", marginTop: 4 },
  statRow: { flexDirection: "row", gap: 9, marginTop: 22, width: "100%" },
  stat: { flex: 1, alignItems: "center" },
  statIcon: { marginBottom: 5 },
  statV: { ...disp(20, 800), lineHeight: 20 },
  statL: { ...mono(7, 600), color: T.sub, letterSpacing: 0.6, marginTop: 4 },
  debriefForge: { marginTop: 12, width: "100%" },
  debriefForgeHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  debriefForgeLabel: { ...mono(9, 700), letterSpacing: 1.4, color: T.green },
  debriefForgeText: { ...ui(14, 500), color: "#cdd3d8", lineHeight: 22 },
  prCard: { marginTop: 12, width: "100%" },
  prTapTarget: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  prRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  prEyebrow: { ...mono(9, 700), letterSpacing: 1.4, color: T.red },
  prLift: { ...ui(15, 700), color: T.text, marginTop: 2 },
  prNote: { ...ui(12, 500), color: T.sub },
  debriefActions: { flexDirection: "row", gap: 10, marginTop: "auto", paddingTop: 16, width: "100%" },
});
