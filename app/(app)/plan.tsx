import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { PrototypeLabel, TrailAtmosphere, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { TRAIL_MISSION_PREVIEW, type TrailSessionPreview } from "@/lib/trail/mission-preview";

const STATE_META = {
  done: { label: "DONE", color: Trail.lime, bg: Trail.limeSoft, icon: "check" as const },
  today: { label: "TODAY", color: Trail.limeInk, bg: Trail.lime, icon: "play" as const },
  next: { label: "UP NEXT", color: Trail.sky, bg: Trail.skySoft, icon: "route" as const },
  rest: { label: "EASY", color: Trail.textMuted, bg: Trail.panelSoft, icon: "moon" as const },
};

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const mission = TRAIL_MISSION_PREVIEW;
  const [selected, setSelected] = useState("THU");

  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <PrototypeLabel />
        <View>
          <Text style={trailStyles.pageOverline}>RILA RIDGE · WEEK {mission.phase.week}</Text>
          <Text style={trailStyles.pageTitle}>Preparation plan</Text>
          <Text style={trailStyles.pageSub}>Every session exists to close a race-day requirement. Missed work is adapted, not punished.</Text>
        </View>

        <TrailPanel accent style={styles.focusPanel}>
          <View style={styles.focusTop}>
            <View style={styles.phaseIndex}>
              <Text style={styles.phaseIndexText}>03</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.focusOverline}>CURRENT BLOCK</Text>
              <Text style={styles.focusTitle}>{mission.phase.name}</Text>
            </View>
            <Text style={styles.focusWeeks}>3 WEEKS LEFT</Text>
          </View>
          <Text style={styles.focusCopy}>Build event-specific climbing and descending durability while proving the exact race fueling system.</Text>
          <View style={styles.focusTags}>
            <Tag icon="mountain" text="VERTICAL" />
            <Tag icon="route" text="DESCENDING" />
            <Tag icon="utensils" text="FUEL TEST" />
          </View>
        </TrailPanel>

        <TrailSectionHead title="THIS WEEK" label="5 SESSIONS · 6H 10M" icon="route" />
        <View style={styles.timeline}>
          {mission.week.map((session, index) => (
            <SessionRow
              key={`${session.day}-${session.date}`}
              session={session}
              selected={selected === session.day}
              last={index === mission.week.length - 1}
              onPress={() => setSelected(session.day)}
            />
          ))}
        </View>

        <TrailSectionHead title="ADAPTATION RULE" label="EXPLAINED" icon="bot" />
        <TrailPanel style={styles.adaptation}>
          <View style={styles.adaptationIcon}>
            <Icon name="sparkles" size={19} color={Trail.lime} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.adaptationTitle}>Protect Saturday’s rehearsal</Text>
            <Text style={styles.adaptationBody}>If fatigue or work pressure rises, STREM will reduce Thursday before removing the session that proves terrain, gear and fueling together.</Text>
            <View style={styles.sourceRow}>
              <Text style={styles.sourceLabel}>USES</Text>
              <Text style={styles.sourceValue}>recovery · calendar · completed load · race demands</Text>
            </View>
          </View>
        </TrailPanel>

        <TrailPanel style={styles.futurePanel}>
          <Text style={styles.futureOverline}>NEXT BLOCK</Text>
          <Text style={styles.futureTitle}>Taper & race operations</Text>
          <Text style={styles.futureBody}>Reduce fatigue. Lock the equipment, pacing, travel and weather contingencies.</Text>
        </TrailPanel>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function Tag({ icon, text }: { icon: "mountain" | "route" | "utensils"; text: string }) {
  return (
    <View style={styles.tag}>
      <Icon name={icon} size={12} color={Trail.lime} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function SessionRow({ session, selected, last, onPress }: { session: TrailSessionPreview; selected: boolean; last: boolean; onPress: () => void }) {
  const meta = STATE_META[session.state];
  return (
    <Pressable onPress={onPress} style={styles.sessionPressable}>
      <View style={styles.dateColumn}>
        <Text style={styles.day}>{session.day}</Text>
        <Text style={styles.date}>{session.date}</Text>
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={[styles.sessionCard, selected && styles.sessionSelected]}>
        <View style={styles.sessionHeader}>
          <View style={[styles.stateIcon, { backgroundColor: meta.bg }]}>
            <Icon name={meta.icon} size={14} color={meta.color} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.sessionDetail}>{session.detail}</Text>
          </View>
          <Text style={[styles.stateLabel, { color: session.state === "today" ? Trail.lime : meta.color }]}>{meta.label}</Text>
        </View>
        {selected ? (
          <View style={styles.sessionExpanded}>
            <Text style={styles.expandedTitle}>WHY THIS MATTERS</Text>
            <Text style={styles.expandedBody}>
              {session.state === "today"
                ? "The late race descent is the least-proven demand in this mission. Keep every repetition controlled; this is durability, not speed work."
                : "This session supports the current race-specific block and will be adjusted against the week's key rehearsal."}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  focusPanel: { gap: 15 },
  focusTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  phaseIndex: { width: 44, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: Trail.lime },
  phaseIndexText: { ...disp(23, 800), color: Trail.limeInk },
  focusOverline: { ...mono(8, 700), letterSpacing: 1, color: Trail.lime },
  focusTitle: { ...disp(21, 800), color: Trail.text, marginTop: 2 },
  focusWeeks: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.6 },
  focusCopy: { ...ui(13, 500), lineHeight: 19, color: Trail.textMuted },
  focusTags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 9, backgroundColor: Trail.limeSoft },
  tagText: { ...mono(8, 700), letterSpacing: 0.5, color: Trail.lime },
  timeline: { gap: 0 },
  sessionPressable: { flexDirection: "row", gap: 11 },
  dateColumn: { width: 38, alignItems: "center" },
  day: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.5 },
  date: { ...disp(20, 800), color: Trail.text, marginTop: 1 },
  timelineLine: { flex: 1, width: 1, minHeight: 58, backgroundColor: Trail.lineStrong, marginVertical: 5 },
  sessionCard: { flex: 1, padding: 13, marginBottom: 11, borderRadius: 16, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  sessionSelected: { borderColor: Trail.limeLine, backgroundColor: Trail.panelRaised },
  sessionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stateIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sessionTitle: { ...ui(13, 700), color: Trail.text },
  sessionDetail: { ...ui(11, 500), color: Trail.textMuted, marginTop: 2 },
  stateLabel: { ...mono(7, 700), letterSpacing: 0.6 },
  sessionExpanded: { borderTopWidth: 1, borderTopColor: Trail.line, paddingTop: 11, marginTop: 12 },
  expandedTitle: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.lime },
  expandedBody: { ...ui(11, 500), lineHeight: 17, color: Trail.textMuted, marginTop: 5 },
  adaptation: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  adaptationIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  adaptationTitle: { ...disp(18, 800), color: Trail.text },
  adaptationBody: { ...ui(12, 500), lineHeight: 18, color: Trail.textMuted, marginTop: 5 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 11 },
  sourceLabel: { ...mono(7, 700), letterSpacing: 0.6, color: Trail.textDim },
  sourceValue: { flex: 1, ...ui(9, 600), color: Trail.textDim },
  futurePanel: { opacity: 0.7 },
  futureOverline: { ...mono(8, 700), letterSpacing: 0.9, color: Trail.sky },
  futureTitle: { ...disp(19, 800), color: Trail.text, marginTop: 4 },
  futureBody: { ...ui(12, 500), color: Trail.textMuted, lineHeight: 18, marginTop: 3 },
});
