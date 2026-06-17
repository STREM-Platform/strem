/**
 * Fuel — performance-nutrition screen, ported from `design-spec/screen-fuel.jsx`.
 *
 * Honesty per the gap analysis: the nutrition contract is day-level
 * (`targets_met` + notes), so the **real, persisted** action is the day-level
 * check-in, and recent days + the streak come from `GET /nutrition/days`. The
 * calorie/macro hero, hydration, and photo/voice/manual logging are a clearly
 * labelled **preview** on sample data (flag `nutritionMacrosPreview`) — they
 * persist nothing and never fabricate saved macros.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { FormError, TextField } from "@/components/form";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Bar, Btn, Chip, IconTile, Panel, ScreenHead, SectionHead } from "@/components/ui/primitives";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { NutritionDay } from "@/lib/api/types";
import { FLAGS } from "@/lib/flags";
import { formatShortDate } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

const SAMPLE_TARGETS = { cal: 2600, protein: 180, carbs: 280, fat: 80, water: 3.0 };
const SAMPLE_TODAY = { cal: 1840, protein: 132, carbs: 188, fat: 56 };

const MACROS: { label: string; key: "protein" | "carbs" | "fat"; color: string }[] = [
  { label: "Protein", key: "protein", color: "#34E2A0" },
  { label: "Carbs", key: "carbs", color: "#37C6F2" },
  { label: "Fat", key: "fat", color: "#F4C45A" },
];

const LOG_METHODS: { id: string; icon: IconName; label: string; sub: string; neutral?: boolean }[] = [
  { id: "photo", icon: "grid", label: "Snap a photo", sub: "AI estimates macros" },
  { id: "voice", icon: "bot", label: "Say what you ate", sub: "Voice → logged" },
  { id: "manual", icon: "edit", label: "Search & add", sub: "Manual entry", neutral: true },
];

const METHOD_ICON: Record<string, IconName> = { photo: "grid", voice: "bot", manual: "edit" };

// Sample meals (preview only — the contract is day-level, so these persist
// nothing). Mirrors `DATA.fuel.meals` from the prototype.
const SAMPLE_MEALS = [
  { name: "Oats, whey & berries", time: "07:10", tag: "Pre-train", method: "voice", cal: 520, p: 38, c: 72, f: 10 },
  { name: "Chicken, rice & greens", time: "12:40", tag: "Recovery", method: "photo", cal: 680, p: 52, c: 78, f: 16 },
  { name: "Greek yogurt & honey", time: "16:05", tag: "Snack", method: "manual", cal: 240, p: 22, c: 24, f: 6 },
  { name: "Salmon & sweet potato", time: "19:30", tag: "Dinner", method: "photo", cal: 400, p: 20, c: 14, f: 24 },
] as const;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive logged-day streak ending today or yesterday. */
function nutritionStreak(days: NutritionDay[]): number {
  const logged = new Set(days.map((d) => d.date));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!logged.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!logged.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (logged.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function FuelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, reload } = useAsync(() => api.listNutritionDays());
  const days = data?.items ?? [];
  const streak = nutritionStreak(days);
  const loggedToday = days.some((d) => d.date === todayKey());

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />}
      >
        <ScreenHead
          overline="Fuel the climb"
          title="Fuel"
          action={streak > 0 ? <Chip label={`${streak}-DAY`} icon="flame" /> : undefined}
        />

        {/* preview, matching the prototype order: macros → log → hydration → meals */}
        {FLAGS.nutritionMacrosPreview ? (
          <>
            <MacroHero />
            <LogMethods />
            <HydrationPreview />
            <MealsTimeline onShare={() => router.push("/(app)/recaps")} />
          </>
        ) : null}

        {/* real, persisted day-level check-in */}
        <DayCheckIn loggedToday={loggedToday} onLogged={reload} />

        {/* consistency — real */}
        <SectionHead icon="chart" title="CONSISTENCY" sub="Day-level proof" />
        <View style={styles.list}>
          {days.length > 0 ? (
            days.map((day) => (
              <View key={day.id} style={styles.dayRow}>
                <View style={styles.shrink}>
                  <Text style={styles.dayDate}>{formatShortDate(day.date)}</Text>
                  <Text style={styles.dayRaw}>{day.date}</Text>
                </View>
                <Chip
                  label={day.targets_met ? "ON TARGET" : "OFF TARGET"}
                  color={day.targets_met ? T.green : T.mut}
                  bg={day.targets_met ? T.greenSoft : "rgba(255,255,255,0.05)"}
                  border={day.targets_met ? T.greenLine : T.line2}
                  iconFill={false}
                />
              </View>
            ))
          ) : (
            <Panel style={styles.sideMargin}>
              <Text style={styles.emptyText}>No days logged yet. Your first honest entry starts the ledger.</Text>
            </Panel>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function MealsTimeline({ onShare }: { onShare: () => void }) {
  return (
    <>
      <SectionHead
        icon="utensils"
        title="TODAY’S FUEL"
        sub={`${SAMPLE_MEALS.length} entries · preview`}
        action={
          <Pressable onPress={onShare}>
            <Text style={styles.share}>SHARE</Text>
          </Pressable>
        }
      />
      <View style={styles.meals}>
        {SAMPLE_MEALS.map((m, i) => (
          <View key={i} style={styles.mealCard}>
            <View style={styles.mealThumb}>
              <Icon name={METHOD_ICON[m.method]} size={16} color="rgba(255,255,255,0.55)" />
            </View>
            <View style={styles.mealBody}>
              <View style={styles.mealTop}>
                <Text style={styles.mealName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.mealCal}>{m.cal} kcal</Text>
              </View>
              <View style={styles.mealMeta}>
                <Chip label={m.tag.toUpperCase()} color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2} iconFill={false} />
                <Text style={styles.mealMacros}>{m.p}P · {m.c}C · {m.f}F</Text>
                <Text style={styles.mealTime}>{m.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function MacroHero() {
  const calPct = Math.min(1, SAMPLE_TODAY.cal / SAMPLE_TARGETS.cal);
  const remaining = Math.max(0, SAMPLE_TARGETS.cal - SAMPLE_TODAY.cal);
  return (
    <Panel raised style={styles.sideMargin} accent={T.greenLine} pad={18}>
      <MountainMark size={200} color="#9fb0a8" style={styles.heroWatermark} />
      <Text style={styles.previewTag}>◇ PREVIEW · SAMPLE TARGETS</Text>
      <View style={styles.heroRow}>
        <Ring size={132} stroke={12} pct={calPct}>
          <Text style={styles.ringNum}>{remaining}</Text>
          <Text style={styles.ringLabel}>KCAL LEFT</Text>
        </Ring>
        <View style={styles.shrink}>
          <Text style={styles.heroKcal}>
            {SAMPLE_TODAY.cal.toLocaleString()} / {SAMPLE_TARGETS.cal.toLocaleString()} KCAL
          </Text>
          <Text style={styles.heroSub}>On track for recovery & tomorrow’s session</Text>
          <View style={styles.macros}>
            {MACROS.map((m) => {
              const cur = SAMPLE_TODAY[m.key];
              const target = SAMPLE_TARGETS[m.key];
              return (
                <View key={m.key}>
                  <View style={styles.macroHead}>
                    <Text style={styles.macroLabel}>{m.label}</Text>
                    <Text style={styles.macroVal}>
                      <Text style={{ color: m.color }}>{cur}</Text>
                      <Text style={styles.macroMuted}> / {target}g</Text>
                    </Text>
                  </View>
                  <Bar pct={Math.min(1, cur / target)} color={m.color} h={8} />
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Panel>
  );
}

function DayCheckIn({ loggedToday, onLogged }: { loggedToday: boolean; onLogged: () => void }) {
  const [met, setMet] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(undefined);
    setSubmitting(true);
    try {
      await api.logNutritionDay({ date: todayKey(), targets_met: met, notes: notes.trim() || undefined });
      setDone(true);
      setNotes("");
      onLogged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t log that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SectionHead icon="check" title="LOG TODAY" sub="Consistency over perfect macro math" />
      <Panel style={styles.sideMargin}>
        {done || loggedToday ? (
          <View style={styles.checkedRow}>
            <Icon name="check" size={18} color={T.green} sw={2.6} />
            <Text style={styles.checkedText}>Today’s fuel is logged. XP updates through the progression ledger.</Text>
          </View>
        ) : (
          <>
            <View style={styles.toggle}>
              <ToggleBtn label="On target" active={met} onPress={() => setMet(true)} tone="green" />
              <ToggleBtn label="Off target" active={!met} onPress={() => setMet(false)} tone="muted" />
            </View>
            <View style={styles.noteField}>
              <TextField label="Notes" helperText="Optional" value={notes} onChangeText={setNotes} placeholder="Hit protein, light on veg" multiline maxLength={500} />
            </View>
            {error ? <FormError message={error} /> : null}
            <Btn kind="primary" full icon="check" label={submitting ? "Logging…" : "Log today"} onPress={submit} />
          </>
        )}
      </Panel>
    </>
  );
}

function ToggleBtn({ label, active, onPress, tone }: { label: string; active: boolean; onPress: () => void; tone: "green" | "muted" }) {
  const color = tone === "green" ? T.green : T.mut;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleBtn,
        active ? { backgroundColor: tone === "green" ? T.greenSoft : T.surf2, borderColor: tone === "green" ? T.greenLine : T.line2 } : styles.toggleIdle,
      ]}
    >
      <Text style={[styles.toggleLabel, { color: active ? color : T.sub }]}>{label}</Text>
    </Pressable>
  );
}

function HydrationPreview() {
  const cups = 6;
  const perCup = SAMPLE_TARGETS.water / cups;
  const [water, setWater] = useState(1.8);
  const filled = Math.round(water / perCup);
  return (
    <>
      <SectionHead icon="compass" title="HYDRATION" sub={`${water.toFixed(1)} of ${SAMPLE_TARGETS.water} L · preview`} />
      <Panel style={styles.sideMargin} pad={15}>
        <View style={styles.hydrationRow}>
          <View style={styles.cups}>
            {Array.from({ length: cups }, (_, i) => (
              <Pressable
                key={i}
                onPress={() => setWater(Math.min(SAMPLE_TARGETS.water, (i + 1) * perCup))}
                style={[styles.cup, i < filled ? styles.cupOn : styles.cupOff]}
              >
                <Icon name="compass" size={16} color={i < filled ? "#37C6F2" : T.sub} />
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setWater((w) => Math.min(SAMPLE_TARGETS.water, w + perCup))} style={styles.cupAdd}>
            <Icon name="plus" size={20} color="#37C6F2" />
          </Pressable>
        </View>
      </Panel>
    </>
  );
}

function LogMethods() {
  const onTap = (label: string) =>
    Alert.alert(
      "Not available yet",
      `${label} needs backend support and isn’t live yet. Photo/voice macro estimation will never fabricate values — for now, use the day-level check-in above.`,
    );
  return (
    <>
      <SectionHead icon="plus" title="LOG A MEAL" sub="Preview · meal tracking coming soon" />
      <View style={styles.methods}>
        {LOG_METHODS.map((lm) => {
          const tone = lm.neutral ? T.mut : T.green;
          return (
            <Pressable key={lm.id} style={styles.method} onPress={() => onTap(lm.label)}>
              <IconTile
                name={lm.icon}
                size={40}
                iconSize={19}
                color={tone}
                bg={lm.neutral ? T.surf2 : T.greenSoft}
                border={lm.neutral ? T.line : T.greenLine}
              />
              <Text style={styles.methodLabel}>{lm.label}</Text>
              <Text style={styles.methodSub}>{lm.sub}</Text>
              <Chip label="SOON" color={T.sub} bg="rgba(255,255,255,0.05)" border={T.line2} style={styles.methodChip} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 124 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1, flex: 1 },

  heroWatermark: { position: "absolute", top: -30, right: -50, opacity: 0.05 },
  previewTag: { ...mono(9, 700), letterSpacing: 1.2, color: T.sub, marginBottom: 12 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  ringNum: { ...disp(30, 800), color: "#fff" },
  ringLabel: { ...mono(9, 700), color: T.green, letterSpacing: 1, marginTop: 3 },
  heroKcal: { ...mono(10, 700), letterSpacing: 1.2, color: T.sub, marginBottom: 3 },
  heroSub: { ...ui(13, 600), color: T.mut, marginBottom: 12 },
  macros: { gap: 10 },
  macroHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  macroLabel: { ...ui(13, 700), color: T.text },
  macroVal: { ...mono(11, 700), color: T.mut },
  macroMuted: { color: T.mut },

  checkedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkedText: { ...ui(14, 600), color: T.text, flexShrink: 1, lineHeight: 20 },
  toggle: { flexDirection: "row", gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  toggleIdle: { backgroundColor: T.surf, borderColor: T.line },
  toggleLabel: { ...ui(14, 700) },
  noteField: { marginBottom: 14 },

  hydrationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cups: { flex: 1, flexDirection: "row", gap: 7 },
  cup: { flex: 1, height: 44, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cupOn: { backgroundColor: "rgba(55,198,242,0.16)", borderColor: "rgba(55,198,242,0.4)" },
  cupOff: { backgroundColor: T.surf2, borderColor: T.line },
  cupAdd: { width: 44, height: 44, borderRadius: 11, backgroundColor: "rgba(55,198,242,0.14)", borderWidth: 1, borderColor: "rgba(55,198,242,0.4)", alignItems: "center", justifyContent: "center" },

  methods: { flexDirection: "row", gap: 9, marginHorizontal: 16 },
  method: { flex: 1, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 13, alignItems: "center", backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  methodLabel: { ...ui(12, 700), color: T.text, marginTop: 8, textAlign: "center" },
  methodSub: { ...ui(10, 500), color: T.sub, marginTop: 1, textAlign: "center", lineHeight: 13 },
  methodChip: { marginTop: 8 },

  list: { gap: 9, marginHorizontal: 16 },
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 13, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  dayDate: { ...ui(15, 700), color: T.text },
  dayRaw: { ...mono(10, 600), color: T.sub, marginTop: 1 },
  emptyText: { ...ui(13, 500), color: T.mut, lineHeight: 19 },

  share: { ...mono(10, 700), color: T.green, letterSpacing: 0.8 },
  meals: { gap: 9, marginHorizontal: 16 },
  mealCard: { flexDirection: "row", borderRadius: 14, overflow: "hidden", backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  mealThumb: { width: 56, backgroundColor: "#0c0f13", alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: T.line },
  mealBody: { flex: 1, paddingVertical: 11, paddingHorizontal: 13, gap: 5 },
  mealTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mealName: { ...ui(14, 700), color: T.text, flexShrink: 1 },
  mealCal: { ...ui(13, 700), color: T.green },
  mealMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealMacros: { ...mono(10, 600), color: T.sub },
  mealTime: { ...mono(10, 600), color: T.sub, marginLeft: "auto" },
});
