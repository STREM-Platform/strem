/**
 * The course: the athlete's GPX drawn over a topographic basemap, synchronized
 * with the elevation profile and the climbs and descents worth knowing.
 *
 * Basemap: OpenTopoMap tiles (dev tier; CC-BY-SA with visible attribution). The
 * route, profile and sections work without tiles (offline or provider outage).
 */

import * as DocumentPicker from "expo-document-picker";
import { File as LocalFile } from "expo-file-system";
import { useMemo, useState } from "react";
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { ElevationArea } from "@/components/ui/charts";
import { Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, Notice, Overline, Row, StatTile, TextLink, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, disp, mono, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { courses, type CoursePoint, type MissionCourse } from "@/lib/api/courses";
import { km } from "@/lib/race/format";

const TILE = 256;
const TILE_URL = (z: number, x: number, y: number) => `https://${"abc"[(x + y) % 3]}.tile.opentopomap.org/${z}/${x}/${y}.png`;

function project(lat: number, lon: number, z: number) {
  const scale = TILE * 2 ** z;
  const x = ((lon + 180) / 360) * scale;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function TopoMap({ points, highlight, width, height }: { points: CoursePoint[]; highlight: CoursePoint[]; width: number; height: number }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const view = useMemo(() => {
    if (!points.length || !width) return null;
    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
    let z = 15;
    for (; z > 2; z--) {
      const a = project(maxLat, minLon, z);
      const b = project(minLat, maxLon, z);
      if (b.x - a.x <= width * 0.82 && b.y - a.y <= height * 0.82) break;
    }
    const a = project(maxLat, minLon, z);
    const b = project(minLat, maxLon, z);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const left = cx - width / 2;
    const top = cy - height / 2;
    const tiles: { x: number; y: number; px: number; py: number }[] = [];
    const max = 2 ** z;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        if (ty < 0 || ty >= max) continue;
        tiles.push({ x: ((tx % max) + max) % max, y: ty, px: tx * TILE - left, py: ty * TILE - top });
      }
    }
    const stride = Math.max(1, Math.ceil(points.length / 1500));
    const toPath = (pts: CoursePoint[]) =>
      pts
        .filter((_, i) => i % stride === 0 || i === pts.length - 1)
        .map((p, i) => {
          const q = project(p.latitude, p.longitude, z);
          return `${i ? "L" : "M"}${(q.x - left).toFixed(1)},${(q.y - top).toFixed(1)}`;
        })
        .join(" ");
    const pin = (p: CoursePoint) => {
      const q = project(p.latitude, p.longitude, z);
      return { x: q.x - left, y: q.y - top };
    };
    return { z, tiles, route: toPath(points), toPath, start: pin(points[0]), finish: pin(points[points.length - 1]) };
  }, [points, width, height]);
  if (!view) return <View style={{ width, height }} />;
  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#1b211e" }} accessibilityLabel="Course map: your GPX route over a topographic basemap, selected section highlighted">
      {!tilesFailed
        ? view.tiles.map((t) => (
            <Image
              key={`${t.x}-${t.y}-${t.px}`}
              source={{ uri: TILE_URL(view.z, t.x, t.y) }}
              onError={() => setTilesFailed(true)}
              style={{ position: "absolute", left: t.px, top: t.py, width: TILE, height: TILE, opacity: 0.92 }}
            />
          ))
        : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,9,11,0.22)" }]} pointerEvents="none" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={view.route} stroke={C.ink} strokeWidth={7} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
        <Path d={view.route} stroke={C.flame} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {highlight.length > 1 ? <Path d={view.toPath(highlight)} stroke={C.white} strokeWidth={6} fill="none" strokeLinecap="round" /> : null}
        <Circle cx={view.start.x} cy={view.start.y} r={7} fill={C.accent} stroke={C.ink} strokeWidth={2} />
        <Circle cx={view.finish.x} cy={view.finish.y} r={8} fill={C.ink} stroke={C.flame} strokeWidth={3} />
      </Svg>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://opentopomap.org/about")} style={styles.attribution}>
        <Text style={[ui(9, 600), { color: "#1c1c1c" }]}>{tilesFailed ? "Basemap unavailable — route only" : "© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA)"}</Text>
      </Pressable>
    </View>
  );
}

