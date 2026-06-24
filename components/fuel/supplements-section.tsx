/**
 * Supplements (issue #62) — a real, persisted Fuel section for what the user
 * takes now (name · dose · timing · purpose). Forge reads it as context to reason
 * about timing and gaps — it informs, it never doses or prescribes (A8).
 */

import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Btn, IconTile, Panel, SectionHead } from "@/components/ui/primitives";
import { T, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.sub}
        style={styles.input}
      />
    </View>
  );
}

export function SupplementsSection() {
  const { data, reload } = useAsync(() => api.listSupplements());
  const items = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timing, setTiming] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createSupplement({
        name: name.trim(),
        dose: dose.trim() || null,
        timing: timing.trim() || null,
        purpose: purpose.trim() || null,
      });
      setName("");
      setDose("");
      setTiming("");
      setPurpose("");
      setOpen(false);
      reload();
    } catch {
      Alert.alert("Couldn’t add", "Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteSupplement(id);
      reload();
    } catch {
      Alert.alert("Couldn’t remove", "Check your connection and try again.");
    }
  };

  return (
    <>
      <SectionHead
        icon="leaf"
        title="SUPPLEMENTS"
        sub="What you take now — Forge reads this"
        action={
          <Pressable onPress={() => setOpen((o) => !o)}>
            <Text style={styles.toggle}>{open ? "CLOSE" : "ADD"}</Text>
          </Pressable>
        }
      />
      <View style={styles.list}>
        {items.length === 0 && !open ? (
          <Panel pad={16} style={styles.emptyCard}>
            <IconTile name="leaf" size={44} iconSize={21} />
            <Text style={styles.empty}>
              Add creatine, whey, vitamin D… Forge reads your stack to reason about timing and gaps —
              it never doses or recommends products.
            </Text>
          </Panel>
        ) : null}

        {items.map((s) => (
          <Panel key={s.id} pad={12} style={styles.row}>
            <IconTile name="leaf" size={42} iconSize={20} />
            <View style={styles.shrink}>
              <View style={styles.nameRow}>
                <Text style={styles.suppName}>{s.name}</Text>
                {s.dose ? (
                  <View style={styles.doseChip}>
                    <Text style={styles.doseText}>{s.dose}</Text>
                  </View>
                ) : null}
              </View>
              {s.timing || s.purpose ? (
                <View style={styles.metaRow}>
                  {s.timing ? (
                    <View style={styles.metaItem}>
                      <Icon name="clock" size={12} color={T.sub} />
                      <Text style={styles.metaText}>{s.timing}</Text>
                    </View>
                  ) : null}
                  {s.purpose ? (
                    <View style={styles.metaItem}>
                      <Icon name="target" size={12} color={T.sub} />
                      <Text style={styles.metaText}>{s.purpose}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => void remove(s.id)} hitSlop={8} accessibilityLabel={`Remove ${s.name}`} style={styles.removeBtn}>
              <Icon name="minus" size={16} color={T.sub} />
            </Pressable>
          </Panel>
        ))}

        {open ? (
          <Panel pad={14} style={styles.form}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Creatine" />
            <View style={styles.formRow}>
              <Field label="Dose" value={dose} onChangeText={setDose} placeholder="5g" />
              <Field label="Timing" value={timing} onChangeText={setTiming} placeholder="daily" />
            </View>
            <Field label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="recovery support" />
            <Btn
              label="Add supplement"
              kind="primary"
              full
              loading={busy}
              disabled={!name.trim()}
              onPress={add}
            />
          </Panel>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 9, marginHorizontal: 16 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 13 },
  empty: { ...ui(13, 500), color: T.mut, lineHeight: 19, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  shrink: { flex: 1, flexShrink: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  suppName: { ...ui(15, 700), color: T.text },
  doseChip: { backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  doseText: { ...mono(10, 700), color: T.green, letterSpacing: 0.2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 5 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...ui(12, 500), color: T.sub },
  removeBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line2 },
  toggle: { ...mono(10, 700), color: T.green, letterSpacing: 0.8 },
  form: { gap: 12 },
  formRow: { flexDirection: "row", gap: 12 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { ...mono(9, 700), letterSpacing: 1, color: T.sub },
  input: {
    ...ui(15, 600),
    color: T.text,
    backgroundColor: T.surf2,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
});
