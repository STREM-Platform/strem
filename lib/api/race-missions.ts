/** Aligned with contracts/user/openapi.yml. Never falls back to fixture data. */
import { ApiError, request } from "./client";

export interface RaceEvent {
  name: string;
  race_date: string;
  timezone: string;
  location_name: string;
  distance_km: number;
  elevation_gain_m: number | null;
  cutoff_minutes: number | null;
}
export interface RaceGoal {
  outcome: "finish_confidently" | "finish" | "target_time";
  target_finish_minutes: number | null;
}
export interface MissionInput { event: RaceEvent; goal: RaceGoal }
export interface RaceMission extends MissionInput {
  id: string;
  state: "active" | "archived";
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
  courses?: { mission_id: string; version: number; content_base64: string }[];
}
const options = { auth: true, timeoutMs: 15000 };
export const raceMissions = {
  async active(): Promise<RaceMission | null> {
    try { return await request<RaceMission>("/race-missions/active", options); }
    catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === "no_active_mission") return null;
      throw error;
    }
  },
  create(body: MissionInput, key: string) {
    return request<RaceMission>("/race-missions", { ...options, method: "POST", body, headers: { "Idempotency-Key": key } });
  },
  update(mission: RaceMission, body: MissionInput, correctionReason: string) {
    return request<RaceMission>(`/race-missions/${mission.id}`, { ...options, method: "PATCH", body: { ...body, correction_reason: correctionReason }, headers: { "If-Match": `"${mission.version}"` } });
  },
  archive(mission: RaceMission, reason: string, key: string) {
    return request<RaceMission>(`/race-missions/${mission.id}/archive`, { ...options, method: "POST", body: { reason }, headers: { "If-Match": `"${mission.version}"`, "Idempotency-Key": key } });
  },
  exportData() { return request<MissionExport>("/race-missions/data", options); },
  deleteData() { return request<void>("/race-missions/data", { ...options, method: "DELETE", body: { confirmation: "DELETE MY RACE MISSIONS" } }); },
};