function pointAt(points: CoursePoint[], distance: number): CoursePoint {
  const upper = points.findIndex((p) => p.distance_m >= distance);
  if (upper <= 0) return points[upper < 0 ? points.length - 1 : 0];
  const a = points[upper - 1];
  const b = points[upper];
  const r = (distance - a.distance_m) / (b.distance_m - a.distance_m || 1);
  return { ...a, latitude: a.latitude + (b.latitude - a.latitude) * r, longitude: a.longitude + (b.longitude - a.longitude) * r, distance_m: distance };
}

export function CourseExplorer({ saved }: { saved: MissionCourse }) {
  const [width, setWidth] = useState(0);
  const runs = saved.analysis.sustained_runs;
  const [selected, setSelected] = useState<number | null>(runs.length ? 0 : null);
  const all = useMemo(() => saved.course.segments.flatMap((s) => s.points), [saved]);
  const run = selected != null ? runs[selected] : null;
  const highlight = useMemo(() => {
    if (!run) return [];
    const inside = all.filter((p) => p.distance_m > run.start_distance_m && p.distance_m < run.end_distance_m);
    return [pointAt(all, run.start_distance_m), ...inside, pointAt(all, run.end_distance_m)];
  }, [run, all]);
  const profile = useMemo(() => {
    const stride = Math.max(1, Math.ceil(all.length / 600));
    return all.filter((p, i) => p.elevation_m != null && (i % stride === 0 || i === all.length - 1)).map((p) => ({ d: p.distance_m, e: p.elevation_m as number }));
  }, [all]);
  const climbs = runs.filter((r) => r.direction === "ascent");
  const biggest = climbs.reduce((m, r) => Math.max(m, r.net_elevation_change_m), 0);
  return (
    <View style={{ gap: 14 }}>
      <Row gap={10} wrap>
        <StatTile label="Distance" value={km(saved.course.distance_m / 1000)} unit="km" note="from your GPX" />
        <StatTile label="Ascent" value={saved.course.ascent_m == null ? "–" : String(Math.round(saved.course.ascent_m))} unit="m" note="raw, unsmoothed" />
        <StatTile label="Highest" value={saved.course.highest_elevation_m == null ? "–" : String(Math.round(saved.course.highest_elevation_m))} unit="m" />
        <StatTile label="Climbs" value={String(climbs.length)} note={biggest ? `biggest +${Math.round(biggest)} m` : undefined} />
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.mapWrap}>
        {width ? <TopoMap points={all} highlight={highlight} width={width} height={Math.min(460, Math.max(280, width * 0.7))} /> : null}
      </View>
      <Card pad={16} style={{ gap: 8 }}>
        <Row>
          <Text style={[ui(14, 700), { color: C.text }]}>Elevation profile</Text>
          <View style={{ flex: 1 }} />
          <Text style={[mono(11, 600), { color: C.textMuted }]}>
            {saved.course.lowest_elevation_m == null ? "" : `${Math.round(saved.course.lowest_elevation_m)}–${Math.round(saved.course.highest_elevation_m ?? 0)} m`}
          </Text>
        </Row>
        <ElevationArea points={profile} color={LAYER_COLOR.course} height={130} highlight={run ? [run.start_distance_m, run.end_distance_m] : null} />
        <Row>
          <Text style={[mono(10, 600), { color: C.textDim }]}>0 km</Text>
          <View style={{ flex: 1 }} />
          <Text style={[mono(10, 600), { color: C.textDim }]}>{km(saved.course.distance_m / 1000)} km</Text>
        </Row>
      </Card>
      {runs.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[disp(20, 800), { color: C.text }]}>Climbs & descents to know</Text>
          <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>Sustained stretches (≥ 300 m long, ≥ 30 m change, ≥ 3% grade) calculated from your file — not official named sections.</Text>
          <Card pad={4}>
            {runs.map((r, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === i }}
                onPress={() => setSelected(i)}
                style={({ pressed }) => [styles.run, i > 0 && styles.runDivider, selected === i && { backgroundColor: C.surface2 }, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.runIcon, { backgroundColor: r.direction === "ascent" ? `${C.flame}22` : `${LAYER_COLOR.course}22` }]}>
                  <Text style={[disp(18, 800), { color: r.direction === "ascent" ? C.flame : LAYER_COLOR.course }]}>{r.direction === "ascent" ? "↗" : "↘"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ui(15, 700), { color: C.text }]}>
                    Km {km(r.start_distance_m / 1000)}–{km(r.end_distance_m / 1000)}
                  </Text>
                  <Text style={[ui(12, 500), { color: C.textMuted }]}>
                    {r.direction === "ascent" ? "+" : ""}
                    {Math.round(r.net_elevation_change_m)} m over {km((r.end_distance_m - r.start_distance_m) / 1000)} km · {r.average_grade_percent.toFixed(1)}% average
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : (
        <Notice icon="info" title="No sustained climbs detected" body="Either the course is rolling or the file has little elevation data." />
      )}
    </View>
  );
}

