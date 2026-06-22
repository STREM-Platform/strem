/**
 * Athlete Baseline form (issue #61) — the progressive, optional "Athlete Profile"
 * (next-steps-plan.md §3.1), separate from the <5min identity onboarding. Body
 * metrics, training history, PRs, injuries, equipment, and dietary constraints —
 * coaching inputs only, never a "look" metric (A8). On save it confirms exactly
 * what "Forge now knows" and feeds the A6 context graph.
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OptionSelect, type Option } from "@/components/select";
import { Icon } from "@/components/ui/icon";
import { Btn, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type {
  AgeBand,
  AthleteProfile,
  AthleteProfileUpdate,
  BiologicalSex,
  EquipmentAccess,
} from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

const AGE_BANDS: Option<AgeBand>[] = [
  { value: "under_20", label: "Under 20" },
  { value: "20_29", label: "20–29" },
  { value: "30_39", label: "30–39" },
  { value: "40_49", label: "40–49" },
  { value: "50_59", label: "50–59" },
  { value: "60_plus", label: "60+" },
];

const SEXES: Option<BiologicalSex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EQUIPMENT: Option<EquipmentAccess>[] = [
  { value: "full_gym", label: "Full gym" },
  { value: "home_gym", label: "Home gym" },
  { value: "minimal", label: "Minimal" },
  { value: "bodyweight_only", label: "Bodyweight only" },
];

interface PrRow {
  exercise: string;
  weight: string;
  reps: string;
}
interface InjuryRow {
  area: string;
  note: string;
}

const numOrNull = (s: string): number | null => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (s: string): number | null => {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.sub}
          keyboardType={keyboardType}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function AthleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading } = useAsync<AthleteProfile>(api.getAthleteProfile);

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand | undefined>();
  const [sex, setSex] = useState<BiologicalSex | undefined>();
  const [years, setYears] = useState("");
  const [equipment, setEquipment] = useState<EquipmentAccess | undefined>();
  const [prs, setPrs] = useState<PrRow[]>([]);
  const [injuries, setInjuries] = useState<InjuryRow[]>([]);
  const [diet, setDiet] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<AthleteProfile | null>(null);

  // Seed the form from the loaded profile once.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time seed of the form
     fields from the async-loaded profile (same pattern as lib/use-async.ts). */
  useEffect(() => {
    if (!data) return;
    setHeightCm(data.height_cm != null ? String(data.height_cm) : "");
    setWeightKg(data.weight_kg != null ? String(data.weight_kg) : "");
    setAgeBand(data.age_band ?? undefined);
    setSex(data.biological_sex ?? undefined);
    setYears(data.years_training != null ? String(data.years_training) : "");
    setEquipment(data.equipment_access ?? undefined);
    setPrs(
      data.personal_records.map((p) => ({
        exercise: p.exercise,
        weight: p.weight_kg != null ? String(p.weight_kg) : "",
        reps: p.reps != null ? String(p.reps) : "",
      })),
    );
    setInjuries(data.injuries.map((i) => ({ area: i.area, note: i.note ?? "" })));
    setDiet(data.dietary_constraints.join(", "));
  }, [data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updatePr = (i: number, patch: Partial<PrRow>) =>
    setPrs((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const updateInjury = (i: number, patch: Partial<InjuryRow>) =>
    setInjuries((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  async function save() {
    const payload: AthleteProfileUpdate = {
      height_cm: numOrNull(heightCm),
      weight_kg: numOrNull(weightKg),
      age_band: ageBand ?? null,
      biological_sex: sex ?? null,
      years_training: intOrNull(years),
      equipment_access: equipment ?? null,
      personal_records: prs
        .filter((p) => p.exercise.trim())
        .map((p) => ({
          exercise: p.exercise.trim(),
          weight_kg: numOrNull(p.weight),
          reps: intOrNull(p.reps),
        })),
      injuries: injuries
        .filter((i) => i.area.trim())
        .map((i) => ({ area: i.area.trim(), note: i.note.trim() || null })),
      dietary_constraints: diet
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setBusy(true);
    try {
      const result = await api.updateAthleteProfile(payload);
      setSaved(result);
    } catch {
      Alert.alert("Couldn’t save", "Check the values and your connection, then try again.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <SavedConfirmation profile={saved} insets={insets.top} onDone={() => router.back()} />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/home"))}
          style={styles.back}
          accessibilityRole="button"
        >
          <Icon name="chevronL" size={20} color={T.mut} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headRow}>
          <Icon name="compass" size={16} color={T.green} />
          <Text style={styles.eyebrow}>ATHLETE BASELINE</Text>
        </View>
        <Text style={styles.title}>HELP FORGE COACH THE REAL YOU</Text>
        <Text style={styles.intro}>
          Optional, and you can change it anytime. These are coaching inputs — not a scoreboard.
          The more Forge knows, the better it scopes your week.
        </Text>

        {loading && !data ? (
          <ActivityIndicator color={T.green} style={styles.loader} />
        ) : null}

        <SectionHead icon="heart" title="BODY" sub="For load math & recovery norms" />
        <View style={styles.section}>
          <View style={styles.row}>
            <Field label="Height" value={heightCm} onChangeText={setHeightCm} placeholder="180" keyboardType="numeric" suffix="cm" />
            <Field label="Weight" value={weightKg} onChangeText={setWeightKg} placeholder="80" keyboardType="numeric" suffix="kg" />
          </View>
          <Text style={styles.fieldLabel}>Age band</Text>
          <OptionSelect options={AGE_BANDS} selected={ageBand} onSelect={setAgeBand} />
          <Text style={styles.fieldLabel}>Sex (for HR/HRV norms & load math)</Text>
          <OptionSelect options={SEXES} selected={sex} onSelect={setSex} />
        </View>

        <SectionHead icon="dumbbell" title="TRAINING" sub="Where you're starting from" />
        <View style={styles.section}>
          <Field label="Years training" value={years} onChangeText={setYears} placeholder="5" keyboardType="numeric" />
          <Text style={styles.fieldLabel}>Equipment & access</Text>
          <OptionSelect options={EQUIPMENT} selected={equipment} onSelect={setEquipment} />
        </View>

        <SectionHead icon="bolt" title="PERSONAL RECORDS" sub="Seeds real PRs so early lifts aren't false" />
        <View style={styles.section}>
          {prs.map((pr, i) => (
            <Panel key={i} pad={12} style={styles.repeater}>
              <View style={styles.repeaterHead}>
                <Text style={styles.repeaterTitle}>PR {i + 1}</Text>
                <Pressable onPress={() => setPrs((r) => r.filter((_, j) => j !== i))} accessibilityLabel="Remove PR">
                  <Icon name="minus" size={16} color={T.sub} />
                </Pressable>
              </View>
              <Field label="Lift / event" value={pr.exercise} onChangeText={(t) => updatePr(i, { exercise: t })} placeholder="Back Squat" />
              <View style={styles.row}>
                <Field label="Weight" value={pr.weight} onChangeText={(t) => updatePr(i, { weight: t })} placeholder="140" keyboardType="numeric" suffix="kg" />
                <Field label="Reps" value={pr.reps} onChangeText={(t) => updatePr(i, { reps: t })} placeholder="1" keyboardType="numeric" />
              </View>
            </Panel>
          ))}
          <Btn kind="ghost" icon="plus" label="Add a PR" onPress={() => setPrs((r) => [...r, { exercise: "", weight: "", reps: "" }])} />
        </View>

        <SectionHead icon="shield" title="INJURIES & LIMITATIONS" sub="So Forge protects your body" />
        <View style={styles.section}>
          {injuries.map((inj, i) => (
            <Panel key={i} pad={12} style={styles.repeater}>
              <View style={styles.repeaterHead}>
                <Text style={styles.repeaterTitle}>Injury {i + 1}</Text>
                <Pressable onPress={() => setInjuries((r) => r.filter((_, j) => j !== i))} accessibilityLabel="Remove injury">
                  <Icon name="minus" size={16} color={T.sub} />
                </Pressable>
              </View>
              <Field label="Area" value={inj.area} onChangeText={(t) => updateInjury(i, { area: t })} placeholder="Left knee" />
              <Field label="Note (optional)" value={inj.note} onChangeText={(t) => updateInjury(i, { note: t })} placeholder="Flares on lunges" />
            </Panel>
          ))}
          <Btn kind="ghost" icon="plus" label="Add an injury" onPress={() => setInjuries((r) => [...r, { area: "", note: "" }])} />
        </View>

        <SectionHead icon="leaf" title="DIETARY CONSTRAINTS" sub="Comma-separated" />
        <View style={styles.section}>
          <Field label="Allergies / preferences" value={diet} onChangeText={setDiet} placeholder="dairy-free, no pork" />
        </View>

        <View style={styles.saveWrap}>
          <Btn label="Save & teach Forge" kind="primary" full loading={busy} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}

function SavedConfirmation({
  profile,
  insets,
  onDone,
}: {
  profile: AthleteProfile;
  insets: number;
  onDone: () => void;
}) {
  const facts: string[] = [];
  if (profile.height_cm != null || profile.weight_kg != null) facts.push("your body metrics");
  if (profile.years_training != null) facts.push(`${profile.years_training}y training`);
  if (profile.personal_records.length) facts.push(`${profile.personal_records.length} PR${profile.personal_records.length > 1 ? "s" : ""}`);
  if (profile.injuries.length) facts.push(`${profile.injuries.length} injury note${profile.injuries.length > 1 ? "s" : ""}`);
  if (profile.equipment_access) facts.push(profile.equipment_access.replace(/_/g, " "));
  if (profile.dietary_constraints.length) facts.push(profile.dietary_constraints.join(", "));

  return (
    <View style={[styles.root, styles.confirmRoot, { paddingTop: insets + 80 }]}>
      <View style={styles.confirmIcon}>
        <Icon name="check" size={28} color={T.green} />
      </View>
      <Text style={styles.confirmTitle}>FORGE NOW KNOWS</Text>
      {facts.length ? (
        <Text style={styles.confirmFacts}>{facts.join(" · ")}</Text>
      ) : (
        <Text style={styles.confirmFacts}>Your baseline is saved.</Text>
      )}
      <Text style={styles.confirmSub}>
        It’ll use this to scope your week, protect your body, and ground your PRs — and you can
        update it anytime. See it under “What your coach sees”.
      </Text>
      <View style={styles.saveWrap}>
        <Btn label="Done" kind="primary" full onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { ...ui(13, 600), color: T.mut },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { ...mono(10, 700), letterSpacing: 1.6, color: T.green },
  title: { ...disp(26, 800), color: "#fff", marginTop: 6, lineHeight: 28 },
  intro: { ...ui(13, 500), color: T.mut, marginTop: 8, lineHeight: 19 },
  loader: { marginTop: 20 },

  section: { gap: 12, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { ...mono(9, 700), letterSpacing: 1, color: T.sub },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surf,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  input: { flex: 1, ...ui(15, 600), color: T.text, paddingVertical: 12 },
  suffix: { ...mono(11, 700), color: T.sub, marginLeft: 6 },

  repeater: { gap: 10 },
  repeaterHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  repeaterTitle: { ...mono(10, 700), letterSpacing: 1, color: T.mut },

  saveWrap: { marginTop: 20 },

  confirmRoot: { paddingHorizontal: 28, alignItems: "center" },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greenSoft,
    borderWidth: 1,
    borderColor: T.greenLine,
  },
  confirmTitle: { ...mono(11, 700), letterSpacing: 2, color: T.green, marginTop: 18 },
  confirmFacts: { ...disp(22, 800), color: "#fff", textAlign: "center", marginTop: 10, lineHeight: 27 },
  confirmSub: { ...ui(13.5, 500), color: T.mut, textAlign: "center", marginTop: 12, lineHeight: 20 },
});
