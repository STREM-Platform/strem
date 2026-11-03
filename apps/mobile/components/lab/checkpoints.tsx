/** The race's checkpoints and aid stations: the athlete enters them, the strategy plans around them (ai#46). */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Choices, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, IconButton, Row } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceMissions, type Checkpoint, type CheckpointService, type RaceMission } from "@/lib/api/race-missions";
import { finishTimeText, hm, km, parseFinishTime } from "@/lib/race/format";

const SERVICES: { value: CheckpointService; label: string }[] = [
  { value: "water", label: "Water" },
  { value: "food", label: "Food" },
  { value: "crew", label: "Crew" },
  { value: "drop_bag", label: "Drop bag" },
  { value: "medical", label: "Medical" },
  { value: "toilet", label: "Toilet" },
];
const SERVICE_LABEL = Object.fromEntries(SERVICES.map((s) => [s.value, s.label])) as Record<CheckpointService, string>;

type Draft = { index: number | null; name: string; km: string; services: CheckpointService[]; cutoff: string };

export function CheckpointsCard({ mission, onSaved }: { mission: RaceMission; onSaved: (mission: RaceMission) => void }) {
  const checkpoints = mission.event.checkpoints ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: Checkpoint[]) => {
    setBusy(true);
    setError(null);
    try {
      const sorted = [...next].sort((a, b) => a.km - b.km);
      onSaved(await raceMissions.update(mission, { event: { ...mission.event, checkpoints: sorted } }, "Checkpoints updated"));
      setDraft(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkpoints were not saved. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (!draft) return;
    const distance = Number(draft.km.replace(",", "."));
    if (!draft.name.trim() || !Number.isFinite(distance) || distance <= 0 || distance > mission.event.distance_km) {
      setError(`Give the checkpoint a name and a distance between 0 and ${km(mission.event.distance_km)} km.`);
      return;
    }
    const cutoff = draft.cutoff.trim() ? parseFinishTime(draft.cutoff) : null;
    if (draft.cutoff.trim() && !cutoff) {
      setError("Write the cutoff as time from the start, e.g. 4:30.");
      return;
    }
    const item: Checkpoint = { name: draft.name.trim(), km: Math.round(distance * 10) / 10, services: draft.services, cutoff_minutes: cutoff };
    const rest = checkpoints.filter((_, i) => i !== draft.index);
    void save([...rest, item]);
  };

  return (
    <Card pad={16} style={{ gap: 10 }}>
      <Row gap={8}>
        <Icon name="flag" size={18} color={LAYER_COLOR.strategy} />
        <Text style={[ui(15, 800), { color: C.text, flex: 1 }]}>Checkpoints & aid stations</Text>
        <Button label="Add" icon="plus" size="sm" kind="secondary" onPress={() => setDraft({ index: null, name: "", km: "", services: ["water"], cutoff: "" })} />
      </Row>
      {checkpoints.length === 0 ? (
        <Body muted size={13}>
          Add the race&apos;s checkpoints from the organiser&apos;s page — the strategy then plans each leg: arrival, cutoff margin, what to carry and what to do at each station.
        </Body>
      ) : (
        checkpoints.map((c, i) => (
          <Pressable
            key={`${c.name}-${c.km}`}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${c.name}, km ${c.km}`}
            onPress={() => setDraft({ index: i, name: c.name, km: String(c.km), services: c.services ?? [], cutoff: finishTimeText(c.cutoff_minutes) })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <Text style={[ui(13, 800), { color: C.textMuted, width: 56 }]}>km {km(c.km)}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[ui(14, 700), { color: C.text }]}>{c.name}</Text>
              <Text style={[ui(12, 500), { color: C.textMuted }]} numberOfLines={1}>
                {(c.services ?? []).map((s) => SERVICE_LABEL[s]).join(" · ") || "No services"}
                {c.cutoff_minutes ? ` · cutoff ${hm(c.cutoff_minutes)}` : ""}
              </Text>
            </View>
            <Icon name="edit" size={16} color={C.textDim} />
          </Pressable>
        ))
      )}
      {error && !draft ? <ErrorBanner message={error} /> : null}
      <Sheet
        visible={draft != null}
        onClose={() => {
          setDraft(null);
          setError(null);
        }}
        title={draft?.index == null ? "Add a checkpoint" : "Edit checkpoint"}
        footer={
          <Row gap={10}>
            {draft?.index != null ? (
              <IconButton icon="trash" label="Remove checkpoint" tone="surface" onPress={() => void save(checkpoints.filter((_, i) => i !== draft.index))} />
            ) : null}
            <Button label="Save" icon="check" loading={busy} onPress={submit} style={{ flex: 1 }} />
          </Row>
        }
      >
        {draft ? (
          <View style={{ gap: 14 }}>
            <Input label="Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} placeholder="e.g. Refuge du Lac" />
            <Row gap={12} wrap align="flex-start">
              <Input label="Distance from start" value={draft.km} onChangeText={(v) => setDraft({ ...draft, km: v })} suffix="km" keyboardType="decimal-pad" placeholder="e.g. 18.5" />
              <Input label="Cutoff from start" value={draft.cutoff} onChangeText={(v) => setDraft({ ...draft, cutoff: v })} placeholder="h:mm, optional" />
            </Row>
            <View style={{ gap: 8 }}>
              <Text style={[ui(13, 700), { color: C.textMuted }]}>What&apos;s there</Text>
              <Choices
                multiple
                options={SERVICES}
                value={draft.services}
                onChange={(v: CheckpointService) => setDraft({ ...draft, services: draft.services.includes(v) ? draft.services.filter((s) => s !== v) : [...draft.services, v] })}
              />
            </View>
            {error ? <ErrorBanner message={error} /> : null}
          </View>
        ) : null}
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.surface2 },
});
