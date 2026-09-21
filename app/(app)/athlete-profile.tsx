import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OptionSelect, type Option } from "@/components/select";
import { TrailAtmosphere, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { AgeBand, AthleteProfile, AthleteProfileUpdate, EquipmentAccess } from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

const AGE_BANDS: Option<AgeBand>[] = [
  { value: "under_20", label: "Under 20" },
  { value: "20_29", label: "20–29" },
  { value: "30_39", label: "30–39" },
  { value: "40_49", label: "40–49" },
  { value: "50_59", label: "50–59" },
  { value: "60_plus", label: "60+" },
];

const STRENGTH_ACCESS: Option<EquipmentAccess>[] = [
  { value: "full_gym", label: "Full gym", hint: "Barbell, machines and free weights" },
  { value: "home_gym", label: "Home gym", hint: "A useful strength setup at home" },
  { value: "minimal", label: "Minimal equipment", hint: "Bands, kettlebell or a few weights" },
  { value: "bodyweight_only", label: "Bodyweight only", hint: "No strength equipment required" },
];

interface InjuryRow { area: string; note: string }

export default function TrailAthleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useAsync<AthleteProfile>(api.getAthleteProfile);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand | undefined>();
  const [years, setYears] = useState("");
  const [equipment, setEquipment] = useState<EquipmentAccess | undefined>();
  const [injuries, setInjuries] = useState<InjuryRow[]>([]);
  const [fuelConstraints, setFuelConstraints] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- seed controlled fields from the live profile once loaded. */
  useEffect(() => {
    if (!data) return;
    setHeightCm(data.height_cm == null ? "" : String(data.height_cm));
    setWeightKg(data.weight_kg == null ? "" : String(data.weight_kg));
    setAgeBand(data.age_band ?? undefined);
    setYears(data.years_training == null ? "" : String(data.years_training));
    setEquipment(data.equipment_access ?? undefined);
    setInjuries(data.injuries.map((item) => ({ area: item.area, note: item.note ?? "" })));
    setFuelConstraints(data.dietary_constraints.join(", "));
  }, [data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    const payload: AthleteProfileUpdate = {
      height_cm: numberOrNull(heightCm),
      weight_kg: numberOrNull(weightKg),
      age_band: ageBand ?? null,
      biological_sex: data?.biological_sex ?? null,
      years_training: integerOrNull(years),
      equipment_access: equipment ?? null,
      personal_records: data?.personal_records ?? [],
      injuries: injuries.filter((item) => item.area.trim()).map((item) => ({ area: item.area.trim(), note: item.note.trim() || null })),
      dietary_constraints: fuelConstraints.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      await api.updateAthleteProfile(payload);
      setSaved(true);
    } catch {
      Alert.alert("Profile not saved", "Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <View style={[trailStyles.root, styles.savedRoot, { paddingTop: insets.top + 70 }]}>
        <View style={styles.savedIcon}><Icon name="check" size={28} color={Trail.lime} /></View>
        <Text style={styles.savedOverline}>ATHLETE CONTEXT UPDATED</Text>
        <Text style={styles.savedTitle}>Your Race Team has a cleaner baseline.</Text>
        <Text style={styles.savedBody}>These facts can shape load, recovery and fueling decisions. Race-specific terrain and event constraints will live in the Race Mission intake.</Text>
        <Pressable style={styles.saveButton} onPress={() => router.back()}><Text style={styles.saveButtonText}>Back to Athlete</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/profile"))}>
          <Icon name="chevronL" size={18} color={Trail.textMuted} />
          <Text style={styles.backText}>Athlete</Text>
        </Pressable>

        <View>
          <Text style={trailStyles.pageOverline}>TRAIL ATHLETE BASELINE</Text>
          <Text style={trailStyles.pageTitle}>Context that changes decisions</Text>
          <Text style={trailStyles.pageSub}>Keep only facts that help STREM adapt preparation safely. Nothing here is a score or appearance target.</Text>
        </View>

        {error ? <TrailPanel style={styles.errorPanel}><Text style={styles.errorText}>The live athlete profile could not be loaded. No sample values are being shown.</Text></TrailPanel> : null}
        {loading && !data ? <ActivityIndicator color={Trail.lime} /> : null}

        <TrailSectionHead title="EXPERIENCE" label="LOAD CONTEXT" icon="mountain" />
        <TrailPanel style={styles.formPanel}>
          <Field label="Years training consistently" value={years} onChangeText={setYears} placeholder="3" keyboardType="numeric" />
          <Text style={styles.fieldLabel}>Age band</Text>
          <OptionSelect options={AGE_BANDS} selected={ageBand} onSelect={setAgeBand} />
        </TrailPanel>

        <TrailSectionHead title="OPTIONAL PHYSIOLOGY" label="PRIVATE" icon="heart" />
        <TrailPanel style={styles.formPanel}>
          <Text style={styles.sectionNote}>Used only where body size materially affects load or fueling estimates.</Text>
          <View style={styles.twoColumns}>
            <Field label="Height" value={heightCm} onChangeText={setHeightCm} placeholder="178" keyboardType="numeric" suffix="cm" />
            <Field label="Weight" value={weightKg} onChangeText={setWeightKg} placeholder="72" keyboardType="numeric" suffix="kg" />
          </View>
        </TrailPanel>

        <TrailSectionHead title="STRENGTH ACCESS" label="SUPPORT WORK" icon="dumbbell" />
        <OptionSelect options={STRENGTH_ACCESS} selected={equipment} onSelect={setEquipment} />

        <TrailSectionHead title="LIMITATIONS" label="SAFETY INPUT" icon="shield" />
        <View style={styles.stack}>
          {injuries.map((injury, index) => (
            <TrailPanel key={index} style={styles.formPanel}>
              <View style={styles.repeaterHead}>
                <Text style={styles.repeaterTitle}>LIMITATION {index + 1}</Text>
                <Pressable onPress={() => setInjuries((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Icon name="minus" size={17} color={Trail.textDim} /></Pressable>
              </View>
              <Field label="Area" value={injury.area} onChangeText={(value) => setInjuries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, area: value } : item))} placeholder="Left Achilles" />
              <Field label="What aggravates it?" value={injury.note} onChangeText={(value) => setInjuries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, note: value } : item))} placeholder="Long descents, especially when fatigued" />
            </TrailPanel>
          ))}
          <Pressable style={styles.addButton} onPress={() => setInjuries((items) => [...items, { area: "", note: "" }])}>
            <Icon name="plus" size={16} color={Trail.lime} /><Text style={styles.addButtonText}>Add limitation</Text>
          </Pressable>
        </View>

        <TrailSectionHead title="FUEL CONSTRAINTS" label="RACE REHEARSAL" icon="utensils" />
        <TrailPanel style={styles.formPanel}>
          <Field label="Allergies, intolerances or preferences" value={fuelConstraints} onChangeText={setFuelConstraints} placeholder="dairy-free, nut allergy" />
          <Text style={styles.sectionNote}>Separate multiple items with commas. STREM uses these to avoid unsuitable rehearsal suggestions.</Text>
        </TrailPanel>

        <Pressable disabled={busy || !data} style={[styles.saveButton, (busy || !data) && styles.disabled]} onPress={() => void save()}>
          <Text style={styles.saveButtonText}>{busy ? "Saving…" : "Save athlete baseline"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", suffix }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; suffix?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.inputRow}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Trail.textDim} keyboardType={keyboardType} style={styles.input} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function numberOrNull(value: string): number | null { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : null; }
function integerOrNull(value: string): number | null { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? parsed : null; }

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  backText: { ...ui(12, 600), color: Trail.textMuted },
  errorPanel: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine },
  errorText: { ...ui(11, 600), lineHeight: 17, color: Trail.orange },
  formPanel: { gap: 13 },
  stack: { gap: 10 },
  twoColumns: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.textDim },
  inputRow: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, borderRadius: 12, backgroundColor: Trail.panelSoft, borderWidth: 1, borderColor: Trail.line },
  input: { flex: 1, ...ui(14, 600), color: Trail.text, paddingVertical: 11 },
  suffix: { ...mono(9, 700), color: Trail.textDim },
  sectionNote: { ...ui(10, 500), lineHeight: 16, color: Trail.textMuted },
  repeaterHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  repeaterTitle: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.textDim },
  addButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, borderWidth: 1, borderColor: Trail.limeLine, backgroundColor: Trail.limeSoft },
  addButtonText: { ...ui(12, 700), color: Trail.lime },
  saveButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: Trail.lime },
  saveButtonText: { ...ui(13, 800), color: Trail.limeInk },
  disabled: { opacity: 0.5 },
  savedRoot: { paddingHorizontal: 28, alignItems: "center" },
  savedIcon: { width: 66, height: 66, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  savedOverline: { ...mono(9, 700), letterSpacing: 1.1, color: Trail.lime, marginTop: 18 },
  savedTitle: { ...disp(27, 800), lineHeight: 30, color: Trail.text, textAlign: "center", marginTop: 8 },
  savedBody: { ...ui(12, 500), lineHeight: 19, color: Trail.textMuted, textAlign: "center", marginTop: 10, marginBottom: 24 },
});
