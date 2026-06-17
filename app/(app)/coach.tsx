/**
 * Coach — the weekly narrative recap framed by proof, ported from
 * `design-spec/screen-coach.jsx`. Premium re-skin over the real AI coach API:
 * the latest/generated recap narrative, this week's proof bars, and recent
 * mission outcomes. A pushed screen (from Home/Profile), so it has a back action
 * rather than the bottom nav.
 */

/* eslint-disable react-hooks/set-state-in-effect -- the initial recap fetch is async; setState runs in the promise, not synchronously. */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Bar, Btn, Chip, IconTile, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { Mission, MissionType, WeeklyRecap } from "@/lib/api/types";
import { formatDateRange } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

type Status = "loading" | "recap" | "empty" | "error";

const MISSION_ICON: Record<MissionType, IconName> = {
  performance: "bolt",
  discipline: "dumbbell",
  recovery: "moon",
  nutrition: "leaf",
  tribe: "users",
  hybrid: "flame",
};

function weekStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

async function loadWeekProof(): Promise<{ training: number; nutrition: number }> {
  const [training, nutrition] = await Promise.all([api.listTrainingSessions(50), api.listNutritionDays(14)]);
  const start = weekStart();
  return {
    training: training.items.filter((s) => new Date(s.logged_at) >= start).length,
    nutrition: nutrition.items.filter((d) => d.targets_met && new Date(`${d.date}T00:00:00`) >= start).length,
  };
}

function ProofBar({ label, value, max, tone = T.green }: { label: string; value: number; max: number; tone?: string }) {
  return (
    <View style={styles.proofRow}>
      <Text style={styles.proofLabel}>{label.toUpperCase()}</Text>
      <View style={styles.shrink}>
        <Bar pct={max > 0 ? value / max : 0} color={tone} h={9} />
      </View>
      <Text style={styles.proofVal}>
        {value}
        <Text style={styles.proofMax}>/{max}</Text>
      </Text>
    </View>
  );
}

