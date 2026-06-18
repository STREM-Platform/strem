/**
 * Forge runtime — the always-on agent loop.
 *
 * A standing in-app service (singleton store), NOT a feature of the Coach screen.
 * It holds the user's autonomy settings, watches the context graph + incoming
 * events, and decides when to act. Every action it takes is recorded as a typed,
 * reversible `AgentAction` in one Activity feed — its reasoning and the exact data
 * it cited, with an Undo. That feed is the proof it's an agent.
 *
 * The decision/trigger engine (B3) and tool execution (B1) are backend work; this
 * runtime models their behaviour locally so every surface can consume one agent
 * over one context today. `observe()` is where the real event stream (workouts,
 * sleep/HRV syncs, meals, missed sessions, streak clock) will plug in.
 */

import { useSyncExternalStore } from "react";

import { CAPABILITY_BY_KEY, defaultAutonomy } from "@/lib/agent/capabilities";
import { guard } from "@/lib/agent/guardrails";
import type { AgentAction, AgentCapability, AutonomyLevel, CitedDatum } from "@/lib/agent/types";

let counter = 0;
const id = () => `act_${Date.now().toString(36)}_${(counter++).toString(36)}`;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

interface ActRequest {
  capability: AgentCapability;
  type: string;
  summary: string;
  reasoning: string;
  citedData: CitedDatum[];
}

type Listener = () => void;

class ForgeRuntime {
  private autonomy: Record<AgentCapability, AutonomyLevel> = defaultAutonomy();
  private actions: AgentAction[] = [];
  private listeners = new Set<Listener>();
  // Stable snapshots so useSyncExternalStore doesn't loop.
  private actionsSnapshot: AgentAction[] = [];
  private autonomySnapshot: Record<AgentCapability, AutonomyLevel> = { ...this.autonomy };

  constructor() {
    this.seed();
  }

