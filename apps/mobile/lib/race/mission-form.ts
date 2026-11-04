/** Mission setup form state, validation (mirrors the user-service rules) and payload. */

import type { TrainingLevel, UserProfile } from "@/lib/api/types";
import type {
  CoverMedia,
  MissionInput,
  Preparation,
  RaceFormat,
  RaceGoal,
  RaceLeg,
  RaceMission,
  Sport,
  Support,
  Terrain,
  Weekday,
} from "@/lib/api/race-missions";
import { finishTimeText, parseFinishTime } from "@/lib/race/format";
import { sportMeta } from "@/lib/race/sports";

export interface MissionForm {
  sport: Sport;
  name: string;
  date: string;
  startTime: string;
  timezone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
  distance: string;
  elevation: string;
  format: RaceFormat;
  stages: string;
  endDate: string;
  support: Support | null;
  cutoff: string;
  legs: RaceLeg[];
  outcome: RaceGoal["outcome"];
  target: string;
  priority: "A" | "B" | "C";
  motivation: string;
  cover: CoverMedia | null;
  experience: Preparation["experience"] | null;
  days: string;
  hours: string;
  longDay: Weekday | null;
  weeklyKm: string;
  weeklyHours: string;
  longestKm: string;
  longestHours: string;
  strength: string;
  terrain: Terrain[];
  constraints: string;
  home: string;
}

export type FormErrors = Partial<Record<keyof MissionForm, string>>;

const deviceZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

const num = (value: number | null | undefined) => (value == null ? "" : String(value));

export function missionForm(mission?: RaceMission | null, sport?: Sport): MissionForm {
  const e = mission?.event;
  const g = mission?.goal;
  const p = mission?.preparation ?? {};
  const chosen = e?.sport ?? sport ?? "trail_running";
  return {
    sport: chosen,
    name: e?.name ?? "",
    date: e?.race_date ?? "",
    startTime: e?.start_time ?? "",
    timezone: e?.timezone ?? deviceZone,
    location: e?.location_name ?? "",
    latitude: e?.latitude ?? null,
    longitude: e?.longitude ?? null,
    countryCode: e?.country_code ?? null,
    distance: e ? String(e.distance_km) : "",
    elevation: num(e?.elevation_gain_m),
    format: e?.format ?? "single_day",
    stages: num(e?.stages),
    endDate: e?.end_date ?? "",
    support: e?.support ?? null,
    cutoff: finishTimeText(e?.cutoff_minutes),
    legs: e?.legs ?? sportMeta(chosen).legs ?? [],
    outcome: g?.outcome ?? "finish_confidently",
    target: finishTimeText(g?.target_finish_minutes),
    priority: g?.priority ?? "A",
    motivation: g?.motivation ?? "",
    cover: mission?.cover ?? null,
    experience: p.experience ?? null,
    days: num(p.training_days_per_week),
    hours: num(p.weekly_hours),
    longDay: p.long_session_day ?? null,
    weeklyKm: num(p.current_weekly_km),
    weeklyHours: num(p.current_weekly_hours),
    longestKm: num(p.longest_recent_km),
    longestHours: num(p.longest_recent_hours),
    strength: num(p.strength_sessions_per_week),
    terrain: p.terrain_access ?? [],
    constraints: p.constraints ?? "",
    home: p.home_location ?? "",
  };
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function optionalNumber(value: string, min: number, max: number, integer: boolean, errors: FormErrors, key: keyof MissionForm): number | null {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    errors[key] = `Enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`;
    return null;
  }
  return n;
}

/** Validate one step's fields (or all when step is undefined). */
const EXPERIENCE_FROM_LEVEL: Record<TrainingLevel, NonNullable<Preparation["experience"]>> = {
  beginner: "new",
  intermediate: "some",
  advanced: "experienced",
};

/** Start a new race's "starting point" from what the athlete said in About you (#4), never over their own edits. */
export function withBaseline(form: MissionForm, profile: Pick<UserProfile, "training_level" | "weekly_target_days">): MissionForm {
  return {
    ...form,
    experience: form.experience ?? (profile.training_level ? EXPERIENCE_FROM_LEVEL[profile.training_level] : null),
    days: form.days || (profile.weekly_target_days ? String(profile.weekly_target_days) : ""),
  };
}

