import { describe, expect, it } from "@jest/globals";

import type { RaceMission } from "@/lib/api/race-missions";
import { daysBetween, finishTimeText, hm, mondayOf, parseFinishTime, todayIn } from "@/lib/race/format";
import { missionForm, toInput, validate, withBaseline } from "@/lib/race/mission-form";

const base = {
  ...missionForm(undefined, "trail_running"),
  name: "Mountain 30",
  date: "2027-06-12",
  timezone: "Europe/Sofia",
  location: "Borovets",
  distance: "30",
};

describe("mission setup form", () => {
  it("preserves unknown versus zero elevation", () => {
    expect(toInput(base).event.elevation_gain_m).toBeNull();
    expect(toInput({ ...base, elevation: "0" }).event.elevation_gain_m).toBe(0);
  });

  it.each(["2027-02-30", "2027-13-01", "12/06/2027", "", "2027-2-3"])("rejects invalid date %s", (date) => {
    expect(validate({ ...base, date }, "race").date).toBeTruthy();
  });

  it.each(["-1", "0", "NaN", "Infinity", "abc", "10001", ""])("rejects invalid distance %s", (distance) => {
    expect(validate({ ...base, distance }, "demands").distance).toBeTruthy();
  });

  it("accepts ultra-distance and multi-day challenges", () => {
    const challenge = { ...base, sport: "custom" as const, distance: "1200", format: "multi_stage" as const, stages: "10", endDate: "2027-06-21" };
    expect(validate(challenge)).toEqual({});
    const input = toInput(challenge);
    expect(input.event.stages).toBe(10);
    expect(input.event.end_date).toBe("2027-06-21");
    expect(validate({ ...challenge, endDate: "2027-06-01" }, "demands").endDate).toBeTruthy();
  });

  it("validates timezone, start time and target-time goals", () => {
    expect(validate({ ...base, timezone: "Mars/Olympus" }, "race").timezone).toBeTruthy();
    expect(validate({ ...base, startTime: "25:00" }, "race").startTime).toBeTruthy();
    expect(validate({ ...base, outcome: "target_time" }, "goal").target).toBeTruthy();
    expect(toInput({ ...base, target: "4:00" }).goal.target_finish_minutes).toBeNull();
    expect(toInput({ ...base, outcome: "target_time", target: "4:00" }).goal.target_finish_minutes).toBe(240);
  });

  it("carries the cover photo, motivation and preparation intake", () => {
    const input = toInput({
      ...base,
      motivation: "  For my dad  ",
      days: "5",
      hours: "8.5",
      terrain: ["trails", "mountains"],
      cover: { url: "https://x.test/a.jpg", license: "CC BY 4.0", source_url: "https://x.test/a", provider: "wikimedia" },
    });
    expect(input.goal.motivation).toBe("For my dad");
    expect(input.preparation?.training_days_per_week).toBe(5);
    expect(input.preparation?.weekly_hours).toBe(8.5);
    expect(input.preparation?.terrain_access).toEqual(["trails", "mountains"]);
    expect(input.cover?.provider).toBe("wikimedia");
  });

  it("round-trips an existing mission into the form", () => {
    const mission: RaceMission = {
      ...toInput({ ...base, cutoff: "12:30", startTime: "07:00" }),
      id: "test",
      version: 1,
      state: "active",
      source: "athlete_entry",
      created_at: "2026-10-08T00:00:00Z",
      updated_at: "2026-10-08T00:00:00Z",
    };
    const form = missionForm(mission);
    expect(form.cutoff).toBe("12:30");
    expect(form.startTime).toBe("07:00");
    expect(form.date).toBe("2027-06-12");
  });
});

describe("race formatting", () => {
  it("parses finish times", () => {
    expect(parseFinishTime("6:30")).toBe(390);
    expect(parseFinishTime("1:02:30")).toBe(63);
    expect(parseFinishTime("4.5")).toBe(270);
    expect(parseFinishTime("abc")).toBeNull();
    expect(finishTimeText(390)).toBe("6:30");
  });

  it("formats durations and calendar maths without timezone drift", () => {
    expect(hm(45)).toBe("45 min");
    expect(hm(125)).toBe("2 h 05");
    expect(hm(120)).toBe("2 h");
    expect(daysBetween("2026-10-23", "2027-03-20")).toBe(148);
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
    expect(todayIn("Europe/Sofia", new Date("2027-06-11T22:00:00Z"))).toBe("2027-06-12");
  });
});

describe("a new race starts from the About-you answers (#4)", () => {
  it("fills experience and training days only when the athlete left them empty", () => {
    const blank = missionForm(null);
    expect(withBaseline(blank, { training_level: "intermediate", weekly_target_days: 4 })).toMatchObject({ experience: "some", days: "4" });
    const edited = { ...blank, experience: "elite" as const, days: "6" };
    expect(withBaseline(edited, { training_level: "beginner", weekly_target_days: 3 })).toMatchObject({ experience: "elite", days: "6" });
    expect(withBaseline(blank, { training_level: null, weekly_target_days: null })).toMatchObject({ experience: null, days: "" });
  });
});
