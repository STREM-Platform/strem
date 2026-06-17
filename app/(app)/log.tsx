/**
 * Train — import/guided execution orchestrator, ported from `ScreenTrain` +
 * `screen-train.jsx`. Landing → (guided preview → guided exec → summary) and a
 * real quick-log for completed sessions.
 *
 * Honesty per the gap analysis:
 * - Structured set-by-set tracking is a flagged *preview* (`FLAGS.guidedWorkoutsPreview`);
 *   only the final session is persisted via `POST /training/sessions`.
 * - Photo/text/voice import (`FLAGS.workoutImport`, off) is shown but reports a
 *   clear unsupported state — no extracted workout data is fabricated.
 * - The quick-log is the always-real path and saves immediately.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Btn, Chip, IconTile, Panel, ScreenHead, SectionHead } from "@/components/ui/primitives";
import { WorkoutExec } from "@/components/workout/workout-exec";
import { WorkoutPreview } from "@/components/workout/workout-preview";
import { WorkoutSummary } from "@/components/workout/workout-summary";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { SessionType, TrainingSession } from "@/lib/api/types";
import { FLAGS } from "@/lib/flags";
import { SAMPLE_WORKOUT, totalSets, type WorkoutResult } from "@/lib/workout";
import { useAsync } from "@/lib/use-async";

type Mode = "landing" | "preview" | "exec" | "summary" | "quicklog";

const IMPORT_METHODS: { id: string; icon: IconName; label: string; sub: string; tone: "green" | "red" | "neutral" }[] = [
  { id: "photo", icon: "grid", label: "Scan a screenshot", sub: "Import a workout from an image", tone: "green" },
  { id: "text", icon: "edit", label: "Paste text", sub: "From notes, a coach, a PDF", tone: "green" },
  { id: "voice", icon: "bot", label: "Voice / AI generate", sub: "Describe it — AI builds it", tone: "red" },
];

export default function TrainScreen() {
  const [mode, setMode] = useState<Mode>("landing");
  const [result, setResult] = useState<WorkoutResult | null>(null);

  if (mode === "preview") {
    return <WorkoutPreview workout={SAMPLE_WORKOUT} onBack={() => setMode("landing")} onStart={() => setMode("exec")} />;
  }
  if (mode === "exec") {
    return (
      <WorkoutExec
        workout={SAMPLE_WORKOUT}
        onCancel={() => setMode("landing")}
        onFinish={(r) => {
          setResult(r);
          setMode("summary");
        }}
      />
    );
  }
  if (mode === "summary" && result) {
    return (
      <WorkoutSummary
        result={result}
        onSave={async () => {
          await api.logTrainingSession({
            session_type: result.workout.type,
            duration_minutes: Math.max(1, Math.round(result.elapsed / 60)),
            notes: `Guided session: ${result.workout.title}`,
          });
        }}
        onDone={() => {
          setResult(null);
          setMode("landing");
        }}
      />
    );
  }
  if (mode === "quicklog") {
    return <QuickLog onBack={() => setMode("landing")} />;
  }
  return <TrainLanding onStartGuided={() => setMode("preview")} onQuickLog={() => setMode("quicklog")} />;
}

// ── Landing ──────────────────────────────────────────────────────────────────
function relativeDay(iso: string): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.floor((start(new Date()) - start(new Date(iso))) / 86_400_000);
  if (days <= 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  return `${days}D AGO`;
}

function sessionMeta(s: TrainingSession): string {
  const parts: string[] = [];
  if (s.distance_km != null) parts.push(`${s.distance_km} km`);
  parts.push(`${s.duration_minutes} min`);
  return parts.join(" · ");
}

function sessionLabel(s: TrainingSession): string {
  if (s.session_type === "running") return "Run";
  if (s.session_type === "mobility") return "Mobility";
  return "Strength";
}

function TrainLanding({ onStartGuided, onQuickLog }: { onStartGuided: () => void; onQuickLog: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, loading, reload } = useAsync(() => api.listTrainingSessions(8));
  const recent = data?.items ?? [];

  const onImport = (label: string) => {
    Alert.alert(
      "Not available yet",
      `${label} import needs backend support and isn’t live yet. For now, run the guided session or log a completed one — we’ll never fabricate imported workout data.`,
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />}
      >
        <ScreenHead overline="Make it executable" title="Train" />

        {/* guided session hero (preview) */}
        {FLAGS.guidedWorkoutsPreview ? (
          <Panel raised style={styles.sideMargin} accent={T.greenLine} pad={0}>
            <View style={styles.heroInner}>
              <HeroBackdrop tone="green" />
              <MountainMark size={200} color="#9fb0a8" style={styles.heroWatermark} />
              <View style={styles.heroTop}>
                <View style={styles.shrink}>
                  <Text style={styles.heroEyebrow}>GUIDED SESSION · PREVIEW</Text>
                  <Text style={styles.heroTitle}>{SAMPLE_WORKOUT.title.toUpperCase()}</Text>
                  <View style={styles.heroSource}>
                    <Icon name="grid" size={12} color={T.sub} />
                    <Text style={styles.heroSourceText}>{SAMPLE_WORKOUT.source}</Text>
                  </View>
                </View>
                <IconTile name="dumbbell" size={46} iconSize={23} />
              </View>
              <View style={styles.heroChips}>
                <Chip label={`${SAMPLE_WORKOUT.exercises.length} EXERCISES`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
                <Chip label={`${totalSets(SAMPLE_WORKOUT)} SETS`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
                <Chip label={`~${SAMPLE_WORKOUT.est} MIN`} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} />
              </View>
              <View style={styles.heroCta}>
                <Btn kind="primary" full icon="play" label="Try guided session" onPress={onStartGuided} />
              </View>
            </View>
          </Panel>
        ) : null}

        {/* real quick log */}
        <View style={[styles.sideMargin, styles.quickCta]}>
          <Btn kind="soft" full icon="check" label="Log a completed session" onPress={onQuickLog} />
        </View>

        {/* import methods (honest unsupported state) */}
        <SectionHead icon="plus" title="IMPORT A WORKOUT" sub="Turn anything into a guided session" />
        <View style={styles.list}>
          {IMPORT_METHODS.map((im) => {
            const tone = im.tone === "red" ? T.red : im.tone === "neutral" ? T.mut : T.green;
            return (
              <Pressable key={im.id} style={styles.importRow} onPress={() => onImport(im.label)}>
                <IconTile
                  name={im.icon}
                  size={42}
                  iconSize={20}
                  color={tone}
                  bg={im.tone === "red" ? T.redSoft : im.tone === "neutral" ? T.surf2 : T.greenSoft}
                  border={im.tone === "neutral" ? T.line : `${tone}44`}
                />
                <View style={styles.shrink}>
                  <Text style={styles.importLabel}>{im.label}</Text>
                  <Text style={styles.importSub}>{im.sub}</Text>
                </View>
                <Chip label="SOON" color={T.sub} bg="rgba(255,255,255,0.05)" border={T.line2} />
              </Pressable>
            );
          })}
        </View>

        {/* recent proof */}
        <SectionHead icon="clock" title="RECENT PROOF" />
        <View style={styles.list}>
          {recent.length > 0 ? (
            recent.map((s) => (
              <View key={s.id} style={styles.recentRow}>
                <IconTile name={s.session_type === "running" ? "route" : "dumbbell"} size={38} iconSize={18} color={T.mut} bg={T.surf2} border={T.line} />
                <View style={styles.shrink}>
                  <Text style={styles.recentLabel}>{sessionLabel(s)}</Text>
                  <Text style={styles.recentMeta}>{sessionMeta(s)}</Text>
                </View>
                <Text style={styles.recentWhen}>{relativeDay(s.logged_at)}</Text>
              </View>
            ))
          ) : (
            <Panel style={styles.sideMargin}>
              <Text style={styles.emptyText}>No sessions logged yet. Your completed work shows up here.</Text>
            </Panel>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

// ── Quick log (real) ─────────────────────────────────────────────────────────
const TYPES: Option<SessionType>[] = [
  { value: "strength", label: "Strength", hint: "Lift, accessories, loaded movement" },
  { value: "running", label: "Running", hint: "Distance, tempo, intervals, easy miles" },
  { value: "mobility", label: "Mobility", hint: "Recovery, movement quality, reset work" },
];

function QuickLog({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessionType, setSessionType] = useState<SessionType>("strength");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [logged, setLogged] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(undefined);
    const minutes = Number.parseInt(duration, 10);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setError("Enter a duration of at least 1 minute.");
      return;
    }
    const distanceKm = distance.trim().length > 0 ? Number.parseFloat(distance) : undefined;
    if (distanceKm !== undefined && (Number.isNaN(distanceKm) || distanceKm < 0)) {
      setError("Enter a valid distance.");
      return;
    }
    setSubmitting(true);
    try {
      await api.logTrainingSession({
        session_type: sessionType,
        duration_minutes: minutes,
        distance_km: sessionType === "running" ? distanceKm : undefined,
        notes: notes.trim() || undefined,
      });
      setLogged(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t log that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.sideMargin}>
        <Btn kind="ghost" icon="chevronL" label="Back" onPress={onBack} style={styles.back} />
      </View>
      <ScreenHead overline="Record the work" title={logged ? "Logged" : "Log a session"} />

      {logged ? (
        <Panel style={styles.sideMargin} accent={T.greenLine}>
          <Text style={styles.loggedTitle}>Session logged</Text>
          <Text style={styles.loggedBody}>That action is now part of your proof. XP updates through the progression ledger.</Text>
          <View style={styles.loggedActions}>
            <Btn kind="primary" full icon="chart" label="View progress" onPress={() => router.replace("/(app)/profile")} />
            <Btn
              kind="ghost"
              full
              label="Log another"
              onPress={() => {
                setLogged(false);
                setDuration("");
                setDistance("");
                setNotes("");
              }}
            />
          </View>
        </Panel>
      ) : (
        <Panel style={styles.sideMargin}>
          <View style={styles.formBlock}>
            <Text style={styles.formLabel}>Session type</Text>
            <OptionSelect options={TYPES} selected={sessionType} onSelect={setSessionType} />
          </View>
          <TextField label="Duration" helperText="Minutes" value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="45" />
          {sessionType === "running" ? (
            <TextField label="Distance" helperText="Km optional" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="8.2" />
          ) : null}
          <TextField label="Notes" helperText="Optional" value={notes} onChangeText={setNotes} placeholder="How did it go?" multiline maxLength={500} />
          {error ? <FormError message={error} /> : null}
          <PrimaryButton label="Log session" onPress={onSubmit} loading={submitting} />
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 124 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1 },

  heroInner: { padding: 16, overflow: "hidden" },
  heroWatermark: { position: "absolute", top: -30, right: -50, opacity: 0.06 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  heroEyebrow: { ...mono(10, 700), letterSpacing: 1.2, color: T.green },
  heroTitle: { ...disp(26, 800), color: "#fff", marginTop: 4 },
  heroSource: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroSourceText: { ...ui(12, 500), color: T.mut },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  heroCta: { marginTop: 14 },

  quickCta: { marginTop: 14 },

  list: { gap: 9, marginHorizontal: 16 },
  importRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  importLabel: { ...ui(15, 700), color: T.text },
  importSub: { ...ui(12, 500), color: T.sub, marginTop: 1 },

  recentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 13, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  recentLabel: { ...ui(15, 600), color: T.text },
  recentMeta: { ...ui(12, 500), color: T.sub, marginTop: 1 },
  recentWhen: { ...mono(9, 600), color: T.sub },
  emptyText: { ...ui(13, 500), color: T.mut, lineHeight: 19 },

  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  formBlock: { gap: 10, marginBottom: 14 },
  formLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub },
  loggedTitle: { ...disp(20, 800), color: T.text },
  loggedBody: { ...ui(13, 500), color: T.mut, marginTop: 6, lineHeight: 19 },
  loggedActions: { marginTop: 16, gap: 10 },
});
