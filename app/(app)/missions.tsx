import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Body, Button, Chip, IconButton, Overline, Page, Row, Title } from "@/components/ui/kit";
import { TopoArt } from "@/components/ui/photo";
import { C, disp, ui } from "@/constants/theme";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import { daysBetween, hm, km, longDate, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { sportMeta } from "@/lib/race/sports";

export default function MissionsScreen() {
  const router = useRouter();
  const race = useRace();
  const [past, setPast] = useState<RaceMission[]>([]);
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
      <View style={{ gap: 12 }}>
        {race.missions.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            focused={m.id === race.mission?.id}
            onPress={() => {
              race.setFocus(m.id);
              router.replace("/(app)/home");
            }}
            onEdit={() => router.push(`/(app)/mission-setup?id=${m.id}`)}
          />
        ))}
      </View>
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

function MissionCard({ mission, focused, onPress, onEdit }: { mission: RaceMission; focused: boolean; onPress: () => void; onEdit: () => void }) {
  const e = mission.event;
  const days = daysBetween(todayIn(e.timezone), e.race_date);
  const meta = sportMeta(e.sport);
  const body = (
    <View style={styles.cardInner}>
      <Row>
        <Chip icon={meta.icon} label={`${meta.short} · priority ${mission.goal.priority ?? "A"}`} color={C.text} bg="rgba(8,9,11,0.6)" border={C.lineStrong} />
        <View style={{ flex: 1 }} />
        {focused ? <Chip icon="target" label="Focused" color={C.ink} bg={C.white} border={C.white} /> : null}
      </Row>
      <View style={{ flex: 1 }} />
      <Text style={[disp(30, 800), { color: C.text, lineHeight: 32 }]} numberOfLines={2}>
        {e.name}
      </Text>
      <Row>
        <Text style={[ui(13, 600), { color: C.textMuted, flex: 1 }]}>
          {longDate(e.race_date)} · {km(e.distance_km)}{" "}km{e.elevation_gain_m ? ` · ${e.elevation_gain_m.toLocaleString("en-US")} m+` : ""}
        </Text>
        <Text style={[disp(22, 800), { color: C.text }]}>{days >= 0 ? `${days}d` : "done"}</Text>
      </Row>
    </View>
  );
  return (
    <View style={[styles.card, focused && { borderColor: C.white }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${e.name}`} onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.9 }]}>
        {mission.cover ? (
          <ImageBackground source={{ uri: mission.cover.thumb_url ?? mission.cover.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <TopoArt seed={e.name.length} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,9,11,0.5)" }]} />
        {body}
      </Pressable>
      <View style={styles.edit}>
        <IconButton icon="edit" label={`Edit ${e.name}`} onPress={onEdit} size={38} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 210, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  cardInner: { flex: 1, padding: 16, gap: 6 },
  edit: { position: "absolute", right: 12, bottom: 56 },
  past: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
