/** Race Missions — aligned with contracts/user/openapi.yml (Race OS, docs#26). */
import { ApiError, request } from "./client";

export type Sport =
  | "trail_running"
  | "road_running"
  | "triathlon"
  | "duathlon"
  | "cycling"
  | "gravel"
  | "mountain_biking"
  | "swimming"
  | "hiking"
  | "skimo"
  | "nordic_skiing"
  | "rowing"
  | "hybrid"
  | "multisport"
  | "custom";
export type RaceFormat = "single_day" | "multi_stage" | "non_stop";
export type Support = "aid_stations" | "crewed" | "self_supported" | "unsupported";
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type Terrain =
  | "flat_roads"
  | "rolling_hills"
  | "trails"
  | "mountains"
  | "track"
  | "treadmill"
  | "pool"
  | "open_water"
  | "indoor_trainer"
  | "gym"
  | "snow"
  | "heat"
  | "altitude";

export interface RaceLeg {
  discipline: "swim" | "bike" | "run" | "hike" | "paddle" | "ski" | "other";
  distance_km: number;
  label?: string | null;
}

export interface RaceEvent {
  name: string;
  race_date: string;
  timezone: string;
  location_name: string;
  distance_km: number;
  elevation_gain_m: number | null;
  cutoff_minutes: number | null;
  sport?: Sport;
  format?: RaceFormat;
  support?: Support | null;
  start_time?: string | null;
  end_date?: string | null;
  stages?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  country_code?: string | null;
  website_url?: string | null;
  description?: string | null;
  legs?: RaceLeg[] | null;
  checkpoints?: Checkpoint[] | null;
}

export type CheckpointService = "water" | "food" | "crew" | "drop_bag" | "medical" | "toilet";

/** An aid station or checkpoint, in course order (ai#46). */
export interface Checkpoint {
  name: string;
  km: number;
  services?: CheckpointService[];
  cutoff_minutes?: number | null;
  notes?: string | null;
}

export interface RaceGoal {
  outcome: "finish_confidently" | "finish" | "target_time" | "compete";
  target_finish_minutes: number | null;
  motivation?: string | null;
  priority?: "A" | "B" | "C";
}

export interface CoverMedia {
  url: string;
  thumb_url?: string | null;
  title?: string | null;
  creator?: string | null;
  creator_url?: string | null;
  license: string;
  license_url?: string | null;
  source_url: string;
  provider: "openverse" | "wikimedia" | "athlete" | "generated";
  depicts?: "event" | "location" | "atmosphere";
}

export interface Preparation {
  experience?: "new" | "some" | "experienced" | "elite" | null;
  start_date?: string | null;
  training_days_per_week?: number | null;
  weekly_hours?: number | null;
  long_session_day?: Weekday | null;
  current_weekly_km?: number | null;
  current_weekly_hours?: number | null;
  longest_recent_km?: number | null;
  longest_recent_hours?: number | null;
  strength_sessions_per_week?: number | null;
  terrain_access?: Terrain[];
  constraints?: string | null;
  home_location?: string | null;
  travel_notes?: string | null;
}

/** What happened on race day, structured so the race team can learn from it (ai#45). */
export interface RaceDayData {
  carbs_g_per_hour?: number | null;
  fluid_ml_per_hour?: number | null;
  gi_issues?: "none" | "mild" | "severe" | null;
  cramps?: boolean | null;
  pacing?: "even" | "negative_split" | "faded" | "blew_up" | null;
  low_point_km?: number | null;
  heat?: "cold" | "mild" | "warm" | "hot" | null;
}

export interface RaceResultSummary {
  status: "finished" | "dnf" | "dns";
  finish_minutes?: number | null;
  placement?: string | null;
  rating?: number | null;
  notes?: string | null;
  lessons?: string[];
  race_day?: RaceDayData | null;
  completed_at?: string | null;
}

export interface MissionInput {
  event: RaceEvent;
  goal: RaceGoal;
  cover?: CoverMedia | null;
  preparation?: Preparation | null;
}

export interface RaceMission extends MissionInput {
  id: string;
  state: "active" | "archived" | "completed";
  result?: RaceResultSummary | null;
  source: "athlete_entry";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MissionExport {
  scope: "race_missions";
  exported_at: string;
  missions: RaceMission[];
  revisions: { mission: RaceMission; reason: string }[];
  layers?: unknown[];
  plans?: unknown[];
  courses?: { mission_id: string; version: number; content_base64: string }[];
}

const options = { auth: true, timeoutMs: 15000 };

export const raceMissions = {
  async active(): Promise<RaceMission | null> {
    try {
      return await request<RaceMission>("/race-missions/active", options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === "no_active_mission") return null;
      throw error;
    }
  },
  async list(state?: RaceMission["state"]): Promise<RaceMission[]> {
    const query = state ? `?state=${state}` : "";
    return (await request<{ items: RaceMission[] }>(`/race-missions${query}`, options)).items;
  },
  get(id: string) {
    return request<RaceMission>(`/race-missions/${id}`, options);
  },
  create(body: MissionInput, key: string) {
    return request<RaceMission>("/race-missions", { ...options, method: "POST", body, headers: { "Idempotency-Key": key } });
  },
  update(mission: RaceMission, body: Partial<MissionInput>, correctionReason: string) {
    return request<RaceMission>(`/race-missions/${mission.id}`, {
      ...options,
      method: "PATCH",
      body: { ...body, correction_reason: correctionReason },
      headers: { "If-Match": `"${mission.version}"` },
    });
  },
  archive(mission: RaceMission, reason: string, key: string) {
    return request<RaceMission>(`/race-missions/${mission.id}/archive`, {
      ...options,
      method: "POST",
      body: { reason },
      headers: { "If-Match": `"${mission.version}"`, "Idempotency-Key": key },
    });
  },
  complete(mission: RaceMission, result: RaceResultSummary, key: string) {
    return request<RaceMission>(`/race-missions/${mission.id}/complete`, {
      ...options,
      method: "POST",
      body: { result },
      headers: { "If-Match": `"${mission.version}"`, "Idempotency-Key": key },
    });
  },
  exportData() {
    return request<MissionExport>("/race-missions/data", options);
  },
  deleteData() {
    return request<void>("/race-missions/data", { ...options, method: "DELETE", body: { confirmation: "DELETE MY RACE MISSIONS" } });
  },
};
