import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Trail, disp } from "@/constants/theme";
import type { CoursePoint, MissionCourse } from "@/lib/api/courses";
import { MissionButton, missionStyles as s } from "./mission-shell";
import { TrailPanel } from "./trail-ui";

const km = (m: number) => (m / 1000).toFixed(2);
export function CourseExplorer({ saved }: { saved: MissionCourse }) {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const section = saved.analysis.sections[selected];
  const geometry = useMemo(() => {
    const all = saved.course.segments.flatMap(segment => segment.points);
    const firstLon = all[0].longitude;
    const lon = (point: CoursePoint) => ((point.longitude - firstLon + 540) % 360) - 180;
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const p of all) { minLon = Math.min(minLon, lon(p)); maxLon = Math.max(maxLon, lon(p)); minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude); }
    const cos = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
    const dx = Math.max((maxLon - minLon) * cos, 0.000001), dy = Math.max(maxLat - minLat, 0.000001);
    const scale = Math.min(520 / dx, 260 / dy);
    const project = (p: CoursePoint) => ({ x: 300 + (lon(p) - (minLon + maxLon) / 2) * cos * scale, y: 150 - (p.latitude - (minLat + maxLat) / 2) * scale });
    const path = (points: CoursePoint[]) => points.map((p, i) => { const v = project(p); return `${i ? "L" : "M"}${v.x.toFixed(2)},${v.y.toFixed(2)}`; }).join(" ");
    const paths = saved.course.segments.map(segment => {
      const stride = Math.max(1, Math.ceil(segment.points.length / 2000));
      return path(segment.points.filter((_, i) => i % stride === 0 || i === segment.points.length - 1));
    });
    let profile = "", pen = false;
    const low = saved.course.lowest_elevation_m ?? Math.min(...all.filter(p => p.elevation_m !== null).map(p => p.elevation_m!));
    const high = saved.course.highest_elevation_m ?? Math.max(...all.filter(p => p.elevation_m !== null).map(p => p.elevation_m!));
    const range = Math.max(high - low, 1);
    for (const segment of saved.course.segments) {
      pen = false;
      segment.points.forEach((p, i) => {
        if (p.elevation_m === null || (i > 0 && p.distance_m - segment.points[i - 1].distance_m > 500)) { pen = false; return; }
        const stride = Math.max(1, Math.ceil(segment.points.length / 2000));
        if (!pen || i % stride === 0 || i === segment.points.length - 1) {
          profile += `${pen ? "L" : "M"}${(20 + 560 * p.distance_m / saved.course.distance_m).toFixed(2)},${(150 - 130 * (p.elevation_m - low) / range).toFixed(2)} `;
          pen = true;
        }
      });
    }
    const pointAt = (points: CoursePoint[], distance: number) => {
      const upper = points.findIndex(p => p.distance_m >= distance);
      if (upper <= 0) return points[upper < 0 ? points.length - 1 : 0];
      const a = points[upper - 1], b = points[upper];
      const ratio = (distance - a.distance_m) / (b.distance_m - a.distance_m || 1);
      const deltaLon = ((b.longitude - a.longitude + 540) % 360) - 180;
      return { ...a, latitude: a.latitude + (b.latitude - a.latitude) * ratio, longitude: ((a.longitude + deltaLon * ratio + 540) % 360) - 180, distance_m: distance };
    };
    return { paths, path, pointAt, profile, start: project(all[0]), finish: project(all[all.length - 1]) };
  }, [saved]);
  const selectedPoints = section ? saved.course.segments[section.segment_index].points : [];
  const highlight = section ? geometry.path([geometry.pointAt(selectedPoints, section.start_distance_m), ...selectedPoints.filter(p => p.distance_m > section.start_distance_m && p.distance_m < section.end_distance_m), geometry.pointAt(selectedPoints, section.end_distance_m)]) : "";
  return <>
    <View style={[styles.visuals, width > 850 && { flexDirection: "row" }]}>
      <TrailPanel style={styles.visual}><Text style={s.label}>YOUR COURSE / ROUTE GEOMETRY</Text>
        <Svg viewBox="0 0 600 300" style={{ width: "100%", height: 300 }} accessibilityLabel="Uploaded course shape, start and finish; selected section highlighted">
          {[100, 200, 300, 400, 500].map(x => <Line key={x} x1={x} x2={x} y1={0} y2={300} stroke={Trail.line} />)}
          {geometry.paths.map((d, i) => <Path key={i} d={d} stroke={Trail.sky} strokeWidth={2.5} fill="none" />)}
          <Path d={highlight} stroke={Trail.lime} strokeWidth={7} fill="none" />
          <Circle cx={geometry.start.x} cy={geometry.start.y} r={6} fill={Trail.lime} />
          <Circle cx={geometry.finish.x} cy={geometry.finish.y} r={10} stroke={Trail.orange} strokeWidth={2} fill="none" />
        </Svg><Text style={s.body}>Start ● · Finish ◯ · North up. Course geometry without a basemap; terrain and navigation are not shown.</Text>
      </TrailPanel>
      <TrailPanel style={styles.visual}><Text style={s.label}>ELEVATION / RECORDED GPX</Text>
        <Svg viewBox="0 0 600 180" style={{ width: "100%", height: 210 }} accessibilityLabel="Elevation profile with selected distance section">
          <Line x1={20} y1={150} x2={580} y2={150} stroke={Trail.lineStrong} />
          {section && <Rect x={20 + 560 * section.start_distance_m / saved.course.distance_m} y={10} width={Math.max(3, 560 * (section.end_distance_m - section.start_distance_m) / saved.course.distance_m)} height={145} fill={Trail.limeSoft} />}
          <Path d={geometry.profile} fill="none" stroke={Trail.lime} strokeWidth={2} />
        </Svg><Text style={s.body}>0 — {km(saved.course.distance_m)} km · {saved.course.lowest_elevation_m === null ? "Elevation incomplete" : `${Math.round(saved.course.lowest_elevation_m)}–${Math.round(saved.course.highest_elevation_m!)} m`}</Text>
        <Text style={s.body}>Gaps stay unknown. Elevation is unsmoothed and can differ from organizer totals.</Text>
      </TrailPanel>
    </View>
    {section && <TrailPanel style={s.panel}><Text style={s.label}>SECTION {selected + 1} / {saved.analysis.sections.length}</Text><Text style={s.heading}>{km(section.start_distance_m)}–{km(section.end_distance_m)} km</Text>
      <Text style={s.body}>Net gradient: {section.average_grade_percent === null ? "unknown" : `${section.average_grade_percent.toFixed(1)}%`} · Elevation change: {section.elevation_change_m === null ? "unknown" : `${Math.round(section.elevation_change_m)} m`}</Text>
      <View style={s.row}><MissionButton secondary label="Previous section" disabled={selected === 0} onPress={() => setSelected(i => i - 1)} /><MissionButton secondary label="Next section" disabled={selected === saved.analysis.sections.length - 1} onPress={() => setSelected(i => i + 1)} /></View>
    </TrailPanel>}
    <TrailPanel style={s.panel}><Text style={s.label}>COURSE DEMANDS / CALCULATED</Text><Text style={s.heading}>Climbs & descents to inspect</Text><Text style={s.body}>Consecutive sections with ≥3% net gradient, ≥300 m distance and ≥30 m elevation change. Flatter stretches can split a climb; these are not official named sections.</Text>
      {saved.analysis.sustained_runs.length === 0 && <Text style={s.body}>No sustained sections detected with this method.</Text>}
      {saved.analysis.sustained_runs.map((run, i) => <Pressable key={i} accessibilityRole="button" onPress={() => setSelected(run.start_section_index)} style={styles.run}><Text style={styles.runTitle}>{run.direction === "ascent" ? "↗" : "↘"} {km(run.start_distance_m)}–{km(run.end_distance_m)} km</Text><Text style={s.body}>{Math.round(run.net_elevation_change_m)} m · {run.average_grade_percent.toFixed(1)}% average</Text></Pressable>)}
    </TrailPanel>
  </>;
}
const styles = StyleSheet.create({ visuals: { gap: 18 }, visual: { flex: 1, minWidth: 0, gap: 12 }, run: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: Trail.line }, runTitle: { ...disp(23, 700), color: Trail.text } });
