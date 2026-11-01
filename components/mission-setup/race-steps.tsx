/** Mission setup, first steps: sport, the race, what it demands and the goal (mobile#147). */

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Choices, DatePicker, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Card, Notice, Row } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { enrichApi, type PlaceResult } from "@/lib/api/race";
import type { Sport } from "@/lib/api/race-missions";
import { longDate, todayIn } from "@/lib/race/format";
import type { FormErrors, MissionForm } from "@/lib/race/mission-form";
import { FORMATS, SPORTS, SUPPORTS, sportMeta } from "@/lib/race/sports";

export function SportStep({ value, onPick }: { value: Sport; onPick: (sport: Sport) => void }) {
  return (
    <View style={styles.sportGrid}>
      {SPORTS.map((sport) => {
        const on = sport.id === value;
        return (
          <Pressable
            key={sport.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(sport.id)}
            style={({ pressed }) => [styles.sportTile, on && styles.sportOn, pressed && { opacity: 0.8 }]}
          >
            <Icon name={sport.icon} size={24} color={on ? C.ink : C.text} />
            <Text style={[ui(15, 700), { color: on ? C.ink : C.text }]}>{sport.label}</Text>
            <Text style={[ui(12, 500), { color: on ? "rgba(8,9,11,0.7)" : C.textMuted, lineHeight: 17 }]}>{sport.blurb}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type SetFn = <K extends keyof MissionForm>(k: K, v: MissionForm[K]) => void;

export function RaceStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  const [query, setQuery] = useState(form.location);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const picked = useRef(Boolean(form.latitude));
  useEffect(() => {
    if (picked.current || query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      enrichApi
        .places(query)
        .then(setPlaces)
        .catch(() => setPlaces([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <View style={{ gap: 18 }}>
      <Input label="Race or challenge name" value={form.name} onChangeText={(v) => set("name", v)} placeholder={form.sport === "custom" ? "e.g. Everesting on Vitosha" : "e.g. Rila Ultra 50K"} error={errors.name} autoCapitalize="words" />
      <View style={{ gap: 6 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Race date{form.date ? ` · ${longDate(form.date)}` : ""}</Text>
        <DatePicker label="Race date" value={form.date} min={todayIn(form.timezone)} onChange={(v) => set("date", v)} />
        {errors.date ? <Text style={[ui(12, 600), { color: C.serious }]}>{errors.date}</Text> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Input
          label="Where it starts"
          value={query}
          onChangeText={(v) => {
            picked.current = false;
            setQuery(v);
            set("location", v);
            set("latitude", null);
            set("longitude", null);
          }}
          placeholder="Search a town or place"
          error={errors.location}
          hint={form.latitude != null ? "Location found ✓" : undefined}
        />
        {searching ? <ActivityIndicator color={C.textMuted} style={{ alignSelf: "flex-start" }} /> : null}
        {places.length ? (
          <Card pad={4}>
            {places.map((p) => (
              <Pressable
                key={`${p.latitude},${p.longitude}`}
                accessibilityRole="button"
                onPress={() => {
                  picked.current = true;
                  setQuery(p.label);
                  setPlaces([]);
                  set("location", p.label);
                  set("latitude", p.latitude);
                  set("longitude", p.longitude);
                  if (p.timezone) set("timezone", p.timezone);
                  set("countryCode", p.country_code ?? null);
                }}
                style={({ pressed }) => [styles.place, pressed && { opacity: 0.75 }]}
              >
                <Icon name="pin" size={16} color={C.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[ui(14, 700), { color: C.text }]}>{p.label}</Text>
                  <Text style={[ui(12, 500), { color: C.textMuted }]}>
                    {p.timezone ?? "timezone unknown"}
                    {p.elevation_m != null ? ` · ${Math.round(p.elevation_m)} m` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        ) : null}
        <Text style={[ui(12, 500), { color: C.textDim }]}>
          Timezone: {form.timezone}. Picking a place lets STREM pull race-day conditions and daylight.
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Start time (optional)</Text>
        <Choices
          options={["05:00", "06:00", "07:00", "08:00", "09:00", "10:00"].map((t) => ({ value: t, label: t }))}
          value={form.startTime || null}
          onChange={(v) => set("startTime", form.startTime === v ? "" : v)}
        />
        <Input label="Or exact time" value={form.startTime} onChangeText={(v) => set("startTime", v)} placeholder="HH:MM" error={errors.startTime} keyboardType="numbers-and-punctuation" />
      </View>
    </View>
  );
}

export function DemandsStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  const meta = sportMeta(form.sport);
  return (
    <View style={{ gap: 18 }}>
      <Row gap={12} wrap align="flex-start">
        <Input label="Distance" value={form.distance} onChangeText={(v) => set("distance", v)} suffix="km" placeholder={meta.distanceHint} keyboardType="decimal-pad" error={errors.distance} />
        {meta.hasElevation ? (
          <Input label="Elevation gain" value={form.elevation} onChangeText={(v) => set("elevation", v)} suffix="m+" placeholder="unknown" keyboardType="number-pad" error={errors.elevation} hint="optional" />
        ) : null}
      </Row>
      {form.legs.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[ui(13, 700), { color: C.textMuted }]}>Legs</Text>
          <Row gap={10} wrap>
            {form.legs.map((leg, i) => (
              <Input
                key={leg.discipline + i}
                label={leg.discipline === "swim" ? "Swim" : leg.discipline === "bike" ? "Bike" : "Run"}
                value={String(leg.distance_km)}
                suffix="km"
                keyboardType="decimal-pad"
                onChangeText={(v) => {
                  const value = Number(v.replace(",", "."));
                  set("legs", form.legs.map((l, j) => (j === i ? { ...l, distance_km: Number.isFinite(value) && value > 0 ? value : l.distance_km } : l)));
                }}
              />
            ))}
          </Row>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Format</Text>
        <Choices options={FORMATS} value={form.format} onChange={(v) => set("format", v)} />
      </View>
      {form.format !== "single_day" ? (
        <Row gap={12} wrap align="flex-start">
          <Input label="Stages / days" value={form.stages} onChangeText={(v) => set("stages", v)} keyboardType="number-pad" error={errors.stages} />
          <Input label="Last day" value={form.endDate} onChangeText={(v) => set("endDate", v)} placeholder="YYYY-MM-DD" error={errors.endDate} />
        </Row>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Support</Text>
        <Choices options={SUPPORTS} value={form.support} onChange={(v) => set("support", form.support === v ? null : v)} />
      </View>
      <Input label="Cutoff" value={form.cutoff} onChangeText={(v) => set("cutoff", v)} placeholder="e.g. 12:00 (hours:minutes)" hint="optional" error={errors.cutoff} keyboardType="numbers-and-punctuation" />
      <Notice icon="info" title="Unknown is fine" body="Leave elevation or cutoff empty if you don't know them yet. STREM never guesses race facts — you can add them, or upload the GPX, later." />
    </View>
  );
}

export function GoalStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  return (
    <View style={{ gap: 18 }}>
      <Choices
        options={[
          { value: "finish", label: "Finish", hint: "Get to the line" },
          { value: "finish_confidently", label: "Finish strong", hint: "Healthy and in control" },
          { value: "target_time", label: "Target time", hint: "A specific time" },
          { value: "compete", label: "Compete", hint: "Race for a placing" },
        ]}
        value={form.outcome}
        onChange={(v) => set("outcome", v)}
      />
      {form.outcome === "target_time" || form.outcome === "compete" ? (
        <Input label={form.outcome === "compete" ? "Time that would win your goal (optional)" : "Target finish time"} value={form.target} onChangeText={(v) => set("target", v)} placeholder="hours:minutes, e.g. 6:30" error={errors.target} keyboardType="numbers-and-punctuation" />
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Priority</Text>
        <Choices
          options={[
            { value: "A", label: "A race", hint: "The season goal" },
            { value: "B", label: "B race", hint: "Important" },
            { value: "C", label: "C race", hint: "Training race" },
          ]}
          value={form.priority}
          onChange={(v) => set("priority", v)}
        />
      </View>
      <Input
        label="Why does this race matter to you?"
        value={form.motivation}
        onChangeText={(v) => set("motivation", v)}
        multiline
        placeholder="Your words. Your race team uses them when it gets hard."
        error={errors.motivation}
        hint={`${form.motivation.length}/600`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sportTile: { width: "48%", flexGrow: 1, gap: 8, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 124 },
  sportOn: { backgroundColor: C.white, borderColor: C.white },
  place: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 52 },
});
