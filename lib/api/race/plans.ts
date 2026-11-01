/** Training plans: mission plans, the athlete timeline, seasons and progress (training-service). */

import { request } from "../client";
import { auth, slow, optional, type Origin } from "./shared";

export type SessionKind =
  | "easy"
  | "long"
  | "tempo"
  | "intervals"
  | "hills"
  | "recovery"
  | "strength"
  | "mobility"
  | "race_sim"
  | "brick"
  | "back_to_back"
  | "technique"
  | "test"
  | "cross"
  | "rest"
  | "race";

export interface PlanSession {
  id: string;
  date: string;
  sport: string;
  kind: SessionKind;
  title: string;
  purpose: string;
  duration_minutes?: number | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  intensity: string;
  structure: string[];
  fueling?: string | null;
  terrain?: string | null;
  key: boolean;
  status: "planned" | "done" | "partial" | "skipped" | "moved";
  matched_session_ids: string[];
  athlete_note?: string | null;
  rpe?: number | null;
}

export interface PlanWeek {
  index: number;
  start_date: string;
  phase: string;
  focus: string;
  target_hours?: number | null;
  target_km?: number | null;
  target_elevation_m?: number | null;
  long_session?: string | null;
  sessions: PlanSession[];
  notes?: string | null;
}

export interface PlanContent {
  headline: string;
  summary: string;
  sport: string;
  timezone: string;
  start_date: string;
  race_date: string;
  phases: { phase: string; start_date: string; end_date: string; goal: string }[];
  weeks: PlanWeek[];
  principles: string[];
  assumptions: string[];
  warnings: string[];
}

export interface MissionPlan {
  mission_id: string;
  version: number;
  origin: Origin;
  model?: string | null;
  inputs_digest?: string | null;
  content: PlanContent;
  created_at: string;
  updated_at: string;
}

export interface Volume {
  sessions: number;
  hours: number;
  km: number;
  elevation_m: number;
}

export interface ActivityRef {
  id: string;
  date: string;
  session_type: string;
  title?: string | null;
  duration_minutes: number;
  distance_km?: number | null;
  elevation_m?: number | null;
  source: string;
  is_race: boolean;
}

export interface SessionProgress {
  id: string;
  date: string;
  week_index: number;
  title: string;
  kind: string;
  sport: string;
  key: boolean;
  planned_minutes?: number | null;
  planned_km?: number | null;
  derived_status: "done" | "partial" | "missed" | "skipped" | "moved" | "planned" | "rest";
  status_source: "athlete" | "matched" | "derived";
  matched: ActivityRef[];
}

export interface MissionProgress {
  mission_id: string;
  as_of: string;
  plan_version?: number | null;
  totals?: {
    planned_to_date: number;
    completed: number;
    partial: number;
    missed: number;
    consistency_pct?: number | null;
    key_planned_to_date: number;
    key_completed: number;
    done: Volume;
  } | null;
  weeks: {
    index: number;
    start_date: string;
    phase: string;
    focus: string;
    timing: "past" | "current" | "future";
    planned: Volume;
    actual: Volume;
    completion_pct?: number | null;
  }[];
  sessions: SessionProgress[];
  long_sessions: { date: string; planned_minutes?: number | null; planned_km?: number | null; actual_minutes?: number | null; actual_km?: number | null; status: string }[];
  unplanned: ActivityRef[];
  evidence: {
    weeks: { start_date: string; volume: Volume; longest_minutes: number; longest_km?: number | null }[];
    longest_recent?: ActivityRef | null;
    races_recorded: number;
    last_activity?: ActivityRef | null;
  };
}

/** One week of the athlete's plan, with the plan it comes from (training-service#23). */
export interface TimelineWeek extends PlanWeek {
  source: "race" | "season" | "base";
  mission_id?: string | null;
  season_id?: string | null;
  origin: Origin;
}

export type SeasonFocus = "base" | "build" | "race_season" | "off_season" | "recovery";

export interface TimelineSeason {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  focus: SeasonFocus;
  has_plan: boolean;
  current: boolean;
}

export interface SeasonInput {
  name: string;
  start_date: string;
  end_date: string;
  focus: SeasonFocus;
  notes?: string | null;
}

export interface TimelineRace {
  mission_id: string;
  name: string;
  race_date: string;
  priority: "A" | "B" | "C";
  sport: string;
  state: "active" | "completed";
  has_plan: boolean;
}

/** The athlete's plan: every race plan and their own plan on one calendar. */
export interface AthletePlan {
  as_of: string;
  content: (Omit<PlanContent, "weeks" | "race_date"> & { race_date?: string | null; weeks: TimelineWeek[] }) | null;
  races: TimelineRace[];
  seasons?: TimelineSeason[];
  base_version?: number | null;
  next_race?: TimelineRace | null;
}

export type AthleteProgress = Omit<MissionProgress, "mission_id">;

export type SessionChange = { status?: PlanSession["status"]; athlete_note?: string | null; rpe?: number | null; date?: string };

/** Timeline session ids carry their source: `b-…` (own plan) or `m<8 hex>-…` (a race plan). */
export function isTimelineId(id: string): boolean {
  return id.startsWith("b-") || /^[ms][0-9a-f]{8}-/.test(id);
}

export const athletePlanApi = {
  get() {
    return request<AthletePlan>("/training/plan", auth);
  },
  progress() {
    return request<AthleteProgress>("/training/plan/progress", auth);
  },
  patchSession(sessionId: string, body: SessionChange) {
    return request<AthletePlan>(`/training/plan/sessions/${sessionId}`, { ...auth, method: "PATCH", body });
  },
  deleteBase() {
    return request<void>("/training/plan/base", { ...auth, method: "DELETE" });
  },
};

/** Seasons of the athlete's year, each with its own plan (training#18). */
export const seasonsApi = {
  async list(): Promise<(TimelineSeason & { plan?: PlanContent | null })[]> {
    return (await request<{ items: (TimelineSeason & { plan?: PlanContent | null })[] }>("/training/seasons", auth)).items;
  },
  create(body: SeasonInput) {
    return request<unknown>("/training/seasons", { ...auth, method: "POST", body });
  },
  update(id: string, body: SeasonInput) {
    return request<unknown>(`/training/seasons/${id}`, { ...auth, method: "PATCH", body });
  },
  remove(id: string) {
    return request<void>(`/training/seasons/${id}`, { ...auth, method: "DELETE" });
  },
  build(id: string) {
    return request<{ origin: Origin; model?: string | null; ai_reason?: string | null }>(`/ai/race/seasons/${id}/build`, { ...slow, method: "POST", body: {} });
  },
};

export const planApi = {
  get(missionId: string) {
    return optional(request<MissionPlan>(`/training/missions/${missionId}/plan`, auth), ["plan_not_found"]);
  },
  progress(missionId: string) {
    return request<MissionProgress>(`/training/missions/${missionId}/progress`, auth);
  },
  patchSession(plan: MissionPlan, sessionId: string, body: { status?: PlanSession["status"]; athlete_note?: string | null; rpe?: number | null; date?: string }) {
    return request<MissionPlan>(`/training/missions/${plan.mission_id}/plan/sessions/${sessionId}`, {
      ...auth,
      method: "PATCH",
      body,
      headers: { "If-Match": `"${plan.version}"` },
    });
  },
};
