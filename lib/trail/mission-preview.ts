type TrailSessionState = "done" | "today" | "next" | "rest";

export interface TrailSessionPreview {
  day: string;
  date: string;
  title: string;
  detail: string;
  state: TrailSessionState;
}

interface CourseSectionPreview {
  km: string;
  name: string;
  note: string;
  tone: "climb" | "control" | "commit";
}

/**
 * Product-direction fixture only. Every screen using it renders a visible
 * prototype label. Delete this when the Race Mission contract lands; never
 * turn it into a fake API response.
 */
export const TRAIL_MISSION_PREVIEW = {
  preview: true,
  race: {
    name: "Rila Ridge 32K",
    location: "Borovets, Bulgaria",
    dateLabel: "18 OCT 2026",
    dateIso: "2026-10-18T07:00:00+03:00",
    distanceKm: 32,
    elevationM: 1850,
    cutoff: "7h 00m",
    goal: "Finish controlled",
  },
  phase: { name: "Specific preparation", week: 5, totalWeeks: 8, completion: 0.61 },
  readiness: {
    score: 68,
    label: "Building",
    explanation: "Climbing load is on target. Descending durability and long-run fueling still need proof.",
  },
  today: {
    overline: "Priority session",
    title: "Downhill durability",
    detail: "42 min · easy climb, 6 controlled descents, ankle strength",
    reason: "Your recent work covers climbing, but the race loses 620 m after kilometre 21. Today closes that gap without adding a hard aerobic load.",
  },
  evidence: [
    { label: "Long trail", value: "18 / 24 km", status: "Building" },
    { label: "Vertical", value: "1,120 / 1,500 m", status: "On course" },
    { label: "Fuel test", value: "90 / 180 min", status: "Needs proof" },
  ],
  week: [
    { day: "MON", date: "21", title: "Recovery", detail: "Walk + mobility · 30 min", state: "done" },
    { day: "TUE", date: "22", title: "Hill repeats", detail: "6 × 4 min climb", state: "done" },
    { day: "THU", date: "24", title: "Downhill durability", detail: "Technique + ankle strength", state: "today" },
    { day: "SAT", date: "26", title: "Race rehearsal", detail: "18 km · 900 m+ · fuel test", state: "next" },
    { day: "SUN", date: "27", title: "Easy hike", detail: "60–75 min conversational", state: "rest" },
  ] as TrailSessionPreview[],
  course: {
    profile: [0.12, 0.18, 0.28, 0.48, 0.74, 0.62, 0.83, 0.92, 0.66, 0.58, 0.42, 0.25, 0.31, 0.2],
    sections: [
      { km: "0–9", name: "Hold back", note: "850 m of early climbing. Hike before the effort spikes.", tone: "climb" },
      { km: "9–21", name: "Settle", note: "Runnable ridge. Eat, drink, and protect the legs.", tone: "control" },
      { km: "21–32", name: "Commit", note: "Long technical descent followed by the final 280 m climb.", tone: "commit" },
    ] as CourseSectionPreview[],
  },
  raceLab: {
    fuel: { title: "Fuel rehearsal incomplete", detail: "Test 50–60 g carbohydrate and 500 ml fluid per hour for 3 hours.", progress: 0.5 },
    gear: { title: "8 of 11 items proven", detail: "Rain shell, headlamp and blister kit still need a wet-run test.", progress: 0.73 },
    logistics: { title: "Race morning not locked", detail: "Transport and bib collection remain unresolved.", progress: 0.42 },
  },
  decisionEvidence: [
    "Recent climbing volume supports the current phase",
    "No sustained downhill session is recorded in the prototype history",
    "Saturday is reserved for the key race rehearsal",
  ],
} as const;

export function daysUntilRace(now = new Date()): number {
  const race = new Date(TRAIL_MISSION_PREVIEW.race.dateIso);
  return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / 86_400_000));
}