export function CoursePanel({ missionId, saved, onChange }: { missionId: string; saved: MissionCourse | null | undefined; onChange: (course: MissionCourse | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [showFile, setShowFile] = useState(false);
  const upload = async () => {
    setError(null);
    setBusy(true);
    let picked: DocumentPicker.DocumentPickerResult;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: false, copyToCacheDirectory: true });
    } catch {
      setBusy(false);
      setError("The file picker could not open. Retry.");
      return;
    }
    if (picked.canceled) {
      setBusy(false);
      return;
    }
    const asset = picked.assets[0];
    const local = Platform.OS === "web" ? null : new LocalFile(asset.uri);
    try {
      const size = asset.size ?? local?.size ?? asset.file?.size;
      if (!/\.(gpx|zip)$/i.test(asset.name) || !size || size > 4 * 1024 * 1024) throw new Error("Choose a GPX or ZIP file up to 4 MB.");
      let content: string;
      if (Platform.OS === "web" && asset.file) {
        const file = asset.file;
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("File could not be read."));
          reader.readAsDataURL(file);
        });
      } else if (local) content = await local.base64();
      else throw new Error("File could not be read.");
      const data = await courses.upload(missionId, saved?.version ?? 0, content, source.trim() || null);
      onChange(data);
      setShowFile(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 412 ? "The saved course changed. Reload before replacing it." : err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload was not confirmed. Reload before retrying.");
    } finally {
      if (local) {
        try {
          local.delete();
        } catch {
          // The OS cache cleans up later.
        }
      }
      setBusy(false);
    }
  };
  if (saved === undefined) {
    return <Notice icon="info" title="Course storage unavailable" body="This server can't store course files right now. Your mission and plan still work." />;
  }
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Overline>Course</Overline>
        <Title size={32}>{saved ? "Know every climb before race day" : "Bring the course into focus"}</Title>
        {!saved ? (
          <Body muted>Upload the race GPX (or a single-course ZIP) you’re allowed to use. STREM maps it, finds the climbs and descents, and paces your race strategy on the real terrain.</Body>
        ) : null}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {saved ? <CourseExplorer key={`${saved.mission_id}:${saved.version}`} saved={saved} /> : null}
      {saved ? (
        <TextLink label={showFile ? "Hide file options" : "Course file & source"} icon={showFile ? "chevronUp" : "chevronDown"} onPress={() => setShowFile((v) => !v)} color={C.textMuted} />
      ) : null}
      {!saved || showFile ? (
        <Card pad={16} style={{ gap: 12 }}>
          <Input label="Organizer source link (optional)" value={source} onChangeText={setSource} autoCapitalize="none" placeholder="https://…" />
          <Row gap={10} wrap>
            <Button label={busy ? "Processing course…" : saved ? "Replace GPX / ZIP" : "Upload GPX / ZIP"} icon="upload" loading={busy} onPress={() => void upload()} />
            {saved ? (
              <Button
                label="Remove course"
                kind="danger"
                onPress={() =>
                  void courses
                    .remove(saved)
                    .then(() => onChange(null))
                    .catch(() => setError("Removal was not confirmed. Reload before retrying."))
                }
              />
            ) : null}
          </Row>
          <Row gap={8} align="flex-start">
            <Icon name="lock" size={14} color={C.textDim} />
            <Text style={[ui(12, 500), { color: C.textDim, flex: 1, lineHeight: 17 }]}>
              Private to your account. Your export includes the original file; deleting mission data removes it.
              {saved?.source_url ? ` Source: ${saved.source_url}` : ""}
            </Text>
          </Row>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  attribution: { position: "absolute", right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "rgba(255,255,255,0.82)", borderTopLeftRadius: 6 },
  run: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 60, borderRadius: 14 },
  runDivider: { borderTopWidth: 1, borderTopColor: C.line },
  runIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
