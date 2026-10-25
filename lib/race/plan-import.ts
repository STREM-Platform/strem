/** Pure helpers for reviewing an imported plan before it is saved. */

import type { PlanContent } from "@/lib/api/race";
import { addDays, daysBetween } from "@/lib/race/format";

/** Move the whole draft so week 1 starts on `newStart` (a Monday or any day). */
export function shiftDraft(content: PlanContent, newStart: string): PlanContent {
  const first = content.weeks[0]?.start_date ?? content.start_date;
  const delta = daysBetween(first, newStart);
  if (!delta) return content;
  return {
    ...content,
    start_date: addDays(content.start_date, delta) < content.race_date ? addDays(content.start_date, delta) : content.race_date,
    // The "week 1 starts …" note no longer holds once the athlete picks the start.
    assumptions: content.assumptions.filter((a) => !/week 1 starts/i.test(a)),
    phases: content.phases.map((p) => ({ ...p, start_date: addDays(p.start_date, delta), end_date: addDays(p.end_date, delta) })),
    weeks: content.weeks.map((w) => ({
      ...w,
      start_date: addDays(w.start_date, delta),
      sessions: w.sessions.map((s) => ({ ...s, date: addDays(s.date, delta) })),
    })),
  };
}

/** Drop one session; weeks left empty disappear and are renumbered. */
export function removeSession(content: PlanContent, sessionId: string): PlanContent {
  const weeks = content.weeks
    .map((w) => ({ ...w, sessions: w.sessions.filter((s) => s.id !== sessionId) }))
    .filter((w) => w.sessions.length)
    .map((w, i) => ({ ...w, index: i + 1 }));
  return { ...content, weeks, headline: `Your plan — ${weeks.length} week${weeks.length === 1 ? "" : "s"}` };
}

export function weekHours(sessions: { kind: string; duration_minutes?: number | null }[]): number {
  return sessions.reduce((sum, s) => sum + (s.kind === "rest" ? 0 : (s.duration_minutes ?? 0)), 0) / 60;
}
