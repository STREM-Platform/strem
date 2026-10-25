/**
 * Preparation status by layer — the "work put in" tracker across the mission.
 *
 * Every number is a count of real things: completed sessions, items the athlete
 * marked done/tested/packed, an uploaded course. No composite readiness score.
 */

import type { IconName, LayerKey } from "@/constants/theme";
import type { LayerKind, MissionLayer, MissionPlan, MissionProgress } from "@/lib/api/race";

export interface LayerStatus {
  key: LayerKey;
  label: string;
  icon: IconName;
  done: number;
  total: number;
  pct: number | null;
  detail: string;
  next: string | null;
  built: boolean;
  origin?: string;
}

const DONE = new Set(["done", "tested", "packed", "na"]);

function itemStatus(layer: MissionLayer | undefined) {
  const items = (layer?.content.sections ?? []).flatMap((s) => s.items);
  const done = items.filter((i) => DONE.has(i.status ?? "todo")).length;
  const open = items.filter((i) => !DONE.has(i.status ?? "todo") && i.status !== "skipped");
  const critical = open.find((i) => i.priority === "critical");
  const dated = open.filter((i) => i.due_date).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
  return { done, total: items.length, next: (critical ?? dated ?? open[0])?.title ?? null };
}

const META: Record<Exclude<LayerKey, "training" | "course">, { kind: LayerKind; label: string; icon: IconName; unit: string }> = {
  fuel: { kind: "fuel", label: "Fuel", icon: "drop", unit: "rehearsed" },
  gear: { kind: "gear", label: "Gear", icon: "pack", unit: "ready" },
  logistics: { kind: "logistics", label: "Logistics", icon: "map", unit: "done" },
  strategy: { kind: "strategy", label: "Strategy", icon: "compass", unit: "reviewed" },
};

export function layerStatuses({
  plan,
  progress,
  layers,
  hasCourse,
  needsCourse,
}: {
  plan: MissionPlan | null;
  progress: MissionProgress | null;
  layers: Partial<Record<LayerKind, MissionLayer>>;
  hasCourse: boolean | null;
  needsCourse: boolean;
}): LayerStatus[] {
  const totals = progress?.totals;
  const sessions = plan ? plan.content.weeks.flatMap((w) => w.sessions).filter((s) => s.kind !== "rest") : [];
  const upcomingKey = progress?.sessions.find((s) => s.key && s.derived_status === "planned");
  const training: LayerStatus = {
    key: "training",
    label: "Training",
    icon: "run",
    done: totals?.completed ?? 0,
    total: sessions.length,
    pct: sessions.length ? (totals?.completed ?? 0) / sessions.length : null,
    detail: plan
      ? `${totals?.completed ?? 0} of ${sessions.length} sessions done${totals?.consistency_pct != null ? ` · ${totals.consistency_pct}% consistency` : ""}`
      : "No plan yet",
    next: plan ? upcomingKey?.title ?? null : "Build your training plan",
    built: Boolean(plan),
    origin: plan?.origin,
  };
  const rows: LayerStatus[] = [training];
  for (const key of ["fuel", "gear", "logistics", "strategy"] as const) {
    const meta = META[key];
    const layer = layers[meta.kind];
    const s = itemStatus(layer);
    rows.push({
      key,
      label: meta.label,
      icon: meta.icon,
      done: s.done,
      total: s.total,
      pct: layer && s.total ? s.done / s.total : null,
      detail: layer ? `${s.done} of ${s.total} ${meta.unit}` : "Not built yet",
      next: layer ? s.next : `Build your ${meta.label.toLowerCase()} plan`,
      built: Boolean(layer),
      origin: layer?.origin,
    });
  }
  rows.splice(1, 0, {
    key: "course",
    label: "Course",
    icon: "route",
    done: hasCourse ? 1 : 0,
    total: 1,
    pct: hasCourse == null ? null : hasCourse ? 1 : 0,
    detail: hasCourse ? "GPX loaded — terrain-based pacing on" : needsCourse ? "No course file yet" : "Optional for this race",
    next: hasCourse ? null : "Upload the course GPX",
    built: Boolean(hasCourse),
  });
  return rows;
}
