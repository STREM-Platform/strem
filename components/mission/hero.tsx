/** The mission hero: race identity over its photography, countdown and phase. */

import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Chip, IconButton, Overline, Row, useLayout } from "@/components/ui/kit";
import { HeroMedia } from "@/components/ui/photo";
import { C, disp, ui } from "@/constants/theme";
import type { MissionPlan } from "@/lib/api/race";
import type { RaceMission } from "@/lib/api/race-missions";
import { capitalize, daysBetween, hm, km, longDate, todayIn } from "@/lib/race/format";
import { sportMeta } from "@/lib/race/sports";

export function currentWeek(plan: MissionPlan | null, today: string) {
  if (!plan) return null;
  const weeks = plan.content.weeks;
  const index = weeks.findIndex((w) => w.start_date <= today && today < addWeek(w.start_date));
  if (index < 0) return null;
  return { week: weeks[index], number: index + 1, total: weeks.length };
}

function addWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function MissionHero({ mission, plan, missionCount }: { mission: RaceMission; plan: MissionPlan | null; missionCount: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wide, width } = useLayout();
  const event = mission.event;
  const sport = sportMeta(event.sport);
  const today = todayIn(event.timezone);
  const days = daysBetween(today, event.race_date);
  const week = currentWeek(plan, today);
  const height = wide ? 460 : Math.min(600, Math.max(470, width * 1.25));
  const seed = mission.id.charCodeAt(0) + mission.id.charCodeAt(1);

  return (
    <HeroMedia
      cover={mission.cover}
      height={height}
      seed={seed}
      overlayTop={
        <Row style={{ paddingTop: insets.top + 12, paddingHorizontal: wide ? 32 : 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch race. Current: ${event.name}`}
            onPress={() => router.push("/(app)/missions")}
            style={({ pressed }) => [styles.switcher, pressed && { opacity: 0.8 }]}
          >
            <Icon name={sport.icon} size={16} color={C.text} />
            <Text style={[ui(13, 700), { color: C.text, maxWidth: 190 }]} numberOfLines={1}>
              {missionCount > 1 ? `${missionCount} races` : "My races"}
            </Text>
            <Icon name="chevronDown" size={16} color={C.textMuted} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <IconButton icon="heart" label="Daily check-in" onPress={() => router.push("/(app)/checkin")} />
        </Row>
      }
    >
      <View style={[styles.content, { paddingHorizontal: wide ? 32 : 18, maxWidth: 1180 }]}>
        <Overline color="rgba(244,245,246,0.94)" style={styles.kicker}>
          {sport.short} · {event.location_name}
        </Overline>
        <Text accessibilityRole="header" numberOfLines={3} style={[disp(wide ? 64 : 48, 800), styles.name, { lineHeight: wide ? 66 : 52 }]}>
          {event.name}
        </Text>
        <Row gap={8} wrap>
          <Chip icon="calendar" label={longDate(event.race_date) + (event.start_time ? ` · ${event.start_time}` : "")} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
          <Chip icon="route" label={`${km(event.distance_km)} km`} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
          {event.elevation_gain_m != null ? (
            <Chip icon="mountain" label={`${event.elevation_gain_m.toLocaleString("en-US")} m+`} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
          ) : null}
          {event.cutoff_minutes != null ? (
            <Chip icon="stopwatch" label={`Cutoff ${hm(event.cutoff_minutes)}`} color={C.text} bg="rgba(8,9,11,0.55)" border={C.lineStrong} />
          ) : null}
        </Row>
        <View style={styles.countRow}>
          <View accessible accessibilityLabel={days >= 0 ? `${days} days to race day` : "Race day has passed"} style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            <Text style={[disp(wide ? 88 : 76, 800), { color: C.text, lineHeight: wide ? 88 : 76 }]}>{days >= 0 ? days : "✓"}</Text>
            <Text style={[ui(14, 600), { color: C.textMuted, marginBottom: 10, maxWidth: 110 }]}>
              {days > 1 ? "days to the start line" : days === 1 ? "day to the start line" : days === 0 ? "race day" : "race day passed"}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          {week ? (
            <View style={styles.phase}>
              <Text style={[ui(11, 700), { color: C.textMuted }]}>Phase</Text>
              <Text style={[disp(20, 800), { color: C.text }]}>{capitalize(week.week.phase)}</Text>
              <Text style={[ui(11, 600), { color: C.textMuted }]}>
                Week {week.number} of {week.total}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </HeroMedia>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.lineStrong,
  },
  content: { width: "100%", alignSelf: "center", gap: 12, paddingBottom: 18 },
  name: { color: C.text, letterSpacing: 0.3, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 12 },
  kicker: { textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 8 },
  countRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4 },
  phase: { alignItems: "flex-end", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: "rgba(8,9,11,0.55)", borderWidth: 1, borderColor: C.lineStrong },
});
