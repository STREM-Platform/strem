/** "What your race team remembers" (ai#59): the athlete sees, corrects and deletes every memory. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/ui/fields";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button, Card, ErrorBanner, Row } from "@/components/ui/kit";
import { C, R, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { memoryApi, type AthleteMemory, type MemoryKind } from "@/lib/api/race";
import { dayLabel } from "@/lib/race/format";

const KIND: Record<MemoryKind, { label: string; icon: IconName }> = {
  injury: { label: "Injury", icon: "heart" },
  preference: { label: "Preference", icon: "star" },
  constraint: { label: "Life", icon: "clock" },
  goal: { label: "Goal", icon: "flag" },
  lesson: { label: "Lesson", icon: "trophy" },
  context: { label: "Context", icon: "pin" },
  other: { label: "Note", icon: "info" },
};

export function MemoryList({ items, onChange }: { items: AthleteMemory[]; onChange: (items: AthleteMemory[]) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (item: AthleteMemory) => {
    setBusy(item.id);
    setError(null);
    try {
      const fixed = await memoryApi.correct(item.id, draft);
      onChange(items.map((m) => (m.id === item.id ? fixed : m)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't save. Retry.");
    } finally {
      setBusy(null);
    }
  };
  const forget = async (item: AthleteMemory) => {
    setBusy(item.id);
    setError(null);
    try {
      await memoryApi.forget(item.id);
      onChange(items.filter((m) => m.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That wasn't deleted. Retry.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card pad={16} style={{ gap: 10 }}>
      <Row gap={8}>
        <Icon name="sparkles" size={16} color={C.accent} />
        <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>What your race team remembers</Text>
        <Text style={[ui(12, 600), { color: C.textMuted }]}>{items.length}</Text>
      </Row>
      <Text style={[ui(12.5, 500), { color: C.textMuted, lineHeight: 18 }]}>
        Things you told the race team that matter for weeks — injuries, preferences, your schedule. Every answer uses them. Correct or delete anything.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      {!items.length ? <Text style={[ui(13, 500), { color: C.textDim }]}>Nothing yet. Tell your race team about injuries, your schedule or what works for you.</Text> : null}
      {items.map((m) => {
        const kind = KIND[m.kind] ?? KIND.other;
        return (
          <View key={m.id} style={styles.item}>
            {editing === m.id ? (
              <View style={{ gap: 8 }}>
                <Input label="Your words" value={draft} onChangeText={setDraft} multiline maxLength={400} />
                <Row gap={8}>
                  <Button label="Save" size="sm" icon="check" loading={busy === m.id} disabled={draft.trim().length < 3} onPress={() => void save(m)} />
                  <Button label="Cancel" size="sm" kind="ghost" onPress={() => setEditing(null)} />
                </Row>
              </View>
            ) : (
              <Row gap={10} align="flex-start">
                <Icon name={kind.icon} size={15} color={C.textMuted} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ui(14, 600), { color: C.text, lineHeight: 20 }]}>{m.text}</Text>
                  <Text style={[ui(11.5, 500), { color: C.textDim }]}>
                    {kind.label} · {m.source === "athlete" ? "your words" : "from chat"} · {dayLabel(m.source_date, false)}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit: ${m.text}`} hitSlop={8} onPress={() => { setDraft(m.text); setEditing(m.id); }}>
                  <Icon name="edit" size={16} color={C.textMuted} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Forget: ${m.text}`} hitSlop={8} disabled={busy === m.id} onPress={() => void forget(m)}>
                  <Icon name="trash" size={16} color={C.textMuted} />
                </Pressable>
              </Row>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, borderRadius: R.sm },
});
