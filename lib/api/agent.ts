/** Live AI and integration endpoints used by the Race Mission experience. */

import { request } from "@/lib/api/client";

interface CitedDatum {
  icon?: string;
  text: string;
}

export interface CoachReply {
  text: string;
  cites: CitedDatum[];
}

interface ConsentData {
  intro: string;
  groups: { label: string; items: { k: string; on: boolean }[] }[];
  footer: string;
}

type AgentActionStatus = "proposed" | "done" | "undone";

export interface AgentAction {
  id: string;
  capability: string;
  type: string;
  summary: string;
  reasoning: string;
  citedData: CitedDatum[];
  status: AgentActionStatus;
  autonomy: "auto" | "ask" | "off";
  createdAt: string;
}

interface AgentActionPage {
  items: AgentAction[];
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

interface IntegrationSourceList {
  items: IntegrationSource[];
}

export const agentApi = {
  chat(message: string): Promise<CoachReply> {
    return request<CoachReply>("/ai/agent/chat", { method: "POST", body: { message }, auth: true });
  },
  getConsent(): Promise<ConsentData> {
    return request<ConsentData>("/users/me/agent-consent", { auth: true });
  },
  setConsent(sourceId: string, enabled: boolean): Promise<ConsentData> {
    return request<ConsentData>("/users/me/agent-consent", {
      method: "PUT",
      body: { source_id: sourceId, enabled },
      auth: true,
    });
  },
  getActivity(limit = 30): Promise<AgentActionPage> {
    return request<AgentActionPage>(`/ai/agent/activity?limit=${limit}`, { auth: true });
  },
  approveAction(id: string): Promise<AgentAction> {
    return request<AgentAction>(`/ai/agent/actions/${id}/approve`, { method: "POST", auth: true });
  },
  undoAction(id: string): Promise<AgentAction> {
    return request<AgentAction>(`/ai/agent/actions/${id}/undo`, { method: "POST", auth: true });
  },
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
