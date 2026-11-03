/** Check-ins v2 building blocks (mobile#121): big-tap capture, the today read and trends. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { Icon, type IconName } from "@/components/ui/icon";
import { Row, Segmented } from "@/components/ui/kit";
import { C, R, disp, ui } from "@/constants/theme";
import type { Checkin, RecoverySample } from "@/lib/api/race";
import { METRICS, trend, type TodayRead } from "@/lib/race/checkin-read";
import { addDays } from "@/lib/race/format";

const WORDS: Record<string, string[]> = {
  sleep_quality: ["Awful", "Poor", "OK", "Good", "Great"],
  energy: ["Empty", "Low", "OK", "Good", "Full"],
  soreness: ["None", "Light", "Some", "Sore", "Very"],
};

/** One row of five big tiles with words under the numbers — the 10-second mode. */
export function BigScale({ metric, label, value, onChange }: { metric: keyof typeof WORDS; label: string; value: number | null | undefined; onChange: (v: number) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[ui(15, 700), { color: C.text }]}>{label}</Text>
      <Row gap={6}>
        {WORDS[metric].map((word, i) => {
          const n = i + 1;
          const on = value === n;
          return (
            <Pressable
              key={word}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${n} of 5, ${word}`}
              onPress={() => onChange(n)}
              style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={[disp(24, 800), { color: on ? C.ink : C.text }]}>{n}</Text>
              <Text style={[ui(11, 700), { color: on ? C.ink : C.textMuted }]} numberOfLines={1}>
                {word}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

export function Toggle({ on, label, icon, onPress, tone = C.serious }: { on: boolean; label: string; icon: IconName; onPress: () => void; tone?: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.toggle, on && { borderColor: tone, backgroundColor: `${tone}1f` }, pressed && { opacity: 0.85 }]}
    >
      <Icon name={on ? "checkCircle" : icon} size={18} color={on ? tone : C.textMuted} />
      <Text style={[ui(14, 700), { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

const VERDICT: Record<TodayRead["verdict"], { label: string; color: string; icon: IconName }> = {
  rest: { label: "Rest", color: C.serious, icon: "moon" },
  easy: { label: "Easy", color: C.warning, icon: "halfCircle" },
  as_planned: { label: "As planned", color: C.good, icon: "checkCircle" },
  unknown: { label: "Not checked in", color: C.textDim, icon: "circle" },
};

/** The transparent read: verdict, the rule in words, and every input it used. */
export function TodayReadCard({ read, onAdjust, adjusting }: { read: TodayRead; onAdjust?: () => void; adjusting?: boolean }) {
  const v = VERDICT[read.verdict];
  return (
    <View style={[styles.card, { borderColor: `${v.color}55` }]}>
      <Row gap={8}>
        <View style={[styles.pill, { backgroundColor: `${v.color}22` }]}>
          <Icon name={v.icon} size={14} color={v.color} />
          <Text style={[ui(12, 800), { color: v.color }]}>{v.label}</Text>
        </View>
        <Text style={[ui(12, 600), { color: C.textMuted }]}>Today&rsquo;s read · no hidden score</Text>
      </Row>
      <Text style={[disp(24, 800), { color: C.text }]}>{read.title}</Text>
      <Text style={[ui(14, 500), { color: C.textMuted, lineHeight: 21 }]}>{read.detail}</Text>
      {read.inputs.length ? (
        <View style={{ gap: 6 }}>
          {read.inputs.map((i) => (
            <Row key={i.label} gap={10}>
              <View style={[styles.dot, { backgroundColor: i.flagged ? C.warning : C.surface3 }]} />
              <Text style={[ui(13, 600), { color: C.textMuted, width: 92 }]}>{i.label}</Text>
              <Text style={[ui(13, 800), { color: C.text, width: 44 }]}>{i.value}</Text>
              {i.note ? <Text style={[ui(12, 500), { color: C.textDim, flex: 1 }]}>{i.note}</Text> : null}
            </Row>
          ))}
        </View>
      ) : null}
      {read.professional ? (
        <View style={styles.pro}>
          <Icon name="heart" size={16} color={C.serious} />
          <Text style={[ui(13, 600), { color: C.text, flex: 1, lineHeight: 19 }]}>{read.professional}</Text>
        </View>
      ) : null}
      {read.pattern ? (
        <View style={styles.pattern}>
          <Text style={[ui(14, 700), { color: C.text }]}>{read.pattern.title}</Text>
          <Text style={[ui(13, 500), { color: C.textMuted }]}>Your race team can propose a change to the next days. You review it before anything moves.</Text>
          {onAdjust ? (
            <Pressable accessibilityRole="button" disabled={adjusting} onPress={onAdjust} style={({ pressed }) => [styles.adjust, (pressed || adjusting) && { opacity: 0.7 }]}>
              <Icon name="sparkles" size={15} color={C.ink} />
              <Text style={[ui(13, 800), { color: C.ink }]}>{adjusting ? "Asking the race team…" : "Ask the race team to adjust"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Sparkline({ points, color, min = 1, max = 5 }: { points: (number | null)[]; color: string; min?: number; max?: number }) {
  const w = 120;
  const h = 32;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const y = (v: number) => h - 3 - ((v - min) / Math.max(1e-6, max - min)) * (h - 6);
  // Gaps break the line: each run of answered days is its own polyline.
  const runs: string[] = [];
  let run: string[] = [];
  points.forEach((v, i) => {
    if (v == null) {
      if (run.length) runs.push(run.join(" "));
      run = [];
    } else run.push(`${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (run.length) runs.push(run.join(" "));
  const lastIndex = points.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={h}>
        <Line x1={0} x2={w} y1={y((min + max) / 2)} y2={y((min + max) / 2)} stroke={C.line} strokeWidth={1} />
        {runs.map((r, i) => (r.includes(" ") ? <Polyline key={i} points={r} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null))}
        {lastIndex != null ? <Circle cx={lastIndex * step} cy={y(points[lastIndex] as number)} r={3.5} fill={color} stroke={C.surface} strokeWidth={2} /> : null}
      </Svg>
    </View>
  );
}

function TrendRow({ label, points, average, note, color, unit = "", min, max }: { label: string; points: (number | null)[]; average: string; note: string | null; color: string; unit?: string; min?: number; max?: number }) {
  return (
    <Row gap={12} style={styles.trendRow}>
      <View style={{ width: 96 }}>
        <Text style={[ui(13, 700), { color: C.text }]}>{label}</Text>
        {note ? <Text style={[ui(11, 600), { color: C.textDim }]}>{note}</Text> : null}
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Sparkline points={points} color={color} min={min} max={max} />
      </View>
      <Text style={[ui(14, 800), { color: C.text, width: 56, textAlign: "right" }]}>
        {average}
        {unit}
      </Text>
    </Row>
  );
}

/** 14/28-day trends of the check-in answers, with wearable recovery alongside when connected. */
export function Trends({ checkins, recovery, today }: { checkins: Checkin[]; recovery: RecoverySample[]; today: string }) {
  const [days, setDays] = useState<"14" | "28">("14");
  const n = Number(days);
  const byDay = new Map(recovery.map((r) => [r.date.slice(0, 10), r]));
  const wearable = (key: "hrv_ms" | "resting_hr" | "sleep_hours") => Array.from({ length: n }, (_, i) => byDay.get(addDays(today, i - n + 1))?.[key] ?? null);
  const avg = (xs: (number | null)[], digits = 1) => {
    const vals = xs.filter((x): x is number => x != null);
    return vals.length ? (vals.reduce((s, x) => s + x, 0) / vals.length).toFixed(digits) : "–";
  };
  const wearables = [
    { key: "hrv_ms" as const, label: "HRV", unit: " ms", digits: 0 },
    { key: "resting_hr" as const, label: "Resting HR", unit: "", digits: 0 },
    { key: "sleep_hours" as const, label: "Sleep (watch)", unit: " h", digits: 1 },
  ].map((w) => ({ ...w, points: wearable(w.key) })).filter((w) => w.points.some((p) => p != null));
  return (
    <View style={styles.card}>
      <Row>
        <Text style={[ui(15, 700), { color: C.text, flex: 1 }]}>Trends</Text>
        <View style={{ width: 150 }}>
          <Segmented options={[{ value: "14", label: "14 d" }, { value: "28", label: "28 d" }]} value={days} onChange={setDays} />
        </View>
      </Row>
      {METRICS.map((m) => {
        const t = trend(checkins, m.key, n, today);
        const note = t.direction === "better" ? "improving" : t.direction === "worse" ? (m.good === "low" ? "rising" : "dropping") : t.direction === "flat" ? "steady" : null;
        return <TrendRow key={m.key} label={m.label} points={t.points} average={t.average == null ? "–" : String(t.average)} note={note} color={t.direction === "worse" ? C.warning : C.text} unit={t.average == null ? "" : "/5"} />;
      })}
      {wearables.length ? (
        <>
          <Text style={[ui(12, 700), { color: C.textMuted, marginTop: 4 }]}>From your watch</Text>
          {wearables.map((w) => {
            const vals = w.points.filter((x): x is number => x != null);
            return <TrendRow key={w.key} label={w.label} points={w.points} average={avg(w.points, w.digits)} note={null} color={C.text} unit={w.unit} min={Math.min(...vals)} max={Math.max(...vals)} />;
          })}
        </>
      ) : (
        <Text style={[ui(12, 500), { color: C.textDim }]}>Connect a watch or ring to see HRV, resting heart rate and sleep here.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 64, gap: 2, borderRadius: R.md, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  tileOn: { backgroundColor: C.white, borderColor: C.white },
  toggle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  card: { gap: 12, padding: 18, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pro: { flexDirection: "row", gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.flameSoft },
  pattern: { gap: 6, padding: 12, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong },
  adjust: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 40, marginTop: 4, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.white },
  trendRow: { minHeight: 44, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
});
