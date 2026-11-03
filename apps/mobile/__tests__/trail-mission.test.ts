import { describe, expect, it } from "@jest/globals";

import type { MissionLayer, MissionPlan, MissionProgress } from "@/lib/api/race";
import { resumeScreen } from "@/lib/onboarding";
import { layerStatuses } from "@/lib/race/readiness";
import { trackerSeries } from "@/lib/race/tracker";

describe("onboarding", () => {
  it("is a welcome plus one 'about you' step", () => {
    expect(resumeScreen(null)).toBe("welcome");
    expect(resumeScreen("welcome")).toBe("identity");
  });

  it("sends accounts from retired steps to the single remaining step", () => {
    expect(resumeScreen("commitment")).toBe("identity");
    expect(resumeScreen("nutrition")).toBe("identity");
    expect(resumeScreen("tribe")).toBe("identity");
  });
});

const plan = {
  mission_id: "m1",
  version: 2,
  origin: "engine",
  content: {
    weeks: [
      {
        index: 1,
        start_date: "2026-10-19",
        sessions: [
          { id: "a", kind: "easy", key: false },
          { id: "b", kind: "long", key: true, title: "Long run" },
          { id: "r", kind: "rest", key: false },
        ],
      },
    ],
  },
} as unknown as MissionPlan;

const progress = {
  totals: { planned_to_date: 1, completed: 1, partial: 0, missed: 0, consistency_pct: 100, key_planned_to_date: 0, key_completed: 0, done: { hours: 1, km: 10, elevation_m: 100, sessions: 1 } },
  sessions: [
    { id: "a", derived_status: "done", key: false },
    { id: "b", derived_status: "planned", key: true, title: "Long run" },
  ],
} as unknown as MissionProgress;

const gear = {
  kind: "gear",
  origin: "ai",
  content: {
    sections: [
      {
        id: "s",
        items: [
          { id: "shoes", title: "Shoes", status: "tested" },
          { id: "lamp", title: "Headlamp", status: "todo", priority: "critical" },
          { id: "cup", title: "Cup", status: "todo", due_date: "2026-11-01" },
        ],
      },
    ],
  },
} as unknown as MissionLayer;

describe("race readiness by layer", () => {
  it("counts real work, never a composite score", () => {
    const rows = layerStatuses({ plan, progress, layers: { gear }, hasCourse: false, needsCourse: true });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(rows.map((r) => r.key)).toEqual(["training", "course", "fuel", "gear", "logistics", "strategy"]);
    expect(byKey.training.done).toBe(1);
    expect(byKey.training.total).toBe(2); // rest days are not work
    expect(byKey.training.next).toBe("Long run");
    expect(byKey.gear.done).toBe(1);
    expect(byKey.gear.total).toBe(3);
    expect(byKey.gear.next).toBe("Headlamp"); // critical items surface first
    expect(byKey.gear.origin).toBe("ai");
    expect(byKey.fuel.built).toBe(false);
    expect(byKey.fuel.pct).toBeNull();
    expect(byKey.course.next).toBe("Upload the course GPX");
  });

  it("treats an unknown course state as unknown, not missing", () => {
    const rows = layerStatuses({ plan: null, progress: null, layers: {}, hasCourse: null, needsCourse: false });
    const course = rows.find((r) => r.key === "course");
    expect(course?.pct).toBeNull();
    expect(rows[0].detail).toBe("No plan yet");
  });
});

const volume = (hours: number) => ({ sessions: 3, hours, km: hours * 8, elevation_m: 300 });
const planWeek = (index: number, start: string, timing: string) => ({ index, start_date: start, phase: "base", focus: "", timing, planned: volume(6), actual: volume(timing === "future" ? 0 : 4) });

describe("tracker series", () => {
  const evidence = {
    weeks: ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"].map((start, i) => ({ start_date: start, volume: volume(5 + i), longest_minutes: 100 + i * 20 })),
  };

  it("shows the training before a new plan, then the plan weeks", () => {
    const progress = {
      weeks: [planWeek(1, "2026-10-19", "current"), planWeek(2, "2026-10-26", "future"), planWeek(3, "2026-11-02", "future")],
      long_sessions: [{ date: "2026-10-24", planned_minutes: 145, actual_minutes: null, status: "planned" }],
      evidence,
    } as unknown as MissionProgress;
    const { volume: bars, longest } = trackerSeries(progress);
    expect(bars.map((b) => b.label)).toEqual(["28 Sep", "5 Oct", "12 Oct", "19 Oct", "26 Oct", "2 Nov"]);
    expect(bars[0]).toMatchObject({ planned: null, actual: 5, note: "before your plan" });
    expect(bars[3]).toMatchObject({ planned: 6, actual: 4, current: true, startsPlan: true });
    expect(bars[4]).toMatchObject({ future: true, actual: null });
    expect(longest.map((p) => [p.planned, p.actual])).toEqual([[null, 100], [null, 120], [null, 140], [145, null]]);
    expect(longest[3].startsPlan).toBe(true);
  });

  it("without a plan, the latest evidence week is the current one", () => {
    const { volume: bars, longest } = trackerSeries({ weeks: [], long_sessions: [], evidence } as unknown as MissionProgress);
    expect(bars).toHaveLength(4);
    expect(bars[3].current).toBe(true);
    expect(bars.some((b) => b.startsPlan)).toBe(false);
    expect(longest).toHaveLength(4);
  });
});
