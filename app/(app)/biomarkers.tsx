/**
 * Biomarkers / lab results (issue #63). Enter lab values; Forge surfaces trends +
 * context, never a diagnosis (A8). Highly sensitive, so the screen is gated: until
 * the Medical Disclaimer is accepted AND the "Lab & blood results" source is on,
 * the user service returns 403 and we show the consent gate instead of any data.
 */

/* eslint-disable react-hooks/set-state-in-effect -- the initial fetch is async; setState runs in the promise, not synchronously. */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OptionSelect, type Option } from "@/components/select";
import { Icon, type IconName } from "@/components/ui/icon";
import { Btn, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { Biomarker, BiomarkerList, BiomarkerType, TrendDirection } from "@/lib/api/types";

const MARKERS: { value: BiomarkerType; label: string; unit: string }[] = [
  { value: "ferritin", label: "Ferritin", unit: "ng/mL" },
  { value: "vitamin_d", label: "Vitamin D", unit: "ng/mL" },
  { value: "b12", label: "Vitamin B12", unit: "pg/mL" },
  { value: "ldl", label: "LDL cholesterol", unit: "mg/dL" },
  { value: "hdl", label: "HDL cholesterol", unit: "mg/dL" },
  { value: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
  { value: "total_cholesterol", label: "Total cholesterol", unit: "mg/dL" },
  { value: "glucose", label: "Fasting glucose", unit: "mg/dL" },
  { value: "hba1c", label: "HbA1c", unit: "%" },
  { value: "testosterone", label: "Testosterone", unit: "ng/dL" },
  { value: "tsh", label: "TSH", unit: "mIU/L" },
  { value: "crp", label: "CRP", unit: "mg/L" },
  { value: "magnesium", label: "Magnesium", unit: "mg/dL" },
];

const MARKER_LABEL: Record<BiomarkerType, string> = Object.fromEntries(
  MARKERS.map((m) => [m.value, m.label]),
) as Record<BiomarkerType, string>;

const MARKER_OPTIONS: Option<BiomarkerType>[] = MARKERS.map((m) => ({ value: m.value, label: m.label }));

const TREND: Record<TrendDirection, { icon: IconName; color: string; label: string }> = {
  rising: { icon: "arrowUR", color: T.green, label: "rising" },
  falling: { icon: "arrowUR", color: T.red, label: "falling" },
  stable: { icon: "minus", color: T.mut, label: "stable" },
  single: { icon: "minus", color: T.mut, label: "first reading" },
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Screen = "loading" | "gated" | "ready" | "error";

export default function BiomarkersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("loading");
  const [data, setData] = useState<BiomarkerList | null>(null);
  const [enabling, setEnabling] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      setData(await api.listBiomarkers());
      setScreen("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setScreen("gated");
      else if (!(err instanceof SessionExpiredError)) setScreen("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enable = async () => {
    setEnabling(true);
    try {
      // Accept the current Medical Disclaimer, then turn the source on.
      const status = await api.getLegalStatus();
      const medical = status.documents.find((d) => d.document_type === "medical");
      if (medical) {
        await api.acceptLegal([{ document_type: "medical", version: medical.required_version }]);
      }
      await api.setAgentConsent("biomarkers", true);
      setScreen("loading");
      await load();
    } catch {
      Alert.alert("Couldn’t enable", "Something went wrong. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/profile"))}
          style={styles.back}
          accessibilityRole="button"
        >
          <Icon name="chevronL" size={20} color={T.mut} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headRow}>
          <Icon name="heart" size={16} color={T.green} />
          <Text style={styles.eyebrow}>LAB RESULTS</Text>
        </View>
        <Text style={styles.title}>YOUR BIOMARKERS</Text>
        <Text style={styles.intro}>
          Enter lab values and Forge surfaces the trend and context — never a diagnosis. This is
          decision-support for a conversation with your clinician.
        </Text>

        {screen === "loading" ? <ActivityIndicator color={T.green} style={styles.loader} /> : null}

        {screen === "error" ? (
          <Panel style={styles.section}>
            <Text style={styles.errText}>Couldn’t load your lab results. Pull back and try again.</Text>
          </Panel>
        ) : null}

        {screen === "gated" ? (
          <Panel accent={T.greenLine} style={styles.section} pad={18}>
            <Icon name="lock" size={22} color={T.green} />
            <Text style={styles.gateTitle}>Turn on lab results</Text>
            <Text style={styles.gateBody}>
              Lab data is sensitive, so it’s off by default. To use it, accept the Medical
              Disclaimer and turn on the “Lab & blood results” source. Forge never diagnoses or
              prescribes — it surfaces trends to discuss with a qualified clinician. You can revoke
              this anytime in Privacy.
            </Text>
            <Btn label="I understand — enable lab results" kind="primary" full loading={enabling} onPress={enable} />
          </Panel>
        ) : null}

        {screen === "ready" && data ? (
          <ReadyView data={data} onChanged={load} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function ReadyView({ data, onChanged }: { data: BiomarkerList; onChanged: () => void }) {
  const [marker, setMarker] = useState<BiomarkerType>("ferritin");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(MARKERS[0].unit);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pickMarker = (m: BiomarkerType) => {
    setMarker(m);
    setUnit(MARKERS.find((x) => x.value === m)?.unit ?? "");
  };

  const save = async () => {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num) || num <= 0 || !unit.trim()) {
      Alert.alert("Check the reading", "Enter a value greater than zero and a unit.");
      return;
    }
    setSaving(true);
    try {
      await api.createBiomarker({
        marker_type: marker,
        value: num,
        unit: unit.trim(),
        taken_at: new Date().toISOString(),
        note: note.trim() || undefined,
      });
      setValue("");
      setNote("");
      onChanged();
    } catch {
      Alert.alert("Couldn’t save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (b: Biomarker) => {
    Alert.alert("Delete reading", `Remove this ${MARKER_LABEL[b.marker_type]} reading?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteBiomarker(b.id);
            onChanged();
          } catch {
            Alert.alert("Couldn’t delete", "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <>
      {data.trends.length > 0 ? (
        <>
          <SectionHead icon="chart" title="TRENDS" sub="Latest reading and its direction" />
          <Panel style={styles.section} pad={0}>
            {data.trends.map((t, i) => {
              const meta = TREND[t.direction];
              return (
                <View key={t.marker_type} style={[styles.trendRow, i > 0 && styles.divider]}>
                  <Text style={styles.trendName}>{MARKER_LABEL[t.marker_type]}</Text>
                  <Text style={styles.trendValue}>
                    {t.latest_value} {t.unit}
                  </Text>
                  <View style={[styles.trendTag, { borderColor: meta.color }]}>
                    <Icon name={meta.icon} size={12} color={meta.color} />
                    <Text style={[styles.trendTagText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}
          </Panel>
          <Text style={styles.disclaimer}>
            Trends are context to discuss with your clinician — Forge never diagnoses or interprets a
            value as good or bad.
          </Text>
        </>
      ) : null}

      <SectionHead icon="plus" title="ADD A READING" sub="From your latest lab panel" />
      <View style={styles.section}>
        <Text style={styles.fieldLabel}>Marker</Text>
        <OptionSelect options={MARKER_OPTIONS} selected={marker} onSelect={pickMarker} />
        <View style={styles.row}>
          <Field label="Value" value={value} onChangeText={setValue} placeholder="45" keyboardType="numeric" />
          <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="ng/mL" />
        </View>
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Fasting, lab name…" />
        <Btn label="Save reading" kind="primary" full loading={saving} onPress={save} />
      </View>

      {data.items.length > 0 ? (
        <>
          <SectionHead icon="clock" title="HISTORY" sub="Every reading you’ve entered" />
          <Panel style={styles.section} pad={0}>
            {data.items.map((b, i) => (
              <View key={b.id} style={[styles.histRow, i > 0 && styles.divider]}>
                <View style={styles.shrink}>
                  <Text style={styles.histName}>{MARKER_LABEL[b.marker_type]}</Text>
                  <Text style={styles.histMeta}>
                    {b.value} {b.unit} · {shortDate(b.taken_at)}
                  </Text>
                  {b.note ? <Text style={styles.histNote}>{b.note}</Text> : null}
                </View>
                <Pressable onPress={() => remove(b)} accessibilityLabel="Delete reading" hitSlop={8}>
                  <Icon name="minus" size={18} color={T.mut} />
                </Pressable>
              </View>
            ))}
          </Panel>
        </>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.mut}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 16 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  backText: { ...ui(14, 600), color: T.mut },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { ...mono(12, 700), letterSpacing: 2, color: T.green },
  title: { ...disp(26, 800), color: T.text, marginTop: 6 },
  intro: { ...ui(13, 500), color: T.sub, marginTop: 8, lineHeight: 19 },
  loader: { marginTop: 40 },
  errText: { ...ui(14, 500), color: T.sub, textAlign: "center" },
  section: { marginTop: 18 },
  gateTitle: { ...disp(18, 800), color: T.text, marginTop: 10 },
  gateBody: { ...ui(13, 500), color: T.sub, marginTop: 8, marginBottom: 16, lineHeight: 19 },
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginTop: 12 },
  fieldLabel: { ...mono(10, 700), letterSpacing: 1, color: T.sub, marginBottom: 6 },
  input: {
    ...ui(15, 600), color: T.text, backgroundColor: T.surf2, borderRadius: 10,
    borderWidth: 1, borderColor: T.line2, paddingHorizontal: 12, paddingVertical: 10,
  },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  trendName: { ...ui(14, 700), color: T.text, flex: 1 },
  trendValue: { ...mono(13, 600), color: T.text },
  trendTag: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  trendTagText: { ...mono(10, 700) },
  disclaimer: { ...ui(11, 500), color: T.mut, marginTop: 8, lineHeight: 16 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  histName: { ...ui(14, 700), color: T.text },
  histMeta: { ...mono(11, 600), color: T.sub, marginTop: 2 },
  histNote: { ...ui(12, 500), color: T.mut, marginTop: 2 },
  shrink: { flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: T.line2 },
});
