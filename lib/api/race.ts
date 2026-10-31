/**
 * Race OS endpoints: layers, plan, progress, check-ins, race history, the AI race
 * team, enrichment and connected sources (docs#26). Never falls back to fixtures.
 */

import { ApiError, request } from "./client";
import type { CoverMedia, RaceDayData, Sport } from "./race-missions";

const auth = { auth: true, timeoutMs: 20000 };
const slow = { auth: true, timeoutMs: 180000 };

export type Origin = "engine" | "ai" | "athlete";
export type LayerKind = "fuel" | "gear" | "logistics" | "strategy";
export type ItemStatus = "todo" | "done" | "tested" | "packed" | "skipped" | "na";

export interface LayerItem {
  id: string;
  title: string;
  detail?: string | null;
  when?: string | null;
  due_date?: string | null;
  quantity?: string | null;
  tag?: string | null;
  priority?: "critical" | "high" | "normal" | "low";
  status?: ItemStatus;
  note?: string | null;
  values?: Record<string, string | number | boolean | null> | null;
}

export interface LayerSection {
  id: string;
  title: string;
  kind: "checklist" | "timeline" | "table" | "notes";
  description?: string | null;
  columns?: string[] | null;
  items: LayerItem[];
}

export interface LayerContent {
  headline: string;
  summary: string;
  metrics: { label: string; value: string; unit?: string | null; note?: string | null }[];
  sections: LayerSection[];
  warnings: string[];
  assumptions: string[];
  sources: string[];
}

export interface MissionLayer {
  mission_id: string;
  kind: LayerKind;
  version: number;
  origin: Origin;
  model?: string | null;
  inputs_digest?: string | null;
  content: LayerContent;
  created_at: string;
  updated_at: string;
}

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

export interface Checkin {
  id?: string;
  day: string;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  energy?: number | null;
  soreness?: number | null;
  stress?: number | null;
  motivation?: number | null;
  illness?: boolean;
  pain_note?: string | null;
  note?: string | null;
  updated_at?: string;
}

export interface RaceResultInput {
  name: string;
  race_date: string;
  sport?: Sport;
  location_name?: string | null;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  status?: "finished" | "dnf" | "dns";
  finish_minutes?: number | null;
  placement?: string | null;
  rating?: number | null;
  conditions?: string | null;
  fueling_notes?: string | null;
  gear_notes?: string | null;
  notes?: string | null;
  lessons?: string[];
  race_day?: RaceDayData | null;
}

export interface RaceResult extends RaceResultInput {
  id: string;
  source: "athlete" | "mission" | "strava";
  mission_id?: string | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brief {
  headline: string;
  message: string;
  phase?: string | null;
  days_to_race: number;
  today_session_id?: string | null;
  evidence: { label: string; value: string; source: string }[];
  risks: { title: string; detail: string; severity: "info" | "attention" | "critical" }[];
  actions: { title: string; target: string }[];
  origin: Origin;
  model?: string | null;
  ai_reason?: string | null;
  conditions?: Conditions | null;
  /** A pending adjustment the race team made on its own (missed training, ai#44). */
  proposal?: Proposal | null;
}

export interface Conditions {
  kind: "forecast" | "seasonal";
  date: string;
  temp_max_c?: number | null;
  temp_min_c?: number | null;
  temp_max_range_c?: [number, number] | null;
  precipitation_mm?: number | null;
  precipitation_probability?: number | null;
  wet_day_share?: number | null;
  wind_max_kmh?: number | null;
  weather?: string | null;
  sunrise?: string | null;
  sunset?: string | null;
  years?: number;
  altitude_note?: string;
  summary: string;
  source: string;
}

export interface LayerBuildResult {
  kind: string;
  origin?: Origin;
  model?: string | null;
  version?: number;
  ai_reason?: string | null;
  error?: string;
  message?: string;
}

export interface AIStatus {
  available: boolean;
  model?: string | null;
  reason?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  origin: Origin;
  model?: string | null;
  ai_reason?: string | null;
  category: string;
  summary: string;
  safety_note?: string | null;
  changes: {
    session_id: string;
    date: string;
    change: "modify" | "rest" | "remove";
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
  }[];
}

export interface Knowledge {
  mission: { name: string; version: number };
  sources: { label: string; last: string }[];
  recent_sessions: number;
  recent_hours: number;
  races_in_history: number;
  race_activities_found: number;
  checkins_recent: number;
  has_course: boolean;
  has_profile: boolean;
  has_weight: boolean;
  plan: { version: number; origin: Origin } | null;
  layers: Record<string, { version: number; origin: Origin }>;
  conditions: Conditions | null;
  missing: string[];
}

export interface PlaceResult {
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  timezone?: string | null;
  country_code?: string | null;
}

export interface PhotoCandidate extends CoverMedia {
  id: string;
  width?: number | null;
  height?: number | null;
  description?: string | null;
}

export interface IntegrationSource {
  id: string;
  label: string;
  icon: string;
  on: boolean;
  last: string;
  metric: string;
}

async function optional<T>(promise: Promise<T>, missingCodes: string[]): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && missingCodes.includes(error.code)) return null;
    throw error;
  }
}

