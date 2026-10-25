/** Switch the focused race from any tab: a pill that opens a sheet of active races. */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Button, Row } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, disp, ui } from "@/constants/theme";
import type { RaceMission } from "@/lib/api/race-missions";
import { daysBetween, km, longDate, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { sportMeta } from "@/lib/race/sports";

export function RaceSwitcher({ tone = "surface", label }: { tone?: "surface" | "glass"; label?: string }) {
  const race = useRace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = race.mission;
  if (!current) return null;
  const sport = sportMeta(current.event.sport);
  const many = race.missions.length > 1;
  const go = (path: "/(app)/missions" | "/(app)/mission-setup") => {
    setOpen(false);
    router.push(path);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch race. Current: ${current.event.name}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pill, tone === "glass" ? styles.glass : styles.surface, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.badge}>
          <Icon name={sport.icon} size={14} color={C.text} />
        </View>
        <Text style={[ui(13, 700), { color: C.text, maxWidth: 220 }]} numberOfLines={1}>
          {label ?? current.event.name}
        </Text>
        {many ? <Text style={[ui(12, 700), { color: C.textMuted }]}>· {race.missions.length}</Text> : null}
        <Icon name="chevronDown" size={16} color={C.textMuted} />
      </Pressable>
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Your races"
        footer={
          <Row gap={10}>
            <Button label="Manage races" kind="secondary" onPress={() => go("/(app)/missions")} style={{ flex: 1 }} />
            <Button label="Add a race" icon="plus" onPress={() => go("/(app)/mission-setup")} style={{ flex: 1 }} />
          </Row>
        }
      >
        <View style={{ gap: 8 }}>
          {race.missions.map((m) => (
            <RaceOption
              key={m.id}
              mission={m}
              selected={m.id === current.id}
              onPress={() => {
                race.setFocus(m.id);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

function RaceOption({ mission, selected, onPress }: { mission: RaceMission; selected: boolean; onPress: () => void }) {
  const e = mission.event;
  const sport = sportMeta(e.sport);
  const days = daysBetween(todayIn(e.timezone), e.race_date);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${e.name}, ${longDate(e.race_date)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.optionIcon, selected && { backgroundColor: C.white }]}>
        <Icon name={sport.icon} size={20} color={selected ? C.ink : C.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[ui(15, 700), { color: C.text }]} numberOfLines={1}>
          {e.name}
        </Text>
        <Text style={[ui(12, 500), { color: C.textMuted }]} numberOfLines={1}>
          {sport.short} · {longDate(e.race_date)} · {km(e.distance_km)}{" "}km
          {mission.goal.priority ? ` · ${mission.goal.priority} race` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[disp(22, 800), { color: C.text, lineHeight: 24 }]}>{days >= 0 ? days : "✓"}</Text>
        <Text style={[ui(10, 600), { color: C.textDim }]}>{days === 1 ? "day" : "days"}</Text>
      </View>
      {selected ? <Icon name="checkCircle" size={20} color={C.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 12, borderRadius: 22, borderWidth: 1, alignSelf: "flex-start" },
  surface: { backgroundColor: C.surface, borderColor: C.line },
  glass: { backgroundColor: C.glass, borderColor: C.lineStrong },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 64 },
  optionOn: { borderColor: C.lineStrong, backgroundColor: C.surface2 },
  optionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: C.surface3 },
});
