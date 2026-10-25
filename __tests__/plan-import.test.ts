import { describe, expect, it } from "@jest/globals";

import type { PlanContent, PlanSession } from "@/lib/api/race";
import { planEnd, removeSession, repeatBlock, shiftDraft, weekHours } from "@/lib/race/plan-import";

const session = (id: string, date: string, kind: PlanSession["kind"], minutes: number): PlanSession => ({
  id,
  date,
  sport: kind === "rest" ? "rest" : "running",
  kind,
  title: id,
  purpose: "",
  duration_minutes: minutes,
  intensity: "easy",
  structure: [],
  key: false,
  status: "planned",
  matched_session_ids: [],
});

const draft: PlanContent = {
  headline: "Your plan — 2 weeks",
  summary: "",
  sport: "trail_running",
  timezone: "Europe/Berlin",
  start_date: "2026-11-02",
  race_date: "2027-04-17",
  phases: [{ phase: "base", start_date: "2026-11-02", end_date: "2026-11-15", goal: "As written in your plan" }],
  weeks: [
    { index: 1, start_date: "2026-11-02", phase: "base", focus: "", sessions: [session("a", "2026-11-02", "rest", 0), session("b", "2026-11-03", "easy", 45)] },
    { index: 2, start_date: "2026-11-09", phase: "base", focus: "", sessions: [session("c", "2026-11-14", "long", 120)] },
  ],
  principles: [],
  assumptions: ["The plan had no dates; week 1 starts Mon 2 Nov — change it before saving"],
  warnings: [],
};

describe("imported plan review", () => {
  it("moves every week and session together", () => {
    const moved = shiftDraft(draft, "2026-11-16");
    expect(moved.start_date).toBe("2026-11-16");
    expect(moved.weeks.map((w) => w.start_date)).toEqual(["2026-11-16", "2026-11-23"]);
    expect(moved.weeks[1].sessions[0].date).toBe("2026-11-28");
    expect(moved.assumptions).toEqual([]);
    expect(moved.phases[0]).toMatchObject({ start_date: "2026-11-16", end_date: "2026-11-29" });
    expect(shiftDraft(draft, "2026-11-02")).toBe(draft);
  });

  it("removes a session and drops weeks left empty", () => {
    const left = removeSession(draft, "c");
    expect(left.weeks).toHaveLength(1);
    expect(left.headline).toBe("Your plan — 1 week");
    expect(removeSession(draft, "b").weeks[0].sessions.map((s) => s.id)).toEqual(["a"]);
  });

  it("counts hours without rest days", () => {
    expect(weekHours(draft.weeks[0].sessions)).toBe(0.75);
  });

  it("repeats a weekly template up to race week, with fresh ids", () => {
    const template = removeSession(draft, "c"); // one week: Mon rest, Tue easy
    const once = repeatBlock(template, 1);
    expect(once.weeks.map((w) => w.start_date)).toEqual(["2026-11-02", "2026-11-09"]);
    expect(once.weeks[1].sessions.map((s) => s.date)).toEqual(["2026-11-09", "2026-11-10"]);
    const filled = repeatBlock(template, "race");
    // Race Sat 17 Apr 2027 → race week starts Mon 12 Apr; the last copy starts 5 Apr.
    expect(filled.weeks[filled.weeks.length - 1].start_date).toBe("2027-04-05");
    expect(planEnd(filled)).toBe("2027-04-11");
    const ids = filled.weeks.flatMap((w) => w.sessions.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(filled.phases).toEqual([{ phase: "base", start_date: "2026-11-02", end_date: "2027-04-11", goal: "As written in your plan" }]);
    expect(filled.assumptions.at(-1)).toMatch(/1-week block repeats through 23 weeks/);
  });
});
