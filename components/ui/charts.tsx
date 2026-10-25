/**
 * Charts for the race tracker (react-native-svg).
 *
 * Specs (dataviz skill): bars ≤ 24 px with a 4 px rounded data end on a single
 * baseline, 2 px lines, hairline solid gridlines, area washes at ~10 %, text in
 * text tokens (never the series colour), a legend for two or more series, and a
 * per-mark inspect state on press. Planned vs done uses the bullet pattern: the
 * planned track is a lighter step of the same hue, done fills it.
 */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { C, mono, ui } from "@/constants/theme";

function roundedTopBar(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}

export function Legend({ items }: { items: { label: string; color: string; hollow?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.swatch, item.hollow ? { borderWidth: 1.5, borderColor: item.color, backgroundColor: "transparent" } : { backgroundColor: item.color }]} />
          <Text style={[ui(12, 600), { color: C.textMuted }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A meter: track = lighter step of the hue, fill = progress. */
export function Meter({ value, color, height = 6, label }: { value: number | null; color: string; height?: number; label?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height, backgroundColor: `${color}33`, overflow: "hidden" }}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** A progress ring: track = lighter step of the hue, arc = progress; children sit inside. */
export function Ring({ value, size = 56, stroke = 5, color, children, label }: { value: number | null; size?: number; stroke?: number; color: string; children?: React.ReactNode; label?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${color}33`} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${circumference * pct} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

export interface VolumePoint {
  label: string;
  planned: number | null;
  actual: number | null;
  current?: boolean;
  future?: boolean;
  /** Shown after the readout, e.g. "before your plan". */
  note?: string;
  /** Draw the "Plan" marker before this point. */
  startsPlan?: boolean;
}

/** Indices that get an x label: evenly spaced, always including the anchor. */
function labelled(count: number, plotW: number, anchor: number, minGap = 46): Set<number> {
  const every = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / minGap))));
  const from = anchor >= 0 ? anchor % every : 0;
  const out = new Set<number>();
  for (let i = from; i < count; i += every) out.add(i);
  return out;
}

/** The dashed "Plan" marker at the boundary between history and the plan. */
function PlanMarker({ x, height }: { x: number; height: number }) {
  return <Line x1={x} x2={x} y1={10} y2={height} stroke={C.lineStrong} strokeWidth={1} strokeDasharray="3 3" />;
}

/** Weekly volume: planned track with the done fill (bullet columns). */
export function VolumeBars({ data, color, unit = "h", height = 150 }: { data: VolumePoint[]; color: string; unit?: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map((d) => Math.max(d.planned ?? 0, d.actual ?? 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const axisW = 28;
  const plotW = Math.max(0, width - axisW);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.min(24, Math.max(6, band * 0.62));
  const plotH = height - 22;
  const y = (v: number) => plotH - (v / top) * plotH;
  const current = data.findIndex((d) => d.current);
  const shown = active ?? current;
  const focus = shown >= 0 ? data[shown] : null;
  const labels = labelled(data.length, plotW, current);
  const planAt = data.findIndex((d) => d.startsPlan);
  return (
    <View>
      <View style={styles.readout}>
        {focus ? (
          <Text style={[ui(13, 600), { color: C.text }]}>
            {focus.label}: {fmt(focus.actual)} {unit} done
            {focus.planned != null ? ` of ${fmt(focus.planned)} ${unit} planned` : ""}
            {focus.note ? <Text style={{ color: C.textMuted }}> · {focus.note}</Text> : null}
          </Text>
        ) : (
          <Text style={[ui(13, 500), { color: C.textMuted }]}>Tap a week to inspect it</Text>
        )}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={1} />
            ))}
            {planAt > 0 ? <PlanMarker x={axisW + planAt * band} height={plotH} /> : null}
            {data.map((d, i) => {
              const x = axisW + i * band + (band - barW) / 2;
              const planned = d.planned ?? 0;
              return (
                <Path key={`p${i}`} d={roundedTopBar(x, y(planned), barW, plotH - y(planned))} fill={`${color}${d.future ? "26" : "40"}`} />
              );
            })}
            {data.map((d, i) => {
              if (d.future || d.actual == null) return null;
              const x = axisW + i * band + (band - barW) / 2;
              return <Path key={`a${i}`} d={roundedTopBar(x, y(d.actual), barW, plotH - y(d.actual))} fill={color} opacity={active == null || active === i ? 1 : 0.55} />;
            })}
            {shown >= 0 ? (
              <Rect x={axisW + shown * band + 1} y={0} width={Math.max(0, band - 2)} height={plotH} fill={C.white} opacity={0.04} rx={6} />
            ) : null}
          </Svg>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { flexDirection: "row", paddingLeft: axisW }]}>
          {data.map((d, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${d.label}: ${fmt(d.actual)} of ${fmt(d.planned)} ${unit}`} onPress={() => setActive(active === i ? null : i)} style={{ flex: 1 }} />
          ))}
        </View>
        {ticks.map((t) => (
          <Text key={`t${t}`} style={[styles.tick, { top: y(t) - 7 }]}>
            {t}
          </Text>
        ))}
        {planAt > 0 ? <Text style={[styles.planTag, { left: axisW + planAt * band + 4 }]}>Plan</Text> : null}
        {data.map((d, i) =>
          labels.has(i) ? (
            <Text key={`x${i}`} numberOfLines={1} style={[styles.xLabel, { left: axisW + i * band + band / 2 - 30, color: d.current ? C.text : C.textDim }]}>
              {d.label}
            </Text>
          ) : null,
        )}
      </View>
      <Legend items={[{ label: "Done", color }, { label: "Planned", color: `${color}66` }]} />
    </View>
  );
}

