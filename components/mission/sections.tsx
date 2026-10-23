/** Mission home sections: today, the race-team brief, readiness, tracker, next, conditions. */

import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Meter, ProgressionLine, VolumeBars } from "@/components/ui/charts";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Body,
  Button,
  Card,
  Chip,
  Data,
  IconButton,
  Notice,
  OriginBadge,
  Overline,
  Row,
  SectionHeader,
  SourceTag,
  StatTile,
  StatusLabel,
  Title,
  useLayout,
} from "@/components/ui/kit";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import type { Brief, Conditions, MissionLayer, MissionPlan, MissionProgress, PlanSession } from "@/lib/api/race";
import { compact, dayLabel, hm, km, relativeDay } from "@/lib/race/format";
import type { LayerStatus } from "@/lib/race/readiness";
import { SESSION_ICON } from "@/lib/race/sports";
import { trackerSeries } from "@/lib/race/tracker";

const TARGET_ROUTE: Record<string, string> = {
  plan: "/(app)/plan",
  fuel: "/(app)/race?tab=fuel",
  gear: "/(app)/race?tab=gear",
  logistics: "/(app)/race?tab=logistics",
  strategy: "/(app)/race?tab=strategy",
  course: "/(app)/race?tab=course",
  checkin: "/(app)/checkin",
  sources: "/(app)/integrations",
  debrief: "/(app)/debrief",
  chat: "/(app)/team",
  training: "/(app)/plan",
};

export function TodayCard({
  plan,
  progress,
  today,
  onBuild,
  building,
}: {
  plan: MissionPlan | null;
  progress: MissionProgress | null;
  today: string;
  onBuild: () => void;
  building: boolean;
}) {
  const router = useRouter();
  if (!plan) {
    return (
      <Card tone="raised" pad={20} style={{ gap: 12 }}>
        <Overline>Your preparation</Overline>
        <Title size={26}>Build every layer of your race</Title>
        <Body muted>
          Training plan, fueling, gear, logistics and race strategy — built for this race from your answers, then refined by the AI race team.
        </Body>
        <Button label={building ? "Building your race plan…" : "Build my race plan"} icon="sparkles" onPress={onBuild} loading={building} size="lg" />
      </Card>
    );
  }
  const sessions = plan.content.weeks.flatMap((w) => w.sessions);
  const todays = sessions.filter((s) => s.date === today && s.kind !== "rest");
  const main = todays.sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0))[0];
  const status = main ? progress?.sessions.find((s) => s.id === main.id) : undefined;
  const nextKey = sessions.find((s) => s.date > today && s.key);
  if (!main) {
    return (
      <Card tone="raised" pad={20} style={{ gap: 10 }}>
        <Row>
          <Overline>Today · {dayLabel(today)}</Overline>
          <View style={{ flex: 1 }} />
          <StatusLabel status="rest" />
        </Row>
        <Title size={28}>Rest day</Title>
        <Body muted>Adaptation happens now. Sleep, eat well and move gently if you feel like it.</Body>
        {nextKey ? <SessionLine session={nextKey} today={today} onPress={() => router.push(`/(app)/session?id=${nextKey.id}`)} label="Next key session" /> : null}
      </Card>
    );
  }
  const done = status?.derived_status === "done" || status?.derived_status === "partial";
  return (
    <Card tone="raised" pad={20} style={{ gap: 12 }}>
      <Row>
        <Overline>Today · {dayLabel(today)}</Overline>
        <View style={{ flex: 1 }} />
        <StatusLabel status={done ? (status?.derived_status === "partial" ? "partial" : "done") : "today"} />
      </Row>
      <Row gap={12} align="flex-start">
        <View style={[styles.sessionIcon, { backgroundColor: `${LAYER_COLOR.training}22` }]}>
          <Icon name={SESSION_ICON[main.sport] ?? "run"} size={22} color={LAYER_COLOR.training} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Title size={26}>{main.title}</Title>
          <Row gap={14} wrap>
            {main.duration_minutes ? <Data size={14}>{hm(main.duration_minutes)}</Data> : null}
            {main.distance_km ? <Data size={14}>{km(main.distance_km)} km</Data> : null}
            {main.elevation_m ? <Data size={14}>+{main.elevation_m} m</Data> : null}
            <Text style={[ui(13, 600), { color: C.textMuted }]}>{main.intensity.replace("_", " ")}</Text>
          </Row>
        </View>
      </Row>
      <Body muted numberOfLines={3}>
        {main.purpose}
      </Body>
      {done && status?.matched[0] ? (
        <Notice
          icon="checkCircle"
          tone="accent"
          title={`Recorded: ${hm(status.matched[0].duration_minutes)}${status.matched[0].distance_km ? ` · ${km(status.matched[0].distance_km)} km` : ""}`}
          body={`${status.matched[0].title ?? "Activity"} · ${status.matched[0].source === "manual" ? "logged in STREM" : `from ${status.matched[0].source}`}`}
        />
      ) : null}
      <Row gap={10} wrap>
        <Button label="Open session" iconRight="chevron" onPress={() => router.push(`/(app)/session?id=${main.id}`)} />
        {todays.length > 1 ? <Chip label={`+${todays.length - 1} more today`} /> : null}
      </Row>
    </Card>
  );
}

