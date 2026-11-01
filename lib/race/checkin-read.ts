/**
 * Check-in logic (mobile#121): trends over the athlete's own history and a
 * transparent "today" read — every input is shown next to the rule it fed, no
 * black-box score. Illness and pain always route to rest and professional advice.
 */

import type { Checkin } from "@/lib/api/race";
import { addDays } from "@/lib/race/format";

export type Metric = "sleep_quality" | "energy" | "soreness" | "stress" | "motivation";

/** `good` says which end of the 1–5 scale is the good one. */
export const METRICS: { key: Metric; label: string; good: "high" | "low"; low: string; high: string }[] = [
  { key: "sleep_quality", label: "Sleep", good: "high", low: "Terrible", high: "Great" },
  { key: "energy", label: "Energy", good: "high", low: "Empty", high: "Full" },
  { key: "soreness", label: "Soreness", good: "low", low: "None", high: "Very sore" },
  { key: "stress", label: "Stress", good: "low", low: "Calm", high: "Very stressed" },
  { key: "motivation", label: "Motivation", good: "high", low: "None", high: "Fired up" },
];

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

/** One value per day (oldest first) for the last `days` days ending today; null when not answered. */
export function series(checkins: Checkin[], key: Metric, days: number, today: string): (number | null)[] {
  const byDay = new Map(checkins.map((c) => [c.day, c[key] ?? null]));
  return Array.from({ length: days }, (_, i) => byDay.get(addDays(today, i - days + 1)) ?? null);
}

export interface Trend {
  points: (number | null)[];
  average: number | null;
  /** Last 7 days' average minus the 7 before; null without both. */
  change: number | null;
  /** Whether the change is good, bad or flat for this metric. */
  direction: "better" | "worse" | "flat" | null;
}

export function trend(checkins: Checkin[], key: Metric, days: number, today: string): Trend {
  const points = series(checkins, key, days, today);
  const answered = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);
  const last = mean(answered(points.slice(-7)));
  const prior = mean(answered(points.slice(-14, -7)));
  const change = last != null && prior != null ? round1(last - prior) : null;
  const good = METRICS.find((m) => m.key === key)?.good ?? "high";
  const direction = change == null ? null : Math.abs(change) < 0.3 ? "flat" : (change > 0) === (good === "high") ? "better" : "worse";
  return { points, average: mean(answered(points)), change, direction };
}

/** The athlete's usual value: mean of the 14 days before today. */
export function baseline(checkins: Checkin[], key: Metric, today: string): number | null {
  const past = series(checkins, key, 15, today).slice(0, -1).filter((x): x is number => x != null);
  return past.length >= 3 ? mean(past) : null;
}

export interface TodayRead {
  verdict: "rest" | "easy" | "as_planned" | "unknown";
  title: string;
  detail: string;
  inputs: { label: string; value: string; note: string | null; flagged: boolean }[];
  /** Shown whenever illness or pain is reported. */
  professional: string | null;
  /** A pattern worth a reviewed plan change; `reason` goes to the race team. */
  pattern: { title: string; reason: string } | null;
}

export interface KeySession {
  title: string;
  date: string;
}

function low(c: Checkin, key: Metric): boolean {
  const v = c[key];
  if (v == null) return false;
  return METRICS.find((m) => m.key === key)?.good === "high" ? v <= 2 : v >= 4;
}

export function todayRead(checkins: Checkin[], today: string, nextKey: KeySession | null = null): TodayRead {
  const c = checkins.find((x) => x.day === today);
  if (!c) {
    return { verdict: "unknown", title: "No check-in yet today", detail: "Ten seconds tells your race team how to treat today's session.", inputs: [], professional: null, pattern: null };
  }
  const inputs = METRICS.filter((m) => c[m.key] != null).map((m) => {
    const usual = baseline(checkins, m.key, today);
    const value = c[m.key] as number;
    const diff = usual == null ? 0 : value - usual;
    const note = usual == null ? null : Math.abs(diff) < 0.5 ? `about your usual ${usual}` : `${diff > 0 ? "above" : "below"} your usual ${usual}`;
    return { label: m.label, value: `${value}/5`, note, flagged: low(c, m.key) };
  });
  if (c.sleep_hours != null) inputs.push({ label: "Hours slept", value: `${c.sleep_hours} h`, note: null, flagged: c.sleep_hours < 6 });

  const flags = METRICS.filter((m) => low(c, m.key)).map((m) => m.label.toLowerCase());
  let verdict: TodayRead["verdict"] = "as_planned";
  let title = "Train as planned";
  let detail = flags.length ? `Only ${flags.join(" and ")} is off — keep an eye on it.` : "Nothing in today's check-in argues against the plan.";
  let professional: string | null = null;

  if (c.illness) {
    verdict = "rest";
    title = "Rest today";
    detail = "Training while ill delays the build and can make you worse.";
    professional = "With a fever, chest symptoms or illness lasting more than a few days, see a doctor before training again.";
  } else if (c.pain_note) {
    verdict = "easy";
    title = "No training through pain";
    detail = `You noted: “${c.pain_note}”. Keep today easy and pain-free, or rest.`;
    professional = "If the pain changes how you move, gets worse, or lasts more than a few days, see a physio or doctor.";
  } else if (flags.length >= 3) {
    verdict = "rest";
    title = "Rest or a very easy day";
    detail = `${capitalize(flags.join(", "))} are all off today. One rest day costs nothing; pushing through can cost a week.`;
  } else if ((c.soreness ?? 0) >= 4) {
    verdict = "easy";
    title = "Swap quality for easy time";
    detail = "High soreness: keep the duration, drop the intensity.";
  } else if ((c.sleep_quality ?? 5) <= 2 && (c.energy ?? 5) <= 2) {
    verdict = "easy";
    title = "Keep it easy";
    detail = "Poor sleep and low energy together: an easy session today, the hard one when you're recovered.";
  }

  return { verdict, title, detail, inputs, professional, pattern: pattern(checkins, today, nextKey) };
}

/** Three-day patterns that justify asking the race team for a reviewed change. */
export function pattern(checkins: Checkin[], today: string, nextKey: KeySession | null): TodayRead["pattern"] {
  const last3 = [0, 1, 2].map((d) => checkins.find((c) => c.day === addDays(today, -d)));
  if (last3.some((c) => !c || c.illness)) return null;
  const all = (pred: (c: Checkin) => boolean) => last3.every((c) => c != null && pred(c));
  const soon = nextKey && nextKey.date >= today && nextKey.date <= addDays(today, 2) ? nextKey : null;
  if (all((c) => (c.sleep_quality ?? 5) <= 2) && soon) {
    return {
      title: `Three poor nights before “${soon.title}”`,
      reason: `Three nights of poor sleep in a row (2/5 or lower) before the key session "${soon.title}" on ${soon.date}. Consider moving or easing it.`,
    };
  }
  if (all((c) => (c.soreness ?? 0) >= 4)) {
    return { title: "Soreness has stayed high for three days", reason: "Soreness 4/5 or higher three days in a row. Consider an easier next few days." };
  }
  if (all((c) => (c.energy ?? 5) <= 2)) {
    return { title: "Energy has been low for three days", reason: "Energy 2/5 or lower three days in a row. Consider lightening the next few days." };
  }
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
