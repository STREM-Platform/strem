import { describe, expect, it } from "@jest/globals";
import { courseProfile, sectionWindow } from "@/lib/trail/course-profile";
import { TRAIL_MISSION_PREVIEW, daysUntilRace } from "@/lib/trail/mission-preview";

describe("illustrative course geometry", () => {
  it("creates a finite profile with exact start and finish", () => {
    const result = courseProfile([0, 1, 0], 32);
    expect(result?.line).toBe("M0.00,156.00 L300.00,28.00 L600.00,156.00");
    expect(result?.area).toContain("L600,180 L0,180 Z");
  });
  it.each([[], [0.5], [0, NaN], [0, Infinity], [-1, 1], [0, 2]])("rejects invalid profile %j", (...values) => {
    expect(courseProfile(values, 32)).toBeNull();
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid distance %s", (distance) => {
    expect(courseProfile([0, 1], distance)).toBeNull();
  });
  it("uses numeric section boundaries, not rounded profile point indices", () => {
    expect(sectionWindow(9, 21, 32)).toEqual({ x: 168.75, width: 225 });
    expect(sectionWindow(21, 32, 32)).toEqual({ x: 393.75, width: 206.25 });
    expect(sectionWindow(-1, 9, 32)).toBeNull();
    expect(sectionWindow(21, 33, 32)).toBeNull();
    expect(sectionWindow(9, 9, 32)).toBeNull();
    expect(sectionWindow(0, 9, 0)).toBeNull();
  });
  it("covers the whole demo course without gaps and keeps the demo clock fixed", () => {
    const sections = TRAIL_MISSION_PREVIEW.course.sections;
    expect(sections[0].startKm).toBe(0);
    expect(sections.at(-1)?.endKm).toBe(TRAIL_MISSION_PREVIEW.race.distanceKm);
    sections.slice(1).forEach((section, index) => expect(section.startKm).toBe(sections[index].endKm));
    expect(daysUntilRace()).toBe(24);
    expect(TRAIL_MISSION_PREVIEW.readiness).not.toHaveProperty("score");
  });
});
