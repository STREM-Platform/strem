/** The athlete's own records: check-ins, recovery, logged sessions and race history. */

import { request } from "../client";
import type { RaceDayData, Sport } from "../race-missions";
import { auth } from "./shared";

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

export interface RecoverySample {
  id: string;
  source: string;
  date: string;
  hrv_ms?: number | null;
  resting_hr?: number | null;
  sleep_hours?: number | null;
  recovery_score?: number | null;
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
