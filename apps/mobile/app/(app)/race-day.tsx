import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, EmptyState, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { C, R, mono, ui } from "@/constants/theme";
import { useRace } from "@/lib/race/race-context";
import { loadRaceDay, saveRaceDay, type RaceDayState } from "@/lib/race/race-day-store";
import { buildRacePack, formatElapsed, liveRead, timelineNotes } from "@/lib/race/race-pack";

const TICK_MS = 15_000; // a clock in minutes: light on the battery

function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

/** Race-day mode (mobile#128): big, glove-friendly, and it works without signal. */
export default function RaceDay() {
  const router = useRouter();
  const { mission, layers } = useRace();
  const [state, setState] = useState<RaceDayState | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fresh pack when the race team's layers are here; the saved one when offline.
  useEffect(() => {
    let live = true;
    void loadRaceDay().then((saved) => {
      if (!live) return;
      let next = saved;
      if (mission && layers.strategy) {
        const pack = buildRacePack(mission, layers);
        const same = saved?.pack.missionId === mission.id;
        next = { pack, startedAt: same ? saved.startedAt : null, arrivals: same ? saved.arrivals : [] };
        void saveRaceDay(next);
      }
      setState(next);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [mission, layers]);

  const update = (next: RaceDayState) => {
    setState(next);
    void saveRaceDay(next);
  };
  const now = useNow(Boolean(state?.startedAt));
  if (!loaded) return <Page>{null}</Page>;
  if (!state) {
    return (
      <Page>
        <BackRow onBack={() => router.back()} />
        <EmptyState
          icon="stopwatch"
          title="No race pack yet"
          body="Race-day mode runs on your Strategy layer’s checkpoint plan. Add your checkpoints and build Strategy in Race Lab, then open this once with signal — it stays on the phone."
          action={<Button label="Open Race Lab" onPress={() => router.replace("/(app)/race?tab=strategy")} />}
        />
      </Page>
    );
  }

  const { pack, startedAt, arrivals } = state;
  const elapsed = startedAt ? (now - Date.parse(startedAt)) / 60_000 : 0;
  const read = liveRead(pack, arrivals, elapsed);
  const finished = Boolean(startedAt) && pack.stations.length > 0 && read.next == null;
  const finishMin = finished ? arrivals[arrivals.length - 1].atMin : null;

  return (
    <Page>
      <BackRow onBack={() => router.back()} />
      <View style={{ gap: 4 }}>
        <Overline>Race day · {pack.name}</Overline>
        <Text style={[mono(64), { color: C.text }]} accessibilityLabel={`Elapsed ${formatElapsed(elapsed)}`}>
          {startedAt ? formatElapsed(finishMin ?? elapsed) : "0:00"}
        </Text>
        <Body muted size={13}>
          Saved on this phone {new Date(pack.savedAt).toLocaleString()} · works without signal
        </Body>
      </View>

      {!startedAt ? (
        <Button label="Start the race clock" icon="stopwatch" size="lg" onPress={() => update({ ...state, startedAt: new Date().toISOString(), arrivals: [] })} />
      ) : finished ? (
        <Card tone="accent">
          <Title size={30}>Finished in {formatElapsed(finishMin ?? 0)}</Title>
          <Body muted>Your station times go into the debrief.</Body>
          <Button
            label="Debrief this race"
            icon="trophy"
            size="lg"
            onPress={() =>
              router.push({ pathname: "/(app)/debrief", params: { finish: formatElapsed(finishMin ?? 0), timeline: timelineNotes(pack, arrivals) } })
            }
          />
        </Card>
      ) : read.next ? (
        <>
          <Card>
            <Overline>Next · km {read.next.km}</Overline>
            <Title size={36}>{read.next.name}</Title>
            <Row gap={16} wrap>
              {read.expectedMin != null ? <Big label="Expected" value={formatElapsed(read.expectedMin)} /> : null}
              {read.delta != null ? (
                <Big label={read.delta >= 0 ? "Ahead" : "Behind"} value={`${Math.abs(read.delta)} min`} color={read.delta >= 0 ? C.accent : C.warning} />
              ) : null}
              {read.cutoffLeft != null ? <Big label="To cutoff" value={formatElapsed(Math.max(read.cutoffLeft, 0))} color={read.cutoffLeft < 30 ? C.critical : C.text} /> : null}
            </Row>
            {read.next.carry ? <Body>Carry this leg: {read.next.carry}</Body> : null}
            {read.next.todo.map((t) => (
              <Row key={t} gap={8} align="flex-start">
                <Icon name="check" size={16} color={C.accent} style={{ marginTop: 3 }} />
                <Text style={[ui(17, 600), { color: C.text, flex: 1 }]}>{t}</Text>
              </Row>
            ))}
          </Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Arrived at ${read.next.name}`}
            style={({ pressed }) => [styles.arrive, pressed && { opacity: 0.8 }]}
            onPress={() => update({ ...state, arrivals: [...arrivals, { name: read.next!.name, atMin: Math.round(elapsed) }] })}
          >
            <Text style={[ui(22, 800), { color: C.accentInk }]}>Arrived at {read.next.name}</Text>
          </Pressable>
        </>
      ) : (
        <Notice icon="info" title="No checkpoint plan" body="Build Strategy in Race Lab with your checkpoints to get station-by-station cues." />
      )}

      {arrivals.length ? (
        <Row gap={10} wrap>
          <Button label="Undo last station" kind="ghost" size="sm" onPress={() => update({ ...state, arrivals: arrivals.slice(0, -1) })} />
          <Button label="Reset clock" kind="ghost" size="sm" onPress={() => update({ ...state, startedAt: null, arrivals: [] })} />
        </Row>
      ) : null}

      <View style={{ gap: 8 }}>
        <Overline>Stations</Overline>
        {pack.stations.map((s) => {
          const at = arrivals.find((a) => a.name === s.name);
          return (
            <Row key={s.name} gap={10} style={styles.station}>
              <Icon name={at ? "checkCircle" : "circle"} size={18} color={at ? C.accent : C.textDim} />
              <Text style={[ui(15, 700), { color: C.text, flex: 1 }]}>
                {s.name} · km {s.km}
              </Text>
              <Text style={[mono(14), { color: C.textMuted }]}>
                {at ? formatElapsed(at.atMin) : s.plannedMin != null ? formatElapsed(s.plannedMin) : "–"}
                {s.cutoffMin != null ? ` / ${formatElapsed(s.cutoffMin)}` : ""}
              </Text>
            </Row>
          );
        })}
      </View>
      {pack.fuel.length ? (
        <View style={{ gap: 6 }}>
          <Overline>Fuel per hour</Overline>
          <Row gap={16} wrap>
            {pack.fuel.map((f) => (
              <Big key={f.label} label={f.label} value={f.value} />
            ))}
          </Row>
        </View>
      ) : null}
      {pack.kit.length ? (
        <View style={{ gap: 6 }}>
          <Overline>Critical kit</Overline>
          {pack.kit.map((k) => (
            <Body key={k}>• {k}</Body>
          ))}
        </View>
      ) : null}
      {pack.notes.map((n) => (
        <Notice key={n} icon="alert" tone="attention" title={n} />
      ))}
    </Page>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <Row>
      <IconButton icon="chevronL" label="Back" onPress={onBack} tone="surface" />
    </Row>
  );
}

function Big({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[ui(12, 600), { color: C.textMuted }]}>{label}</Text>
      <Text style={[mono(26), { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arrive: { backgroundColor: C.accent, borderRadius: R.lg, minHeight: 88, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  station: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
});
