/** Body & health basics: the few athlete facts that change preparation decisions. */

import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Choices, Input } from "@/components/ui/fields";
import { Body, Button, Card, ErrorBanner, IconButton, Notice, Overline, Page, Row, SectionHeader, Skeleton, Title } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { AgeBand, AthleteProfile, AthleteProfileUpdate, EquipmentAccess } from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "under_20", label: "Under 20" },
  { value: "20_29", label: "20–29" },
  { value: "30_39", label: "30–39" },
  { value: "40_49", label: "40–49" },
  { value: "50_59", label: "50–59" },
  { value: "60_plus", label: "60+" },
];

const EQUIPMENT: { value: EquipmentAccess; label: string; hint: string }[] = [
  { value: "full_gym", label: "Full gym", hint: "Barbell and machines" },
  { value: "home_gym", label: "Home gym", hint: "A useful setup at home" },
  { value: "minimal", label: "Minimal", hint: "Bands or a kettlebell" },
  { value: "bodyweight_only", label: "Bodyweight", hint: "No equipment" },
];

export default function AthleteProfileScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsync<AthleteProfile>(api.getAthleteProfile);
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/athlete"))} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>Body & health basics</Overline>
        <Title size={40}>What changes your plan</Title>
        <Body muted>Only facts that change decisions: weight sets fueling grams, injuries shape the plan, dietary needs become product checks. Nothing here is a score.</Body>
      </View>
      {error ? <ErrorBanner message="Your profile could not load. Nothing is shown until it does." /> : null}
      {loading && !data ? <Skeleton height={320} radius={22} /> : null}
      {/* The form seeds its fields from the loaded profile once. */}
      {data ? <ProfileForm profile={data} onDone={() => router.back()} /> : null}
    </Page>
  );
}

function ProfileForm({ profile, onDone }: { profile: AthleteProfile; onDone: () => void }) {
  const [years, setYears] = useState(profile.years_training == null ? "" : String(profile.years_training));
  const [ageBand, setAgeBand] = useState<AgeBand | null>(profile.age_band ?? null);
  const [height, setHeight] = useState(profile.height_cm == null ? "" : String(profile.height_cm));
  const [weight, setWeight] = useState(profile.weight_kg == null ? "" : String(profile.weight_kg));
  const [equipment, setEquipment] = useState<EquipmentAccess | null>(profile.equipment_access ?? null);
  const [injuries, setInjuries] = useState(profile.injuries.map((i) => ({ area: i.area, note: i.note ?? "" })));
  const [diet, setDiet] = useState(profile.dietary_constraints.join(", "));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setInjury = (index: number, patch: Partial<{ area: string; note: string }>) => setInjuries((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const save = async () => {
    const payload: AthleteProfileUpdate = {
      height_cm: integerOrNull(height),
      weight_kg: numberOrNull(weight),
      age_band: ageBand,
      biological_sex: profile.biological_sex ?? null,
      years_training: integerOrNull(years),
      equipment_access: equipment,
      personal_records: profile.personal_records,
      injuries: injuries.filter((i) => i.area.trim()).map((i) => ({ area: i.area.trim(), note: i.note.trim() || null })),
      dietary_constraints: diet.split(",").map((d) => d.trim()).filter(Boolean),
    };
    setBusy(true);
    setSaveError(null);
    try {
      await api.updateAthleteProfile(payload);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Not saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <Notice
        icon="checkCircle"
        tone="accent"
        title="Saved — your race team uses this from now on"
        body="Rebuild fuel or the plan in Race Lab to apply it to layers that are already built."
        action={<Button label="Done" size="sm" onPress={onDone} />}
      />
    );
  }

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 12 }}>
        <SectionHeader overline="Experience" title="Training background" />
        <Input label="Years training consistently" value={years} onChangeText={setYears} keyboardType="number-pad" placeholder="e.g. 3" />
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Age band</Text>
        <Choices options={AGE_BANDS} value={ageBand} onChange={(v) => setAgeBand(ageBand === v ? null : v)} />
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader overline="Optional" title="Body" />
        <Row gap={12} wrap align="flex-start">
          <Input label="Height" value={height} onChangeText={setHeight} keyboardType="number-pad" suffix="cm" placeholder="178" />
          <Input label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" placeholder="72" hint="sets fueling grams" />
        </Row>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader overline="Strength work" title="Equipment you can use" />
        <Choices options={EQUIPMENT} value={equipment} onChange={(v) => setEquipment(equipment === v ? null : v)} />
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader overline="Safety" title="Injuries and limitations" />
        {injuries.map((injury, index) => (
          <Card key={index} pad={14} style={{ gap: 10 }}>
            <Row>
              <Text style={[ui(13, 700), { color: C.textMuted, flex: 1 }]}>Limitation {index + 1}</Text>
              <IconButton icon="x" label={`Remove limitation ${index + 1}`} onPress={() => setInjuries((items) => items.filter((_, i) => i !== index))} tone="plain" size={36} />
            </Row>
            <Input label="Area" value={injury.area} onChangeText={(v) => setInjury(index, { area: v })} placeholder="e.g. Left Achilles" />
            <Input label="What aggravates it?" value={injury.note} onChangeText={(v) => setInjury(index, { note: v })} placeholder="e.g. Long descents when tired" />
          </Card>
        ))}
        <Button label="Add a limitation" icon="plus" kind="secondary" onPress={() => setInjuries((items) => [...items, { area: "", note: "" }])} style={{ alignSelf: "flex-start" }} />
        <Text style={[ui(12, 500), { color: C.textDim, lineHeight: 18 }]}>STREM doesn’t diagnose. Persistent pain belongs with a physio or doctor.</Text>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader overline="Fuel" title="Dietary needs" />
        <Input label="Allergies, intolerances or preferences" value={diet} onChangeText={setDiet} placeholder="e.g. lactose intolerant, nut allergy" hint="comma separated" />
      </View>

      {saveError ? <ErrorBanner message={saveError} /> : null}
      <Button label={busy ? "Saving…" : "Save"} icon="check" size="lg" loading={busy} onPress={() => void save()} style={styles.save} />
    </View>
  );
}

function numberOrNull(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const styles = StyleSheet.create({
  save: { alignSelf: "stretch" },
});