export const layersApi = {
  async list(missionId: string): Promise<MissionLayer[]> {
    return (await request<{ items: MissionLayer[] }>(`/race-missions/${missionId}/layers`, auth)).items;
  },
  patchItem(layer: MissionLayer, itemId: string, body: { status?: ItemStatus; note?: string | null }) {
    return request<MissionLayer>(`/race-missions/${layer.mission_id}/layers/${layer.kind}/items/${itemId}`, {
      ...auth,
      method: "PATCH",
      body,
      headers: { "If-Match": `"${layer.version}"` },
    });
  },
};

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

export const checkinsApi = {
  async list(limit = 14): Promise<Checkin[]> {
    return (await request<{ items: Checkin[] }>(`/training/checkins?limit=${limit}`, auth)).items;
  },
  save(body: Checkin) {
    return request<Checkin>("/training/checkins", { ...auth, method: "PUT", body });
  },
};

export const historyApi = {
  async list(): Promise<RaceResult[]> {
    return (await request<{ items: RaceResult[] }>("/users/me/races", auth)).items;
  },
  add(body: RaceResultInput) {
    return request<RaceResult>("/users/me/races", { ...auth, method: "POST", body });
  },
  update(id: string, body: RaceResultInput) {
    return request<RaceResult>(`/users/me/races/${id}`, { ...auth, method: "PUT", body });
  },
  remove(id: string) {
    return request<void>(`/users/me/races/${id}`, { ...auth, method: "DELETE" });
  },
  importStrava() {
    return request<{ created: number; updated: number; found: number }>("/ai/race/history/import-strava", { ...auth, method: "POST" });
  },
};

export interface ImportSource {
  kind: "image" | "pdf" | "csv" | "text";
  media_type?: string;
  data_base64?: string;
  text?: string;
  name?: string;
}

export interface PlanImportDraft {
  content: PlanContent;
  warnings: string[];
  unparsed: string[];
  parser: "ai" | "text";
  model?: string | null;
  ai_reason?: string | null;
  review?: { summary: string; notes: string[] } | null;
  sessions: number;
}

