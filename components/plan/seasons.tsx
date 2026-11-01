/** Seasons on the Plan tab: a strip of the athlete's year and a sheet to shape each season (training#18). */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Choices, DatePicker, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Button, ErrorBanner, Notice, Row } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { seasonsApi, type SeasonFocus, type TimelineSeason } from "@/lib/api/race";
import { addDays, dayLabel, todayIn } from "@/lib/race/format";

export const FOCUS: { value: SeasonFocus; label: string; hint: string }[] = [
  { value: "base", label: "Base", hint: "Aerobic volume + strength" },
  { value: "build", label: "Build", hint: "Adds hills and harder work" },
  { value: "race_season", label: "Race season", hint: "Hold fitness between races" },
  { value: "off_season", label: "Off-season", hint: "Lighter, more variety" },
  { value: "recovery", label: "Recovery", hint: "Easy, restore" },
];
const FOCUS_LABEL = Object.fromEntries(FOCUS.map((f) => [f.value, f.label])) as Record<SeasonFocus, string>;

export function SeasonStrip({ seasons, onChanged }: { seasons: TimelineSeason[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<TimelineSeason | "new" | null>(null);
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <Text style={[ui(13, 700), { color: C.textMuted, flex: 1 }]}>Seasons</Text>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {seasons.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`Season ${s.name}`}
            onPress={() => setEditing(s)}
            style={({ pressed }) => [styles.season, s.current && styles.current, pressed && { opacity: 0.85 }]}
          >
            <Text style={[ui(14, 800), { color: C.text }]} numberOfLines={1}>
              {s.name}
            </Text>
            <Text style={[ui(11, 600), { color: C.textMuted }]}>
              {dayLabel(s.start_date, false)} – {dayLabel(s.end_date, false)}
            </Text>
            <Text style={[ui(11, 700), { color: s.has_plan ? LAYER_COLOR.training : C.textDim }]}>
              {FOCUS_LABEL[s.focus as SeasonFocus] ?? s.focus} · {s.has_plan ? "plan ready" : "no plan yet"}
            </Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="New season" onPress={() => setEditing("new")} style={({ pressed }) => [styles.season, styles.add, pressed && { opacity: 0.85 }]}>
          <Icon name="plus" size={18} color={C.text} />
          <Text style={[ui(13, 700), { color: C.text }]}>New season</Text>
        </Pressable>
      </ScrollView>
      <SeasonSheet
        key={editing === "new" ? "new" : editing?.id ?? "none"}
        season={editing === "new" ? null : editing}
        visible={editing != null}
        onClose={() => setEditing(null)}
        onChanged={() => {
          setEditing(null);
          onChanged();
        }}
        onRefresh={onChanged}
      />
    </View>
  );
}

function SeasonSheet({ season, visible, onClose, onChanged, onRefresh }: { season: TimelineSeason | null; visible: boolean; onClose: () => void; onChanged: () => void; onRefresh: () => void }) {
  const router = useRouter();
  const today = todayIn();
  const [name, setName] = useState(season?.name ?? "");
  const [start, setStart] = useState(season?.start_date ?? today);
  const [end, setEnd] = useState(season?.end_date ?? addDays(today, 7 * 16));
  const [focus, setFocus] = useState<SeasonFocus>((season?.focus as SeasonFocus) ?? "base");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async (label: string, action: () => Promise<unknown>, close = true) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      if (close) onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't save. Retry.");
    } finally {
      setBusy(null);
    }
  };
  const body = { name: name.trim(), start_date: start, end_date: end, focus };
  const save = () => {
    if (!body.name) return setError("Give the season a name, e.g. Winter base.");
    if (end < start) return setError("The season has to end after it starts.");
    void run("save", () => (season ? seasonsApi.update(season.id, body) : seasonsApi.create(body)));
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={season ? season.name : "New season"}
      footer={
        <Row gap={10}>
          {season ? <Button label="Delete" kind="danger" disabled={busy != null} onPress={() => void run("delete", () => seasonsApi.remove(season.id))} /> : null}
          <Button label="Save season" icon="check" loading={busy === "save"} onPress={save} style={{ flex: 1 }} />
        </Row>
      }
    >
      {season ? (
        <View style={{ gap: 8 }}>
          <Row gap={8} wrap>
            <Button
              label={season.has_plan ? "Rebuild season plan" : "Generate season plan"}
              icon="sparkles"
              size="sm"
              loading={busy === "build"}
              onPress={() =>
                void run(
                  "build",
                  async () => {
                    const result = await seasonsApi.build(season.id);
                    setNote(result.origin === "ai" ? "Your race team built the season plan." : `Built by the race engine${result.ai_reason ? ` — ${result.ai_reason}` : ""}.`);
                    onRefresh();
                  },
                  false,
                )
              }
            />
            <Button label="Import a plan" icon="upload" size="sm" kind="secondary" onPress={() => { onClose(); router.push(`/(app)/plan-import?season=${season.id}`); }} />
          </Row>
          {note ? <Notice icon="checkCircle" tone="accent" title={note} /> : null}
        </View>
      ) : null}
      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Winter base" />
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Focus</Text>
        <Choices options={FOCUS} value={focus} onChange={setFocus} />
      </View>
      <DatePicker label="Starts" value={start} onChange={setStart} />
      <DatePicker label="Ends" value={end} min={start} onChange={setEnd} />
      {error ? <ErrorBanner message={error} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  season: { minWidth: 150, maxWidth: 220, gap: 3, padding: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  current: { borderColor: LAYER_COLOR.training },
  add: { alignItems: "center", justifyContent: "center", minWidth: 120, borderStyle: "dashed" },
});
