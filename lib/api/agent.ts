/**
 * Real Forge endpoints behind the gateway (A6/A7/B4/B8, capture, integrations).
 *
 * These mirror `strem-shared-contracts` and return the same camelCase shapes the
 * agent layer already uses (`lib/agent/types.ts`), so the live agent service can
 * pass them straight through. Wired into the app via `lib/services/agent.live.ts`,
 * gated by `FLAGS.forgeAgentMock` — nothing here runs until that flag is flipped.
 */

import { request } from "@/lib/api/client";
import type {
  AdaptivePlan,
  AgentAction,
  AgentCapability,
  AthleteContext,
  AutonomyLevel,
  CitedDatum,
  Insight,
  PrivacyData,
} from "@/lib/agent/types";

/** A grounded, cited reply from the Forge agent (LangChain create_agent). */
export interface CoachReply {
  text: string;
  cites: CitedDatum[];
}

export interface PlanExercise {
  name: string;
  target: string;
  note: string;
  group: string;
}
export interface PlanDay {
  label: string;
  focus: string;
  icon: string;
  exercises: PlanExercise[];
}
export interface TrainingPlan {
  title: string;
  summary: string;
  days: PlanDay[];
}

export interface InsightList {
  items: Insight[];
}

export interface AgentActionPage {
  items: AgentAction[];
  pagination: { limit: number; offset: number; total: number };
}

export type AutonomyMap = Record<AgentCapability, AutonomyLevel>;

export interface PersonalRecord {
  id: string;
  exercise: string;
  reps: number;
  kg: number;
  estimated1rm?: number;
  achievedAt: string;
}

export interface PersonalRecordPage {
  items: PersonalRecord[];
  pagination: { limit: number; offset: number; total: number };
}

export interface IntegrationSource {
  id: string;
  label: string;
  icon: string;
  on: boolean;
  last: string;
  metric: string;
}

export interface IntegrationSourceList {
  items: IntegrationSource[];
}

export const agentApi = {
  // ── context (A6) ──────────────────────────────────────────────────────────
  getContext(): Promise<AthleteContext> {
    return request<AthleteContext>("/ai/context", { auth: true });
  },

  // ── chat (B1) — the omniscient agent, grounded in the user's own data ──────
  chat(message: string): Promise<CoachReply> {
    return request<CoachReply>("/ai/agent/chat", { method: "POST", body: { message }, auth: true });
  },

  // ── insights (B8) + adaptive plan (B4) ────────────────────────────────────
  getInsights(): Promise<InsightList> {
    return request<InsightList>("/ai/insights", { auth: true });
  },
  getAdaptivePlan(): Promise<AdaptivePlan> {
    return request<AdaptivePlan>("/ai/agent/plan", { auth: true });
  },
  getTrainingPlan(goal?: string): Promise<TrainingPlan> {
    const query = goal ? `?goal=${encodeURIComponent(goal)}` : "";
    return request<TrainingPlan>(`/ai/agent/training-plan${query}`, { auth: true });
  },
  swapExercise(group: string, exclude: string): Promise<{ exercise: PlanExercise }> {
    return request<{ exercise: PlanExercise }>("/ai/agent/training-plan/swap", {
      method: "POST",
      body: { group, exclude },
      auth: true,
    });
  },

  // ── consent + autonomy (A7) ───────────────────────────────────────────────
  getConsent(): Promise<PrivacyData> {
    return request<PrivacyData>("/users/me/agent-consent", { auth: true });
  },
  setConsent(sourceId: string, enabled: boolean): Promise<PrivacyData> {
    return request<PrivacyData>("/users/me/agent-consent", {
      method: "PUT",
      body: { source_id: sourceId, enabled },
      auth: true,
    });
  },
  getAutonomy(): Promise<AutonomyMap> {
    return request<AutonomyMap>("/users/me/agent-autonomy", { auth: true });
  },
  setAutonomy(capability: AgentCapability, level: AutonomyLevel): Promise<AutonomyMap> {
    return request<AutonomyMap>("/users/me/agent-autonomy", {
      method: "PUT",
      body: { capability, level },
      auth: true,
    });
  },

  // ── action log (B3) ───────────────────────────────────────────────────────
  getActivity(limit = 20): Promise<AgentActionPage> {
    return request<AgentActionPage>(`/ai/agent/activity?limit=${limit}`, { auth: true });
  },
  approveAction(id: string): Promise<AgentAction> {
    return request<AgentAction>(`/ai/agent/actions/${id}/approve`, { method: "POST", auth: true });
  },
  undoAction(id: string): Promise<AgentAction> {
    return request<AgentAction>(`/ai/agent/actions/${id}/undo`, { method: "POST", auth: true });
  },

  // ── personal records (D1/D2) ──────────────────────────────────────────────
  listPersonalRecords(limit = 50): Promise<PersonalRecordPage> {
    return request<PersonalRecordPage>(`/training/prs?limit=${limit}`, { auth: true });
  },

  // ── connected sources (A3) ────────────────────────────────────────────────
  listSources(): Promise<IntegrationSourceList> {
    return request<IntegrationSourceList>("/integrations/sources", { auth: true });
  },
  connectSource(provider: string, code: string, redirectUri = ""): Promise<IntegrationSource> {
    return request<IntegrationSource>(`/integrations/${provider}/connect`, {
      method: "POST",
      body: { code, redirect_uri: redirectUri },
      auth: true,
    });
  },
  disconnectSource(provider: string): Promise<void> {
    return request<void>(`/integrations/${provider}`, { method: "DELETE", auth: true });
  },
  syncSource(provider: string): Promise<{ syncedSessions: number; syncedRecovery: number }> {
    return request(`/integrations/${provider}/sync`, { method: "POST", auth: true });
  },
};