export interface ProgressionPoint {
  label: string;
  planned: number | null;
  actual: number | null;
  startsPlan?: boolean;
}

/** Long-session progression in minutes: planned (muted) vs done (series colour). */
export function ProgressionLine({ points, color, height = 120 }: { points: ProgressionPoint[]; color: string; height?: number }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const values = points.flatMap((p) => [p.planned ?? 0, p.actual ?? 0]);
  const max = Math.max(1, ...values);
  const ticks = minuteTicks(max);
  const top = ticks[ticks.length - 1];
  const axisW = 30;
  const plotH = height - 18;
  const step = points.length > 1 ? (width - axisW - 8) / (points.length - 1) : 0;
  const x = (i: number) => axisW + 4 + i * step;
  const y = (v: number) => plotH - (v / top) * plotH;
  const path = (key: "planned" | "actual") => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = p[key];
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const focus = active != null ? points[active] : null;
  const planAt = points.findIndex((p) => p.startsPlan);
  const readout = !focus
    ? "Longest session each week — tap a point"
    : focus.planned == null
      ? `${focus.label}: ${fmtMin(focus.actual)} · before your plan`
      : `${focus.label}: ${focus.actual != null ? `${fmtMin(focus.actual)} done` : "not done yet"} · ${fmtMin(focus.planned)} planned`;
  return (
    <View>
      <View style={styles.readout}>
        <Text style={[ui(13, focus ? 600 : 500), { color: focus ? C.text : C.textMuted }]}>{readout}</Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && points.length ? (
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={1} />
            ))}
            {planAt > 0 ? <PlanMarker x={(x(planAt - 1) + x(planAt)) / 2} height={plotH} /> : null}
            <Path d={path("planned")} stroke={`${color}70`} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Path d={path("actual")} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) =>
              p.actual != null ? <Circle key={i} cx={x(i)} cy={y(p.actual)} r={4} fill={color} stroke={C.surface} strokeWidth={2} /> : null,
            )}
            {active != null ? <Line x1={x(active)} x2={x(active)} y1={0} y2={plotH} stroke={C.lineStrong} strokeWidth={1} /> : null}
          </Svg>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { flexDirection: "row", paddingLeft: axisW }]}>
          {points.map((p, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${p.label}: planned ${fmtMin(p.planned)}, done ${fmtMin(p.actual)}`} onPress={() => setActive(active === i ? null : i)} style={{ flex: 1 }} />
          ))}
        </View>
        {ticks.map((t) => (
          <Text key={`t${t}`} style={[styles.tick, { top: y(t) - 7 }]}>
            {fmtAxisMin(t)}
          </Text>
        ))}
        {planAt > 0 ? <Text style={[styles.planTag, { left: (x(planAt - 1) + x(planAt)) / 2 + 4 }]}>Plan</Text> : null}
      </View>
      <Legend items={[{ label: "Done", color }, { label: "Planned", color: `${color}70` }]} />
    </View>
  );
}

export interface PhaseSpan {
  phase: string;
  start: string;
  end: string;
}

const PHASE_SHADE: Record<string, number> = { base: 0.35, build: 0.55, specific: 0.75, peak: 0.85, taper: 0.5, race: 1, recovery: 0.3 };

/** The road to race day: phases as one bar with a today marker. */
export function PhaseBar({ phases, today, color = C.accent }: { phases: PhaseSpan[]; today: string; color?: string }) {
  if (!phases.length) return null;
  const start = Date.parse(phases[0].start);
  const end = Date.parse(phases[phases.length - 1].end) + 86400000;
  const span = Math.max(end - start, 1);
  const pos = Math.max(0, Math.min(1, (Date.parse(today) - start) / span));
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.phaseTrack}>
        {phases.map((p) => {
          const w = (Date.parse(p.end) + 86400000 - Date.parse(p.start)) / span;
          const past = Date.parse(p.end) < Date.parse(today);
          return (
            <View
              key={`${p.phase}${p.start}`}
              accessibilityLabel={`${p.phase} ${p.start} to ${p.end}`}
              style={{ flex: w, height: 10, backgroundColor: color, opacity: past ? 0.25 : PHASE_SHADE[p.phase] ?? 0.5 }}
            />
          );
        })}
        <View style={[styles.todayMark, { left: `${pos * 100}%` }]} />
      </View>
      <View style={{ flexDirection: "row" }}>
        {phases.map((p) => {
          const w = (Date.parse(p.end) + 86400000 - Date.parse(p.start)) / span;
          return (
            <Text key={`l${p.phase}${p.start}`} numberOfLines={1} style={[ui(11, 600), { flex: w, color: C.textMuted, textTransform: "capitalize" }]}>
              {w > 0.08 ? p.phase : ""}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/** Elevation profile: 2 px line over a 10 % wash, optional highlighted span. */
export function ElevationArea({ points, color = C.text, height = 120, highlight }: { points: { d: number; e: number }[]; color?: string; height?: number; highlight?: [number, number] | null }) {
  const [width, setWidth] = useState(0);
  if (points.length < 2) return <View style={{ height }} />;
  const maxD = points[points.length - 1].d || 1;
  const minE = Math.min(...points.map((p) => p.e));
  const maxE = Math.max(...points.map((p) => p.e));
  const range = Math.max(maxE - minE, 1);
  const x = (d: number) => (d / maxD) * width;
  const y = (e: number) => height - 6 - ((e - minE) / range) * (height - 16);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {highlight ? <Rect x={x(highlight[0])} y={0} width={Math.max(3, x(highlight[1]) - x(highlight[0]))} height={height} fill={C.white} opacity={0.07} /> : null}
          <Path d={area} fill={color} opacity={0.1} />
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

function niceTicks(max: number): number[] {
  const steps = [1, 2, 2.5, 5, 10];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = (steps.find((s) => s * mag >= raw) ?? 10) * mag;
  const ticks = [];
  for (let t = 0; t <= max + step * 0.999; t += step) ticks.push(Number(t.toFixed(2)));
  return ticks.length > 1 ? ticks : [0, 1];
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "–";
  return v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, "");
}

function fmtMin(v: number | null | undefined): string {
  if (v == null) return "–";
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m}m`;
}

/** Minute ticks on whole quarter-hours or hours, so every label is exact. */
function minuteTicks(max: number): number[] {
  const step = [15, 30, 60, 120, 180, 240, 360, 480, 720].find((s) => s * 3 >= max) ?? 720;
  const ticks = [];
  for (let t = 0; t <= max + step * 0.999; t += step) ticks.push(t);
  return ticks.length > 1 ? ticks : [0, step];
}

function fmtAxisMin(v: number): string {
  if (v === 0) return "0";
  if (v % 60 === 0) return `${v / 60}h`;
  return v > 60 ? `${Math.floor(v / 60)}h${v % 60}` : `${v}m`;
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  readout: { minHeight: 22, marginBottom: 6 },
  tick: { position: "absolute", left: 0, width: 24, textAlign: "right", ...mono(9, 600), color: C.textDim },
  xLabel: { position: "absolute", bottom: 0, width: 60, textAlign: "center", ...mono(9, 600) },
  planTag: { position: "absolute", top: 0, ...ui(10, 700), color: C.textMuted },
  phaseTrack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "visible", gap: 2 },
  todayMark: { position: "absolute", top: -5, width: 3, height: 20, marginLeft: -1.5, borderRadius: 2, backgroundColor: C.white },
});
