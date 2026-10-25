import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdaptSheet } from "@/components/plan/adapt-sheet";
import { Meter, PhaseBar } from "@/components/ui/charts";
import { Icon } from "@/components/ui/icon";
import {
  Body,
  Button,
  Card,
  Data,
  EmptyState,
  ErrorBanner,
  IconButton,
  OriginBadge,
  Overline,
  Page,
  Row,
  Skeleton,
  StatusLabel,
  TextLink,
  Title,
} from "@/components/ui/kit";
import { BuildPanel } from "@/components/mission/build-panel";
import { SessionRow, sessionStatus } from "@/components/plan/session-row";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import { addDays, capitalize, dayLabel, km, mondayOf, todayIn, weekdayShort } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { useBuilder } from "@/lib/race/use-builder";

export default function PlanScreen() {
  const race = useRace();
  const { mission, plan, progress } = race;
  const router = useRouter();
  // The picked week belongs to one plan; switching missions falls back to this week.
  const [picked, setPicked] = useState<{ mission: string; index: number } | null>(null);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const refresh = useCallback(() => race.refresh(["plan", "progress", "brief"], { briefRefresh: true }), [race]);
  const builder = useBuilder(refresh);
  const today = todayIn(mission?.event.timezone);
  const weeks = useMemo(() => plan?.content.weeks ?? [], [plan]);
  const currentIndex = useMemo(() => {
    const monday = mondayOf(today);
    const i = weeks.findIndex((w) => w.start_date === monday);
    return i >= 0 ? i : today < (weeks[0]?.start_date ?? today) ? 0 : Math.max(weeks.length - 1, 0);
  }, [weeks, today]);
  const index = picked && picked.mission === plan?.mission_id ? picked.index : currentIndex;
  const setWeekIndex = (value: number | null) => setPicked(value == null || !plan ? null : { mission: plan.mission_id, index: value });
  const week = weeks[index];
  const statusById = useMemo(() => new Map((progress?.sessions ?? []).map((s) => [s.id, s])), [progress]);
  const weekProgress = progress?.weeks.find((w) => w.index === week?.index);

  if (!mission) {
    return (
      <Page>
        <EmptyState title="No race yet" body="Start a Race Mission and your plan appears here." action={<Button label="Start a Race Mission" onPress={() => router.push("/(app)/mission-setup")} />} />
      </Page>
    );
  }
  if (race.dataLoading && !plan) {
    return (
      <Page>
        <Skeleton height={36} width="60%" />
        <Skeleton height={120} radius={22} />
        <Skeleton height={320} radius={22} />
      </Page>
    );
  }
  if (!plan) {
    return (
      <Page>
        <Overline>Training plan</Overline>
        <Title size={40}>{mission.event.name}</Title>
        {race.dataError ? <ErrorBanner message={race.dataError} onRetry={() => void race.refresh()} /> : null}
        <EmptyState
          icon="calendar"
          title="Your plan isn't built yet"
          body="STREM periodizes every week from today to race day around your availability, current fitness and the course — then the AI race team personalizes it."
          action={<Button label="Build my training plan" icon="sparkles" loading={builder.running} onPress={() => void builder.build(mission.id, ["plan"])} />}
        />
        <BuildPanel states={builder.states} />
      </Page>
    );
  }

  const allDays = week ? Array.from({ length: 7 }, (_, i) => addDays(week.start_date, i)) : [];
  const preDays = allDays.filter((d) => d < plan.content.start_date);
  const days = allDays.filter((d) => d >= plan.content.start_date);
  // The first week can start mid-week: its calendar-week volume includes days before the plan.
  const partialWeek = preDays.length > 0;
  return (
    <Page>
      <Row align="flex-start">
        <View style={{ flex: 1, gap: 6 }}>
          <Overline>Training plan · {mission.event.name}</Overline>
          <Title size={38}>{plan.content.headline}</Title>
        </View>
      </Row>
      <Row gap={8} wrap>
        <OriginBadge origin={plan.origin} model={plan.model} />
        <TextLink label={showWhy ? "Hide the reasoning" : "Why this plan"} icon={showWhy ? "chevronUp" : "chevronDown"} onPress={() => setShowWhy((v) => !v)} />
      </Row>
      {showWhy ? <WhyCard summary={plan.content.summary} principles={plan.content.principles} assumptions={plan.content.assumptions} warnings={plan.content.warnings} /> : null}
      <Card pad={16} style={{ gap: 6 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Road to race day</Text>
        <PhaseBar phases={plan.content.phases.map((p) => ({ phase: p.phase, start: p.start_date, end: p.end_date }))} today={today} color={LAYER_COLOR.training} />
      </Card>
      {race.dataError ? <ErrorBanner message={race.dataError} onRetry={() => void race.refresh()} /> : null}
      <BuildPanel states={builder.states} />
      {week ? (
        <>
          <Row gap={10}>
            <IconButton icon="chevronL" label="Previous week" onPress={() => setWeekIndex(Math.max(0, index - 1))} tone="surface" />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[disp(22, 800), { color: C.text }]}>
                Week {week.index} · {capitalize(week.phase)}
              </Text>
              <Text style={[ui(12, 600), { color: C.textMuted }]}>
                {dayLabel(week.start_date, false)} – {dayLabel(addDays(week.start_date, 6), false)}
                {index === currentIndex ? " · this week" : ""}
              </Text>
            </View>
            <IconButton icon="chevron" label="Next week" onPress={() => setWeekIndex(Math.min(weeks.length - 1, index + 1))} tone="surface" />
          </Row>
          {index !== currentIndex ? <Button label="Back to this week" kind="ghost" size="sm" onPress={() => setWeekIndex(null)} /> : null}
          <Card pad={18} style={{ gap: 12 }}>
            <Body>{week.focus}</Body>
            <Row gap={18} wrap>
              <Target label="Planned" value={week.target_hours != null ? `${week.target_hours} h` : "–"} />
              {week.target_km ? <Target label="Distance" value={`${km(week.target_km)} km`} /> : null}
              {week.target_elevation_m ? <Target label="Climbing" value={`${week.target_elevation_m} m`} /> : null}
              {week.long_session ? <Target label="Long session" value={week.long_session} /> : null}
            </Row>
            {weekProgress && weekProgress.timing !== "future" && partialWeek ? (
              <Text style={[ui(12, 600), { color: C.textMuted }]}>
                This week so far: {hours(weekProgress.actual.hours)} h in {weekProgress.actual.sessions} session{weekProgress.actual.sessions === 1 ? "" : "s"} · the plan adds {hours(weekProgress.planned.hours)} h from {dayLabel(plan.content.start_date)}
              </Text>
            ) : weekProgress && weekProgress.timing !== "future" ? (
              <View style={{ gap: 6 }}>
                <Row>
                  <Text style={[ui(12, 600), { color: C.textMuted }]}>
                    Done {hours(weekProgress.actual.hours)} h of {hours(weekProgress.planned.hours)} h · {weekProgress.actual.sessions} session{weekProgress.actual.sessions === 1 ? "" : "s"}
                  </Text>
                </Row>
                <Meter value={weekProgress.planned.hours ? weekProgress.actual.hours / weekProgress.planned.hours : null} color={LAYER_COLOR.training} label="Week completion" />
              </View>
            ) : null}
            {week.notes ? <Body muted size={13}>{week.notes}</Body> : null}
          </Card>
          <View style={{ gap: 8 }}>
            {preDays.length ? (
              <View style={[styles.day, styles.preDays]}>
                <Icon name="calendar" size={16} color={C.textDim} />
                <Text style={[ui(13, 500), { color: C.textMuted, flex: 1 }]}>
                  {weekdayShort(preDays[0])}
                  {preDays.length > 1 ? `–${weekdayShort(preDays[preDays.length - 1])}` : ""} · before your plan, which starts {dayLabel(plan.content.start_date)}
                </Text>
              </View>
            ) : null}
            {days.map((day) => {
              const sessions = week.sessions.filter((s) => s.date === day);
              return (
                <View key={day} style={[styles.day, day === today && styles.today]}>
                  <View style={styles.dayLabel}>
                    <Text style={[ui(12, 700), { color: day === today ? C.text : C.textMuted }]}>{weekdayShort(day)}</Text>
                    <Text style={[disp(22, 800), { color: day === today ? C.text : C.textMuted }]}>{Number(day.slice(8))}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    {sessions.length === 0 ? <Text style={[ui(13, 500), { color: C.textDim, paddingVertical: 14 }]}>—</Text> : null}
                    {sessions.map((s) => (
                      <SessionRow key={s.id} session={s} status={sessionStatus(s, statusById.get(s.id), today)} onPress={() => router.push(`/(app)/session?id=${s.id}`)} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
      <Row gap={10} wrap>
        <Button label="Adapt my plan" icon="sliders" kind="secondary" onPress={() => setAdaptOpen(true)} />
        <Button label="Rebuild plan" icon="refresh" kind="ghost" loading={builder.running} onPress={() => void builder.build(mission.id, ["plan"])} />
      </Row>
      <AdaptSheet visible={adaptOpen} onClose={() => setAdaptOpen(false)} missionId={mission.id} onAccepted={() => void refresh()} />
    </Page>
  );
}

const hours = (value: number) => km(Math.round(value * 10) / 10);

function Target({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={[ui(11, 600), { color: C.textDim }]}>{label}</Text>
      <Data size={15}>{value}</Data>
    </View>
  );
}

function WhyCard({ summary, principles, assumptions, warnings }: { summary: string; principles: string[]; assumptions: string[]; warnings: string[] }) {
  return (
    <Card pad={18} style={{ gap: 12 }}>
      <Body>{summary}</Body>
      {warnings.length ? (
        <View style={{ gap: 6 }}>
          {warnings.map((w) => (
            <Row key={w} gap={8} align="flex-start">
              <StatusLabel status="attention" compact />
              <Text style={[ui(13, 500), { color: C.text, flex: 1, lineHeight: 19 }]}>{w}</Text>
            </Row>
          ))}
        </View>
      ) : null}
      <Text style={[ui(13, 700), { color: C.textMuted }]}>Principles</Text>
      {principles.map((p) => (
        <Row key={p} gap={8} align="flex-start">
          <Icon name="check" size={14} color={C.accent} />
          <Text style={[ui(13, 500), { color: C.text, flex: 1, lineHeight: 19 }]}>{p}</Text>
        </Row>
      ))}
      <Text style={[ui(13, 700), { color: C.textMuted }]}>Built from</Text>
      {assumptions.map((a) => (
        <Row key={a} gap={8} align="flex-start">
          <Icon name="info" size={14} color={C.textDim} />
          <Text style={[ui(12, 500), { color: C.textMuted, flex: 1, lineHeight: 18 }]}>{a}</Text>
        </Row>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  day: { flexDirection: "row", gap: 12, padding: 10, borderRadius: 18, backgroundColor: C.night, borderWidth: 1, borderColor: C.line },
  today: { borderColor: C.lineStrong, backgroundColor: C.surface },
  preDays: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderStyle: "dashed" },
  dayLabel: { width: 40, alignItems: "center", paddingTop: 6 },
});
