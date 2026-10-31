/** What happened on race day, in a shape the race team learns from (ai#45). */

import { Text, View } from "react-native";

import { Choices, Input } from "@/components/ui/fields";
import { Row } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import type { RaceDayData } from "@/lib/api/race-missions";

const num = (v: string) => (v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);

export function RaceDayFields({ value, onChange }: { value: RaceDayData; onChange: (value: RaceDayData) => void }) {
  const set = <K extends keyof RaceDayData>(k: K, v: RaceDayData[K]) => onChange({ ...value, [k]: v });
  return (
    <View style={{ gap: 14 }}>
      <Text style={[ui(14, 800), { color: C.text }]}>Race day, in numbers</Text>
      <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>
        Optional — your race team uses it to set fuel, pacing and warnings for your next race.
      </Text>
      <Row gap={12} wrap align="flex-start">
        <Input label="Carbs per hour" value={value.carbs_g_per_hour == null ? "" : String(value.carbs_g_per_hour)} onChangeText={(v) => set("carbs_g_per_hour", num(v) == null ? null : Math.round(num(v)!))} suffix="g/h" keyboardType="number-pad" placeholder="e.g. 60" />
        <Input label="Fluid per hour" value={value.fluid_ml_per_hour == null ? "" : String(value.fluid_ml_per_hour)} onChangeText={(v) => set("fluid_ml_per_hour", num(v) == null ? null : Math.round(num(v)!))} suffix="ml/h" keyboardType="number-pad" placeholder="e.g. 500" />
      </Row>
      <Pick label="Stomach" value={value.gi_issues ?? null} onChange={(v) => set("gi_issues", v)} options={[{ value: "none", label: "Fine" }, { value: "mild", label: "Some trouble" }, { value: "severe", label: "Bad" }]} />
      <Pick label="Pacing" value={value.pacing ?? null} onChange={(v) => set("pacing", v)} options={[{ value: "even", label: "Even" }, { value: "negative_split", label: "Faster 2nd half" }, { value: "faded", label: "Faded" }, { value: "blew_up", label: "Blew up" }]} />
      {value.pacing === "faded" || value.pacing === "blew_up" ? (
        <Input label="Low point around km" value={value.low_point_km == null ? "" : String(value.low_point_km)} onChangeText={(v) => set("low_point_km", num(v))} suffix="km" keyboardType="decimal-pad" />
      ) : null}
      <Pick label="Cramps" value={value.cramps == null ? null : value.cramps ? "yes" : "no"} onChange={(v) => set("cramps", v === "yes")} options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
      <Pick label="Heat" value={value.heat ?? null} onChange={(v) => set("heat", v)} options={[{ value: "cold", label: "Cold" }, { value: "mild", label: "Mild" }, { value: "warm", label: "Warm" }, { value: "hot", label: "Hot" }]} />
    </View>
  );
}

function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[ui(13, 700), { color: C.textMuted }]}>{label}</Text>
      <Choices options={options} value={value} onChange={onChange} />
    </View>
  );
}

/** Drop empty fields; null when nothing was entered. */
export function cleanRaceDay(value: RaceDayData): RaceDayData | null {
  const out = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== "")) as RaceDayData;
  return Object.keys(out).length ? out : null;
}
