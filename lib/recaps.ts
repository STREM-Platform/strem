/**
 * Recap builders — turn real account data into shareable story summaries.
 *
 * Ported conceptually from `design-spec/story-recaps.jsx`, but driven by real
 * APIs. Only recaps we can back with real data are produced: weekly, monthly,
 * latest-medal, and consistency. The prototype's PR and lift-volume stories are
 * omitted (no PR / structured-volume history in the contract) rather than faked.
 */

import type { IconName } from "@/constants/theme";
import type { EarnedMedal, NutritionDay, TrainingSession, XPSummary } from "@/lib/api/types";
import { medalDefinitionFor, type MedalDefinition } from "@/lib/medals";

export type RecapType = "weekly" | "monthly" | "medal" | "consistency";

export interface RecapInputs {
  xp: XPSummary;
  sessions: TrainingSession[];
  nutrition: NutritionDay[];
  medals: EarnedMedal[];
}

/** Per-discipline rollup for a recap: count, time, distance and elevation. */
export interface SessionBreakdown {
  type: string;
  label: string;
  icon: IconName;
  sessions: number;
  minutes: number;
  km: number;
  elevationM: number;
}

// Discipline display map. The contract logs strength / running / mobility today;
// the rest are wired so swim / bike / trail / hybrid + elevation light up the
// moment the backend (BE-D5) starts returning them — no recap change needed.
const DISCIPLINE: Record<string, { label: string; icon: IconName }> = {
  strength: { label: "Strength", icon: "dumbbell" },
  running: { label: "Run", icon: "route" },
  trail_running: { label: "Trail run", icon: "mountain" },
  cycling: { label: "Bike", icon: "compass" },
  swimming: { label: "Swim", icon: "route" },
  mobility: { label: "Mobility", icon: "refresh" },
  hybrid: { label: "Hybrid", icon: "flame" },
  hyrox: { label: "HYROX", icon: "timer" },
};
const FALLBACK = { label: "Session", icon: "bolt" as IconName };

function breakdown(sessions: TrainingSession[]): SessionBreakdown[] {
  const map = new Map<string, SessionBreakdown>();
  for (const s of sessions) {
    const d = DISCIPLINE[s.session_type] ?? FALLBACK;
    const cur =
      map.get(s.session_type) ??
      { type: s.session_type, label: d.label, icon: d.icon, sessions: 0, minutes: 0, km: 0, elevationM: 0 };
    cur.sessions += 1;
    cur.minutes += s.duration_minutes;
    cur.km += s.distance_km ?? 0;
    cur.elevationM += s.elevation_m ?? 0;
    map.set(s.session_type, cur);
  }
  return [...map.values()]
    .map((b) => ({ ...b, km: Math.round(b.km * 10) / 10 }))
    .sort((a, b) => b.minutes - a.minutes);
}

export interface WeeklyRecap {
  type: "weekly";
  sessions: number;
  distanceKm: number;
  minutes: number;
  streak: number;
  totalXp: number;
  byType: SessionBreakdown[];
  bars: { d: string; v: number }[];
  weekLabel: string;
}
export interface MonthlyRecap {
  type: "monthly";
  monthLabel: string;
  sessions: number;
  distanceKm: number;
  hours: number;
  byType: SessionBreakdown[];
  topMedal?: MedalDefinition;
}
export interface MedalRecap {
  type: "medal";
  def: MedalDefinition;
}
export interface ConsistencyRecap {
  type: "consistency";
  trainingDays: number;
  nutritionDays: number;
  streak: number;
}
export type Recap = WeeklyRecap | MonthlyRecap | MedalRecap | ConsistencyRecap;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function startOfWeek(ref: Date): Date {
  const c = startOfDay(ref);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); // Monday
  return c;
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function shortDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

function buildWeekly(inputs: RecapInputs): WeeklyRecap {
  const now = new Date();
  const monday = startOfWeek(now);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const counts = new Array(7).fill(0);
  let distanceKm = 0;
  let minutes = 0;
  const weekSessions: TrainingSession[] = [];
  for (const s of inputs.sessions) {
    const t = new Date(s.logged_at);
    if (t >= monday) {
      const idx = (t.getDay() + 6) % 7;
      counts[idx] += 1;
      distanceKm += s.distance_km ?? 0;
      minutes += s.duration_minutes;
      weekSessions.push(s);
    }
  }
  return {
    type: "weekly",
    sessions: weekSessions.length,
    distanceKm: Math.round(distanceKm * 10) / 10,
    minutes,
    streak: inputs.xp.current_streak_days,
    totalXp: inputs.xp.total_xp,
    byType: breakdown(weekSessions),
    bars: labels.map((d, i) => ({ d, v: counts[i] })),
    weekLabel: `Week of ${shortDate(monday)}`,
  };
}

function buildMonthly(inputs: RecapInputs): MonthlyRecap {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  let distanceKm = 0;
  let minutes = 0;
  const monthSessions: TrainingSession[] = [];
  for (const s of inputs.sessions) {
    const t = new Date(s.logged_at);
    if (t.getMonth() === m && t.getFullYear() === y) {
      distanceKm += s.distance_km ?? 0;
      minutes += s.duration_minutes;
      monthSessions.push(s);
    }
  }
  return {
    type: "monthly",
    monthLabel: MONTHS[m],
    sessions: monthSessions.length,
    distanceKm: Math.round(distanceKm),
    hours: Math.round(minutes / 60),
    byType: breakdown(monthSessions),
    topMedal: latestMedalDef(inputs.medals),
  };
}

function latestMedalDef(medals: EarnedMedal[]): MedalDefinition | undefined {
  const sorted = [...medals].sort((a, b) => b.earned_at.localeCompare(a.earned_at));
  for (const m of sorted) {
    const def = medalDefinitionFor(m.medal_type);
    if (def) return def;
  }
  return undefined;
}

/** The recaps we surface — weekly + monthly, both real-data backed. */
export function buildRecaps(inputs: RecapInputs): Recap[] {
  return [buildWeekly(inputs), buildMonthly(inputs)];
}
