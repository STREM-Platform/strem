import { useId, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Line, Path, Rect } from "react-native-svg";

import { Trail, disp, mono, ui } from "@/constants/theme";
import { courseProfile, sectionWindow } from "@/lib/trail/course-profile";
import { TRAIL_MISSION_PREVIEW } from "@/lib/trail/mission-preview";

/** Fixture-only section explorer. Not an official course map or live GPX reader. */
export function CourseExplorer() {
  const [selected, setSelected] = useState(0);
  const clipId = `course-${useId().replace(/:/g, "")}`;
  const { course, race } = TRAIL_MISSION_PREVIEW;
  const section = course.sections[selected];
  const profile = courseProfile(course.profile, race.distanceKm);
  const window = sectionWindow(section.startKm, section.endKm, race.distanceKm);
  if (!profile || !window) return <Text style={styles.body}>Course profile unavailable.</Text>;

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>TERRAIN / 03 SECTIONS</Text>
          <Text style={styles.title}>Know the demands.</Text>
        </View>
        <Text style={styles.distance}>32 KM</Text>
      </View>
      <Text style={styles.caption}>Illustrative profile · not official GPX · not for navigation</Text>
      <View accessible accessibilityRole="image" accessibilityLabel={`Illustrative course profile. Selected section ${selected + 1}, kilometres ${section.startKm} to ${section.endKm}: ${section.name}. ${section.note}`}>
        <Svg width="100%" height={180} viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden>
          <Defs><ClipPath id={clipId}><Rect x={window.x} y={0} width={window.width} height={180} /></ClipPath></Defs>
          {[45, 90, 135, 179].map((y) => <Line key={y} x1={0} x2={600} y1={y} y2={y} stroke={Trail.lineStrong} strokeDasharray="3 6" />)}
          <Path d={profile.area} fill={Trail.panelSoft} />
          <Path d={profile.line} fill="none" stroke={Trail.textDim} strokeWidth={2} />
          <Rect x={window.x} width={window.width} height={180} fill={Trail.limeSoft} />
          <Path d={profile.area} fill="rgba(183,237,98,0.13)" clipPath={`url(#${clipId})`} />
          <Path d={profile.line} fill="none" stroke={Trail.lime} strokeWidth={3} clipPath={`url(#${clipId})`} />
          <Line x1={window.x} x2={window.x} y1={0} y2={180} stroke={Trail.lime} strokeOpacity={0.5} />
        </Svg>
      </View>
      <View style={styles.axis}><Text style={styles.caption}>0 km</Text><Text style={styles.caption}>16 km</Text><Text style={styles.caption}>32 km</Text></View>
      <View style={styles.sections}>
        {course.sections.map((item, index) => (
          <Pressable key={item.km} accessibilityRole="button" accessibilityLabel={`Section ${index + 1}: ${item.startKm} to ${item.endKm} kilometres, ${item.name}`} accessibilityState={{ selected: index === selected }} onPress={() => setSelected(index)} style={({ pressed }) => [styles.section, index === selected && styles.selected, pressed && styles.pressed]}>
            <Text style={[styles.sectionLabel, index === selected && styles.activeText]}>0{index + 1} / {item.km} km</Text>
            <Text style={styles.sectionName}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.detail} accessibilityLiveRegion="polite">
        <Text style={styles.detailLabel}>SECTION {selected + 1} / SAMPLE STRATEGY</Text>
        <Text style={styles.body}>{section.note}</Text>
        <Text style={styles.caption}>Unknown: verified terrain, aid-station locations and section cutoffs.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14, padding: 22, borderWidth: 1, borderColor: Trail.lineStrong, borderRadius: 18, backgroundColor: Trail.panel },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  eyebrow: { ...mono(10, 700), color: Trail.textMuted, letterSpacing: 1 },
  title: { ...disp(28, 700), color: Trail.text, marginTop: 5 },
  distance: { ...mono(12, 700), color: Trail.lime },
  caption: { ...ui(12, 500), color: Trail.textMuted, lineHeight: 18 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: -10 },
  sections: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { flex: 1, minWidth: 90, minHeight: 68, padding: 12, gap: 6, borderWidth: 1, borderColor: Trail.lineStrong, borderRadius: 10 },
  selected: { borderColor: Trail.lime, backgroundColor: Trail.limeSoft },
  pressed: { opacity: 0.75 },
  sectionLabel: { ...mono(10, 600), color: Trail.textMuted },
  activeText: { color: Trail.lime },
  sectionName: { ...ui(14, 600), color: Trail.text },
  detail: { borderLeftWidth: 2, borderLeftColor: Trail.lime, paddingLeft: 14, gap: 8 },
  detailLabel: { ...mono(10, 700), color: Trail.lime },
  body: { ...ui(15, 500), color: Trail.text, lineHeight: 23 },
});
