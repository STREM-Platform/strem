/**
 * Forge capability registry + autonomy defaults.
 *
 * Each capability is a typed, logged, reversible action Forge can take. Autonomy
 * is user-controlled per capability:
 *   AUTO — Forge does it, tells you, you can undo
 *   ASK  — Forge proposes, you approve
 *   OFF  — Forge won't
 *
 * Defaults follow the roadmap rule: low-risk = AUTO; anything that changes a plan
 * or sends a message = ASK. The Privacy screen (A7) renders and edits these.
 */

import type { AgentCapability, AutonomyLevel, CapabilityMeta } from "@/lib/agent/types";

export const CAPABILITIES: CapabilityMeta[] = [
  {
    capability: "updateReadiness",
    label: "Read your recovery",
    description: "Turn sleep, HRV and load into today's readiness score.",
    icon: "heart",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "surfaceInsight",
    label: "Surface insights",
    description: "Point out cross-domain patterns it finds in your data.",
    icon: "sparkles",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "adjustTargets",
    label: "Autoregulate live",
    description: "Trim loads, reps and rest mid-session to match how you're moving.",
    icon: "bolt",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "swapExercise",
    label: "Protect your body",
    description: "Swap a movement for a safer one (e.g. off your left knee).",
    icon: "shield",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "flagNutrition",
    label: "Flag fuel & recovery",
    description: "Warn you when protein or recovery is running low.",
    icon: "leaf",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "writeMemory",
    label: "Remember preferences",
    description: "Note injuries, preferences and goals so it never re-asks.",
    icon: "clock",
    default: "auto",
    sensitive: false,
  },
  {
    capability: "adjustTodayPlan",
    label: "Adjust today's plan",
    description: "Change what today's session is — e.g. swap heavy squats for a run.",
    icon: "refresh",
    default: "ask",
    sensitive: true,
  },
  {
    capability: "rescheduleWeek",
    label: "Reschedule your week",
    description: "Move sessions across the week to fit recovery and your calendar.",
    icon: "clock",
    default: "ask",
    sensitive: true,
  },
  {
    capability: "generateMissions",
    label: "Generate missions",
    description: "Write new missions from your last weeks, goal and readiness.",
    icon: "target",
    default: "ask",
    sensitive: true,
  },
  {
    capability: "importPlan",
    label: "Import & adapt plans",
    description: "Read a plan from a photo and tune it to your week.",
    icon: "grid",
    default: "ask",
    sensitive: true,
  },
  {
    capability: "logCapture",
    label: "Log captures",
    description: "Write a workout or meal it parsed from a photo or your voice.",
    icon: "check",
    default: "ask",
    sensitive: true,
  },
  {
    capability: "sendNudge",
    label: "Send proactive nudges",
    description: "Reach out unprompted when something in your data needs you.",
    icon: "bell",
    default: "ask",
    sensitive: true,
  },
];

export const CAPABILITY_BY_KEY: Record<AgentCapability, CapabilityMeta> = Object.fromEntries(
  CAPABILITIES.map((c) => [c.capability, c]),
) as Record<AgentCapability, CapabilityMeta>;

export function defaultAutonomy(): Record<AgentCapability, AutonomyLevel> {
  return Object.fromEntries(CAPABILITIES.map((c) => [c.capability, c.default])) as Record<
    AgentCapability,
    AutonomyLevel
  >;
}