export const raceAi = {
  importPlan(missionId: string, sources: ImportSource[], startDate?: string | null) {
    return request<PlanImportDraft>(`/ai/race/${missionId}/plan/import`, { ...slow, method: "POST", body: { sources, ...(startDate ? { start_date: startDate } : {}) } });
  },
  /** A plan with no race attached: it becomes the athlete's own plan. */
  importAthletePlan(sources: ImportSource[], startDate?: string | null) {
    return request<PlanImportDraft>("/ai/race/plan/import", { ...slow, method: "POST", body: { sources, ...(startDate ? { start_date: startDate } : {}) } });
  },
  commitAthleteImport(content: PlanContent, seasonId?: string | null) {
    return request<unknown>("/ai/race/plan/import/commit", { ...auth, method: "POST", body: { content, ...(seasonId ? { season_id: seasonId } : {}) } });
  },
  commitImport(missionId: string, content: PlanContent) {
    return request<MissionPlan>(`/ai/race/${missionId}/plan/import/commit`, { ...auth, method: "POST", body: { content } });
  },
  status() {
    return request<AIStatus>("/ai/race/status", auth);
  },
  build(missionId: string, layers?: string[], useAi = true) {
    return request<{ results: LayerBuildResult[]; ai: AIStatus }>(`/ai/race/${missionId}/build`, {
      ...slow,
      method: "POST",
      body: { ...(layers ? { layers } : {}), use_ai: useAi },
    });
  },
  buildLayer(missionId: string, kind: string, useAi = true) {
    return request<LayerBuildResult>(`/ai/race/${missionId}/layers/${kind}/build`, { ...slow, method: "POST", body: { use_ai: useAi } });
  },
  brief(missionId: string, refresh = false) {
    return request<Brief>(`/ai/race/${missionId}/brief${refresh ? "?refresh=true" : ""}`, slow);
  },
  knowledge(missionId: string) {
    return request<Knowledge>(`/ai/race/${missionId}/knowledge`, slow);
  },
  conditions(missionId: string) {
    return request<{ conditions: Conditions | null }>(`/ai/race/${missionId}/conditions`, slow);
  },
  history(missionId: string) {
    return request<{ items: ChatMessage[]; ai: AIStatus }>(`/ai/race/${missionId}/chat`, auth);
  },
  chat(missionId: string, message: string) {
    return request<{ available: boolean; reason?: string | null; message: ChatMessage | null }>(`/ai/race/${missionId}/chat`, {
      ...slow,
      method: "POST",
      body: { message },
    });
  },
  clearChat(missionId: string) {
    return request<void>(`/ai/race/${missionId}/chat`, { ...auth, method: "DELETE" });
  },
  adapt(missionId: string, reason: string) {
    return request<Proposal>(`/ai/race/${missionId}/adapt`, { ...slow, method: "POST", body: { reason } });
  },
  decide(missionId: string, proposalId: string, decision: "accept" | "reject") {
    return request<Proposal>(`/ai/race/${missionId}/proposals/${proposalId}/${decision}`, { ...auth, method: "POST" });
  },
};

export const enrichApi = {
  async places(q: string): Promise<PlaceResult[]> {
    return (await request<{ items: PlaceResult[] }>(`/ai/enrich/places?q=${encodeURIComponent(q)}`, auth)).items;
  },
  async photos(params: { event?: string; location?: string; sport?: string }): Promise<PhotoCandidate[]> {
    const query = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    return (await request<{ items: PhotoCandidate[] }>(`/ai/enrich/photos?${query}`, { auth: true, timeoutMs: 30000 })).items;
  },
};

export const sourcesApi = {
  async list(): Promise<IntegrationSource[]> {
    return (await request<{ items: IntegrationSource[] }>("/integrations/sources", auth)).items;
  },
  connect(provider: string, code: string, redirectUri = "") {
    return request<IntegrationSource>(`/integrations/${provider}/connect`, { ...auth, method: "POST", body: { code, redirect_uri: redirectUri } });
  },
  disconnect(provider: string) {
    return request<void>(`/integrations/${provider}`, { ...auth, method: "DELETE" });
  },
  sync(provider: string) {
    return request<{ synced_sessions: number; synced_recovery: number }>(`/integrations/${provider}/sync`, { auth: true, method: "POST", timeoutMs: 120000 });
  },
};

export interface LoggedSession {
  id: string;
  session_type: string;
  duration_minutes: number;
  distance_km?: number | null;
  elevation_m?: number | null;
  title?: string | null;
  notes?: string | null;
  source: string;
  is_race: boolean;
  avg_hr?: number | null;
  logged_at: string;
}

export const sessionsApi = {
  log(body: { session_type: string; duration_minutes: number; distance_km?: number | null; elevation_m?: number | null; title?: string | null; notes?: string | null; logged_at?: string; is_race?: boolean }) {
    return request<LoggedSession>("/training/sessions", { ...auth, method: "POST", body });
  },
  async recent(limit = 30): Promise<LoggedSession[]> {
    return (await request<{ items: LoggedSession[] }>(`/training/sessions?limit=${limit}`, auth)).items;
  },
};
