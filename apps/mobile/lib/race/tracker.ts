/** The tracker's series: real training before the plan, plan weeks to date, then what's next. */

import type { ProgressionPoint, VolumePoint } from "@/components/ui/charts";
import type { MissionProgress } from "@/lib/api/race";
import { dayLabel } from "@/lib/race/format";

export function trackerSeries(progress: MissionProgress, history = 9, ahead = 4) {
  const weeks = progress.weeks;
  const planStart = weeks[0]?.start_date;
  const before = progress.evidence.weeks.filter((w) => !planStart || w.start_date < planStart);
  const current = weeks.findIndex((w) => w.timing === "current");
  const toDate = current >= 0 ? current + 1 : weeks.filter((w) => w.timing === "past").length;
  const past: VolumePoint[] = [
    ...before.map((w, i) => ({
      label: dayLabel(w.start_date, false),
      planned: null,
      actual: w.volume.hours,
      note: "before your plan",
      current: !weeks.length && i === before.length - 1,
    })),
    ...weeks.slice(0, toDate).map((w, i) => ({
      label: dayLabel(w.start_date, false),
      planned: w.planned.hours,
      actual: w.actual.hours,
      current: w.timing === "current",
      startsPlan: i === 0,
    })),
  ].slice(-history);
  const next: VolumePoint[] = weeks.slice(toDate, toDate + ahead).map((w, i) => ({
    label: dayLabel(w.start_date, false),
    planned: w.planned.hours,
    actual: null,
    future: true,
    startsPlan: toDate === 0 && i === 0,
  }));
  const longest: ProgressionPoint[] = [
    ...before.map((w) => ({ label: dayLabel(w.start_date, false), planned: null, actual: w.longest_minutes || null })),
    ...progress.long_sessions.map((p, i) => ({ label: dayLabel(p.date, false), planned: p.planned_minutes ?? null, actual: p.actual_minutes ?? null, startsPlan: i === 0 })),
  ];
  return { volume: [...past, ...next], longest };
}
