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
  Chip,
  Data,
  EmptyState,
  ErrorBanner,
  IconButton,
  Notice,
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
import { ProposalCard } from "@/components/plan/proposal-card";
import { SeasonStrip } from "@/components/plan/seasons";
import { SessionRow, sessionStatus } from "@/components/plan/session-row";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import { addDays, capitalize, dayLabel, km, mondayOf, todayIn, weekdayShort } from "@/lib/race/format";
import { raceConflicts } from "@/lib/race/priority";
import { useRace } from "@/lib/race/race-context";
import { useBuilder } from "@/lib/race/use-builder";

export default function PlanScreen() {
  const race = useRace();
  const { mission, missions, plan, timeline, timelineProgress: progress } = race;
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const refresh = useCallback(() => race.refresh(["plan", "progress", "brief"], { briefRefresh: true }), [race]);
  const builder = useBuilder(refresh);
  const content = timeline?.content ?? null;
  const today = todayIn(content?.timezone ?? mission?.event.timezone);
  const weeks = useMemo(() => content?.weeks ?? [], [content]);
  const currentIndex = useMemo(() => {
    const monday = mondayOf(today);
    const i = weeks.findIndex((w) => w.start_date === monday);
    return i >= 0 ? i : today < (weeks[0]?.start_date ?? today) ? 0 : Math.max(weeks.length - 1, 0);
  }, [weeks, today]);
  const index = picked != null && picked < weeks.length ? picked : currentIndex;
  const setWeekIndex = (value: number | null) => setPicked(value);
  const week = weeks[index];
  const statusById = useMemo(() => new Map((progress?.sessions ?? []).map((s) => [s.id, s])), [progress]);
  const weekProgress = progress?.weeks.find((w) => w.index === week?.index);
  const races = useMemo(() => new Map((timeline?.races ?? []).map((r) => [r.mission_id, r])), [timeline]);
  const upcoming = (timeline?.races ?? []).filter((r) => r.state === "active" && r.race_date >= today);
  const weekRace = week?.mission_id ? races.get(week.mission_id) : undefined;
  const weekSeason = week?.season_id ? (timeline?.seasons ?? []).find((s) => s.id === week.season_id) : undefined;
  const generate = mission ? () => void builder.build(mission.id, ["plan"]) : undefined;

  if (timeline === undefined) {
    return (
      <Page>
        <Skeleton height={36} width="60%" />
        <Skeleton height={120} radius={22} />
        <Skeleton height={320} radius={22} />
      </Page>
    );
  }
  if (!content || !weeks.length) {
    return (
      <Page>
        <Overline>Your plan</Overline>
        <Title size={40}>{mission ? mission.event.name : "Train with a plan"}</Title>
        {race.timelineError ? <ErrorBanner message={race.timelineError} onRetry={() => void race.refreshTimeline()} /> : null}
        <EmptyState
          icon="calendar"
          title="No plan yet"
          body={
            mission
              ? "Your AI race team can build every week to race day around your availability, fitness and the course — or bring the plan you already follow."
              : "Bring the plan you already follow — it doesn't need a race. Add a race any time and the race team plans around it."
          }
          action={
            <Row gap={10} wrap style={{ justifyContent: "center" }}>
              {generate ? <Button label="Generate it for me" icon="sparkles" loading={builder.running} onPress={generate} /> : null}
              <Button label="Import my plan" icon="upload" kind={generate ? "secondary" : "primary"} onPress={() => router.push("/(app)/plan-import")} />
              {!missions.length ? <Button label="Add a race" icon="flag" kind="ghost" onPress={() => router.push("/(app)/mission-setup")} /> : null}
            </Row>
          }
        />
        <BuildPanel states={builder.states} />
        <SeasonStrip seasons={timeline?.seasons ?? []} onChanged={() => void race.refreshTimeline()} />
      </Page>
    );
  }

  const allDays = week ? Array.from({ length: 7 }, (_, i) => addDays(week.start_date, i)) : [];
  const days = allDays;
  const isLast = index === weeks.length - 1;
  const why = week?.mission_id && plan?.mission_id === week.mission_id ? plan.content : null;
  return (
    <Page>
      <Overline>Your plan</Overline>
      <Title size={38}>{timeline?.next_race ? `Road to ${timeline.next_race.name}` : "Your training"}</Title>
      {upcoming.length ? (
        <Row gap={8} wrap>
          {upcoming.slice(0, 4).map((r) => (
            <RaceMarker key={r.mission_id} name={r.name} date={r.race_date} priority={r.priority} />
          ))}
        </Row>
      ) : (
        <Body muted size={13}>
          No race ahead — this is your own plan. Add a race and the race team plans around it.
        </Body>
      )}
      <SeasonStrip seasons={timeline?.seasons ?? []} onChanged={() => void race.refreshTimeline()} />
      {content.phases.length ? (
        <Card pad={16} style={{ gap: 6 }}>
          <Text style={[ui(13, 700), { color: C.textMuted }]}>Road ahead</Text>
          <PhaseBar phases={content.phases.map((p) => ({ phase: p.phase, start: p.start_date, end: p.end_date }))} today={today} color={LAYER_COLOR.training} />
        </Card>
      ) : null}
      {race.timelineError ? <ErrorBanner message={race.timelineError} onRetry={() => void race.refreshTimeline()} /> : null}
      {raceConflicts(missions, today).map((c) => (
        <Notice key={c} icon="alert" tone="attention" title="Races clash" body={c} action={<TextLink label="Change priorities" onPress={() => router.push("/(app)/missions")} />} />
      ))}
      <BuildPanel states={builder.states} />
      {mission && race.brief?.proposal?.status === "pending" ? (
        <ProposalCard missionId={mission.id} proposal={race.brief.proposal} onDecided={() => void refresh()} />
      ) : null}
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
            <Row gap={8} wrap>
              <Chip
                label={weekRace ? `${weekRace.priority} · ${weekRace.name}` : weekSeason ? weekSeason.name : "Your own plan"}
                icon={weekRace ? "flag" : "user"}
                color={weekRace ? C.text : C.textMuted}
              />
              {week.source === "race" ? <OriginBadge origin={week.origin} /> : null}
              {why || week.source === "base" ? (
                <TextLink label={showWhy ? "Hide the reasoning" : "Why this week"} icon={showWhy ? "chevronUp" : "chevronDown"} onPress={() => setShowWhy((v) => !v)} />
              ) : null}
            </Row>
            {showWhy ? (
              why ? (
                <WhyCard summary={why.summary} principles={why.principles} assumptions={why.assumptions} warnings={why.warnings} />
              ) : (
                <Body muted size={13}>{content.summary || "Weeks no race plan covers follow the plan you brought."}</Body>
              )
            ) : null}
            <Body>{week.focus}</Body>
            <Row gap={18} wrap>
              <Target label="Planned" value={week.target_hours != null ? `${week.target_hours} h` : "–"} />
              {week.target_km ? <Target label="Distance" value={`${km(week.target_km)} km`} /> : null}
              {week.target_elevation_m ? <Target label="Climbing" value={`${week.target_elevation_m} m`} /> : null}
              {week.long_session ? <Target label="Long session" value={week.long_session} /> : null}
            </Row>
            {weekProgress && weekProgress.timing !== "future" ? (
              <View style={{ gap: 6 }}>
                <Text style={[ui(12, 600), { color: C.textMuted }]}>
                  Done {hours(weekProgress.actual.hours)} h of {hours(weekProgress.planned.hours)} h · {weekProgress.actual.sessions} session{weekProgress.actual.sessions === 1 ? "" : "s"}
                </Text>
                <Meter value={weekProgress.planned.hours ? weekProgress.actual.hours / weekProgress.planned.hours : null} color={LAYER_COLOR.training} label="Week completion" />
              </View>
            ) : null}
            {week.notes ? <Body muted size={13}>{week.notes}</Body> : null}
          </Card>
          <View style={{ gap: 8 }}>
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
          {isLast ? (
            <Notice
              icon="calendar"
              title={`Your plan ends ${dayLabel(addDays(week.start_date, 6))}`}
              body={timeline?.next_race && timeline.next_race.race_date > addDays(week.start_date, 6) ? `${timeline.next_race.name} is on ${dayLabel(timeline.next_race.race_date)} — build or bring the next block.` : "Bring your next block, or add a race and let the race team plan it."}
            />
          ) : null}
        </>
      ) : null}
      <Row gap={10} wrap>
        {week?.source === "race" && week.mission_id ? <Button label="Adapt this race plan" icon="sliders" kind="secondary" onPress={() => setAdaptOpen(true)} /> : null}
        <Button label="Import my plan" icon="upload" kind="ghost" onPress={() => router.push("/(app)/plan-import")} />
        {generate ? (
          <Button label={plan ? `Rebuild plan for ${mission?.event.name}` : `Generate a plan for ${mission?.event.name}`} icon="refresh" kind="ghost" loading={builder.running} onPress={generate} />
        ) : null}
      </Row>
      {week?.mission_id ? <AdaptSheet visible={adaptOpen} onClose={() => setAdaptOpen(false)} missionId={week.mission_id} onAccepted={() => void refresh()} /> : null}
    </Page>
  );
}

function RaceMarker({ name, date, priority }: { name: string; date: string; priority: "A" | "B" | "C" }) {
  const tone = priority === "A" ? C.flame : priority === "B" ? C.accent : C.textMuted;
  return (
    <View style={[styles.marker, { borderColor: `${tone}55` }]} accessibilityLabel={`${priority} race ${name}, ${dayLabel(date)}`}>
      <Text style={[ui(11, 900), { color: tone }]}>{priority}</Text>
      <Text style={[ui(12, 700), { color: C.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[ui(11, 600), { color: C.textMuted }]}>{dayLabel(date, false)}</Text>
    </View>
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
  dayLabel: { width: 40, alignItems: "center", paddingTop: 6 },
  marker: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: C.surface, maxWidth: 260 },
});