export function validate(form: MissionForm, step?: "race" | "demands" | "goal" | "prep"): FormErrors {
  const errors: FormErrors = {};
  const all = step === undefined;
  if (all || step === "race") {
    if (form.name.trim().length < 2) errors.name = "Give your race or challenge a name.";
    if (!isDate(form.date)) errors.date = "Pick the race date.";
    if (form.location.trim().length < 2) errors.location = "Where does it start?";
    if (form.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime)) errors.startTime = "Use 24-hour time, e.g. 07:00.";
    try {
      new Intl.DateTimeFormat("en", { timeZone: form.timezone }).format();
    } catch {
      errors.timezone = "Pick a place so the timezone is known.";
    }
  }
  if (all || step === "demands") {
    const d = optionalNumber(form.distance, 0.01, 10000, false, errors, "distance");
    if (d == null && !errors.distance) errors.distance = "Distance is needed to plan.";
    optionalNumber(form.elevation, 0, 100000, true, errors, "elevation");
    if (form.cutoff && parseFinishTime(form.cutoff) == null) errors.cutoff = "Use hours:minutes, e.g. 12:00.";
    if (form.format !== "single_day") {
      optionalNumber(form.stages, 1, 60, true, errors, "stages");
      if (form.endDate && (!isDate(form.endDate) || form.endDate < form.date)) errors.endDate = "End date must be on or after the start.";
    }
  }
  if (all || step === "goal") {
    const target = parseFinishTime(form.target);
    if (form.outcome === "target_time" && target == null) errors.target = "Enter your target time, e.g. 6:30.";
    if (form.motivation.length > 600) errors.motivation = "Keep it under 600 characters.";
  }
  if (all || step === "prep") {
    optionalNumber(form.days, 1, 7, true, errors, "days");
    optionalNumber(form.hours, 0.5, 40, false, errors, "hours");
    optionalNumber(form.weeklyKm, 0, 2000, false, errors, "weeklyKm");
    optionalNumber(form.weeklyHours, 0, 60, false, errors, "weeklyHours");
    optionalNumber(form.longestKm, 0, 1000, false, errors, "longestKm");
    optionalNumber(form.longestHours, 0, 72, false, errors, "longestHours");
    optionalNumber(form.strength, 0, 4, true, errors, "strength");
  }
  return errors;
}

function n(value: string): number | null {
  const text = value.trim().replace(",", ".");
  return text ? Number(text) : null;
}

export function toInput(form: MissionForm): MissionInput {
  const multi = form.format !== "single_day";
  const target = parseFinishTime(form.target);
  const prep: Preparation = {
    experience: form.experience ?? null,
    training_days_per_week: n(form.days),
    weekly_hours: n(form.hours),
    long_session_day: form.longDay,
    current_weekly_km: n(form.weeklyKm),
    current_weekly_hours: n(form.weeklyHours),
    longest_recent_km: n(form.longestKm),
    longest_recent_hours: n(form.longestHours),
    strength_sessions_per_week: n(form.strength),
    terrain_access: form.terrain,
    constraints: form.constraints.trim() || null,
    home_location: form.home.trim() || null,
  };
  return {
    event: {
      name: form.name.trim(),
      race_date: form.date,
      timezone: form.timezone,
      location_name: form.location.trim(),
      distance_km: Number(form.distance.trim().replace(",", ".")),
      elevation_gain_m: n(form.elevation) == null ? null : Math.round(n(form.elevation)!),
      cutoff_minutes: parseFinishTime(form.cutoff),
      sport: form.sport,
      format: form.format,
      support: form.support,
      start_time: form.startTime || null,
      end_date: multi && form.endDate ? form.endDate : null,
      stages: multi && n(form.stages) ? Math.round(n(form.stages)!) : null,
      latitude: form.latitude,
      longitude: form.longitude,
      country_code: form.countryCode,
      legs: form.legs.length ? form.legs : null,
    },
    goal: {
      outcome: form.outcome,
      target_finish_minutes: form.outcome === "target_time" || form.outcome === "compete" ? target : null,
      motivation: form.motivation.trim() || null,
      priority: form.priority,
    },
    cover: form.cover,
    preparation: prep,
  };
}
