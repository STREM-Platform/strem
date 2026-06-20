/**
 * Live Forge data service — the real-endpoint counterpart to `agent.mock`.
 *
 * Selected by `lib/agent/index.ts` when `FLAGS.forgeAgentMock` is off. Only the
 * getters whose backend response maps 1:1 to the FE type are wired to real
 * endpoints today — insights (B8), adaptive plan (B4), and privacy/consent (A7).
 * Everything else delegates to `agentMock` until its endpoint (or a shape
 * adapter) lands, so the app stays whole. Each real call falls back to the mock
 * if the endpoint errors, so a partially-up stack still renders.
 *
 * Not yet real (shape gap / no endpoint): getContext (signals lack the wearable
 * fields until A3 recovery feeds A4), getProof (PRs → story timeline adapter),
 * and the narrative getters (today brief, nudge, check-in, coach conversation,
 * live workout, capture bundle, plan import, season, league, chapters, atlas).
 */

import { agentApi } from "@/lib/api/agent";
import { agentMock } from "@/lib/services/agent.mock";
import type { AdaptivePlan, Insight, PrivacyData } from "@/lib/agent/types";

async function realOr<T>(real: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (error) {
    console.warn("[forge] live endpoint failed; using mock data", error);
    return fallback();
  }
}

export const agentLive: typeof agentMock = {
  ...agentMock,

  getInsights(): Promise<Insight[]> {
    return realOr(async () => (await agentApi.getInsights()).items, agentMock.getInsights);
  },
  generateAdaptivePlan(): Promise<AdaptivePlan> {
    return realOr(() => agentApi.getAdaptivePlan(), agentMock.generateAdaptivePlan);
  },
  getPrivacy(): Promise<PrivacyData> {
    return realOr(() => agentApi.getConsent(), agentMock.getPrivacy);
  },
};
