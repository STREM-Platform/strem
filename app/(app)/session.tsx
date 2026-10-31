import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sessionStatus } from "@/components/plan/session-row";
import { DatePicker, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, Chip, EmptyState, ErrorBanner, IconButton, Notice, Overline, Page, Row, StatusLabel, Title } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { athletePlanApi, isTimelineId, planApi, sessionsApi, type PlanSession, type PlanWeek, type SessionChange } from "@/lib/api/race";
import { capitalize, hm, km, longDate, todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { SESSION_ICON } from "@/lib/race/sports";

const LOG_TYPE: Record<string, string> = {
  running: "running",
  trail_running: "trail_running",
  cycling: "cycling",
  swimming: "swimming",
  strength: "strength",
  mobility: "mobility",
  hiking: "hiking",
  rowing: "rowing",
  skiing: "skiing",
  hybrid: "hybrid",
  brick: "cycling",
  other: "hybrid",
};

function findSession(weeks: PlanWeek[] | undefined, id: string | undefined) {
  for (const week of weeks ?? []) {
    const session = week.sessions.find((s) => s.id === id);
    if (session) return { session, week };
  }
  return null;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const race = useRace();
  const { mission, plan, progress } = race;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  // Sessions opened from the athlete's plan carry a source prefix; from a race screen, the mission plan's id.
  const fromTimeline = id ? isTimelineId(id) : false;
  const found = fromTimeline ? findSession(race.timeline?.content?.weeks, id) : findSession(plan?.content.weeks, id);
  const [rpe, setRpe] = useState<number | null>(found?.session.rpe ?? null);
  const [note, setNote] = useState(found?.session.athlete_note ?? "");

  if (!found || (!fromTimeline && (!plan || !mission))) {
    return (
      <Page>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
        <EmptyState title="Session not found" body="It may have changed when the plan was rebuilt." action={<Button label="Open the plan" onPress={() => router.replace("/(app)/plan")} />} />
      </Page>
    );
  }
  const { session, week } = found;
  const today = todayIn(fromTimeline ? race.timeline?.content?.timezone : mission?.event.timezone);
  const prog = (fromTimeline ? race.timelineProgress : progress)?.sessions.find((s) => s.id === session.id);
  const status = sessionStatus(session, prog, today);
  const matched = prog?.matched ?? [];

  const patch = async (body: SessionChange, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      if (fromTimeline) {
        race.replaceTimeline(await athletePlanApi.patchSession(session.id, body));
        void race.refresh(["plan", "progress", "brief"], { briefRefresh: true });
      } else if (plan) {
        race.replacePlan(await planApi.patchSession(plan, session.id, body));
        void race.refresh(["progress", "brief"], { briefRefresh: true });
      }
      after?.();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 412 ? "The plan changed elsewhere. Pull to refresh and try again." : err instanceof ApiError ? err.message : "That didn't save. Retry.");
      if (err instanceof ApiError && err.status === 412) void race.refresh(["plan"]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
        <View style={{ flex: 1 }} />
        <StatusLabel status={status} />
      </Row>
      <View style={{ gap: 8 }}>
        <Overline>
          {longDate(session.date)} · week {week.index} · {capitalize(week.phase)}
        </Overline>
        <Row gap={12} align="flex-start">
          <View style={[styles.icon, { backgroundColor: session.kind === "race" ? C.flameSoft : `${LAYER_COLOR.training}22` }]}>
            <Icon name={session.kind === "race" ? "flag" : SESSION_ICON[session.sport] ?? "run"} size={26} color={session.kind === "race" ? C.flame : LAYER_COLOR.training} />
          </View>
          <Title size={36} style={{ flex: 1 }}>
            {session.title}
          </Title>
        </Row>
        <Row gap={8} wrap>
          {session.duration_minutes ? <Chip icon="clock" label={hm(session.duration_minutes)} color={C.text} /> : null}
          {session.distance_km ? <Chip icon="route" label={`${km(session.distance_km)} km`} color={C.text} /> : null}
          {session.elevation_m ? <Chip icon="mountain" label={`+${session.elevation_m} m`} color={C.text} /> : null}
          <Chip icon="bolt" label={capitalize(session.intensity)} color={C.text} />
          {session.key ? <Chip icon="star" label="Key session" color={C.accent} border={C.accentLine} bg={C.accentSoft} /> : null}
        </Row>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Card pad={20} style={{ gap: 10 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Why this session</Text>
        <Body>{session.purpose}</Body>
        {session.terrain ? (
          <Row gap={8}>
            <Icon name="mountain" size={16} color={C.textMuted} />
            <Text style={[ui(13, 600), { color: C.textMuted }]}>{session.terrain}</Text>
          </Row>
        ) : null}
      </Card>
      {session.structure.length ? (
        <Card pad={20} style={{ gap: 12 }}>
          <Text style={[ui(13, 700), { color: C.textMuted }]}>How to do it</Text>
          {session.structure.map((step, i) => (
            <Row key={step + i} gap={12} align="flex-start">
              <View style={styles.stepNum}>
                <Text style={[disp(15, 800), { color: C.text }]}>{i + 1}</Text>
              </View>
              <Text style={[ui(15, 500), { color: C.text, flex: 1, lineHeight: 22 }]}>{step}</Text>
            </Row>
          ))}
        </Card>
      ) : null}
      {session.fueling ? (
        <Card pad={18} style={{ gap: 8, borderColor: `${LAYER_COLOR.fuel}55` }}>
          <Row gap={8}>
            <Icon name="drop" size={18} color={LAYER_COLOR.fuel} />
            <Text style={[ui(14, 700), { color: C.text }]}>Fuel rehearsal</Text>
          </Row>
          <Body muted>{session.fueling}</Body>
        </Card>
      ) : null}
      {matched.length ? (
        <Notice
          icon="checkCircle"
          tone="accent"
          title={`Recorded: ${hm(matched[0].duration_minutes)}${matched[0].distance_km ? ` · ${km(matched[0].distance_km)} km` : ""}${matched[0].elevation_m ? ` · +${matched[0].elevation_m} m` : ""}`}
          body={`${matched[0].title ?? capitalize(matched[0].session_type)} · ${matched[0].source === "manual" ? "logged in STREM" : `from ${capitalize(matched[0].source)}`}${prog?.status_source === "matched" ? " · matched automatically by day and sport" : ""}`}
        />
      ) : status === "missed" ? (
        <Notice icon="info" title="No activity recorded for this day" body="If you did it, log it or sync your watch — STREM won't mark it done without evidence. If you skipped it, that's fine: carry on with the next session." />
      ) : null}
      {session.kind !== "race" && session.kind !== "rest" ? (
        <>
          <Row gap={10} wrap>
            {!matched.length ? <Button label="Log this session" icon="plus" onPress={() => setLogOpen(true)} /> : null}
            {session.status !== "done" ? <Button label="Mark done" icon="check" kind="secondary" loading={busy} onPress={() => void patch({ status: "done", rpe, athlete_note: note || null })} /> : null}
            {session.status !== "skipped" ? <Button label="Skip" kind="ghost" onPress={() => void patch({ status: "skipped" })} /> : null}
            <Button label="Move" icon="calendar" kind="ghost" onPress={() => setMoveOpen(true)} />
          </Row>
          <Card pad={18} style={{ gap: 12 }}>
            <Text style={[ui(13, 700), { color: C.textMuted }]}>How did it feel? (RPE 1–10)</Text>
            <View style={styles.rpe}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={`Effort ${n} of 10`}
                  accessibilityState={{ selected: rpe === n }}
                  onPress={() => setRpe(n)}
                  style={[styles.rpeCell, rpe === n && { backgroundColor: C.white, borderColor: C.white }]}
                >
                  <Text style={[ui(14, 800), { color: rpe === n ? C.ink : C.text }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Input label="Notes for your race team" value={note} onChangeText={setNote} multiline placeholder="Legs, fueling, gear, anything worth remembering" />
            <Button label="Save feedback" kind="secondary" loading={busy} disabled={rpe == null && !note} onPress={() => void patch({ rpe, athlete_note: note || null })} />
          </Card>
        </>
      ) : null}
      <LogSheet visible={logOpen} onClose={() => setLogOpen(false)} session={session} onLogged={() => void race.refresh(["progress", "brief"], { briefRefresh: true })} />
      <Sheet visible={moveOpen} onClose={() => setMoveOpen(false)} title="Move this session">
        <DatePicker label="New date" value={session.date} min={today} onChange={(date) => void patch({ date }, () => setMoveOpen(false))} />
      </Sheet>
    </Page>
  );
}

function LogSheet({ visible, onClose, session, onLogged }: { visible: boolean; onClose: () => void; session: PlanSession; onLogged: () => void }) {
  const [minutes, setMinutes] = useState(String(session.duration_minutes ?? ""));
  const [distance, setDistance] = useState(session.distance_km ? String(session.distance_km) : "");
  const [elevation, setElevation] = useState(session.elevation_m ? String(session.elevation_m) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const duration = Number(minutes);
    if (!Number.isFinite(duration) || duration < 1) {
      setError("Enter how many minutes you trained.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const type = LOG_TYPE[session.sport] ?? "hybrid";
      const distanceOk = ["running", "trail_running", "cycling", "swimming", "hiking", "rowing", "skiing"].includes(type);
      await sessionsApi.log({
        session_type: type,
        duration_minutes: Math.round(duration),
        distance_km: distanceOk && distance ? Number(distance.replace(",", ".")) : null,
        elevation_m: elevation ? Math.round(Number(elevation)) : null,
        title: session.title,
        logged_at: `${session.date}T12:00:00Z`,
      });
      onLogged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Logging was not confirmed. Check before retrying so it isn't saved twice.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Log this session" footer={<Button label="Save session" icon="check" loading={busy} onPress={() => void save()} />}>
      <Body muted>Logged sessions count as recorded evidence and are matched to your plan automatically.</Body>
      {error ? <ErrorBanner message={error} /> : null}
      <Row gap={10} wrap align="flex-start">
        <Input label="Duration" value={minutes} onChangeText={setMinutes} suffix="min" keyboardType="number-pad" />
        <Input label="Distance" value={distance} onChangeText={setDistance} suffix="km" keyboardType="decimal-pad" />
        <Input label="Climbing" value={elevation} onChangeText={setElevation} suffix="m" keyboardType="number-pad" />
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  icon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2 },
  rpe: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rpeCell: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
});
