import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BuildPanel } from "@/components/mission/build-panel";
import { MissionHero } from "@/components/mission/hero";
import { BriefCard, ComingUp, ConditionsCard, ReadinessCard, TodayCard, TrackerSection } from "@/components/mission/sections";
import { ProposalCard } from "@/components/plan/proposal-card";
import { Icon } from "@/components/ui/icon";
import { Body, Button, ErrorBanner, Overline, Skeleton, Title, Wordmark, useLayout } from "@/components/ui/kit";
import { TopoArt } from "@/components/ui/photo";
import { C, disp, ui } from "@/constants/theme";
import { todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { layerStatuses } from "@/lib/race/readiness";
import { SPORTS } from "@/lib/race/sports";
import { useBuilder } from "@/lib/race/use-builder";

const NEEDS_COURSE = new Set(["trail_running", "hiking", "skimo", "cycling", "gravel", "mountain_biking", "multisport", "custom"]);

export default function MissionHome() {
  const race = useRace();
  const { mission, missions, plan, progress, layers, brief, course } = race;
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const refreshAll = useCallback(() => race.refresh(undefined, { briefRefresh: true }), [race]);
  const builder = useBuilder(refreshAll);

  const rows = useMemo(
    () =>
      layerStatuses({
        plan,
        progress,
        layers,
        hasCourse: course === undefined ? null : Boolean(course),
        needsCourse: NEEDS_COURSE.has(mission?.event.sport ?? "trail_running"),
      }),
    [plan, progress, layers, course, mission?.event.sport],
  );

  if (race.loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 18, gap: 14 }]}>
        <Skeleton height={380} radius={24} />
        <Skeleton height={140} radius={22} />
        <Skeleton height={120} radius={22} />
      </View>
    );
  }
  if (race.error) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 40, paddingHorizontal: 18 }]}>
        <ErrorBanner message={race.error} onRetry={() => void race.reloadMissions()} />
      </View>
    );
  }
  if (!mission) return <StartMission />;

  const today = todayIn(mission.event.timezone);
  const missing = rows.filter((r) => !r.built && r.key !== "course").map((r) => (r.key === "training" ? "plan" : r.key)) as ("plan" | "fuel" | "gear" | "logistics" | "strategy")[];
  const buildMissing = () => void builder.build(mission.id, missing.length ? missing : undefined);
  const raceDayPassed = today > mission.event.race_date;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
      <MissionHero mission={mission} plan={plan} missionCount={missions.length} />
      <View style={[styles.body, { paddingHorizontal: wide ? 32 : 16 }]}>
        {race.dataError ? <ErrorBanner message={race.dataError} onRetry={() => void race.refresh()} /> : null}
        {raceDayPassed ? <DebriefPrompt /> : null}
        <BuildPanel states={builder.states} />
        <View style={[styles.columns, wide && { flexDirection: "row", alignItems: "flex-start" }]}>
          <View style={[styles.column, wide && { flex: 1.15 }]}>
            {race.dataLoading && !plan && !progress ? (
              <Skeleton height={180} radius={22} />
            ) : (
              <TodayCard plan={plan} progress={progress} today={today} onBuild={buildMissing} building={builder.running} />
            )}
            {brief?.proposal && brief.proposal.status === "pending" ? (
              <ProposalCard missionId={mission.id} proposal={brief.proposal} onDecided={() => void race.refresh(["plan", "progress", "brief"], { briefRefresh: true })} />
            ) : null}
            <BriefCard brief={brief} loading={race.briefLoading} error={race.briefError} onRefresh={() => void race.refresh(["brief"], { briefRefresh: true })} />
            <TrackerSection plan={plan} progress={progress} />
          </View>
          <View style={[styles.column, wide && { flex: 1 }]}>
            <ReadinessCard rows={rows} onBuild={buildMissing} building={builder.running} />
            <ComingUp plan={plan} layers={layers} today={today} />
            <ConditionsCard conditions={brief?.conditions} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function DebriefPrompt() {
  const router = useRouter();
  return (
    <View style={styles.debrief}>
      <Icon name="trophy" size={22} color={C.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[ui(15, 700), { color: C.text }]}>Race day has passed</Text>
        <Text style={[ui(13, 500), { color: C.textMuted }]}>Record your result and lessons — they make your next mission smarter.</Text>
      </View>
      <Button label="Debrief" size="sm" onPress={() => router.push("/(app)/debrief")} />
    </View>
  );
}

function StartMission() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
      <View style={[styles.startHero, { paddingTop: insets.top + 28, minHeight: wide ? 420 : 460 }]}>
        <TopoArt seed={7} />
        <View style={[styles.startInner, { paddingHorizontal: wide ? 40 : 20 }]}>
          <Wordmark size={14} color={C.textMuted} />
          <Text accessibilityRole="header" style={[disp(wide ? 72 : 52, 800), { color: C.text, lineHeight: wide ? 74 : 54, marginTop: 24 }]}>
            What are you preparing for?
          </Text>
          <Body muted size={16} style={{ maxWidth: 560, marginTop: 10 }}>
            Name your race or challenge. STREM builds every layer — training, fueling, gear, logistics and race strategy — and your AI race team keeps it aligned with what you actually do.
          </Body>
          <Button label="Start a Race Mission" icon="flag" size="lg" onPress={() => router.push("/(app)/mission-setup")} style={{ alignSelf: "flex-start", marginTop: 22 }} />
        </View>
      </View>
      <View style={[styles.body, { paddingHorizontal: wide ? 40 : 16 }]}>
        <Overline>Pick your discipline</Overline>
        <View style={styles.sportGrid}>
          {SPORTS.map((sport) => (
            <Pressable
              key={sport.id}
              accessibilityRole="button"
              accessibilityLabel={`Start a ${sport.label} mission`}
              onPress={() => router.push(`/(app)/mission-setup?sport=${sport.id}`)}
              style={({ pressed }) => [styles.sportTile, wide && { width: "23.5%" }, pressed && { opacity: 0.8 }]}
            >
              <Icon name={sport.icon} size={24} color={C.text} />
              <Text style={[ui(15, 700), { color: C.text }]}>{sport.label}</Text>
              <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>{sport.blurb}</Text>
            </Pressable>
          ))}
        </View>
        <Title size={22} style={{ marginTop: 8 }}>
          Already raced before?
        </Title>
        <Body muted>Add past races and connect Strava — your race team learns from every finish and every DNF.</Body>
        <Button label="Add race history" kind="secondary" icon="trophy" onPress={() => router.push("/(app)/history")} style={{ alignSelf: "flex-start" }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  body: { width: "100%", maxWidth: 1180, alignSelf: "center", gap: 18, marginTop: 6 },
  columns: { gap: 18 },
  column: { gap: 18 },
  debrief: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accentLine },
  startHero: { width: "100%", overflow: "hidden", justifyContent: "flex-end", paddingBottom: 28 },
  startInner: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sportTile: { width: "48%", flexGrow: 1, gap: 8, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 128 },
});
