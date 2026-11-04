import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoursePanel } from "@/components/lab/course";
import { CheckpointsCard } from "@/components/lab/checkpoints";
import { LAYER_META, LayerView, layerProgress } from "@/components/lab/layer-view";
import { BuildPanel } from "@/components/mission/build-panel";
import { RaceSwitcher } from "@/components/mission/race-switcher";
import { ConditionsCard } from "@/components/mission/sections";
import { Meter } from "@/components/ui/charts";
import { Icon } from "@/components/ui/icon";
import { Body, Button, EmptyState, ErrorBanner, OriginBadge, Page, Row, Segmented, Skeleton, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import type { MissionCourse } from "@/lib/api/courses";
import type { LayerKind } from "@/lib/api/race";
import { todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { BUILD_ORDER, useBuilder, type BuildKind } from "@/lib/race/use-builder";

type Tab = "overview" | "course" | LayerKind;
const TABS: { value: Tab; label: string; icon: "grid" | "route" | "compass" | "drop" | "pack" | "map"; color?: string }[] = [
  { value: "overview", label: "Overview", icon: "grid" },
  { value: "course", label: "Course", icon: "route", color: LAYER_COLOR.course },
  { value: "strategy", label: "Strategy", icon: "compass", color: LAYER_COLOR.strategy },
  { value: "fuel", label: "Fuel", icon: "drop", color: LAYER_COLOR.fuel },
  { value: "gear", label: "Gear", icon: "pack", color: LAYER_COLOR.gear },
  { value: "logistics", label: "Logistics", icon: "map", color: LAYER_COLOR.logistics },
];

export default function RaceLab() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const race = useRace();
  const { mission, layers, course, brief } = race;
  const paramTab = TABS.find((t) => t.value === params.tab)?.value;
  const [tab, setTab] = useState<Tab>(paramTab ?? "overview");
  // Deep links (e.g. from the brief) choose the tab; follow them during render.
  const [seenParam, setSeenParam] = useState(paramTab);
  if (paramTab !== seenParam) {
    setSeenParam(paramTab);
    if (paramTab) setTab(paramTab);
  }
  const refresh = useCallback(() => race.refresh(["plan", "layers", "brief"], { briefRefresh: true }), [race]);
  const builder = useBuilder(refresh);

  if (!mission) {
    return (
      <Page>
        <EmptyState title="No race yet" body="Race Lab turns your race into an executable plan." action={<Button label="Start a Race Mission" onPress={() => router.push("/(app)/mission-setup")} />} />
      </Page>
    );
  }
  const today = todayIn(mission.event.timezone);
  const missing = (["strategy", "fuel", "gear", "logistics"] as LayerKind[]).filter((k) => !layers[k]);
  // Pacing, fuel, kit, timings and the plan's climbing all follow the course:
  // a new, replaced or removed GPX rebuilds everything the race team already built.
  const courseChanged = (next: MissionCourse | null) => {
    race.replaceCourse(next);
    const stale = BUILD_ORDER.filter((kind) => (kind === "plan" ? race.plan : layers[kind]));
    if (stale.length) void builder.build(mission.id, [...stale]);
    else void race.refresh(["brief"], { briefRefresh: true });
  };

  return (
    <Page>
      <View style={{ gap: 6 }}>
        <RaceSwitcher />
        <Title size={38}>Execute race day</Title>
      </View>
      {layers.strategy ? (
        <Button label="Race-day mode" icon="stopwatch" kind="secondary" onPress={() => router.push("/(app)/race-day")} style={{ alignSelf: "flex-start" }} accessibilityLabel="Open race-day mode" />
      ) : null}
      <Segmented scroll options={TABS} value={tab} onChange={setTab} />
      {race.dataError ? <ErrorBanner message={race.dataError} onRetry={() => void race.refresh()} /> : null}
      <BuildPanel states={builder.states} />
      {tab === "overview" ? (
        <View style={{ gap: 14 }}>
          <Body muted>Everything that isn’t training but decides race day. Work through each layer — your progress shows up on the Mission screen.</Body>
          <View style={styles.grid}>
            <LayerCard
              title="Course"
              icon="route"
              color={LAYER_COLOR.course}
              line={course ? `${(course.course.distance_m / 1000).toFixed(1)} km · ${course.analysis.sustained_runs.filter((r) => r.direction === "ascent").length} climbs mapped` : "Upload the GPX"}
              pct={course ? 1 : 0}
              onPress={() => setTab("course")}
            />
            {(["strategy", "fuel", "gear", "logistics"] as LayerKind[]).map((kind) => {
              const layer = layers[kind];
              const meta = LAYER_META[kind];
              const p = layerProgress(layer);
              return (
                <LayerCard
                  key={kind}
                  title={meta.label}
                  icon={meta.icon}
                  color={LAYER_COLOR[meta.key]}
                  line={layer ? layer.content.headline : meta.blurb}
                  pct={layer && p.total ? p.done / p.total : null}
                  origin={layer?.origin}
                  onPress={() => setTab(kind)}
                />
              );
            })}
          </View>
          {missing.length ? (
            <Button label={`Build ${missing.join(", ")}`} icon="sparkles" loading={builder.running} onPress={() => void builder.build(mission.id, missing as BuildKind[])} />
          ) : null}
          <ConditionsCard conditions={brief?.conditions} />
        </View>
      ) : null}
      {tab === "course" ? (
        race.dataLoading && course === undefined ? <Skeleton height={320} radius={22} /> : <CoursePanel missionId={mission.id} saved={course} onChange={courseChanged} />
      ) : null}
      {tab === "strategy" ? (
        <CheckpointsCard
          mission={mission}
          onSaved={(next) => {
            race.replaceMission(next);
            if (layers.strategy) void builder.build(next.id, ["strategy", "fuel"]);
          }}
        />
      ) : null}
      {tab !== "overview" && tab !== "course" ? (
        layers[tab] ? (
          <LayerView
            layer={layers[tab]!}
            today={today}
            onChange={(layer) => race.replaceLayer(layer)}
            onRebuild={() => void builder.build(mission.id, [tab as BuildKind])}
            rebuilding={builder.running}
          />
        ) : race.dataLoading ? (
          <Skeleton height={320} radius={22} />
        ) : (
          <EmptyState
            icon={LAYER_META[tab].icon}
            title={`${LAYER_META[tab].label} isn't built yet`}
            body={LAYER_META[tab].blurb}
            action={<Button label={`Build ${LAYER_META[tab].label.toLowerCase()}`} icon="sparkles" loading={builder.running} onPress={() => void builder.build(mission.id, [tab as BuildKind])} />}
          />
        )
      ) : null}
    </Page>
  );
}

function LayerCard({ title, icon, color, line, pct, origin, onPress }: { title: string; icon: Parameters<typeof Icon>[0]["name"]; color: string; line: string; pct: number | null; origin?: "ai" | "engine" | "athlete"; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${line}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <Row>
        <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }} />
        {origin ? <OriginBadge origin={origin} /> : null}
      </Row>
      <Text style={[ui(17, 700), { color: C.text }]}>{title}</Text>
      <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]} numberOfLines={3}>
        {line}
      </Text>
      <View style={{ flex: 1 }} />
      <Meter value={pct} color={color} label={`${title} progress`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", flexGrow: 1, minWidth: 220, minHeight: 190, gap: 8, padding: 16, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
