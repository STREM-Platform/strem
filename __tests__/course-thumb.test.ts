/** Race-card snapshot helpers (mobile#120). */

import { describe, expect, it } from "@jest/globals";

import type { MissionCourse } from "@/lib/api/courses";
import { thumbProfile } from "@/lib/race/course-thumb";

function course(n: number): MissionCourse {
  const points = Array.from({ length: n }, (_, i) => ({ latitude: 42, longitude: 23, elevation_m: i % 7 === 3 ? null : 1000 + i, distance_m: i * 10 }));
  return { course: { segments: [{ points }] } } as unknown as MissionCourse;
}

describe("thumbProfile", () => {
  it("downsamples to about the target, keeps the finish and skips points without elevation", () => {
    const profile = thumbProfile(course(5000), 120);
    expect(profile).not.toBeNull();
    expect(profile!.length).toBeGreaterThan(100);
    expect(profile!.length).toBeLessThanOrEqual(122);
    expect(profile![profile!.length - 1]).toEqual({ d: 49990, e: 5999 });
  });

  it("is null without a course or elevation", () => {
    expect(thumbProfile(null)).toBeNull();
    expect(thumbProfile(course(1))).toBeNull();
  });
});
