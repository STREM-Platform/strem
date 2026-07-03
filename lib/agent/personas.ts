/**
 * The Crew — Forge as four routed personas (issue #73, design direction v3).
 *
 * ONE agent, ONE context graph, ONE backend. The personas are a product-feeling
 * layer: each surface the agent already owns gets signed by the specialist who
 * "runs" it, Kotcha-style. Routing is a presentation/prompt concern — the
 * personas never have separate data and never contradict each other's numbers.
 *
 * Persona colors are identity marks, not state signals — green/amber/red keep
 * their readiness/proof/at-risk meaning everywhere else.
 *
 * Gated by `FLAGS.crewPersonas`; flag off, no surface renders any of this.
 */

import type { IconName } from "@/constants/theme";

export type PersonaId = "forge" | "luna" | "atlas" | "sage";

export interface Persona {
  id: PersonaId;
  /** Display name, always rendered uppercase (FORGE, LUNA, …). */
  name: string;
  /** Specialty line rendered next to the name, e.g. "Recovery". */
  role: string;
  /** Longer role for tiles and intros, e.g. "Recovery · readiness". */
  roleLong: string;
  icon: IconName;
  /** Identity color for name + avatar stroke. */
  color: string;
  /** Soft fill behind the avatar. */
  soft: string;
  /** Border line for the avatar tile. */
  line: string;
}

// Atlas cyan matches RARITY.rare; Sage neutral matches T.mut — both already in
// the shipped palette, so no new visual language is introduced.
export const PERSONAS: Record<PersonaId, Persona> = {
  forge: {
    id: "forge",
    name: "Forge",
    role: "Head coach",
    roleLong: "Head coach · training",
    icon: "mountain",
    color: "#34E2A0",
    soft: "rgba(52,226,160,0.10)",
    line: "rgba(52,226,160,0.28)",
  },
  luna: {
    id: "luna",
    name: "Luna",
    role: "Recovery",
    roleLong: "Recovery · readiness",
    icon: "moon",
    color: "#F4B740",
    soft: "rgba(244,183,64,0.12)",
    line: "rgba(244,183,64,0.30)",
  },
  atlas: {
    id: "atlas",
    name: "Atlas",
    role: "Analyst",
    roleLong: "Analyst · data",
    icon: "chart",
    color: "#37C6F2",
    soft: "rgba(55,198,242,0.10)",
    line: "rgba(55,198,242,0.28)",
  },
  sage: {
    id: "sage",
    name: "Sage",
    role: "Fuel",
    roleLong: "Fuel · nutrition",
    icon: "leaf",
    color: "#9AA3AB",
    soft: "rgba(154,163,171,0.10)",
    line: "rgba(154,163,171,0.30)",
  },
};

/** The crew in presentation order (grid tiles, faces row). */
export const CREW: readonly Persona[] = [
  PERSONAS.forge,
  PERSONAS.luna,
  PERSONAS.atlas,
  PERSONAS.sage,
];

/** The agent surfaces that carry a signature, mapped to their owner. */
export type CrewSurface =
  | "climb" // Today's Climb + the training plan
  | "plan"
  | "nudge" // the morning nudge + 10s check-in
  | "checkin"
  | "readiness"
  | "insight" // post-session insight + trend evidence
  | "debrief"
  | "fuel"; // nutrition voice

const OWNERSHIP: Record<CrewSurface, PersonaId> = {
  climb: "forge",
  plan: "forge",
  nudge: "luna",
  checkin: "luna",
  readiness: "luna",
  insight: "atlas",
  debrief: "atlas",
  fuel: "sage",
};

export function personaFor(surface: CrewSurface): Persona {
  return PERSONAS[OWNERSHIP[surface]];
}
