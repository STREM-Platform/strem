/**
 * Check-ins v2 (mobile#121): a 10-second mode with big taps and a detailed
 * mode; a transparent read of today (inputs shown, no hidden score) that feeds
 * the brief; 14/28-day trends with wearable recovery alongside; three-day
 * patterns can ask the race team for a reviewed change. No gamification.
 */

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { BigScale, Toggle, TodayReadCard, Trends } from "@/components/checkin/checkin-ui";
import { Input, Scale } from "@/components/ui/fields";
import { Body, Button, Card, ErrorBanner, IconButton, Notice, Overline, Page, Row, Segmented, Title } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { checkinsApi, raceAi, sourcesApi, type Checkin, type RecoverySample } from "@/lib/api/race";
import { todayRead, type KeySession } from "@/lib/race/checkin-read";
import { dayLabel, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";

export default function CheckinScreen() {
  const router = useRouter();
  const race = useRace();
  const today = todayIn(race.mission?.event.timezone);
  const [form, setForm] = useState<Checkin>({ day: today, illness: false });
  const [history, setHistory] = useState<Checkin[]>([]);
  const [recovery, setRecovery] = useState<RecoverySample[]>([]);
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [hurts, setHurts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjusted, setAdjusted] = useState<string | null>(null);

  useEffect(() => {
    checkinsApi
      .list(28)
      .then((items) => {
        setHistory(items);
        const existing = items.find((c) => c.day === today);
        if (existing) {
          setForm(existing);
          setHurts(Boolean(existing.pain_note));
          setSaved(true);
        }
      })
      .catch(() => undefined);
    sourcesApi
      .recovery(28)
      .then(setRecovery)
      .catch(() => undefined);
  }, [today]);

  const nextKey: KeySession | null = useMemo(() => {
    const sessions = (race.timeline?.content?.weeks ?? []).flatMap((w) => w.sessions);
    const key = sessions.filter((s) => s.key && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    return key ? { title: key.title, date: key.date } : null;
  }, [race.timeline, today]);
  const read = useMemo(() => todayRead(saved ? history : [], today, nextKey), [history, saved, today, nextKey]);

  const set = <K extends keyof Checkin>(k: K, v: Checkin[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, day: today, pain_note: hurts ? form.pain_note ?? null : null };
      const stored = await checkinsApi.save(body);
      setHistory((h) => [{ ...body, ...stored }, ...h.filter((c) => c.day !== today)]);
      setSaved(true);
      void race.refresh(["brief"], { briefRefresh: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Your check-in didn't save. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const adjust = async () => {
    if (!race.mission || !read.pattern) return;
    setAdjusting(true);
    try {
      await raceAi.adapt(race.mission.id, read.pattern.reason);
      setAdjusted("Your race team proposed a change. Review it on the Plan tab before anything moves.");
    } catch (err) {
      setAdjusted(err instanceof ApiError ? err.message : "The race team couldn't propose a change right now.");
    } finally {
      setAdjusting(false);
    }
  };

  const answered = [form.sleep_quality, form.energy, form.soreness, form.stress, form.motivation].some((v) => v != null) || form.illness || Boolean(form.note);
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>Check-in · {dayLabel(today)}</Overline>
        <Title size={40}>How are you today?</Title>
        <Body muted>Your race team weighs this next to your training before it suggests anything.</Body>
      </View>
      <Segmented
        options={[
          { value: "quick", label: "10 seconds", icon: "bolt" },
          { value: "detailed", label: "Detailed", icon: "list" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {error ? <ErrorBanner message={error} /> : null}

      {mode === "quick" ? (
        <Card pad={18} style={{ gap: 18 }}>
          <BigScale metric="sleep_quality" label="How did you sleep?" value={form.sleep_quality} onChange={(v) => set("sleep_quality", v)} />
          <BigScale metric="energy" label="Energy right now" value={form.energy} onChange={(v) => set("energy", v)} />
          <BigScale metric="soreness" label="Legs and muscles" value={form.soreness} onChange={(v) => set("soreness", v)} />
          <Row gap={8}>
            <Toggle on={Boolean(form.illness)} label="I feel ill" icon="alert" onPress={() => set("illness", !form.illness)} />
            <Toggle on={hurts} label="Something hurts" icon="heart" onPress={() => { setSaved(false); setHurts((v) => !v); }} tone={C.warning} />
          </Row>
          {hurts ? <Input label="Where does it hurt, and since when?" value={form.pain_note ?? ""} onChangeText={(v) => set("pain_note", v || null)} placeholder="e.g. outside of the left knee since Tuesday" /> : null}
        </Card>
      ) : (
        <Card pad={20} style={{ gap: 22 }}>
          <Scale label="Sleep quality" value={form.sleep_quality ?? null} onChange={(v) => set("sleep_quality", v)} low="Terrible" high="Great" />
          <Scale label="Energy" value={form.energy ?? null} onChange={(v) => set("energy", v)} low="Empty" high="Full" />
          <Scale label="Muscle soreness" value={form.soreness ?? null} onChange={(v) => set("soreness", v)} low="None" high="Very sore" />
          <Scale label="Stress" value={form.stress ?? null} onChange={(v) => set("stress", v)} low="Calm" high="Very stressed" />
          <Scale label="Motivation" value={form.motivation ?? null} onChange={(v) => set("motivation", v)} low="None" high="Fired up" />
          <Input label="Hours slept (optional)" value={form.sleep_hours == null ? "" : String(form.sleep_hours)} onChangeText={(v) => set("sleep_hours", v.trim() ? Number(v.replace(",", ".")) : null)} suffix="h" keyboardType="decimal-pad" />
          <Row gap={8}>
            <Toggle on={Boolean(form.illness)} label="I feel ill" icon="alert" onPress={() => set("illness", !form.illness)} />
            <Toggle on={hurts} label="Something hurts" icon="heart" onPress={() => { setSaved(false); setHurts((v) => !v); }} tone={C.warning} />
          </Row>
          {hurts ? <Input label="Where does it hurt, and since when?" value={form.pain_note ?? ""} onChangeText={(v) => set("pain_note", v || null)} placeholder="e.g. outside of the left knee since Tuesday" /> : null}
          <Input label="Anything else" value={form.note ?? ""} onChangeText={(v) => set("note", v || null)} multiline placeholder="Work trip, bad night, felt amazing…" />
        </Card>
      )}

      {!saved ? <Button label="Save check-in" icon="check" size="lg" loading={busy} disabled={!answered} onPress={() => void save()} /> : null}
      {saved ? (
        <>
          <TodayReadCard read={read} onAdjust={race.mission ? () => void adjust() : undefined} adjusting={adjusting} />
          {adjusted ? <Notice icon="sparkles" tone="accent" title={adjusted} action={<Button label="Open my plan" size="sm" onPress={() => router.push("/(app)/plan")} style={{ alignSelf: "flex-start", marginTop: 6 }} />} /> : null}
          <Text style={[ui(12, 500), { color: C.textDim }]}>Saved. Today&rsquo;s brief now reflects how you feel. Change any answer to update it.</Text>
        </>
      ) : null}
      <Trends checkins={history} recovery={recovery} today={today} />
    </Page>
  );
}
