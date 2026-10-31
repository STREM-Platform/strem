/** Pure helpers for reviewing an imported plan before it is saved. */

import type { PlanContent } from "@/lib/api/race";
import { addDays, daysBetween, mondayOf } from "@/lib/race/format";

/** Move the whole draft so week 1 starts on `newStart` (a Monday or any day). */
export function shiftDraft(content: PlanContent, newStart: string): PlanContent {
  const first = content.weeks[0]?.start_date ?? content.start_date;
  const delta = daysBetween(first, newStart);
  if (!delta) return content;
  return {
    ...content,
    start_date: !content.race_date || addDays(content.start_date, delta) < content.race_date ? addDays(content.start_date, delta) : content.race_date,
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

/** Last day the plan covers (end of its last week). */
export function planEnd(content: PlanContent): string {
  const last = content.weeks[content.weeks.length - 1];
  return last ? addDays(last.start_date, 6) : content.start_date;
}

/**
 * Repeat the imported block (often a one-week template) — `times` more copies,
 * or "race" to fill every whole week before race week. Ids are reassigned and
 * phase spans rebuilt; nothing is invented beyond copying the athlete's weeks.
 */
export function repeatBlock(content: PlanContent, times: number | "race"): PlanContent {
  const block = content.weeks;
  if (!block.length) return content;
  const first = block[0].start_date;
  const raceWeek = content.race_date ? mondayOf(content.race_date) : "9999-12-31";
  const fits = (k: number) => addDays(first, 7 * k) < raceWeek && block.length + k <= 80;
  const total = times === "race" ? (() => { let k = block.length; while (fits(k)) k++; return k; })() : Math.min(80, block.length * (times + 1));
  if (total <= block.length) return content;
  const weeks = Array.from({ length: total }, (_, k) => {
    const source = block[k % block.length];
    const start = addDays(first, 7 * k);
    const shift = daysBetween(source.start_date, start);
    return {
      ...source,
      index: k + 1,
      start_date: start,
      sessions: source.sessions.map((s, i) => ({ ...s, id: `imp-w${k + 1}-${i + 1}`, date: addDays(s.date, shift) })),
    };
  });
  const phases: PlanContent["phases"] = [];
  for (const w of weeks) {
    const end = !content.race_date || addDays(w.start_date, 6) < content.race_date ? addDays(w.start_date, 6) : content.race_date;
    const open = phases[phases.length - 1];
    if (open && open.phase === w.phase) open.end_date = end;
    else phases.push({ phase: w.phase, start_date: w.start_date, end_date: end, goal: open?.goal ?? content.phases[0]?.goal ?? "As written in your plan" });
  }
  const note = `Your ${block.length}-week block repeats through ${weeks.length} weeks.`;
  return {
    ...content,
    weeks,
    phases,
    headline: `Your plan — ${weeks.length} weeks`,
    assumptions: [...content.assumptions.filter((a) => !/block repeats/.test(a)), note],
  };
}
