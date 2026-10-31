import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { PriorityBadge, PrioritySheet } from "@/components/mission/priority";
import { Body, Button, Chip, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { Ring } from "@/components/ui/charts";
import { TopoArt } from "@/components/ui/photo";
import { C, disp, ui } from "@/constants/theme";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import { daysBetween, hm, km, longDate, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { priorityOf, raceConflicts } from "@/lib/race/priority";
import { sportMeta } from "@/lib/race/sports";
import { useBuilder } from "@/lib/race/use-builder";

export default function MissionsScreen() {
  const router = useRouter();
  const race = useRace();
  const [past, setPast] = useState<RaceMission[]>([]);
  const [prioritizing, setPrioritizing] = useState<RaceMission | null>(null);
  const [replanned, setReplanned] = useState<string | null>(null);
  const refresh = useCallback(() => race.refresh(["plan", "progress", "brief"], { briefRefresh: true }), [race]);
  const builder = useBuilder(refresh);
  const conflicts = raceConflicts(race.missions, todayIn());
  // A new priority changes this race's plan and every later race plan that contains it.
  const replan = async (changed: RaceMission) => {
    const planned = new Set((race.timeline?.races ?? []).filter((r) => r.has_plan).map((r) => r.mission_id));
    const affected = race.missions.filter((m) => planned.has(m.id) && (m.id === changed.id || m.event.race_date > changed.event.race_date));
    for (const m of affected) await builder.build(m.id, ["plan"]);
    setReplanned(affected.length ? `Re-planned ${affected.length} plan${affected.length === 1 ? "" : "s"} around the new priority.` : "No race plan to change yet — new plans use the new priority.");
    setPrioritizing(null);
  };
  useEffect(() => {
    raceMissions
      .list("completed")
      .then(setPast)
      .catch(() => setPast([]));
  }, []);
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>My races</Overline>
        <Title size={40}>Your missions</Title>
        <Body muted>Prepare for several races at once — an A race plus tune-ups or a season of challenges. The focused race leads your home screen.</Body>
      </View>
      {conflicts.map((c) => (
        <Notice key={c} icon="alert" tone="attention" title="Races clash" body={c} />
      ))}
      {replanned ? <Notice icon="checkCircle" tone="accent" title={replanned} /> : null}
      <View style={{ gap: 12 }}>
        {race.missions.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            focused={m.id === race.mission?.id}
            onPress={() => {
              race.setFocus(m.id);
              if (router.canGoBack()) router.back();
              else router.replace("/(app)/home");
            }}
            onEdit={() => router.push(`/(app)/mission-setup?id=${m.id}`)}
            onPriority={() => setPrioritizing(m)}
          />
        ))}
      </View>
      <PrioritySheet
        mission={prioritizing}
        onClose={() => setPrioritizing(null)}
        onSaved={(next) => race.replaceMission(next)}
        onReplan={(next) => void replan(next)}
        replanning={builder.running}
      />
      <Button label="Add another race" icon="plus" kind="secondary" onPress={() => router.push("/(app)/mission-setup")} style={{ alignSelf: "flex-start" }} />
      {past.length ? (
        <View style={{ gap: 10 }}>
          <Text style={[disp(22, 800), { color: C.text }]}>Completed</Text>
          {past.map((m) => (
            <View key={m.id} style={styles.past}>
              <Icon name="trophy" size={18} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[ui(15, 700), { color: C.text }]}>{m.event.name}</Text>
                <Text style={[ui(12, 500), { color: C.textMuted }]}>
                  {longDate(m.event.race_date)} · {m.result?.status === "finished" ? hm(m.result.finish_minutes ?? null) : m.result?.status?.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Page>
  );
}

function MissionCard({ mission, focused, onPress, onEdit, onPriority }: { mission: RaceMission; focused: boolean; onPress: () => void; onEdit: () => void; onPriority: () => void }) {
  const e = mission.event;
  const today = todayIn(e.timezone);
  const days = daysBetween(today, e.race_date);
  const meta = sportMeta(e.sport);
  // How much of the preparation window (commit → race day) has passed.
  const total = Math.max(1, daysBetween(mission.created_at.slice(0, 10), e.race_date));
  const elapsed = Math.min(1, Math.max(0, 1 - days / total));
  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${e.name}`} onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.92 }]}>
        {mission.cover ? (
          <ImageBackground source={{ uri: mission.cover.thumb_url ?? mission.cover.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <TopoArt seed={e.name.length} />
        )}
        <LinearGradient colors={["rgba(8,9,11,0.35)", "rgba(8,9,11,0.15)", "rgba(8,9,11,0.88)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.cardInner}>
          <Row gap={10} align="flex-start">
            <View style={styles.sportBadge}>
              <Icon name={meta.icon} size={24} color={C.ink} />
            </View>
            <View style={{ gap: 2, flex: 1, paddingRight: 44 }}>
              <Text style={[ui(12, 700), { color: C.text }]} numberOfLines={1}>{meta.label}</Text>
              <Text style={[ui(11, 600), { color: "rgba(244,245,246,0.75)" }]}>
                {priorityOf(mission)} race{focused ? " · focused" : ""}
              </Text>
            </View>
            <View style={styles.ringBack}>
              <Ring value={elapsed} size={58} stroke={4} color={focused ? C.accent : C.white} label={`${days} days to race day`}>
                <Text style={[disp(18, 800), { color: C.text, lineHeight: 20 }]}>{days >= 0 ? days : "✓"}</Text>
                <Text style={[ui(9, 700), { color: C.textMuted }]}>{days === 1 ? "DAY" : "DAYS"}</Text>
              </Ring>
            </View>
          </Row>
          <View style={{ flex: 1 }} />
          <Text style={[disp(30, 800), { color: C.text, lineHeight: 33 }]} numberOfLines={2}>
            {e.name}
          </Text>
          <Row gap={6} wrap>
            <Chip icon="calendar" label={longDate(e.race_date)} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
            <Chip icon="route" label={`${km(e.distance_km)} km`} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
            {e.elevation_gain_m ? <Chip icon="mountain" label={`${e.elevation_gain_m.toLocaleString("en-US")} m+`} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} /> : null}
          </Row>
        </View>
      </Pressable>
      <View style={styles.edit}>
        <IconButton icon="edit" label={`Edit ${e.name}`} onPress={onEdit} size={38} />
      </View>
      <View style={styles.priority}>
        <PriorityBadge priority={priorityOf(mission)} size={30} onPress={onPriority} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 236, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  cardFocused: { borderColor: C.accent, borderWidth: 1.5 },
  cardInner: { flex: 1, padding: 16, gap: 8 },
  sportBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
  edit: { position: "absolute", top: 26, right: 90 },
  priority: { position: "absolute", bottom: 18, right: 16 },
  ringBack: { borderRadius: 29, backgroundColor: "rgba(8,9,11,0.6)", marginRight: 0 },
  past: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
