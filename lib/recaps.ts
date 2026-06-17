/**
 * Recap builders — turn real account data into shareable story summaries.
 *
 * Ported conceptually from `design-spec/story-recaps.jsx`, but driven by real
 * APIs. Only recaps we can back with real data are produced: weekly, monthly,
 * latest-medal, and consistency. The prototype's PR and lift-volume stories are
 * omitted (no PR / structured-volume history in the contract) rather than faked.
 */

import type { EarnedMedal, NutritionDay, TrainingSession, XPSummary } from "@/lib/api/types";
import { medalDefinitionFor, type MedalDefinition } from "@/lib/medals";

export type RecapType = "weekly" | "monthly" | "medal" | "consistency";

export interface RecapInputs {
  xp: XPSummary;
  sessions: TrainingSession[];
  nutrition: NutritionDay[];
  medals: EarnedMedal[];
}

export interface WeeklyRecap {
  type: "weekly";
  sessions: number;
  distanceKm: number;
  streak: number;
  totalXp: number;
  bars: { d: string; v: number }[];
  weekLabel: string;
}
export interface MonthlyRecap {
  type: "monthly";
  monthLabel: string;
  sessions: number;
  distanceKm: number;
  hours: number;
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
  let sessions = 0;
  for (const s of inputs.sessions) {
    const t = new Date(s.logged_at);
    if (t >= monday) {
      const idx = (t.getDay() + 6) % 7;
      counts[idx] += 1;
      sessions += 1;
      distanceKm += s.distance_km ?? 0;
    }
  }
  return {
    type: "weekly",
    sessions,
    distanceKm: Math.round(distanceKm * 10) / 10,
    streak: inputs.xp.current_streak_days,
    totalXp: inputs.xp.total_xp,
    bars: labels.map((d, i) => ({ d, v: counts[i] })),
    weekLabel: `Week of ${shortDate(monday)}`,
  };
}

function buildMonthly(inputs: RecapInputs): MonthlyRecap {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  let sessions = 0;
  let distanceKm = 0;
  let minutes = 0;
  for (const s of inputs.sessions) {
    const t = new Date(s.logged_at);
    if (t.getMonth() === m && t.getFullYear() === y) {
      sessions += 1;
      distanceKm += s.distance_km ?? 0;
      minutes += s.duration_minutes;
    }
  }
  return {
    type: "monthly",
    monthLabel: MONTHS[m],
    sessions,
    distanceKm: Math.round(distanceKm),
    hours: Math.round(minutes / 60),
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

function buildConsistency(inputs: RecapInputs): ConsistencyRecap {
  const monday = startOfWeek(new Date());
  const trainDays = new Set<string>();
  for (const s of inputs.sessions) {
    const t = new Date(s.logged_at);
    if (t >= monday) trainDays.add(startOfDay(t).toDateString());
  }
  const fuelDays = new Set<string>();
  for (const n of inputs.nutrition) {
    const t = new Date(`${n.date}T12:00:00`);
    if (t >= monday) fuelDays.add(t.toDateString());
  }
  return {
    type: "consistency",
    trainingDays: trainDays.size,
    nutritionDays: fuelDays.size,
    streak: inputs.xp.current_streak_days,
  };
}

/** All recaps we can back with real data, in display order. */
export function buildRecaps(inputs: RecapInputs): Recap[] {
  const recaps: Recap[] = [buildWeekly(inputs), buildConsistency(inputs), buildMonthly(inputs)];
  const def = latestMedalDef(inputs.medals);
  if (def) {
    recaps.splice(1, 0, { type: "medal", def });
  }
  return recaps;
}
