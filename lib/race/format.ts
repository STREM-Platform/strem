/** Formatting helpers for race data (metric, locale-light, calendar-true). */

export function hm(minutes: number | null | undefined): string {
  if (minutes == null) return "–";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function hmCompact(minutes: number | null | undefined): string {
  if (minutes == null) return "–";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}` : `${m}'`;
}

export function km(value: number | null | undefined, digits = 1): string {
  if (value == null) return "–";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/\.0$/, "");
}

export function compact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse a YYYY-MM-DD calendar date without timezone drift. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dayLabel(iso: string, withWeekday = true): string {
  const d = parseDay(iso);
  const base = `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAY[d.getUTCDay()]} ${base}` : base;
}

export function longDate(iso: string): string {
  const d = parseDay(iso);
  return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAY[parseDay(iso).getUTCDay()];
}

/** Today's calendar date in a timezone (YYYY-MM-DD). */
export function todayIn(timezone = "UTC", now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return parts.slice(0, 10);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDay(toIso).getTime() - parseDay(fromIso).getTime()) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(iso: string): string {
  const d = parseDay(iso);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -offset);
}

export function relativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${-diff} days ago`;
  return dayLabel(iso);
}

export function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1).replace(/_/g, " ") : text;
}

export function requestKey(): string {
  return `mission_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function parseFinishTime(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  const parts = value.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  return null;
}

export function finishTimeText(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
