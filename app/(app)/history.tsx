import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Choices, Input, DatePicker } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Chip, EmptyState, ErrorBanner, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { historyApi, type RaceResult, type RaceResultInput } from "@/lib/api/race";
import type { Sport } from "@/lib/api/race-missions";
import { finishTimeText, hm, km, longDate, parseFinishTime } from "@/lib/race/format";
import { SPORTS, sportMeta } from "@/lib/race/sports";

export default function HistoryScreen() {
  const router = useRouter();
  const [races, setRaces] = useState<RaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RaceResult | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setRaces(await historyApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Race history could not load.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const importStrava = async () => {
    setImporting(true);
    setImportNote(null);
    try {
      const result = await historyApi.importStrava();
      setImportNote(result.found ? `Found ${result.found} race${result.found === 1 ? "" : "s"} flagged in Strava · ${result.created} added.` : "No Strava activities are marked as races yet. In Strava, set the activity type to “Race” and sync again.");
      await load();
    } catch (err) {
      setImportNote(err instanceof ApiError ? err.message : "Import failed — is Strava connected?");
    } finally {
      setImporting(false);
    }
  };
  const finished = (races ?? []).filter((r) => r.status === "finished");
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>Race history</Overline>
        <Title size={40}>Every start line counts</Title>
        <Body muted>Finishes, DNFs and what you learned. Your race team reads these to plan pacing, fueling and the risks to watch.</Body>
      </View>
      <Row gap={10} wrap>
        <Button label="Add a race" icon="plus" onPress={() => setEditing("new")} />
        <Button label="Import from Strava" icon="download" kind="secondary" loading={importing} onPress={() => void importStrava()} />
      </Row>
      {importNote ? <Notice icon="info" title="Strava import" body={importNote} /> : null}
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {races && !races.length ? <EmptyState icon="trophy" title="No races yet" body="Add your past races — even the ones that went wrong. Those teach the most." /> : null}
      {finished.length ? (
        <Text style={[ui(13, 600), { color: C.textMuted }]}>
          {finished.length} finished · {Math.round(finished.reduce((s, r) => s + (r.distance_km ?? 0), 0))} km raced
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {(races ?? []).map((r) => {
          const meta = sportMeta(r.sport);
          return (
            <Pressable key={r.id} accessibilityRole="button" onPress={() => setEditing(r)} style={({ pressed }) => [styles.race, pressed && { opacity: 0.85 }]}>
              <View style={[styles.icon, { backgroundColor: r.status === "finished" ? `${LAYER_COLOR.strategy}22` : "rgba(236,131,90,0.14)" }]}>
                <Icon name={r.status === "finished" ? "trophy" : "flag"} size={20} color={r.status === "finished" ? LAYER_COLOR.strategy : C.serious} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[ui(16, 700), { color: C.text }]}>{r.name}</Text>
                <Text style={[ui(12, 500), { color: C.textMuted }]}>
                  {longDate(r.race_date)} · {meta.short}
                  {r.distance_km ? ` · ${km(r.distance_km)} km` : ""}
                  {r.elevation_gain_m ? ` · ${r.elevation_gain_m.toLocaleString("en-US")} m+` : ""}
                </Text>
                {r.lessons?.length ? (
                  <Text style={[ui(12, 500), { color: C.text, fontStyle: "italic" }]} numberOfLines={2}>
                    “{r.lessons[0]}”
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[disp(20, 800), { color: r.status === "finished" ? C.text : C.serious }]}>{r.status === "finished" ? hm(r.finish_minutes) : (r.status ?? "dnf").toUpperCase()}</Text>
                <Chip label={r.source === "strava" ? "Strava" : r.source === "mission" ? "Mission" : "You"} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <RaceSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        race={editing === "new" ? null : editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </Page>
  );
}

function RaceSheet({ race, visible, onClose, onSaved }: { race: RaceResult | null; visible: boolean; onClose: () => void; onSaved: () => void }) {
  // Remounted per race (see the key at the call site), so initial state is enough.
  const [form, setForm] = useState<RaceResultInput>(() => (race ? { ...race } : { name: "", race_date: "", sport: "trail_running", status: "finished", lessons: [] }));
  const [time, setTime] = useState(() => finishTimeText(race?.finish_minutes ?? null));
  const [lessons, setLessons] = useState(() => (race?.lessons ?? []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof RaceResultInput>(k: K, v: RaceResultInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (form.name.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(form.race_date)) {
      setError("Add the race name and date.");
      return;
    }
    setBusy(true);
    setError(null);
    const body: RaceResultInput = {
      name: form.name.trim(),
      race_date: form.race_date,
      sport: form.sport,
      location_name: form.location_name || null,
      distance_km: form.distance_km || null,
      elevation_gain_m: form.elevation_gain_m || null,
      status: form.status,
      finish_minutes: parseFinishTime(time),
      placement: form.placement || null,
      rating: form.rating ?? null,
      conditions: form.conditions || null,
      fueling_notes: form.fueling_notes || null,
      gear_notes: form.gear_notes || null,
      notes: form.notes || null,
      lessons: lessons.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10),
    };
    try {
      if (race) await historyApi.update(race.id, body);
      else await historyApi.add(body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't save. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!race) return;
    setBusy(true);
    try {
      await historyApi.remove(race.id);
      onSaved();
    } catch {
      setError("Couldn't delete. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : null);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={race ? "Edit race" : "Add a race"}
      footer={
        <Row gap={10}>
          {race ? <Button label="Delete" kind="danger" onPress={() => void remove()} disabled={busy} /> : null}
          <Button label="Save race" icon="check" loading={busy} onPress={() => void save()} style={{ flex: 1 }} />
        </Row>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}
      <Input label="Race name" value={form.name} onChangeText={(v) => set("name", v)} placeholder="e.g. Vitosha 100" />
      <DatePicker label="Race date" value={form.race_date} onChange={(v) => set("race_date", v)} />
      <Choices options={SPORTS.slice(0, 8).map((s) => ({ value: s.id, label: s.short, icon: s.icon }))} value={form.sport ?? "trail_running"} onChange={(v: Sport) => set("sport", v)} />
      <Row gap={10} wrap align="flex-start">
        <Input label="Distance" value={form.distance_km == null ? "" : String(form.distance_km)} onChangeText={(v) => set("distance_km", num(v))} suffix="km" keyboardType="decimal-pad" />
        <Input label="Elevation" value={form.elevation_gain_m == null ? "" : String(form.elevation_gain_m)} onChangeText={(v) => set("elevation_gain_m", num(v) == null ? null : Math.round(num(v)!))} suffix="m+" keyboardType="number-pad" />
      </Row>
      <Choices
        options={[
          { value: "finished", label: "Finished" },
          { value: "dnf", label: "DNF" },
          { value: "dns", label: "DNS" },
        ]}
        value={form.status ?? "finished"}
        onChange={(v) => set("status", v as RaceResultInput["status"])}
      />
      <Row gap={10} wrap align="flex-start">
        <Input label="Finish time" value={time} onChangeText={setTime} placeholder="h:mm" keyboardType="numbers-and-punctuation" />
        <Input label="Placing" value={form.placement ?? ""} onChangeText={(v) => set("placement", v)} placeholder="e.g. 42nd / 310" />
      </Row>
      <Input label="Conditions on the day" value={form.conditions ?? ""} onChangeText={(v) => set("conditions", v)} placeholder="Hot, muddy, night start…" />
      <Input label="Fueling — what worked, what didn't" value={form.fueling_notes ?? ""} onChangeText={(v) => set("fueling_notes", v)} multiline />
      <Input label="Gear notes" value={form.gear_notes ?? ""} onChangeText={(v) => set("gear_notes", v)} multiline />
      <Input label="Lessons (one per line)" value={lessons} onChangeText={setLessons} multiline placeholder={"Start slower on the first climb\nTake salt every 45 minutes"} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  race: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
