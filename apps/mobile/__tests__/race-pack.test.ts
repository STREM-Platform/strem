/** Race-day mode (mobile#128): the offline pack and the live read against plan. */

import { describe, expect, it } from "@jest/globals";

import type { LayerContent, MissionLayer } from "@/lib/api/race";
import type { RaceMission } from "@/lib/api/race-missions";
import { buildRacePack, liveRead, parseHm, timelineNotes } from "@/lib/race/race-pack";

const layer = (kind: MissionLayer["kind"], content: Partial<LayerContent>): MissionLayer =>
  ({ kind, content: { headline: "", summary: "", metrics: [], sections: [], warnings: [], assumptions: [], sources: [], ...content } }) as MissionLayer;

const mission = {
  id: "m1",
  event: {
    name: "Synthetic Ridge 50K",
    race_date: "2026-11-20",
    timezone: "Europe/Sofia",
    distance_km: 50,
    cutoff_minutes: 720,
    start_time: "07:00",
    checkpoints: [{ name: "Hut", km: 18, cutoff_minutes: 240 }],
  },
} as unknown as RaceMission;

const layers = {
  strategy: layer("strategy", {
    warnings: ["Only 40 min margin to the Hut cutoff."],
    sections: [
      {
        id: "checkpoints",
        title: "Checkpoint plan",
        kind: "table",
        items: [
          { id: "leg-1", title: "Start → Hut (km 18)", detail: "Refill ~500 ml · Eat something real (salty + carbs)", values: { arrive: "3 h 20", clock: "10:20", carry: "120 g carbs · 900 ml" } },
          { id: "leg-2", title: "Hut → Finish (km 50)", detail: "Hold even effort; eat and drink on schedule.", values: { arrive: "9 h 05", clock: "16:05" } },
        ],
      },
    ],
  }),
  fuel: layer("fuel", { metrics: [{ label: "Carbohydrate", value: "60", unit: "g/h" }] }),
  gear: layer("gear", { sections: [{ id: "mandatory", title: "Mandatory", kind: "checklist", items: [{ id: "a", title: "Waterproof jacket", priority: "critical" }, { id: "b", title: "Buff", priority: "normal" }] }] }),
};

describe("parseHm", () => {
  it("reads the engine's duration text", () => {
    expect(parseHm("4 h 12")).toBe(252);
    expect(parseHm("3 h")).toBe(180);
    expect(parseHm("45 min")).toBe(45);
    expect(parseHm("–")).toBeNull();
  });
});

describe("buildRacePack", () => {
  it("turns the checkpoint plan, fuel targets and critical kit into the offline pack", () => {
    const pack = buildRacePack(mission, layers, new Date("2026-11-19T18:00:00Z"));
    expect(pack.stations.map((s) => [s.name, s.km, s.plannedMin, s.cutoffMin])).toEqual([
      ["Hut", 18, 200, 240],
      ["Finish", 50, 545, 720],
    ]);
    expect(pack.stations[0].todo).toEqual(["Refill ~500 ml", "Eat something real (salty + carbs)"]);
    expect(pack.fuel).toEqual([{ label: "Carbohydrate", value: "60 g/h" }]);
    expect(pack.kit).toEqual(["Waterproof jacket"]);
    expect(pack.notes).toEqual(["Only 40 min margin to the Hut cutoff."]);
  });

  it("is empty but valid before the strategy layer exists", () => {
    expect(buildRacePack(mission, {}).stations).toEqual([]);
  });
});

describe("liveRead", () => {
  const pack = buildRacePack(mission, layers);

  it("points at the first station and its cutoff before any arrival", () => {
    expect(liveRead(pack, [], 60)).toMatchObject({ delta: null, cutoffLeft: 180, expectedMin: 200, next: { name: "Hut" } });
  });

  it("shifts the next arrival by how far ahead or behind the athlete is", () => {
    const read = liveRead(pack, [{ name: "Hut", atMin: 215 }], 230);
    expect(read.next?.name).toBe("Finish");
    expect(read.delta).toBe(-15);
    expect(read.expectedMin).toBe(560);
    expect(timelineNotes(pack, [{ name: "Hut", atMin: 215 }])).toBe("Hut: 3:35 (15 min behind)");
  });
});
