/**
 * Training visuals (mobile#120): a consistency calendar of planned sessions by
 * day and a training-load trend with the ramp against the 4-week average.
 * Dataviz specs as in charts.tsx: status colours only with icon + label,
 * 2 px gaps between cells, text in text tokens, press a mark to inspect it.
 */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/ui/icon";
import { Row } from "@/components/ui/kit";
import { C, R, disp, ui } from "@/constants/theme";
import type { MissionProgress, SessionProgress } from "@/lib/api/race";
import { addDays, dayLabel } from "@/lib/race/format";

type CellState = "done" | "partial" | "missed" | "planned" | "rest" | "none";

const CELL: Record<CellState, { color: string; label: string; icon: IconName }> = {
  done: { color: C.good, label: "Done", icon: "checkCircle" },
  partial: { color: C.warning, label: "Partial", icon: "halfCircle" },
  missed: { color: C.serious, label: "Missed or skipped", icon: "xCircle" },
  planned: { color: C.textDim, label: "Planned", icon: "circle" },
  rest: { color: C.surface2, label: "Rest", icon: "moon" },
  none: { color: C.surface2, label: "Nothing planned", icon: "minus" },
};

/** The most telling status when a day has several sessions. */
function dayState(sessions: SessionProgress[], day: string): CellState {
  const s = sessions.filter((x) => x.date === day && x.kind !== "rest");
  if (!s.length) return sessions.some((x) => x.date === day) ? "rest" : "none";
  const st = s.map((x) => x.derived_status);
  if (st.includes("done") && st.every((x) => x === "done" || x === "rest")) return "done";
  if (st.includes("done") || st.includes("partial")) return "partial";
  if (st.some((x) => x === "missed" || x === "skipped")) return "missed";
  return "planned";
}

const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
};

