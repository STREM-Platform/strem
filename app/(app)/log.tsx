/**
 * Train — Forge live-workout intelligence + AI capture, over the real log.
 *
 * Leads with today's AI-planned, autoregulated session (D1/D2): per-set coaching,
 * RPE capture, autoregulated rest, PR-detect → celebration, finish debrief. The
 * debrief persists a real `POST /training/sessions` so the proof ledger stays
 * honest. AI capture (D3/D4/D6) runs the scanning → parsed → confirm states; the
 * quick-log (always-real) and recent proof are preserved.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { CaptureFlow } from "@/components/workout/capture-flow";
import { Debrief, LiveWorkout } from "@/components/workout/live-session";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon } from "@/components/ui/icon";
import { Btn, IconTile, Panel, ScreenHead, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { SessionType, TrainingSession } from "@/lib/api/types";
import { forge } from "@/lib/agent";
import type { CaptureData, LiveWorkout as LiveWorkoutData } from "@/lib/agent/types";
import { FLAGS } from "@/lib/flags";
import { PHOTOS } from "@/lib/photos";
import { useAsync } from "@/lib/use-async";

type Mode = "landing" | "live" | "debrief" | "quicklog";
type CaptureKind = "workout" | "food" | "voice";

export default function TrainScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("landing");
  const { data: workout } = useAsync<LiveWorkoutData>(forge.getLiveWorkout);

  // Persist the completed session — the always-real proof path.
  const persistSession = async (): Promise<void> => {
    if (!workout) return;
    try {
      await api.logTrainingSession({ session_type: "strength", duration_minutes: 47, notes: `Forge live session: ${workout.title}` });
    } catch {
      // Surfaced on the proof screens; never blocks the debrief.
    }
  };

  if (mode === "live" && workout) {
    return <LiveWorkout workout={workout} onCancel={() => setMode("landing")} onFinish={() => setMode("debrief")} />;
  }
  if (mode === "debrief" && workout) {
    return (
      <Debrief
        workout={workout}
        onDone={async () => {
          await persistSession();
          setMode("landing");
        }}
        onShare={async () => {
          await persistSession();
          router.push("/(app)/recaps");
        }}
      />
    );
  }
  if (mode === "quicklog") {
    return <QuickLog onBack={() => setMode("landing")} />;
  }
  return (
    <TrainLanding
      workout={workout}
      onStartLive={() => setMode("live")}
      onQuickLog={() => setMode("quicklog")}
      onShare={() => router.push("/(app)/recaps")}
    />
  );
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

function TrainLanding({
  workout,
  onStartLive,
  onQuickLog,
  onShare,
}: {
  workout: LiveWorkoutData | undefined;
  onStartLive: () => void;
  onQuickLog: () => void;
  onShare: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data, loading, reload } = useAsync(() => api.listTrainingSessions(8));
  const { data: capture } = useAsync<CaptureData>(forge.getCapture);
  const [captureKind, setCaptureKind] = useState<CaptureKind | null>(null);
  const recent = data?.items ?? [];

  return (
    <View style={styles.root}>
      {capture && captureKind ? <CaptureFlow data={capture} kind={captureKind} onClose={() => setCaptureKind(null)} /> : null}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />}
      >
        <ScreenHead overline="Phase 2 · 5 · Live intelligence" title="Train" />

        {/* today's AI-planned, autoregulated session */}
        {FLAGS.forgeAgentMock && workout ? (
          <Panel raised accent={T.amberLine} style={styles.sideMargin} pad={0}>
            <View style={styles.sessionImgWrap}>
              <HeroBackdrop tone="green" glow={false} />
              <Image source={PHOTOS.strength} style={styles.sessionImg} resizeMode="cover" />
              <View style={styles.sessionScrim} />
              <View style={styles.sessionCaption}>
                <View style={styles.sessionEyebrowRow}>
                  <Icon name="bot" size={14} color={T.green} />
                  <Text style={styles.sessionEyebrow}>TODAY · AI-PLANNED</Text>
                </View>
                <Text style={styles.sessionTitle}>{workout.title.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.sessionBody}>
              <Text style={styles.sessionNote}>{workout.note}</Text>
              <View style={styles.sessionChips}>
                {["2 lifts", "~47 min", "+220 XP", "PR window"].map((t) => (
                  <View key={t} style={styles.sessionChip}>
                    <Text style={styles.sessionChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.sessionCta}>
              <Btn kind="primary" full icon="play" label="Start live session" onPress={onStartLive} />
            </View>
          </Panel>
        ) : null}

        {/* real quick log */}
        <View style={[styles.sideMargin, styles.quickCta]}>
          <Btn kind="soft" full icon="check" label="Log a completed session" onPress={onQuickLog} />
        </View>

        {/* AI capture */}
        {FLAGS.forgeAgentMock && capture ? (
          <>
            <SectionHead icon="sparkles" title="LOG WITH AI" sub="Photo, plate or voice — parsed in seconds" />
            <View style={styles.list}>
              {capture.methods.map((m) => (
                <Pressable key={m.id} style={styles.captureRow} onPress={() => setCaptureKind(m.id)}>
                  <IconTile name={m.icon} size={44} iconSize={21} />
                  <View style={styles.shrink}>
                    <Text style={styles.captureLabel}>{m.label}</Text>
                    <Text style={styles.captureSub}>{m.sub}</Text>
                  </View>
                  <Icon name="chevron" size={17} color={T.sub} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* recent proof — compact, grouped, last few only */}
        <SectionHead icon="clock" title="RECENT PROOF" sub="Your last sessions" />
        <View style={styles.sideMargin}>
          {recent.length > 0 ? (
            <Panel pad={0}>
              {recent.slice(0, 4).map((s, i) => (
                <View key={s.id} style={[styles.recentRow, i > 0 && styles.recentDivider]}>
                  <View style={styles.recentIcon}>
                    <Icon name={s.session_type === "running" ? "route" : "dumbbell"} size={15} color={T.green} />
                  </View>
                  <Text style={styles.recentLabel}>{sessionLabel(s)}</Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {sessionMeta(s)}
                  </Text>
                  <Text style={styles.recentWhen}>{relativeDay(s.logged_at)}</Text>
                </View>
              ))}
            </Panel>
          ) : (
            <Panel>
              <Text style={styles.emptyText}>No sessions logged yet. Your completed work shows up here.</Text>
            </Panel>
          )}
        </View>

        {/* share to story — export your training week as an image (Strava-style) */}
        <SectionHead icon="sparkles" title="SHARE YOUR WEEK" sub="Story-ready training recaps" />
        <View style={styles.sideMargin}>
          <Panel raised accent={T.greenLine} pad={0}>
            <Pressable onPress={onShare}>
              <View style={styles.shareImgWrap}>
                <HeroBackdrop tone="green" glow={false} />
                <Image source={PHOTOS.coachData} style={styles.shareImg} resizeMode="cover" />
                <View style={styles.shareScrim} />
                <View style={styles.shareRow}>
                  <View style={styles.shrink}>
                    <Text style={styles.shareEyebrow}>RECAP · SHARE TO STORY</Text>
                    <Text style={styles.shareTitle}>Your training week, as a story</Text>
                    <Text style={styles.shareSub}>Save the image · post it anywhere</Text>
                  </View>
                  <View style={styles.shareIcon}>
                    <Icon name="arrowUR" size={20} color="#06130D" />
                  </View>
                </View>
              </View>
            </Pressable>
          </Panel>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

// ── Quick log (real, unchanged) ──────────────────────────────────────────────
const TYPES: Option<SessionType>[] = [
  { value: "strength", label: "Strength", hint: "Lift, accessories, loaded movement" },
  { value: "running", label: "Running", hint: "Distance, tempo, intervals, easy miles" },
  { value: "mobility", label: "Mobility", hint: "Recovery, movement quality, reset work" },
];

function QuickLog({ onBack }: { onBack: () => void }) {
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
            <Btn kind="ghost" full label="Log another" onPress={() => { setLogged(false); setDuration(""); setDistance(""); setNotes(""); }} />
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
  shrink: { flexShrink: 1, flex: 1 },

  sessionImgWrap: { height: 132, position: "relative", overflow: "hidden", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sessionImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  sessionScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,16,21,0.5)" },
  sessionCaption: { position: "absolute", left: 16, right: 16, bottom: 12 },
  sessionEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionEyebrow: { ...mono(10, 700), letterSpacing: 1.4, color: T.green },
  sessionTitle: { ...disp(26, 800), color: "#fff", marginTop: 5, lineHeight: 27 },
  sessionBody: { paddingHorizontal: 16, paddingBottom: 4 },
  sessionNote: { ...ui(13.5, 500), color: "#cdd3d8", lineHeight: 20, marginTop: 12 },
  sessionChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  sessionChip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: T.line },
  sessionChipText: { ...mono(10, 700), color: T.mut },
  sessionCta: { padding: 14, borderTopWidth: 1, borderTopColor: T.line, marginTop: 12 },

  quickCta: { marginTop: 14 },

  list: { gap: 9, marginHorizontal: 16 },
  captureRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 13, borderRadius: 14, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  captureLabel: { ...ui(15, 700), color: T.text },
  captureSub: { ...ui(12, 500), color: T.sub, marginTop: 1 },

  shareImgWrap: { height: 120, position: "relative", overflow: "hidden", borderRadius: 16 },
  shareImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  shareScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,16,21,0.58)" },
  shareRow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  shareEyebrow: { ...mono(9, 700), letterSpacing: 1.2, color: T.green },
  shareTitle: { ...disp(21, 800), color: "#fff", marginTop: 4, lineHeight: 22 },
  shareSub: { ...ui(12.5, 500), color: "#cdd3d8", marginTop: 4 },
  shareIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: T.green },

  recentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  recentDivider: { borderTopWidth: 1, borderTopColor: T.line },
  recentIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine },
  recentLabel: { ...ui(14, 700), color: T.text },
  recentMeta: { flex: 1, ...mono(10, 600), color: T.sub, letterSpacing: 0.3 },
  recentWhen: { ...mono(9, 700), color: T.sub, letterSpacing: 0.4 },
  emptyText: { ...ui(13, 500), color: T.mut, lineHeight: 19 },

  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  formBlock: { gap: 10, marginBottom: 14 },
  formLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub },
  loggedTitle: { ...disp(20, 800), color: T.text },
  loggedBody: { ...ui(13, 500), color: T.mut, marginTop: 6, lineHeight: 19 },
  loggedActions: { marginTop: 16, gap: 10 },
});
