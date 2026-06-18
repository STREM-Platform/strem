/**
 * Forge agent — type contract.
 *
 * Forge is ONE autonomous agent, not a set of chatbots. Every AI surface in the
 * app (the Today nudge, the live-workout autoregulation, mission generation, the
 * plan import, the coach chat, the proactive activity feed) is a call into this
 * layer over a single Athlete Context Graph.
 *
 * These shapes mirror the prototype data contract (`prototype/lib/strem-ai-data.jsx`
 * + `strem-ai-data2.jsx`) so the mock service can return them verbatim and the
 * real backend (epics A1/A4/A5/A6 + B1/B3/B4/B8 + D1–D6) can drop straight in.
 */

import type { IconName } from "@/constants/theme";

// ── Grounding: every answer / action cites the user's own data ───────────────
export interface CitedDatum {
  icon: IconName;
  text: string;
}

// ── Athlete Context Graph (A1) + signals (A4) + memory (A5) ──────────────────
export interface ContextSource {
  id: string;
  label: string;
  icon: IconName;
  on: boolean;
  last: string;
  metric: string;
}

export interface ContextSignals {
  readiness: number;
  readinessLabel: string;
  sleepHours: string;
  sleepDelta: string;
  hrv: number;
  hrvDelta: string;
  restingHr: number;
  load7: number;
  load28: number;
  acwr: number;
  loadLabel: string;
  momentum: string;
  streakRisk: boolean;
}

export interface MemoryItem {
  icon: IconName;
  text: string;
}

export interface AthleteContext {
  sources: ContextSource[];
  signals: ContextSignals;
  memory: MemoryItem[];
}

// ── Today's briefing (C2) ────────────────────────────────────────────────────
export interface TodayAction {
  type: string;
  icon: IconName;
  label: string;
  sub: string;
  xp: number;
}

export interface TodayBrief {
  readiness: number;
  label: string;
  headline: string;
  body: string;
  action: TodayAction;
  why: { icon: IconName; text: string; em: string }[];
}

// ── Proactive nudge + 10-second check-in (Phase 6) ───────────────────────────
export interface Nudge {
  tone: string;
  icon: IconName;
  tag: string;
  title: string;
  body: string;
}

export interface CheckinField {
  id: string;
  label: string;
  icon: IconName;
  opts: string[];
}

export interface Checkin {
  fields: CheckinField[];
  result: { readiness: number; line: string };
}

// ── Omniscient coach chat (B1 / B6) ──────────────────────────────────────────
export interface CoachMessage {
  role: "coach" | "you";
  text: string;
  cites?: CitedDatum[];
}

export interface CoachPrompt {
  q: string;
  a: string;
  cites: CitedDatum[];
}

export interface CoachConversation {
  name: string;
  opener: { text: string; cites: CitedDatum[] };
  prompts: CoachPrompt[];
}

// ── Live workout intelligence (D1 / D2) ──────────────────────────────────────
export interface LiveSet {
  reps: number;
  kg: number;
  ai: string;
  done: boolean;
  rpe: number | null;
}

export interface LiveExercise {
  name: string;
  target: string;
  rest: number;
  sets: LiveSet[];
}

export interface LiveWorkout {
  title: string;
  tag: string;
  note: string;
  exercises: LiveExercise[];
  prDetected: { lift: string; val: string; note: string };
}

// ── AI capture (D3 / D4 / D6) ────────────────────────────────────────────────
export interface CaptureMethod {
  id: "workout" | "food" | "voice";
  icon: IconName;
  label: string;
  sub: string;
  tone: string;
}

export interface CaptureWorkoutResult {
  title: string;
  items: { name: string; detail: string; note: string }[];
  note: string;
}

export interface CaptureFoodResult {
  title: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  note: string;
}

export interface CaptureVoiceResult {
  title: string;
  detail: string;
  note: string;
}