function SessionLine({ session, today, onPress, label }: { session: PlanSession; today: string; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.sessionLine, pressed && { opacity: 0.8 }]}>
      <Icon name={SESSION_ICON[session.sport] ?? "run"} size={18} color={LAYER_COLOR.training} />
      <View style={{ flex: 1 }}>
        <Text style={[ui(12, 600), { color: C.textMuted }]}>
          {label} · {relativeDay(session.date, today)}
        </Text>
        <Text style={[ui(15, 700), { color: C.text }]}>{session.title}</Text>
      </View>
      <Data size={13} color={C.textMuted}>
        {hm(session.duration_minutes)}
      </Data>
      <Icon name="chevron" size={16} color={C.textDim} />
    </Pressable>
  );
}

export function BriefCard({ brief, loading, error, onRefresh }: { brief: Brief | null; loading: boolean; error: string | null; onRefresh: () => void }) {
  const router = useRouter();
  return (
    <Card pad={20} style={{ gap: 12 }}>
      <Row>
        <Icon name="sparkles" size={18} color={C.accent} />
        <Text style={[ui(14, 700), { color: C.text }]}>Race team brief</Text>
        {brief ? <OriginBadge origin={brief.origin} model={brief.model} /> : null}
        <View style={{ flex: 1 }} />
        {loading ? <ActivityIndicator color={C.textMuted} /> : <IconButton icon="refresh" label="Refresh brief" onPress={onRefresh} tone="plain" size={36} />}
      </Row>
      {!brief && loading ? <Body muted>Reading your plan, training and race data…</Body> : null}
      {!brief && error ? <Body muted>{error}</Body> : null}
      {brief ? (
        <>
          <Title size={24}>{brief.headline}</Title>
          <Body>{brief.message}</Body>
          {brief.evidence.length ? (
            <View style={styles.evidence}>
              {brief.evidence.map((e) => (
                <View key={e.label} style={styles.evidenceRow}>
                  <Text style={[ui(13, 600), { color: C.textMuted, flex: 1 }]}>{e.label}</Text>
                  <Text style={[ui(13, 700), { color: C.text, flex: 1.4, textAlign: "right" }]}>{e.value}</Text>
                  <View style={{ width: 78, alignItems: "flex-end" }}>
                    <SourceTag source={e.source} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {brief.risks.map((risk) => (
            <Row key={risk.title} gap={10} align="flex-start">
              <StatusLabel status={risk.severity === "critical" ? "critical" : risk.severity === "attention" ? "attention" : "info"} compact />
              <View style={{ flex: 1 }}>
                <Text style={[ui(14, 700), { color: C.text }]}>{risk.title}</Text>
                <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]}>{risk.detail}</Text>
              </View>
            </Row>
          ))}
          {brief.actions.length ? (
            <Row gap={8} wrap>
              {brief.actions.map((a) => (
                <Chip key={a.title} label={a.title} icon="chevron" color={C.text} onPress={() => router.push(TARGET_ROUTE[a.target] ?? "/(app)/home")} />
              ))}
            </Row>
          ) : null}
          {brief.ai_reason ? (
            <Text style={[ui(12, 500), { color: C.textDim, lineHeight: 17 }]}>AI race team offline: {brief.ai_reason} This brief is computed by the race engine from your data.</Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

export function ReadinessCard({ rows, onBuild, building }: { rows: LayerStatus[]; onBuild: () => void; building: boolean }) {
  const router = useRouter();
  const unbuilt = rows.filter((r) => !r.built && r.key !== "course");
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader overline="Work put in" title="Race readiness by layer" />
      <Card pad={6}>
        {rows.map((row, index) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={`${row.label}: ${row.detail}`}
            onPress={() => router.push(TARGET_ROUTE[row.key] ?? "/(app)/race")}
            style={({ pressed }) => [styles.readyRow, index > 0 && styles.readyDivider, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.layerIcon, { backgroundColor: `${LAYER_COLOR[row.key]}22` }]}>
              <Icon name={row.icon} size={18} color={LAYER_COLOR[row.key]} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Row>
                <Text style={[ui(15, 700), { color: C.text }]}>{row.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[ui(12, 600), { color: C.textMuted }]}>{row.pct != null ? `${Math.round(row.pct * 100)}%` : "–"}</Text>
              </Row>
              <Meter value={row.pct} color={LAYER_COLOR[row.key]} label={`${row.label} ${row.detail}`} />
              <Text style={[ui(12, 500), { color: C.textMuted }]} numberOfLines={1}>
                {row.detail}
                {row.next ? ` · Next: ${row.next}` : ""}
              </Text>
            </View>
          </Pressable>
        ))}
      </Card>
      {unbuilt.length ? (
        <Button label={building ? "Building…" : `Build ${unbuilt.map((r) => r.label.toLowerCase()).join(", ")}`} icon="sparkles" kind="secondary" onPress={onBuild} loading={building} />
      ) : null}
    </View>
  );
}

export function TrackerSection({ plan, progress }: { plan: MissionPlan | null; progress: MissionProgress | null }) {
  const { medium } = useLayout();
  if (!progress) return null;
  const totals = progress.totals;
  const { volume, longest } = trackerSeries(progress);
  // Early in a plan, the recent foundation says more than two matched sessions.
  const early = !totals || totals.planned_to_date < 3;
  const recent = sumVolume(progress.evidence.weeks.map((w) => w.volume));
  const done = early ? recent : totals.done;
  const weeksBefore = progress.evidence.weeks.length;
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader overline="Tracker" title="Training you've put in" />
      <Row gap={10} wrap align="stretch">
        <StatTile label="Time" value={done.hours >= 10 ? String(Math.round(done.hours)) : done.hours.toFixed(1)} unit="h" note={early ? `last ${weeksBefore} weeks` : "matched to your plan"} />
        <StatTile label="Distance" value={compact(done.km)} unit="km" />
        <StatTile label="Climbing" value={compact(done.elevation_m)} unit="m" />
        {early ? (
          <StatTile label="Sessions" value={String(done.sessions)} note={plan ? "consistency starts with your plan" : `last ${weeksBefore} weeks`} />
        ) : (
          <StatTile
            label="Consistency"
            value={totals.consistency_pct != null ? String(totals.consistency_pct) : "–"}
            unit={totals.consistency_pct != null ? "%" : undefined}
            note={`${totals.completed} done · ${totals.missed} without evidence`}
          />
        )}
      </Row>
      <View style={{ flexDirection: medium ? "row" : "column", gap: 12 }}>
        <Card pad={16} style={{ flex: 1.3 }}>
          <Text style={[ui(14, 700), { color: C.text, marginBottom: 6 }]}>{plan ? "Weekly hours: planned vs done" : "Weekly hours"}</Text>
          {volume.some((d) => (d.actual ?? 0) > 0 || (d.planned ?? 0) > 0) ? (
            <VolumeBars data={volume} color={LAYER_COLOR.training} />
          ) : (
            <Body muted size={13}>
              No training recorded yet. Connect Strava or log a session and it appears here.
            </Body>
          )}
        </Card>
        {longest.filter((p) => p.actual != null || p.planned != null).length > 1 ? (
          <Card pad={16} style={{ flex: 1 }}>
            <Text style={[ui(14, 700), { color: C.text, marginBottom: 6 }]}>Long-session progression</Text>
            <ProgressionLine points={longest} color={LAYER_COLOR.training} />
          </Card>
        ) : null}
      </View>
    </View>
  );
}

function sumVolume(volumes: { hours: number; km: number; elevation_m: number; sessions: number }[]) {
  return volumes.reduce(
    (acc, v) => ({ hours: acc.hours + v.hours, km: acc.km + v.km, elevation_m: acc.elevation_m + v.elevation_m, sessions: acc.sessions + v.sessions }),
    { hours: 0, km: 0, elevation_m: 0, sessions: 0 },
  );
}

export function ComingUp({ plan, layers, today }: { plan: MissionPlan | null; layers: Partial<Record<string, MissionLayer>>; today: string }) {
  const router = useRouter();
  const sessions = plan ? plan.content.weeks.flatMap((w) => w.sessions).filter((s) => s.date > today && s.key && s.kind !== "race").slice(0, 3) : [];
  const race = plan?.content.weeks.flatMap((w) => w.sessions).find((s) => s.kind === "race");
  const tasks = (["logistics", "gear", "fuel"] as const)
    .flatMap((kind) =>
      (layers[kind]?.content.sections ?? []).flatMap((s) => s.items.map((i) => ({ ...i, kind }))),
    )
    .filter((i) => i.due_date && (i.status ?? "todo") === "todo")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 4);
  if (!sessions.length && !tasks.length) return null;
  const icons: Record<string, IconName> = { logistics: "map", gear: "pack", fuel: "drop" };
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader overline="Next" title="Coming up" />
      <Card pad={6}>
        {sessions.map((s, i) => (
          <Pressable key={s.id} accessibilityRole="button" onPress={() => router.push(`/(app)/session?id=${s.id}`)} style={({ pressed }) => [styles.nextRow, i > 0 && styles.readyDivider, pressed && { opacity: 0.8 }]}>
            <View style={[styles.layerIcon, { backgroundColor: `${LAYER_COLOR.training}22` }]}>
              <Icon name={SESSION_ICON[s.sport] ?? "run"} size={18} color={LAYER_COLOR.training} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ui(15, 700), { color: C.text }]}>{s.title}</Text>
              <Text style={[ui(12, 500), { color: C.textMuted }]}>
                {relativeDay(s.date, today)} · {hm(s.duration_minutes)}
                {s.distance_km ? ` · ${km(s.distance_km)} km` : ""}
              </Text>
            </View>
            <Icon name="chevron" size={16} color={C.textDim} />
          </Pressable>
        ))}
        {tasks.map((t, i) => (
          <Pressable key={`${t.kind}${t.id}`} accessibilityRole="button" onPress={() => router.push(TARGET_ROUTE[t.kind])} style={({ pressed }) => [styles.nextRow, (i > 0 || sessions.length > 0) && styles.readyDivider, pressed && { opacity: 0.8 }]}>
            <View style={[styles.layerIcon, { backgroundColor: `${LAYER_COLOR[t.kind]}22` }]}>
              <Icon name={icons[t.kind]} size={18} color={LAYER_COLOR[t.kind]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ui(15, 700), { color: C.text }]} numberOfLines={1}>
                {t.title}
              </Text>
              <Text style={[ui(12, 500), { color: (t.due_date ?? "") <= today ? C.warning : C.textMuted }]}>{dueLabel(t.due_date ?? today, today)}</Text>
            </View>
            <Icon name="chevron" size={16} color={C.textDim} />
          </Pressable>
        ))}
        {race ? (
          <View style={[styles.nextRow, styles.readyDivider]}>
            <View style={[styles.layerIcon, { backgroundColor: C.flameSoft }]}>
              <Icon name="flag" size={18} color={C.flame} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ui(15, 700), { color: C.text }]}>Race day</Text>
              <Text style={[ui(12, 500), { color: C.textMuted }]}>{dayLabel(race.date)}</Text>
            </View>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

/** "Due now", "Due tomorrow", "Due in 3 days" or "Due Sat 6 Feb". */
function dueLabel(due: string, today: string): string {
  if (due <= today) return "Due now";
  const rel = relativeDay(due, today);
  return `Due ${/^(Tomorrow|In \d+ days)$/.test(rel) ? rel.toLowerCase() : rel}`;
}

function weatherIcon(c: Conditions): IconName {
  const w = (c.weather ?? "").toLowerCase();
  if (w.includes("rain") || w.includes("shower") || w.includes("drizzle") || (c.precipitation_probability ?? 0) >= 60) return "rain";
  if (w.includes("cloud") || w.includes("overcast") || w.includes("fog")) return "cloud";
  if ((c.wet_day_share ?? 0) >= 0.5) return "rain";
  return "sun";
}

export function ConditionsCard({ conditions }: { conditions: Conditions | null | undefined }) {
  if (!conditions) return null;
  return (
    <Card pad={20} style={{ gap: 12 }}>
      <Row>
        <Icon name={weatherIcon(conditions)} size={22} color={C.text} />
        <Text style={[ui(14, 700), { color: C.text }]}>Race-day conditions</Text>
        <View style={{ flex: 1 }} />
        <Chip label={conditions.kind === "forecast" ? "Forecast" : "Seasonal assumption"} icon={conditions.kind === "forecast" ? "cloud" : "info"} />
      </Row>
      <Row gap={22} wrap align="flex-end">
        {conditions.temp_max_c != null ? (
          <View>
            <Text style={[disp(40, 800), { color: C.text, lineHeight: 42 }]}>
              {Math.round(conditions.temp_min_c ?? 0)}–{Math.round(conditions.temp_max_c)}°
            </Text>
            <Text style={[ui(12, 600), { color: C.textMuted }]}>low – high</Text>
          </View>
        ) : null}
        {conditions.sunrise && conditions.sunset ? (
          <View>
            <Row gap={6}>
              <Icon name="sunrise" size={16} color={C.textMuted} />
              <Data size={15}>
                {conditions.sunrise.slice(-5)} – {conditions.sunset.slice(-5)}
              </Data>
            </Row>
            <Text style={[ui(12, 600), { color: C.textMuted }]}>daylight</Text>
          </View>
        ) : null}
        {conditions.wind_max_kmh != null ? (
          <View>
            <Row gap={6}>
              <Icon name="wind" size={16} color={C.textMuted} />
              <Data size={15}>{Math.round(conditions.wind_max_kmh)} km/h</Data>
            </Row>
            <Text style={[ui(12, 600), { color: C.textMuted }]}>max wind</Text>
          </View>
        ) : null}
      </Row>
      <Body muted size={13}>
        {conditions.summary}
        {conditions.altitude_note ? ` ${conditions.altitude_note}` : ""}
      </Body>
      <Text style={[ui(11, 600), { color: C.textDim }]}>Source: {conditions.source}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  sessionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sessionLine: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 56 },
  evidence: { borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  evidenceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 64 },
  readyDivider: { borderTopWidth: 1, borderTopColor: C.line },
  layerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 60 },
});
