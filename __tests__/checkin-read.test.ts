/** Check-ins v2 (mobile#121): trends, the transparent today read and three-day patterns. */

import { describe, expect, it } from "@jest/globals";

import type { Checkin } from "@/lib/api/race";
import { addDays } from "@/lib/race/format";
import { baseline, todayRead, trend } from "@/lib/race/checkin-read";

const TODAY = "2026-11-01";
const day = (offset: number, values: Partial<Checkin>): Checkin => ({ day: addDays(TODAY, offset), illness: false, ...values });

describe("trend", () => {
  it("lays out one point per day, averages what was answered and judges the change per metric", () => {
    const history = [
      ...[-13, -12, -11, -10, -9, -8, -7].map((d) => day(d, { sleep_quality: 2, soreness: 2 })),
      ...[-6, -5, -4, -3, -2, -1, 0].map((d) => day(d, { sleep_quality: 4, soreness: 4 })),
    ];
    const sleep = trend(history, "sleep_quality", 14, TODAY);
    expect(sleep.points).toHaveLength(14);
    expect(sleep.average).toBe(3);
    expect(sleep).toMatchObject({ change: 2, direction: "better" });
    // More soreness is worse, even though the number went up.
    expect(trend(history, "soreness", 14, TODAY).direction).toBe("worse");
    expect(trend(history, "stress", 28, TODAY)).toMatchObject({ average: null, change: null, direction: null });
  });

  it("uses the 14 days before today as the athlete's usual, once there are three answers", () => {
    expect(baseline([day(-1, { energy: 4 }), day(-2, { energy: 2 })], "energy", TODAY)).toBeNull();
    expect(baseline([day(0, { energy: 1 }), day(-1, { energy: 4 }), day(-2, { energy: 3 }), day(-3, { energy: 5 })], "energy", TODAY)).toBe(4);
  });
});

describe("todayRead", () => {
  it("shows every input next to the athlete's usual value", () => {
    const read = todayRead([day(0, { sleep_quality: 2, energy: 4 }), day(-1, { sleep_quality: 4 }), day(-2, { sleep_quality: 4 }), day(-3, { sleep_quality: 4 })], TODAY);
    expect(read.verdict).toBe("as_planned");
    expect(read.inputs[0]).toEqual({ label: "Sleep", value: "2/5", note: "below your usual 4", flagged: true });
    expect(read.detail).toContain("sleep");
  });

  it("always routes illness to rest and a doctor, and pain to easy and a physio", () => {
    const ill = todayRead([day(0, { illness: true, energy: 5 })], TODAY);
    expect(ill).toMatchObject({ verdict: "rest", title: "Rest today" });
    expect(ill.professional).toContain("doctor");
    const pain = todayRead([day(0, { pain_note: "left knee since Tuesday", energy: 5 })], TODAY);
    expect(pain.verdict).toBe("easy");
    expect(pain.detail).toContain("left knee since Tuesday");
    expect(pain.professional).toContain("physio");
  });

  it("eases or rests the day when the signals stack up", () => {
    expect(todayRead([day(0, { soreness: 4 })], TODAY).verdict).toBe("easy");
    expect(todayRead([day(0, { sleep_quality: 2, energy: 2 })], TODAY).verdict).toBe("easy");
    expect(todayRead([day(0, { sleep_quality: 1, energy: 2, stress: 5 })], TODAY).verdict).toBe("rest");
    expect(todayRead([], TODAY).verdict).toBe("unknown");
  });

  it("turns three poor nights before a key session into a pattern for the race team", () => {
    const nights = [0, -1, -2].map((d) => day(d, { sleep_quality: 2 }));
    const read = todayRead(nights, TODAY, { title: "Long run 3 h", date: addDays(TODAY, 1) });
    expect(read.pattern?.title).toBe("Three poor nights before “Long run 3 h”");
    expect(read.pattern?.reason).toContain("2026-11-02");
    // No key session soon, no sleep pattern; illness never becomes a training proposal.
    expect(todayRead(nights, TODAY, { title: "Long run", date: addDays(TODAY, 5) }).pattern).toBeNull();
    expect(todayRead([day(0, { soreness: 4, illness: true }), day(-1, { soreness: 4 }), day(-2, { soreness: 5 })], TODAY).pattern).toBeNull();
    expect(todayRead([0, -1, -2].map((d) => day(d, { soreness: 4 })), TODAY).pattern?.title).toBe("Soreness has stayed high for three days");
  });
});
