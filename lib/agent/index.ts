/**
 * Forge — the one agent, public facade.
 *
 * Every AI surface in the app imports `forge` and nothing else. Chat, the Today
 * nudge, live-workout autoregulation, mission generation, plan import, capture —
 * they are all calls into this single object over one assembled context, not
 * separate bots. Swap the mock for real endpoints here and every screen follows.
 *
 * Tools (the typed, reversible actions) route through the runtime so each one is
 * gated by the user's autonomy setting and lands in the Activity feed with an
 * Undo. The data getters proxy the mocked context service (A6) for now.
 */

import { assembleContext } from "@/lib/agent/context";
import { guard } from "@/lib/agent/guardrails";
import { forgeRuntime } from "@/lib/agent/runtime";
import { agentMock } from "@/lib/services/agent.mock";
import type { AgentAction, CitedDatum } from "@/lib/agent/types";

export const forge = {
  name: "Forge",

  // ── context (A6) ──────────────────────────────────────────────────────────
  assembleContext,
  getContext: agentMock.getContext,

  // ── reads — every surface pulls from the one graph ────────────────────────
  getTodayBrief: agentMock.getTodayBrief,
  getNudge: agentMock.getNudge,
  getCheckin: agentMock.getCheckin,
  getCoachConversation: agentMock.getCoachConversation,
  getLiveWorkout: agentMock.getLiveWorkout,
  getScannedWorkout: agentMock.getScannedWorkout,
  getCapture: agentMock.getCapture,
  generateAdaptivePlan: agentMock.generateAdaptivePlan,
  getInsights: agentMock.getInsights,
  getPlanImport: agentMock.getPlanImport,
  getProof: agentMock.getProof,
  getSeason: agentMock.getSeason,
  getLeague: agentMock.getLeague,
  getChapters: agentMock.getChapters,
  getPrivacy: agentMock.getPrivacy,
  getAtlas: agentMock.getAtlas,

  /** Run agent copy through the guardrail before it reaches the UI (A8). */
  guard,

  // ── tools (typed, reversible, autonomy-gated, logged) ─────────────────────
  // Each returns the recorded AgentAction (or null if the capability is OFF).
  adjustTodayPlan(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "adjustTodayPlan", type: "Adjusted today's plan", summary, reasoning, citedData: cites });
  },
  updateReadiness(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "updateReadiness", type: "Updated readiness", summary, reasoning, citedData: cites });
  },
  adjustTargets(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "adjustTargets", type: "Autoregulated the session", summary, reasoning, citedData: cites });
  },
  generateMissions(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "generateMissions", type: "Generated missions", summary, reasoning, citedData: cites });
  },
  importPlanFromImage(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "importPlan", type: "Imported & adapted a plan", summary, reasoning, citedData: cites });
  },
  logCapture(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "logCapture", type: "Logged a capture", summary, reasoning, citedData: cites });
  },
  flagNutrition(summary: string, reasoning: string, cites: CitedDatum[]): AgentAction | null {
    return forgeRuntime.act({ capability: "flagNutrition", type: "Flagged fuel / recovery", summary, reasoning, citedData: cites });
  },

  // ── proactive loop + reversibility ────────────────────────────────────────
  observe: forgeRuntime.observe.bind(forgeRuntime),
  approve: forgeRuntime.approve.bind(forgeRuntime),
  undo: forgeRuntime.undo.bind(forgeRuntime),
};

export type Forge = typeof forge;
export { useAgentActivity, useAutonomy } from "@/lib/agent/runtime";
export { CAPABILITIES, CAPABILITY_BY_KEY } from "@/lib/agent/capabilities";
export type {
  AgentAction,
  AgentCapability,
  AutonomyLevel,
  CitedDatum,
} from "@/lib/agent/types";
