import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { MissionButton, MissionShell, missionStyles as s } from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { Trail, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import { useMission } from "@/lib/trail/mission-context";
import { missionForm, requestKey, validateMission, type MissionForm } from "@/lib/trail/mission-form";

export default function MissionSetupScreen() {
  const { mission, loading, error, reload } = useMission();
  return <MissionShell title={mission ? "Make the facts yours." : "Commit to your race."} subtitle="Enter the event you chose. Unknown is better than a guess.">
    {loading ? <Text style={s.body}>Loading saved state…</Text> : error ? <TrailPanel style={s.panel}><Text style={s.error}>{error}</Text><MissionButton label="Retry" onPress={() => void reload()} /></TrailPanel> : <MissionFormView key={`${mission?.id ?? "new"}:${mission?.version ?? 0}`} mission={mission} />}
  </MissionShell>;
}
function MissionFormView({ mission }: { mission: RaceMission | null }) {
  const router = useRouter();
  const { reload } = useMission();
  const [form, setForm] = useState(() => missionForm(mission));
  const [errors, setErrors] = useState<Partial<Record<keyof MissionForm, string>>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const retry = useRef({ payload: "", key: requestKey() });
  const set = (key: keyof MissionForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (inFlight.current) return;
    const result = validateMission(form); setErrors(result.errors); setError(null);
    if (!result.data) return;
    if (mission && reason.trim().length < 3) { setError("Explain the correction in at least 3 characters."); return; }
    const serialized = JSON.stringify(result.data);
    if (retry.current.payload !== serialized) retry.current = { payload: serialized, key: requestKey() };
    inFlight.current = true; setBusy(true);
    try {
      if (mission) await raceMissions.update(mission, result.data, reason.trim());
      else await raceMissions.create(result.data, retry.current.key);
      await reload(); router.replace("/(app)/home");
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.status === 412 ? " Your entries are kept below. Return to Mission and refresh before editing again." : ""}` : "The save was not confirmed. Your entries are kept here; retry sends the same request key. After leaving, reload Mission to check whether it saved.");
    } finally { inFlight.current = false; setBusy(false); }
  };
  return <>
    <TrailPanel style={s.panel}><Text style={s.label}>EVENT / ENTERED BY YOU</Text>
      <Field label="Race name" value={form.name} onChange={(v) => set("name", v)} error={errors.name} maxLength={160} />
      <Field label="Race date (YYYY-MM-DD)" value={form.date} onChange={(v) => set("date", v)} error={errors.date} maxLength={10} />
      <Field label="Event timezone (IANA) — confirm for the race location" value={form.timezone} onChange={(v) => set("timezone", v)} error={errors.timezone} maxLength={64} />
      <Field label="Location" value={form.location} onChange={(v) => set("location", v)} error={errors.location} maxLength={160} />
      <Field label="Distance (km)" value={form.distance} onChange={(v) => set("distance", v)} error={errors.distance} numeric />
      <Field label="Elevation gain (m) — optional" value={form.elevation} onChange={(v) => set("elevation", v)} error={errors.elevation} numeric />
      <Field label="Cutoff (minutes) — optional" value={form.cutoff} onChange={(v) => set("cutoff", v)} error={errors.cutoff} numeric />
      <Text style={s.body}>Blank elevation and cutoff are saved as unknown. These facts are not verified by the organizer.</Text>
    </TrailPanel>
    <TrailPanel style={s.panel}><Text style={s.label}>GOAL / YOUR PRIORITY</Text><View style={s.row}>
      {([['finish_confidently', 'Finish confidently'], ['finish', 'Finish'], ['target_time', 'Target time']] as const).map(([value, label]) => <MissionButton key={value} label={`${form.goal === value ? "✓ " : ""}${label}`} secondary={form.goal !== value} onPress={() => set("goal", value)} />)}
    </View>{form.goal === "target_time" && <Field label="Target finish time (minutes)" value={form.target} onChange={(v) => set("target", v)} error={errors.target} numeric />}
    {mission && <Field label="Why are you changing these details?" value={reason} onChange={setReason} maxLength={500} />}</TrailPanel>
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Text style={s.body}>Saving stores this mission privately in your account. It does not enable AI analysis, new integrations or background tracking. Unsaved entries are kept only while this form is open.</Text>
    <MissionButton label={busy ? "Saving to your account…" : mission ? "Save corrections" : "Create my Race Mission"} disabled={busy} onPress={() => void save()} />
    <MissionButton secondary label="Back to Mission" disabled={busy} onPress={() => router.replace("/(app)/home")} />
  </>;
}
function Field({ label, value, onChange, error, numeric = false, maxLength = 30 }: { label: string; value: string; onChange: (value: string) => void; error?: string; numeric?: boolean; maxLength?: number }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={numeric ? "decimal-pad" : "default"} autoCapitalize="none" maxLength={maxLength} style={[styles.input, error && styles.invalid]} />{error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({ field: { gap: 8 }, label: { ...ui(14, 600), color: Trail.text }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: Trail.lineStrong, borderRadius: 9, backgroundColor: Trail.bgRaised, ...ui(16, 500), color: Trail.text }, invalid: { borderColor: Trail.orange } });
