/** A small course elevation profile for race cards (mobile#120). Pure, so it is unit-tested. */

import type { MissionCourse } from "@/lib/api/courses";

/** ~`target` evenly spaced points with elevation, for a thumbnail. */
export function thumbProfile(course: MissionCourse | null, target = 120): { d: number; e: number }[] | null {
  const points = (course?.course.segments ?? []).flatMap((s) => s.points).filter((p) => p.elevation_m != null);
  if (points.length < 2) return null;
  const stride = Math.max(1, Math.ceil(points.length / target));
  return points.filter((_, i) => i % stride === 0 || i === points.length - 1).map((p) => ({ d: p.distance_m, e: p.elevation_m as number }));
}
