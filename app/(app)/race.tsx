import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { ElevationProfile, PrototypeLabel, TrailAtmosphere, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { TRAIL_MISSION_PREVIEW } from "@/lib/trail/mission-preview";

const LAB_ITEMS: { key: keyof typeof TRAIL_MISSION_PREVIEW.raceLab; label: string; icon: IconName; color: string }[] = [
  { key: "fuel", label: "Fuel & hydration", icon: "utensils", color: Trail.orange },
  { key: "gear", label: "Gear & mandatory kit", icon: "shield", color: Trail.sky },
  { key: "logistics", label: "Race-week operations", icon: "pin", color: Trail.lime },
];

export default function RaceLabScreen() {
  const insets = useSafeAreaInsets();
  const mission = TRAIL_MISSION_PREVIEW;
  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere />
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <PrototypeLabel />
        <View>
          <Text style={trailStyles.pageOverline}>RILA RIDGE 32K</Text>
          <Text style={trailStyles.pageTitle}>Race Lab</Text>
          <Text style={trailStyles.pageSub}>Turn the course, conditions and logistics into decisions you have already rehearsed.</Text>
        </View>

        <TrailPanel accent style={styles.courseCard}>
          <View style={trailStyles.between}>
            <View>
              <Text style={styles.courseOverline}>COURSE MODEL</Text>
              <Text style={styles.courseTitle}>32 km · 1,850 m+</Text>
            </View>
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>TECHNICAL</Text>
            </View>
          </View>
          <ElevationProfile values={mission.course.profile} />
          <View style={styles.courseFacts}>
            <CourseFact value="1,930 m" label="HIGH POINT" />
            <CourseFact value="3" label="AID STATIONS" />
            <CourseFact value="7h" label="CUTOFF" />
          </View>
        </TrailPanel>

        <TrailPanel style={styles.calendarCard}>
          <View style={styles.calendarIcon}>
            <Icon name="clock" size={20} color={Trail.lime} />
          </View>
          <View style={styles.flex}>
            <View style={trailStyles.between}>
              <Text style={styles.calendarOverline}>PERSONAL CALENDAR</Text>
              <Text style={styles.calendarState}>CONTRACT NEXT</Text>
            </View>
            <Text style={styles.calendarTitle}>Reserve the race weekend</Text>
            <Text style={styles.calendarBody}>Export the event, travel block, registration deadline and key rehearsals. STREM will use free/busy windows, never meeting contents.</Text>
          </View>
        </TrailPanel>

        <TrailSectionHead title="COURSE EXECUTION" label="3 DECISIONS" icon="compass" />
        <View style={styles.sections}>
          {mission.course.sections.map((section, index) => (
            <View key={section.km} style={styles.sectionRow}>
              <View style={[styles.sectionIndex, section.tone === "commit" && styles.sectionIndexRisk]}>
                <Text style={[styles.sectionIndexText, section.tone === "commit" && styles.sectionIndexTextRisk]}>{index + 1}</Text>
              </View>
              <TrailPanel style={styles.sectionCard}>
                <View style={trailStyles.between}>
                  <Text style={styles.sectionKm}>KM {section.km}</Text>
                  <Text style={[styles.sectionMode, section.tone === "commit" && styles.sectionModeRisk]}>{section.name.toUpperCase()}</Text>
                </View>
                <Text style={styles.sectionNote}>{section.note}</Text>
              </TrailPanel>
            </View>
          ))}
        </View>

        <TrailSectionHead title="READINESS BOARD" label="PROVE BEFORE RACE DAY" icon="target" />
        <View style={styles.labList}>
          {LAB_ITEMS.map(({ key, label, icon, color }) => {
            const item = mission.raceLab[key];
            return (
              <Pressable key={key} style={styles.labCard}>
                <View style={[styles.labIcon, { backgroundColor: `${color}18` }]}>
                  <Icon name={icon} size={19} color={color} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.labLabel}>{label.toUpperCase()}</Text>
                  <Text style={styles.labTitle}>{item.title}</Text>
                  <Text style={styles.labDetail}>{item.detail}</Text>
                  <View style={styles.labTrack}>
                    <View style={[styles.labFill, { width: `${item.progress * 100}%`, backgroundColor: color }]} />
                  </View>
                </View>
                <Icon name="chevron" size={18} color={Trail.textDim} />
              </Pressable>
            );
          })}
        </View>

        <TrailPanel style={styles.weatherPanel}>
          <View style={styles.weatherTop}>
            <View style={styles.weatherIcon}>
              <Icon name="mountain" size={20} color={Trail.sky} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.weatherOverline}>CONDITION ASSUMPTION</Text>
              <Text style={styles.weatherTitle}>Cold start · exposed ridge · possible rain</Text>
            </View>
          </View>
          <Text style={styles.weatherBody}>This is a planning assumption, not a forecast. Live weather should only influence the final plan inside race week.</Text>
        </TrailPanel>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function CourseFact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  courseCard: { gap: 10 },
  courseOverline: { ...mono(8, 700), letterSpacing: 1, color: Trail.lime },
  courseTitle: { ...disp(24, 800), color: Trail.text, marginTop: 3 },
  courseBadge: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: Trail.orangeSoft, borderWidth: 1, borderColor: Trail.orangeLine },
  courseBadgeText: { ...mono(8, 700), letterSpacing: 0.7, color: Trail.orange },
  courseFacts: { flexDirection: "row", borderTopWidth: 1, borderTopColor: Trail.line, paddingTop: 13 },
  calendarCard: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  calendarIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  calendarOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.lime },
  calendarState: { ...mono(7, 700), letterSpacing: 0.6, color: Trail.textDim },
  calendarTitle: { ...ui(14, 700), color: Trail.text, marginTop: 5 },
  calendarBody: { ...ui(11, 500), lineHeight: 17, color: Trail.textMuted, marginTop: 4 },
  fact: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: Trail.line },
  factValue: { ...disp(18, 800), color: Trail.text },
  factLabel: { ...mono(7, 700), letterSpacing: 0.6, color: Trail.textDim, marginTop: 3 },
  sections: { gap: 10 },
  sectionRow: { flexDirection: "row", alignItems: "stretch", gap: 9 },
  sectionIndex: { width: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  sectionIndexRisk: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine },
  sectionIndexText: { ...disp(20, 800), color: Trail.lime },
  sectionIndexTextRisk: { color: Trail.orange },
  sectionCard: { flex: 1, padding: 13 },
  sectionKm: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.6 },
  sectionMode: { ...mono(8, 700), color: Trail.lime, letterSpacing: 0.7 },
  sectionModeRisk: { color: Trail.orange },
  sectionNote: { ...ui(12, 500), lineHeight: 18, color: Trail.textMuted, marginTop: 7 },
  labList: { gap: 10 },
  labCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  labIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  labLabel: { ...mono(7, 700), letterSpacing: 0.7, color: Trail.textDim },
  labTitle: { ...ui(13, 700), color: Trail.text, marginTop: 3 },
  labDetail: { ...ui(10, 500), color: Trail.textMuted, lineHeight: 15, marginTop: 2 },
  labTrack: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: Trail.panelSoft, marginTop: 10 },
  labFill: { height: "100%", borderRadius: 2 },
  weatherPanel: { backgroundColor: Trail.skySoft, borderColor: "rgba(120,199,214,0.26)" },
  weatherTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  weatherIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(120,199,214,0.10)" },
  weatherOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.sky },
  weatherTitle: { ...ui(13, 700), color: Trail.text, marginTop: 2 },
  weatherBody: { ...ui(10, 500), lineHeight: 16, color: Trail.textMuted, marginTop: 11 },
});
