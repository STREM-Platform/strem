import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Input, Scale } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { checkinsApi, type Checkin } from "@/lib/api/race";
import { dayLabel, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";

export default function CheckinScreen() {
  const router = useRouter();
  const race = useRace();
  const today = todayIn(race.mission?.event.timezone);
  const [form, setForm] = useState<Checkin>({ day: today, illness: false });
  const [recent, setRecent] = useState<Checkin[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    checkinsApi
      .list(14)
      .then((items) => {
        setRecent(items);
        const existing = items.find((c) => c.day === today);
        if (existing) setForm(existing);
      })
      .catch(() => undefined);
  }, [today]);
  const set = <K extends keyof Checkin>(k: K, v: Checkin[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await checkinsApi.save({ ...form, day: today });
      setSaved(true);
      void race.refresh(["brief"], { briefRefresh: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Your check-in didn't save. Retry.");
    } finally {
      setBusy(false);
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
        <Body muted>Sixty seconds. Your race team weighs this next to your training load before it suggests anything.</Body>
      </View>
      {saved ? (
        <Notice
          icon="checkCircle"
          tone="accent"
          title="Saved — your race team has it"
          body={form.illness ? "Rest until symptoms clear. Consider asking your race team to adapt the next days." : "Today's brief now reflects how you feel."}
          action={<Button label="Back to my mission" size="sm" onPress={() => router.replace("/(app)/home")} style={{ alignSelf: "flex-start", marginTop: 8 }} />}
        />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <Card pad={20} style={{ gap: 22 }}>
        <Scale label="Sleep quality" value={form.sleep_quality ?? null} onChange={(v) => set("sleep_quality", v)} low="Terrible" high="Great" />
        <Scale label="Energy" value={form.energy ?? null} onChange={(v) => set("energy", v)} low="Empty" high="Full" />
        <Scale label="Muscle soreness" value={form.soreness ?? null} onChange={(v) => set("soreness", v)} low="None" high="Very sore" />
        <Scale label="Stress" value={form.stress ?? null} onChange={(v) => set("stress", v)} low="Calm" high="Very stressed" />
        <Scale label="Motivation" value={form.motivation ?? null} onChange={(v) => set("motivation", v)} low="None" high="Fired up" />
        <Input label="Hours slept (optional)" value={form.sleep_hours == null ? "" : String(form.sleep_hours)} onChangeText={(v) => set("sleep_hours", v.trim() ? Number(v.replace(",", ".")) : null)} suffix="h" keyboardType="decimal-pad" />
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: Boolean(form.illness) }}
          onPress={() => set("illness", !form.illness)}
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }, pressed && { opacity: 0.8 }]}
        >
          <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: form.illness ? C.serious : C.lineStrong, backgroundColor: form.illness ? C.serious : "transparent", alignItems: "center", justifyContent: "center" }}>
            {form.illness ? <Icon name="check" size={15} color={C.white} sw={3} /> : null}
          </View>
          <Text style={[ui(15, 600), { color: C.text, flex: 1 }]}>I feel ill (cold, fever, stomach)</Text>
        </Pressable>
        <Input label="Pain or niggles" value={form.pain_note ?? ""} onChangeText={(v) => set("pain_note", v || null)} placeholder="Where, and since when?" />
        <Input label="Anything else" value={form.note ?? ""} onChangeText={(v) => set("note", v || null)} multiline placeholder="Work trip, bad night, felt amazing…" />
      </Card>
      <Button label="Save check-in" icon="check" size="lg" loading={busy} disabled={!answered} onPress={() => void save()} />
      {recent.length ? (
        <Card pad={16} style={{ gap: 8 }}>
          <Text style={[ui(13, 700), { color: C.textMuted }]}>Recent</Text>
          {recent.slice(0, 7).map((c) => (
            <Row key={c.day}>
              <Text style={[ui(13, 600), { color: C.text, width: 96 }]}>{dayLabel(c.day)}</Text>
              <Text style={[ui(12, 500), { color: C.textMuted, flex: 1 }]} numberOfLines={1}>
                {[c.sleep_quality != null && `sleep ${c.sleep_quality}/5`, c.energy != null && `energy ${c.energy}/5`, c.soreness != null && `soreness ${c.soreness}/5`, c.illness && "ill"].filter(Boolean).join(" · ") || "note only"}
              </Text>
            </Row>
          ))}
        </Card>
      ) : null}
    </Page>
  );
}
