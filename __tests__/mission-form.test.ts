import { describe, expect, it } from "@jest/globals";
import { missionForm, raceDays, validateMission } from "@/lib/trail/mission-form";
import type { RaceMission } from "@/lib/api/race-missions";

const form = { ...missionForm(), name: "Mountain 30", date: "2027-06-12", timezone: "Europe/Sofia", location: "Borovets", distance: "30" };
describe("real mission intake", () => {
  it("preserves unknown versus zero", () => {
    expect(validateMission(form).data?.event.elevation_gain_m).toBeNull();
    expect(validateMission({ ...form, elevation: "0" }).data?.event.elevation_gain_m).toBe(0);
  });
  it.each(["2027-02-30", "2027-13-01", "12/06/2027", "", "2027-2-3"])("rejects invalid date %s", (date) => expect(validateMission({ ...form, date }).errors.date).toBeTruthy());
  it.each(["-1", "0", "NaN", "Infinity", "1e2", "501", ""])("rejects invalid distance %s", (distance) => expect(validateMission({ ...form, distance }).errors.distance).toBeTruthy());
  it("validates timezone and target-time goals", () => {
    expect(validateMission({ ...form, timezone: "Mars/Olympus" }).errors.timezone).toBeTruthy();
    expect(validateMission({ ...form, goal: "target_time" }).errors.target).toBeTruthy();
    expect(validateMission({ ...form, target: "240" }).data?.goal.target_finish_minutes).toBeNull();
    expect(validateMission({ ...form, goal: "target_time", target: "240" }).data?.goal.target_finish_minutes).toBe(240);
  });
  it("counts calendar days in the race zone and exposes past dates", () => {
    const mission: RaceMission = { ...validateMission(form).data!, id: "test", version: 1, state: "active", source: "athlete_entry", created_at: "2026-10-08T00:00:00Z", updated_at: "2026-10-08T00:00:00Z" };
    expect(raceDays(mission, new Date("2027-06-11T22:00:00Z"))).toBe(0);
    expect(raceDays(mission, new Date("2027-06-12T22:00:00Z"))).toBe(-1);
    expect(missionForm(mission).date).toBe("2027-06-12");
  });
});
