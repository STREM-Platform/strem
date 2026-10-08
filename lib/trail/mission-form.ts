import type { MissionInput, RaceMission } from "@/lib/api/race-missions";

export interface MissionForm {
  name: string; date: string; timezone: string; location: string;
  distance: string; elevation: string; cutoff: string;
  goal: "finish_confidently" | "finish" | "target_time"; target: string;
}
export function missionForm(mission?: RaceMission | null): MissionForm {
  return { name: mission?.event.name ?? "", date: mission?.event.race_date ?? "",
    timezone: mission?.event.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    location: mission?.event.location_name ?? "", distance: mission ? String(mission.event.distance_km) : "",
    elevation: mission?.event.elevation_gain_m == null ? "" : String(mission.event.elevation_gain_m),
    cutoff: mission?.event.cutoff_minutes == null ? "" : String(mission.event.cutoff_minutes),
    goal: mission?.goal.outcome ?? "finish_confidently", target: mission?.goal.target_finish_minutes == null ? "" : String(mission.goal.target_finish_minutes) };
}
export function validateMission(form: MissionForm): { data?: MissionInput; errors: Partial<Record<keyof MissionForm, string>> } {
  const errors: Partial<Record<keyof MissionForm, string>> = {};
  if (form.name.trim().length < 2 || form.name.trim().length > 160) errors.name = "Enter 2–160 characters.";
  if (form.location.trim().length < 2 || form.location.trim().length > 160) errors.location = "Enter 2–160 characters.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !Number.isFinite(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0, 10) !== form.date) errors.date = "Use a real date: YYYY-MM-DD.";
  try { new Intl.DateTimeFormat("en", { timeZone: form.timezone.trim() }).format(); }
  catch { errors.timezone = "Use an IANA timezone, such as Europe/Sofia."; }
  const number = (key: "distance" | "elevation" | "cutoff" | "target", min: number, max: number, optional = false, integer = true): number | null => {
    const input = form[key].trim();
    if (!input && optional) return null;
    const value = Number(input);
    if (!input || !/^\d+(\.\d+)?$/.test(input) || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) errors[key] = `Enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`;
    return value;
  };
  const distance = number("distance", 0.01, 500, false, false);
  const elevation = number("elevation", 0, 30000, true);
  const cutoff = number("cutoff", 1, 4320, true);
  const target = form.goal === "target_time" ? number("target", 1, 4320) : null;
  if (Object.keys(errors).length) return { errors };
  return { errors, data: { event: { name: form.name.trim(), race_date: form.date, timezone: form.timezone.trim(), location_name: form.location.trim(), distance_km: distance!, elevation_gain_m: elevation, cutoff_minutes: cutoff }, goal: { outcome: form.goal, target_finish_minutes: target } } };
}
/** Calendar-day difference in the event's zone, not a fabricated gun-time countdown. */
export function raceDays(mission: RaceMission, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: mission.event.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return Math.round((Date.parse(mission.event.race_date) - Date.parse(`${value("year")}-${value("month")}-${value("day")}`)) / 86400000);
}
export function requestKey(): string { return `mission_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`; }
