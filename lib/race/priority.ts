/** A/B/C race priority: what it means and where races clash (user-service#31). */

import type { RaceMission } from "@/lib/api/race-missions";
import { daysBetween, dayLabel } from "@/lib/race/format";

export type Priority = "A" | "B" | "C";

export const PRIORITY: Record<Priority, { label: string; short: string; body: string }> = {
  A: { label: "A race", short: "The goal", body: "The race the season builds toward: full build, peak and taper." },
  B: { label: "B race", short: "Key race", body: "Raced hard with a mini-taper (a few easy days) and a recovery day, inside your A-race build." },
  C: { label: "C race", short: "Train through", body: "Trained through — it replaces a long run and doubles as a rehearsal for fuel, gear and pacing." },
};

export function priorityOf(mission: Pick<RaceMission, "goal">): Priority {
  return mission.goal.priority ?? "A";
}

/** Clashes worth saying out loud: two A races close together, a B or C race in an A-race taper. */
export function raceConflicts(missions: Pick<RaceMission, "goal" | "event" | "state">[], today: string): string[] {
  const ahead = missions
    .filter((m) => m.state === "active" && m.event.race_date >= today)
    .sort((a, b) => a.event.race_date.localeCompare(b.event.race_date));
  const out: string[] = [];
  for (const [i, first] of ahead.entries()) {
    for (const second of ahead.slice(i + 1)) {
      const gap = daysBetween(first.event.race_date, second.event.race_date);
      const [p1, p2] = [priorityOf(first), priorityOf(second)];
      if (p1 === "A" && p2 === "A" && gap < 56) {
        out.push(`${first.event.name} and ${second.event.name} are both A races, ${Math.round(gap / 7)} week(s) apart — one of them is usually a B race.`);
      } else if (p2 === "A" && p1 === "B" && gap <= 21) {
        out.push(`${first.event.name} (B, ${dayLabel(first.event.race_date)}) falls in the taper for ${second.event.name} — you'll arrive less fresh.`);
      } else if (p2 === "A" && p1 === "C" && gap <= 7) {
        out.push(`${first.event.name} (C) is in race week for ${second.event.name} — consider skipping it.`);
      }
    }
  }
  return out;
}
