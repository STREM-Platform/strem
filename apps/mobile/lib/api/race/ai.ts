/** The race team (ai-orchestrator): brief, chat, cockpit, proposals, builds and plan import. */

import { request } from "../client";
import { auth, slow, type Origin } from "./shared";
import { type LayerBuildResult } from "./layers";
import { type PlanContent, type MissionPlan } from "./plans";

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
  /** What the athlete asked for when adjusting, oldest first (ADR 0010 phase 4). */
  notes?: string[];
  changes: {
    session_id: string;
    date: string;
    change: "modify" | "rest" | "remove";
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
  }[];
}

/** Race-team cockpit (mobile#119): engine calls per specialist + what changed. */
export type SpecialistRole = "coach" | "fuel" | "course" | "gear" | "logistics" | "strategy";

export interface CockpitEvidence {
  label: string;
  value: string;
  source: string;
}

export interface CockpitAction {
  label: string;
  /** `plan`, `proposal` or `race?tab=<layer>`. */
  target: string;
}

export interface CockpitSpecialist {
  role: SpecialistRole;
  layer: string;
  status: "on_track" | "attention" | "missing";
  call: string;
  confidence: "high" | "medium" | "low";
  evidence: CockpitEvidence[];
  action: CockpitAction;
  ask: string;
}

export interface CockpitFeedItem {
  kind: "proposal" | "training" | "checkin" | "conditions" | "milestone";
  role: SpecialistRole;
  title: string;
  detail: string;
  when?: string | null;
  severity?: "info" | "attention" | "critical";
  evidence: CockpitEvidence[];
  action: CockpitAction;
}

export interface Cockpit {
  days_to_race: number;
  specialists: CockpitSpecialist[];
  feed: CockpitFeedItem[];
  summary: { on_track: number; attention: number; missing: number };
  ai: AIStatus;
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

/** Athlete memory (ai#59): what the athlete told the race team, kept and editable. */
export type MemoryKind = "injury" | "preference" | "constraint" | "goal" | "lesson" | "context" | "other";
export interface AthleteMemory {
  id: string;
  kind: MemoryKind;
  text: string;
  /** `chat` (from a message) or `athlete` (written or corrected by them). */
  source: string;
  source_date: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}
export interface RaceTeamExport {
  memory: AthleteMemory[];
  chat: Record<string, unknown>[];
  briefs: Record<string, unknown>[];
  proposals: Record<string, unknown>[];
}

export const memoryApi = {
  async list(): Promise<AthleteMemory[]> {
    return (await request<{ items: AthleteMemory[] }>("/ai/race/memory", auth)).items;
  },
  correct(id: string, text: string) {
    return request<AthleteMemory>(`/ai/race/memory/${id}`, { ...auth, method: "PATCH", body: { text } });
  },
  forget(id: string) {
    return request<void>(`/ai/race/memory/${id}`, { ...auth, method: "DELETE" });
  },
  /** Everything the race team holds: memory, chat, briefs and proposals. */
  exportAll() {
    return request<RaceTeamExport>("/ai/race/data", auth);
  },
  deleteAll() {
    return request<void>("/ai/race/data", { ...auth, method: "DELETE", body: { confirmation: "FORGET MY RACE TEAM DATA" } });
  },
};

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
  cockpit(missionId: string) {
    return request<Cockpit>(`/ai/race/${missionId}/cockpit`, slow);
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
  /** The athlete's words back to the race team: a new draft, still waiting for review. */
  adjust(missionId: string, proposalId: string, note: string) {
    return request<Proposal>(`/ai/race/${missionId}/proposals/${proposalId}/adjust`, { ...slow, method: "POST", body: { note } });
  },
  async proposals(missionId: string, status?: Proposal["status"]): Promise<Proposal[]> {
    return (await request<{ items: Proposal[] }>(`/ai/race/${missionId}/proposals${status ? `?status=${status}` : ""}`, auth)).items;
  },
};
