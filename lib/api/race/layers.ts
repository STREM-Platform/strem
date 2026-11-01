/** Race Lab layers (fuel, gear, logistics, strategy) on user-service. */

import { request } from "../client";
import { auth, type Origin } from "./shared";

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

export interface LayerBuildResult {
  kind: string;
  origin?: Origin;
  model?: string | null;
  version?: number;
  ai_reason?: string | null;
  error?: string;
  message?: string;
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