export interface CaptureData {
  methods: CaptureMethod[];
  workout: { steps: string[]; result: CaptureWorkoutResult };
  food: { steps: string[]; result: CaptureFoodResult };
  voice: { transcript: string; steps: string[]; result: CaptureVoiceResult };
}

// ── Adaptive missions (B4) + insights (B8) ───────────────────────────────────
export interface AdaptiveMission {
  icon: IconName;
  title: string;
  tone: "green" | "amber" | "red";
  xp: number;
  days: number;
  why: string;
}

export interface AdaptivePlan {
  reason: string;
  missions: AdaptiveMission[];
}

export interface Insight {
  icon: IconName;
  tone: "green" | "amber" | "red";
  title: string;
  body: string;
  chip: string;
}

// ── Plan import → markdown → adapt (B4) ──────────────────────────────────────
export interface PlanImport {
  fileName: string;
  steps: string[];
  imported: string;
  adaptNote: string;
  adapted: string;
  changes: { icon: IconName; t: string }[];
}

// ── Proof timeline (Phase 4) + season / league / chapters (Phase 7) ──────────
export interface ProofData {
  xp: number[];
  load: number[];
  prs: { lift: string; val: string; delta: string; when: string }[];
  rarity: Record<string, number>;
}

export interface Season {
  name: string;
  daysLeft: number;
  progress: number;
  reward: string;
  rankInSeason: string;
}

export interface League {
  tier: string;
  note: string;
  standings: { tribe: string; power: number; you: boolean; trend: "up" | "down" | "flat" }[];
  verdict: string;
}

export interface Chapter {
  num: string;
  title: string;
  span: string;
  state: "done" | "current" | "locked";
  beat: string;
}

// ── Privacy / consent (A7 / Phase 8) ─────────────────────────────────────────
export interface PrivacyData {
  intro: string;
  groups: { label: string; items: { k: string; on: boolean }[] }[];
  footer: string;
}

// ── Ascent Atlas (Phase 1 · 7) ───────────────────────────────────────────────
export interface AtlasStation {
  rank: string;
  floor: number;
  state: "done" | "current" | "next" | "locked";
  emblem: IconName;
  note?: string;
  medals: { r: string; emblem: IconName; earned: boolean }[];
}

export interface Atlas {
  currentXp: number;
  stations: AtlasStation[];
  waypoints: { icon: IconName; title: string; xp: number; tone: string }[];
}

// ── The agent's reversible, logged actions (autonomy + transparency) ─────────
//
// Every autonomous thing Forge does is a typed AgentAction: it cites the data it
// used, records its reasoning, and is UNDOABLE. This is the proof it's an agent.
export type AgentCapability =
  | "updateReadiness"
  | "surfaceInsight"
  | "adjustTargets"
  | "swapExercise"
  | "flagNutrition"
  | "writeMemory"
  | "adjustTodayPlan"
  | "rescheduleWeek"
  | "generateMissions"
  | "importPlan"
  | "logCapture"
  | "sendNudge";

/** Per-capability autonomy, user-controlled. */
export type AutonomyLevel = "auto" | "ask" | "off";

export type AgentActionStatus = "proposed" | "done" | "undone";

export interface AgentAction {
  id: string;
  capability: AgentCapability;
  /** Short human label, e.g. "Rescheduled the week". */
  type: string;
  summary: string;
  /** Why Forge did it — always grounded in the user's data. */
  reasoning: string;
  citedData: CitedDatum[];
  status: AgentActionStatus;
  /** How it was handled given the capability's autonomy setting. */
  autonomy: AutonomyLevel;
  createdAt: string;
}

export interface CapabilityMeta {
  capability: AgentCapability;
  label: string;
  description: string;
  icon: IconName;
  /** Default autonomy: low-risk = auto, plan-change / message = ask. */
  default: AutonomyLevel;
  /** A plan change or an outbound message — the prototype's "ask by default". */
  sensitive: boolean;
}
