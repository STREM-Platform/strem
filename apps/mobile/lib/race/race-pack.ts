/**
 * Race-day mode (mobile#128): the race pack the athlete carries offline, and the
 * live read of where they are against their plan.
 *
 * Built from what the race team already made: the strategy layer's checkpoint
 * plan (arrival, cutoff margin, what to carry and do per leg), the fuel targets
 * and the critical gear. Nothing here needs the network once the pack is saved.
 */

import type { MissionLayer, LayerKind } from "@/lib/api/race";
import type { RaceMission } from "@/lib/api/race-missions";

export interface PackStation {
  name: string;
  km: number;
  /** Planned elapsed minutes on arrival (stops before it included). */
  plannedMin: number | null;
  /** Official cutoff, in elapsed minutes. */
  cutoffMin: number | null;
  clock: string | null;
  carry: string | null;
  todo: string[];
}

export interface RacePack {
  missionId: string;
  name: string;
  raceDate: string;
  startTime: string | null;
  distanceKm: number;
  stations: PackStation[];
  fuel: { label: string; value: string }[];
  kit: string[];
  notes: string[];
  savedAt: string;
}

export interface Arrival {
  name: string;
  /** Elapsed minutes when the athlete marked it. */
  atMin: number;
}

/** "4 h 12", "3 h", "45 min" (the engine's `hm`) → minutes. */
export function parseHm(text: string | number | boolean | null | undefined): number | null {
  if (typeof text === "number") return text;
  if (typeof text !== "string") return null;
  const hours = /(\d+)\s*h/.exec(text);
  const mins = /(\d+)\s*min/.exec(text) ?? (hours ? /h\s*(\d+)/.exec(text) : null);
  if (!hours && !mins) return null;
  return (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
}

const LEG_TITLE = /→\s*(.+?)\s*\(km\s*([\d.]+)\)/;

export function buildRacePack(mission: RaceMission, layers: Partial<Record<LayerKind, MissionLayer>>, now = new Date()): RacePack {
  const event = mission.event;
  const cutoffs = new Map((event.checkpoints ?? []).map((c) => [c.name, c.cutoff_minutes ?? null]));
  const legs = layers.strategy?.content.sections.find((s) => s.id === "checkpoints")?.items ?? [];
  const stations: PackStation[] = legs.map((leg) => {
    const match = LEG_TITLE.exec(leg.title);
    const name = match?.[1] ?? leg.title;
    const values = leg.values ?? {};
    return {
      name,
      km: match ? Number(match[2]) : 0,
      plannedMin: parseHm(values.arrive),
      cutoffMin: cutoffs.get(name) ?? (name === "Finish" ? event.cutoff_minutes : null) ?? null,
      clock: typeof values.clock === "string" && values.clock !== "–" ? values.clock : null,
      carry: typeof values.carry === "string" ? values.carry : null,
      todo: (leg.detail ?? "").split(" · ").map((t) => t.trim()).filter(Boolean),
    };
  });
  const fuel = (layers.fuel?.content.metrics ?? []).slice(0, 4).map((m) => ({ label: m.label, value: [m.value, m.unit].filter(Boolean).join(" ") }));
  const kit = (layers.gear?.content.sections ?? [])
    .flatMap((s) => s.items)
    .filter((i) => i.priority === "critical")
    .map((i) => i.title);
  const notes = [...(layers.strategy?.content.warnings ?? []), ...(layers.fuel?.content.warnings ?? [])].slice(0, 6);
  return {
    missionId: mission.id,
    name: event.name,
    raceDate: event.race_date,
    startTime: event.start_time ?? null,
    distanceKm: event.distance_km,
    stations,
    fuel,
    kit,
    notes,
    savedAt: now.toISOString(),
  };
}

export interface LiveRead {
  next: PackStation | null;
  /** Minutes ahead (+) or behind (−) of plan at the last marked station. */
  delta: number | null;
  /** Minutes left to the next station's cutoff at the current elapsed time. */
  cutoffLeft: number | null;
  /** When the athlete should reach the next station, shifted by how they are running. */
  expectedMin: number | null;
}

export function liveRead(pack: RacePack, arrivals: Arrival[], elapsedMin: number): LiveRead {
  const reached = new Set(arrivals.map((a) => a.name));
  const next = pack.stations.find((s) => !reached.has(s.name)) ?? null;
  const last = arrivals.length ? arrivals[arrivals.length - 1] : null;
  const lastPlan = last ? pack.stations.find((s) => s.name === last.name)?.plannedMin ?? null : null;
  const delta = last && lastPlan != null ? Math.round(lastPlan - last.atMin) : null;
  return {
    next,
    delta,
    cutoffLeft: next?.cutoffMin != null ? Math.round(next.cutoffMin - elapsedMin) : null,
    expectedMin: next?.plannedMin != null ? next.plannedMin - (delta ?? 0) : null,
  };
}

/** One line per station for the debrief notes: planned vs actual. */
export function timelineNotes(pack: RacePack, arrivals: Arrival[]): string {
  return arrivals
    .map((a) => {
      const plan = pack.stations.find((s) => s.name === a.name)?.plannedMin;
      const diff = plan != null ? Math.round(a.atMin - plan) : null;
      const rel = diff == null ? "" : diff === 0 ? " (on plan)" : ` (${Math.abs(diff)} min ${diff < 0 ? "ahead" : "behind"})`;
      return `${a.name}: ${formatElapsed(a.atMin)}${rel}`;
    })
    .join("\n");
}

export function formatElapsed(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