export default function CoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>("loading");
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationNote, setGenerationNote] = useState<string | undefined>();

  const proof = useAsync(loadWeekProof);
  const history = useAsync(() => api.listMissionHistory(8));

  const load = useCallback(async (): Promise<void> => {
    try {
      setRecap(await api.getLatestRecap());
      setStatus("recap");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setStatus("empty");
      else if (!(err instanceof SessionExpiredError)) setStatus("error");
    }
  }, []);

  const onGenerate = useCallback(async (): Promise<void> => {
    setGenerating(true);
    setGenerationNote(undefined);
    try {
      setRecap(await api.generateRecap());
      setStatus("recap");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setGenerationNote("Log an action first — your coach needs a little more to work with.");
      else if (!(err instanceof SessionExpiredError)) setGenerationNote("Couldn't reach your coach. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, []);

  const refresh = (): void => {
    void load();
    proof.reload();
    history.reload();
  };

  useEffect(() => {
    void load();
  }, [load]);

  const pastMissions = (history.data?.items ?? []).filter((m) => m.state !== "active");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={T.text} colors={[T.green]} />}
      >
        {/* header */}
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/home"))}>
            <Icon name="chevronL" size={20} color={T.mut} />
            <Text style={styles.backText}>Home</Text>
          </Pressable>
          {status === "recap" && recap ? (
            <Chip label={formatDateRange(recap.week_start, recap.week_end).toUpperCase()} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} iconFill={false} />
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <IconTile name="bot" size={48} iconSize={24} />
          <View>
            <Text style={styles.eyebrow}>AI COACH</Text>
            <Text style={styles.title}>WEEKLY RECAP</Text>
          </View>
        </View>

        {status === "loading" ? (
          <View style={styles.loading}>
            <ActivityIndicator color={T.green} />
            <Text style={styles.muted}>Loading coach…</Text>
          </View>
        ) : null}

        {status === "error" ? (
          <Panel style={styles.sideMargin}>
            <Text style={styles.muted}>Couldn’t load your coach.</Text>
            <View style={{ marginTop: 12 }}>
              <Btn kind="soft" full icon="refresh" label="Retry" onPress={refresh} />
            </View>
          </Panel>
        ) : null}

        {/* narrative or generate */}
        {status === "recap" && recap ? (
          <Panel raised style={[styles.sideMargin, styles.narrativePanel]} accent={T.greenLine} pad={18}>
            <MountainMark size={180} color="#9fb0a8" style={styles.narrativeWatermark} />
            <Text style={styles.narrative}>
              <Text style={styles.quote}>“</Text>
              {recap.narrative}
            </Text>
          </Panel>
        ) : status === "empty" ? (
          <Panel style={styles.sideMargin} accent={T.greenLine}>
            <Text style={styles.emptyTitle}>Your coach is listening</Text>
            <Text style={styles.muted}>Generate this week’s recap to turn your logs into an honest, identity-grounded read.</Text>
            {generationNote ? <Text style={styles.note}>{generationNote}</Text> : null}
            <View style={{ marginTop: 14 }}>
              <Btn kind="primary" full icon="sparkles" label={generating ? "Generating…" : "Generate this week’s recap"} onPress={() => void onGenerate()} loading={generating} />
            </View>
          </Panel>
        ) : null}

        {/* weekly proof */}
        {status !== "loading" && status !== "error" ? (
          <>
            <SectionHead icon="chart" title="WEEKLY PROOF" sub="What you actually did" />
            <Panel style={styles.sideMargin} pad={16}>
              <ProofBar label="Training" value={proof.data?.training ?? 0} max={5} />
              <View style={{ height: 13 }} />
              <ProofBar label="Nutrition" value={proof.data?.nutrition ?? 0} max={7} />
            </Panel>

            {/* mission outcomes */}
            <SectionHead icon="target" title="MISSION OUTCOMES" />
            <View style={styles.list}>
              {pastMissions.length > 0 ? (
                pastMissions.map((m: Mission) => {
                  const done = m.state === "completed";
                  return (
                    <View key={m.id} style={[styles.missionRow, { opacity: done ? 1 : 0.72 }]}>
                      <IconTile
                        name={MISSION_ICON[m.type] ?? "target"}
                        size={38}
                        iconSize={18}
                        color={done ? T.green : T.sub}
                        bg={done ? T.greenSoft : T.surf2}
                        border={done ? T.greenLine : T.line}
                      />
                      <View style={styles.shrink}>
                        <Text style={[styles.missionTitle, { color: done ? T.text : T.mut }]} numberOfLines={1}>{m.title}</Text>
                        <Text style={[styles.missionState, { color: done ? T.green : T.sub }]}>
                          {done ? "COMPLETED" : "MISSED — NO SHAME, RE-RUN IT"}
                        </Text>
                      </View>
                      {done ? (
                        <Chip label={`+${m.xp_reward} XP`} />
                      ) : (
                        <Icon name="refresh" size={17} color={T.sub} />
                      )}
                    </View>
                  );
                })
              ) : (
                <Panel>
                  <Text style={styles.muted}>No mission history yet. Complete a mission and it shows here as proof.</Text>
                </Panel>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 30 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1, flex: 1 },
  muted: { ...ui(13, 500), color: T.mut, lineHeight: 19 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { ...ui(13, 600), color: T.mut },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 18, marginTop: 18, marginBottom: 4 },
  eyebrow: { ...mono(10, 700), letterSpacing: 1.4, color: T.green },
  title: { ...disp(28, 800), color: T.text, letterSpacing: 0.4 },

  loading: { alignItems: "center", gap: 10, paddingVertical: 40 },

  narrativePanel: { marginTop: 12 },
  narrativeWatermark: { position: "absolute", top: -20, right: -50, opacity: 0.05 },
  narrative: { ...ui(15, 500), color: "#dfe4e3", lineHeight: 25 },
  quote: { ...disp(28, 800), color: T.green },
  emptyTitle: { ...disp(20, 800), color: T.text, marginBottom: 6 },
  note: { ...ui(13, 600), color: T.green, marginTop: 10 },

  proofRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  proofLabel: { width: 70, ...mono(10, 700), color: T.mut, letterSpacing: 0.6 },
  proofVal: { width: 34, ...ui(13, 800), color: T.text, textAlign: "right" },
  proofMax: { ...ui(11, 500), color: T.sub },

  list: { gap: 9, marginHorizontal: 16 },
  missionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 13, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  missionTitle: { ...ui(15, 600) },
  missionState: { ...mono(9, 700), letterSpacing: 0.8, marginTop: 2 },
});