/** Weeks × weekdays grid of the plan: what was done, partly done, missed and still planned. */
export function ConsistencyCalendar({ progress, today, weeks = 10 }: { progress: MissionProgress; today: string; weeks?: number }) {
  const [picked, setPicked] = useState<string | null>(null);
  // Start at the plan's first week (at most 7 weeks back), so future weeks show what is planned.
  const first = progress.sessions.reduce((m, s) => (s.date < m ? s.date : m), today);
  const earliest = addDays(mondayOf(today), -7 * 7);
  const start = mondayOf(first) > earliest ? mondayOf(first) : earliest;
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const sessions = progress.sessions;
  const pickedSessions = picked ? sessions.filter((s) => s.date === picked && s.kind !== "rest") : [];
  const counts = columns.flat().filter((d) => d <= today).map((d) => dayState(sessions, d));
  const done = counts.filter((s) => s === "done").length;
  const due = counts.filter((s) => s === "done" || s === "partial" || s === "missed").length;
  return (
    <View style={{ gap: 10 }}>
      <Row>
        <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>Consistency calendar</Text>
        {due ? <Text style={[ui(12, 600), { color: C.textMuted }]}>{done} of {due} training days done</Text> : null}
      </Row>
      <Row gap={2} align="flex-start">
        <View style={{ gap: 2, marginRight: 4 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Text key={i} style={[ui(10, 600), styles.weekday]}>
              {d}
            </Text>
          ))}
        </View>
        {columns.map((days) => (
          <View key={days[0]} style={{ gap: 2, flex: 1 }}>
            {days.map((day) => {
              const state = dayState(sessions, day);
              const cell = CELL[state];
              const filled = state === "done" || state === "partial" || state === "missed";
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(day)}: ${cell.label}`}
                  onPress={() => setPicked(picked === day ? null : day)}
                  style={[
                    styles.cell,
                    { backgroundColor: filled ? cell.color : C.surface2 },
                    state === "planned" && { borderWidth: 1.5, borderColor: C.textDim, backgroundColor: "transparent" },
                    day === today && styles.today,
                    picked === day && { borderWidth: 2, borderColor: C.white },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </Row>
      {picked ? (
        <View style={styles.readout}>
          <Text style={[ui(13, 700), { color: C.text }]}>{dayLabel(picked)}</Text>
          {pickedSessions.length ? (
            pickedSessions.map((s) => {
              const state = dayState([s], picked);
              return (
                <Row key={s.id} gap={6}>
                  <Icon name={CELL[state].icon} size={13} color={state === "planned" ? C.textMuted : CELL[state].color} />
                  <Text style={[ui(12.5, 500), { color: C.textMuted, flex: 1 }]} numberOfLines={1}>
                    {s.title} · {CELL[state].label.toLowerCase()}
                  </Text>
                </Row>
              );
            })
          ) : (
            <Text style={[ui(12.5, 500), { color: C.textMuted }]}>No training planned.</Text>
          )}
        </View>
      ) : null}
      <View style={styles.legend}>
        {(["done", "partial", "missed", "planned"] as CellState[]).map((k) => (
          <Row key={k} gap={6}>
            <View style={[styles.swatch, k === "planned" ? { borderWidth: 1.5, borderColor: C.textDim } : { backgroundColor: CELL[k].color }]} />
            <Text style={[ui(12, 600), { color: C.textMuted }]}>{CELL[k].label}</Text>
          </Row>
        ))}
      </View>
    </View>
  );
}

/** The last 12 complete weeks of recorded training: a week in progress would always look like a drop. */
export function fullWeeks(progress: MissionProgress) {
  const thisWeek = mondayOf(progress.as_of.slice(0, 10));
  return progress.evidence.weeks.filter((w) => w.start_date < thisWeek).slice(-12);
}

/** Weekly recorded hours with the 4-week rolling average, and this week's ramp against it. */
export function LoadTrend({ progress }: { progress: MissionProgress }) {
  const [width, setWidth] = useState(0);
  const weeks = fullWeeks(progress);
  const hours = weeks.map((w) => w.volume.hours);
  if (hours.filter((h) => h > 0).length < 2) return null;
  const rolling = hours.map((_, i) => {
    const prior = hours.slice(Math.max(0, i - 4), i);
    return prior.length >= 2 ? prior.reduce((s, h) => s + h, 0) / prior.length : null;
  });
  const current = hours[hours.length - 1];
  const base = rolling[rolling.length - 1];
  const ramp = base ? Math.round(((current - base) / base) * 100) : null;
  const height = 96;
  const max = Math.max(...hours, ...rolling.map((r) => r ?? 0), 1);
  const x = (i: number) => (hours.length > 1 ? (i / (hours.length - 1)) * (width - 8) + 4 : width / 2);
  const y = (v: number) => height - 6 - (v / max) * (height - 14);
  const line = hours.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h).toFixed(1)}`).join(" ");
  const avg = rolling.map((r, i) => (r == null ? null : `${x(i).toFixed(1)},${y(r).toFixed(1)}`)).filter(Boolean);
  const steep = ramp != null && ramp > 30;
  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text style={[ui(14, 700), { color: C.text }]}>Training load</Text>
        <Text style={[ui(12, 500), { color: C.textMuted }]}>Hours per full week, last {weeks.length} weeks</Text>
      </View>
      <Row gap={10} align="flex-end" wrap>
        <Text style={[disp(28, 800), { color: C.text }]}>{current.toFixed(1)} h</Text>
        <View style={{ paddingBottom: 4, flexShrink: 1 }}>
          {ramp != null ? (
            <Row gap={4}>
              {steep ? <Icon name="alert" size={12} color={C.warning} /> : null}
              <Text style={[ui(12, 700), { color: steep ? C.warning : C.textMuted, flexShrink: 1 }]}>
                last week · {ramp >= 0 ? "+" : ""}
                {ramp}% vs the 4 weeks before
              </Text>
            </Row>
          ) : null}
        </View>
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height - 6} y2={height - 6} stroke={C.line} strokeWidth={1} />
            {avg.length > 1 ? <Path d={`M${avg.join(" L")}`} stroke={C.textMuted} strokeWidth={2} strokeDasharray="4 4" fill="none" /> : null}
            <Path d={line} stroke={C.text} strokeWidth={2} fill="none" strokeLinejoin="round" />
            <Circle cx={x(hours.length - 1)} cy={y(current)} r={4} fill={C.text} stroke={C.surface} strokeWidth={2} />
          </Svg>
        ) : null}
      </View>
      <Row gap={14}>
        <Row gap={6}>
          <View style={{ width: 14, height: 2, backgroundColor: C.text }} />
          <Text style={[ui(12, 600), { color: C.textMuted }]}>Recorded</Text>
        </Row>
        <Row gap={6}>
          <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: "dashed", borderColor: C.textMuted }} />
          <Text style={[ui(12, 600), { color: C.textMuted }]}>4-week average</Text>
        </Row>
      </Row>
      {steep ? <Text style={[ui(12, 500), { color: C.textMuted }]}>Jumps over ~30% a week raise injury risk. Your coach keeps the next week steadier.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  weekday: { height: 16, lineHeight: 16, color: C.textDim },
  cell: { height: 16, borderRadius: 4 },
  today: { borderWidth: 1.5, borderColor: C.accent },
  readout: { gap: 4, padding: 10, borderRadius: R.md, backgroundColor: C.surface2 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
