import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File as LocalFile } from "expo-file-system";
import { Trail } from "@/constants/theme";
import { courses, type MissionCourse } from "@/lib/api/courses";
import { ApiError } from "@/lib/api/client";
import { CourseExplorer } from "./course-explorer";
import { MissionButton, missionStyles as s } from "./mission-shell";
import { TrailPanel } from "./trail-ui";

export function CourseWorkspace({ missionId }: { missionId: string }) {
  const [saved, setSaved] = useState<MissionCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const alive = useRef(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await courses.get(missionId); if (alive.current) setSaved(data); }
    catch { if (alive.current) setError("Your course could not be loaded. Retry before uploading or replacing a file."); }
    finally { if (alive.current) setLoading(false); }
  }, [missionId]);
  useEffect(() => { alive.current = true; const timer = setTimeout(() => void load(), 0); return () => { alive.current = false; clearTimeout(timer); }; }, [load]);
  const upload = async () => {
    if (busy || loading) return;
    setError(null);
    setBusy(true);
    let picked: DocumentPicker.DocumentPickerResult;
    try { picked = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: false, copyToCacheDirectory: true }); }
    catch (err) { if (alive.current) setBusy(false); throw err; }
    if (picked.canceled) { if (alive.current) setBusy(false); return; }
    const asset = picked.assets[0];
    const local = Platform.OS === "web" ? null : new LocalFile(asset.uri);
    try {
      const size = asset.size ?? local?.size ?? asset.file?.size;
      if (!/\.(gpx|zip)$/i.test(asset.name) || !size || size > 4 * 1024 * 1024) throw new Error("Choose a GPX or ZIP file up to 4 MiB.");
      let content: string;
      if (Platform.OS === "web" && asset.file) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("File could not be read.")); reader.readAsDataURL(asset.file!);
        });
      } else if (local) content = await local.base64();
      else throw new Error("File could not be read.");
      if (!alive.current) return;
      const data = await courses.upload(missionId, saved?.version ?? 0, content, source.trim() || null);
      if (alive.current) { setSaved(data); setExpanded(false); }
    } catch (err) {
      if (alive.current) setError(err instanceof ApiError && err.status === 412 ? "The saved course changed. Reload it before choosing a replacement." : err instanceof ApiError ? err.message : err instanceof Error && err.name !== "AbortError" ? err.message : "Upload was not confirmed. Reload the saved course before retrying.");
    } finally {
      // The selected GPX is private: discard the picker cache copy after reading/uploading.
      if (local) { try { local.delete(); } catch { /* OS cache cleanup can retry later. */ } }
      if (Platform.OS === "web" && asset.uri.startsWith("blob:")) URL.revokeObjectURL(asset.uri);
      if (alive.current) setBusy(false);
    }
  };
  return <>
    <TrailPanel style={s.panel}><Text style={s.label}>PRIVATE COURSE / GPX</Text><Text style={s.heading}>{saved ? `${(saved.course.distance_m / 1000).toFixed(2)} km to explore` : "Bring your race route into focus."}</Text>
      {loading && <ActivityIndicator color={Trail.lime} />}
      {saved && <><Text style={s.body}>Saved course v{saved.version} · {new Date(saved.updated_at).toLocaleString()}</Text><Text style={s.body}>GPX ascent {saved.course.ascent_m === null ? "unknown" : `${Math.round(saved.course.ascent_m)} m`} · descent {saved.course.descent_m === null ? "unknown" : `${Math.round(saved.course.descent_m)} m`} · {saved.analysis.sections.length} sections</Text><MissionButton secondary label={expanded ? "Hide file controls" : "Course source & file controls"} onPress={() => setExpanded(value => !value)} /></>}
      {(!saved || expanded) && <>
      <Text style={s.body}>Upload a GPX or single-course ZIP you are allowed to use. STREM calculates the route and elevation sections. Organizer facts stay separate.</Text>
      <TextInput accessibilityLabel="Course source URL" placeholder="Organizer source URL (optional)" placeholderTextColor={Trail.textDim} value={source} onChangeText={setSource} autoCapitalize="none" style={{ color: Trail.text, minHeight: 48, padding: 12, borderWidth: 1, borderColor: Trail.lineStrong, borderRadius: 8 }} />
      <View style={s.row}><MissionButton label={busy ? "Processing course…" : saved ? "Replace GPX / ZIP" : "Upload GPX / ZIP"} disabled={busy || loading || !!error} onPress={() => void upload().catch(() => setError("The file picker could not open. Retry."))} /><MissionButton secondary label="Reload saved course" disabled={busy || loading} onPress={() => void load()} /></View>
      {saved && <><Text style={s.body}>Source reference: {saved.source_url ?? "not provided"}. Athlete-supplied; official status has not been verified.</Text><Text style={s.body}>Replacing discards the previous course file. Your export includes the original GPX and course calculations. Mission data deletion removes both.</Text><MissionButton secondary label={confirmRemoval ? "Confirm remove course file" : "Remove course file"} disabled={busy || loading} onPress={() => { if (!confirmRemoval) { setConfirmRemoval(true); return; } setBusy(true); void courses.remove(saved).then(() => { if (alive.current) { setSaved(null); setConfirmRemoval(false); } }).catch(() => { if (alive.current) setError("Removal was not confirmed. Reload before retrying."); }).finally(() => { if (alive.current) setBusy(false); }); }} /></>}
      </>}
      {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {error && saved && !expanded && <MissionButton secondary label="Reload saved course" disabled={busy || loading} onPress={() => void load()} />}
    </TrailPanel>
    {saved && <CourseExplorer key={`${saved.mission_id}:${saved.version}`} saved={saved} />}
  </>;
}
