import { ApiError, request } from "./client";

export interface CoursePoint { latitude: number; longitude: number; elevation_m: number | null; distance_m: number }
export interface CourseSection { segment_index: number; start_distance_m: number; end_distance_m: number; elevation_change_m: number | null; average_grade_percent: number | null }
export interface MissionCourse {
  mission_id: string; version: number; updated_at: string; source: "athlete_supplied"; source_url: string | null;
  course: { gpx_sha256: string; calculation_version: string; segments: { points: CoursePoint[] }[]; distance_m: number; ascent_m: number | null; descent_m: number | null; lowest_elevation_m: number | null; highest_elevation_m: number | null; warnings: string[] };
  analysis: { analysis_version: string; sections: CourseSection[]; unknown_grade_distance_m: number; warnings: string[]; sustained_runs: { direction: "ascent" | "descent"; start_section_index: number; end_section_index: number; start_distance_m: number; end_distance_m: number; net_elevation_change_m: number; average_grade_percent: number }[] };
}
export const courses = {
  remove(saved: MissionCourse) {
    return request<void>(`/training/missions/${saved.mission_id}/course`, { auth: true, timeoutMs: 30000, method: "DELETE", headers: { "If-Match": `"${saved.version}"` } });
  },
  async get(missionId: string): Promise<MissionCourse | null> {
    try { return await request<MissionCourse>(`/training/missions/${missionId}/course`, { auth: true, timeoutMs: 30000 }); }
    catch (err) { if (err instanceof ApiError && err.code === "course_not_found") return null; throw err; }
  },
  upload(missionId: string, version: number, content: string, sourceUrl: string | null) {
    return request<MissionCourse>(`/training/missions/${missionId}/course`, { auth: true, timeoutMs: 60000, method: "PUT", headers: { "If-Match": `"${version}"` }, body: { content_base64: content, source_url: sourceUrl } });
  },
};