  // ── subscription (drives the hooks) ───────────────────────────────────────
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.actionsSnapshot = [...this.actions];
    this.autonomySnapshot = { ...this.autonomy };
    this.listeners.forEach((l) => l());
  }

  getActions = (): AgentAction[] => this.actionsSnapshot;
  getAutonomy = (): Record<AgentCapability, AutonomyLevel> => this.autonomySnapshot;

  // ── autonomy controls (edited from the Privacy screen) ────────────────────
  setAutonomy(capability: AgentCapability, level: AutonomyLevel) {
    this.autonomy[capability] = level;
    this.emit();
  }

  /**
   * The core decision. Given a capability the agent wants to use, the autonomy
   * setting decides what happens:
   *   OFF  → nothing (returns null)
   *   ASK  → records a `proposed` action awaiting approval
   *   AUTO → records a `done` action (already taken, undoable)
   */
  act(req: ActRequest): AgentAction | null {
    const level = this.autonomy[req.capability];
    if (level === "off") return null;
    const action: AgentAction = {
      id: id(),
      capability: req.capability,
      type: req.type,
      summary: req.summary,
      reasoning: guard(req.reasoning, req.capability),
      citedData: req.citedData,
      status: level === "auto" ? "done" : "proposed",
      autonomy: level,
      createdAt: new Date().toISOString(),
    };
    this.actions = [action, ...this.actions];
    this.emit();
    return action;
  }

  /** Approve a proposed (ASK) action. */
  approve(actionId: string) {
    this.actions = this.actions.map((a) => (a.id === actionId ? { ...a, status: "done" } : a));
    this.emit();
  }

  /** Undo any action — the reversibility guarantee. */
  undo(actionId: string) {
    this.actions = this.actions.map((a) => (a.id === actionId ? { ...a, status: "undone" } : a));
    this.emit();
  }

  /**
   * The proactive run-loop entry point. Real graph events (a finished workout, a
   * Whoop sync, a missed session, the streak clock) come in here and the agent
   * decides — unprompted — whether to act. Wired to B3 server-side.
   */
  observe(event: { type: string; payload?: Record<string, unknown> }): AgentAction | null {
    switch (event.type) {
      case "hrv_sync_low":
        return this.act({
          capability: "sendNudge",
          type: "Sent a proactive nudge",
          summary: "Flagged two sub-6h nights before you trained",
          reasoning: "HRV slid 12% over two nights under 6h — worth a 10-second check before loading you.",
          citedData: [
            { icon: "moon", text: "Sleep <6h ×2" },
            { icon: "heart", text: "HRV −12%" },
          ],
        });
      case "readiness_recomputed":
        return this.act({
          capability: "updateReadiness",
          type: "Updated today's readiness",
          summary: "Set readiness to 62 (Moderate)",
          reasoning: "Combined last night's sleep and HRV with your 7-day load to recompute readiness.",
          citedData: [
            { icon: "moon", text: "Sleep 5h24m" },
            { icon: "heart", text: "HRV 48ms" },
          ],
        });
      default:
        return null;
    }
  }

  // ── seed: a believable activity history for the demo graph ────────────────
  private seed() {
    this.actions = [
      {
        id: id(),
        capability: "adjustTodayPlan",
        type: "Proposed a plan change",
        summary: "Swap today's heavy squats → Zone-2 run",
        reasoning:
          "You slept 5h24m and HRV is down 12% two days after a trap-bar PR. A Zone-2 run keeps the streak, widens your endurance base for Hybrid, and lets your legs recover. Heavy lower moves to Thursday.",
        citedData: [
          { icon: "moon", text: "Sleep 5h24m" },
          { icon: "heart", text: "HRV −12%" },
          { icon: "bolt", text: "Trap-bar PR 110kg" },
        ],
        status: "proposed",
        autonomy: "ask",
        createdAt: minutesAgo(11),
      },
      {
        id: id(),
        capability: "swapExercise",
        type: "Protected your left knee",
        summary: "Subbed walking lunge → Bulgarian split squat",
        reasoning: "You told me your left knee flares on lunges, so I swapped it for a controlled split squat.",
        citedData: [{ icon: "heart", text: "Memory: left knee" }],
        status: "done",
        autonomy: "auto",
        createdAt: minutesAgo(12),
      },
      {
        id: id(),
        capability: "flagNutrition",
        type: "Flagged low protein",
        summary: "Protein landing ~48g short on heavy days",
        reasoning: "Your protein is at 132g against a 180g target on training days — bumping breakfast would change Thursday's lift.",
        citedData: [{ icon: "bolt", text: "Protein 132g (−48g)" }],
        status: "done",
        autonomy: "auto",
        createdAt: minutesAgo(180),
      },
      {
        id: id(),
        capability: "surfaceInsight",
        type: "Surfaced an insight",
        summary: "Your PRs live on rest",
        reasoning: "Every PR this block came the day after a 7h+ night; none followed a sub-6h night. Sleep is your real program.",
        citedData: [{ icon: "moon", text: "4 of 4 PRs" }],
        status: "done",
        autonomy: "auto",
        createdAt: minutesAgo(1440),
      },
      {
        id: id(),
        capability: "updateReadiness",
        type: "Updated today's readiness",
        summary: "Set readiness to 62 (Moderate)",
        reasoning: "Combined last night's sleep and HRV with your 7-day load to recompute readiness.",
        citedData: [
          { icon: "moon", text: "Sleep 5h24m" },
          { icon: "heart", text: "HRV 48ms" },
        ],
        status: "done",
        autonomy: "auto",
        createdAt: minutesAgo(200),
      },
    ];
    this.actionsSnapshot = [...this.actions];
  }
}

export const forgeRuntime = new ForgeRuntime();

// ── React hooks ──────────────────────────────────────────────────────────────
export function useAgentActivity(): AgentAction[] {
  return useSyncExternalStore(forgeRuntime.subscribe, forgeRuntime.getActions, forgeRuntime.getActions);
}

export function useAutonomy(): {
  autonomy: Record<AgentCapability, AutonomyLevel>;
  setAutonomy: (c: AgentCapability, l: AutonomyLevel) => void;
} {
  const autonomy = useSyncExternalStore(forgeRuntime.subscribe, forgeRuntime.getAutonomy, forgeRuntime.getAutonomy);
  return { autonomy, setAutonomy: (c, l) => forgeRuntime.setAutonomy(c, l) };
}

export { CAPABILITY_BY_KEY };
