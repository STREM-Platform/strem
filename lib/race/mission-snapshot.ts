/**
 * A light snapshot of one race for its card on My races (mobile#120): current
 * phase and week, readiness per layer, and a downsampled course profile.
 * Every part is optional — a card renders with whatever loaded.
 */

import { useEffect, useState } from "react";

import { courses } from "@/lib/api/courses";
import { layersApi, planApi, type LayerKind, type MissionLayer } from "@/lib/api/race";
import type { RaceMission } from "@/lib/api/race-missions";
import { todayIn } from "@/lib/race/format";
import { thumbProfile } from "@/lib/race/course-thumb";
import { layerStatuses, type LayerStatus } from "@/lib/race/readiness";

export const NEEDS_COURSE = new Set(["trail_running", "hiking", "skimo", "cycling", "gravel", "mountain_biking", "multisport", "custom"]);

export interface MissionSnapshot {
  phase: string | null;
  week: { index: number; total: number } | null;
  rows: LayerStatus[] | null;
  profile: { d: number; e: number }[] | null;
}

export function useMissionSnapshot(mission: RaceMission): MissionSnapshot {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>({ phase: null, week: null, rows: null, profile: null });
  useEffect(() => {
    let alive = true;
    const today = todayIn(mission.event.timezone);
    void Promise.all([
      planApi.get(mission.id).catch(() => null),
      planApi.progress(mission.id).catch(() => null),
      layersApi.list(mission.id).catch(() => [] as MissionLayer[]),
      courses.get(mission.id).catch(() => null),
    ]).then(([plan, progress, layerList, course]) => {
      if (!alive) return;
      const weeks = plan?.content.weeks ?? [];
      const index = weeks.findIndex((w, i) => w.start_date <= today && (weeks[i + 1]?.start_date ?? "9999") > today);
      const layers = Object.fromEntries(layerList.map((l) => [l.kind, l])) as Partial<Record<LayerKind, MissionLayer>>;
      setSnapshot({
        phase: index >= 0 ? weeks[index].phase : weeks.length && today < weeks[0].start_date ? "starts soon" : null,
        week: index >= 0 ? { index: index + 1, total: weeks.length } : null,
        rows: layerStatuses({ plan, progress, layers, hasCourse: Boolean(course), needsCourse: NEEDS_COURSE.has(mission.event.sport ?? "trail_running") }),
        profile: thumbProfile(course),
      });
    });
    return () => {
      alive = false;
    };
  }, [mission.id, mission.version, mission.event.timezone, mission.event.sport]);
  return snapshot;
}
