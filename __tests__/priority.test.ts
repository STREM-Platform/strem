import { describe, expect, it } from "@jest/globals";

import { priorityOf, raceConflicts } from "@/lib/race/priority";

const race = (name: string, race_date: string, priority?: "A" | "B" | "C", state: "active" | "archived" = "active") =>
  ({ state, event: { name, race_date }, goal: { outcome: "finish", target_finish_minutes: null, priority } }) as never;

describe("race priority", () => {
  it("defaults to an A race", () => {
    expect(priorityOf(race("X", "2027-05-01"))).toBe("A");
  });

  it("flags two A races close together and B/C races in an A taper", () => {
    const found = raceConflicts(
      [race("Mountain 50K", "2027-06-12", "A"), race("Spring 30K", "2027-05-08", "A"), race("Tune-up 10K", "2027-05-29", "B"), race("Parkrun", "2027-06-07", "C")],
      "2027-01-01",
    );
    expect(found.some((c) => c.includes("both A races"))).toBe(true);
    expect(found.some((c) => c.startsWith("Tune-up 10K (B") && c.includes("taper for Mountain 50K"))).toBe(true);
    expect(found.some((c) => c.startsWith("Parkrun (C)"))).toBe(true);
  });

  it("ignores past and archived races and well-spaced seasons", () => {
    expect(raceConflicts([race("Old", "2026-01-01", "A"), race("New", "2027-06-12", "A"), race("Gone", "2027-06-01", "A", "archived")], "2027-01-01")).toEqual([]);
    expect(raceConflicts([race("Spring", "2027-04-01", "A"), race("Autumn", "2027-09-01", "A")], "2027-01-01")).toEqual([]);
  });
});
