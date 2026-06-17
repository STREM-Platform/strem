/**
 * The MVP + Phase-2 medals (game-systems.md), mirrored from strem-user-service
 * (`app/medals.py` earn conditions + `MEDAL_TITLES`). Static product data so the
 * gallery can show unearned medals as aspiration alongside earned ones.
 *
 * `rarity` + `emblem` are static *display* metadata (allowed by the gap analysis:
 * "collectible medal gallery using current earned medal API plus static display
 * metadata"). They drive the premium medal artwork engine
 * (`components/medals/`, ported from `design-spec/medal-art.jsx`); the backend
 * still only returns which medals are earned.
 */

import type { IconName, Rarity } from "@/constants/theme";

export interface MedalDefinition {
  type: string;
  title: string;
  /** How it is earned — shown on aspirational (not-yet-earned) medals. */
  condition: string;
  /** Collectible tier — drives the rim/core/glow palette. */
  rarity: Rarity;
  /** Sport/achievement emblem struck into the coin (a `PATHS` icon). */
  emblem: IconName;
}

export const MEDAL_CATALOGUE: MedalDefinition[] = [
  { type: "first_steps", title: "First Steps", condition: "Log your first training or running session.", rarity: "common", emblem: "mountain" },
  { type: "first_iron", title: "First Iron", condition: "Log your first strength session.", rarity: "common", emblem: "dumbbell" },
  { type: "first_mile", title: "First Mile", condition: "Log your first run.", rarity: "common", emblem: "route" },
  { type: "tribe_member", title: "Tribe Member", condition: "Join a tribe and post your first check-in.", rarity: "common", emblem: "users" },
  { type: "committed", title: "Committed", condition: "Stay active 7 days in a row.", rarity: "rare", emblem: "flame" },
  { type: "nutrition_consistent", title: "Nutrition Consistent", condition: "Log nutrition 14 days in a row.", rarity: "rare", emblem: "leaf" },
  { type: "iron_week", title: "Iron Week", condition: "Train, run, and log nutrition in the same week.", rarity: "rare", emblem: "bolt" },
  { type: "accountability_anchor", title: "Accountability Anchor", condition: "Post 14 tribe check-ins.", rarity: "rare", emblem: "shield" },
  { type: "thirty_day_mark", title: "30-Day Mark", condition: "Log activity on 30 different days.", rarity: "epic", emblem: "flag" },
  { type: "identity_forged", title: "Identity Forged", condition: "Finish onboarding and reach 30 active days.", rarity: "legendary", emblem: "sparkles" },
  // --- Phase 2 expanded catalogue ---
  { type: "unbroken", title: "Unbroken", condition: "Stay active 14 days in a row.", rarity: "epic", emblem: "flame" },
  { type: "relentless", title: "Relentless", condition: "Stay active 30 days in a row.", rarity: "legendary", emblem: "flame" },
  { type: "long_hauler", title: "Long Hauler", condition: "Log 25 running sessions.", rarity: "epic", emblem: "route" },
  { type: "iron_devotee", title: "Iron Devotee", condition: "Log 25 strength sessions.", rarity: "epic", emblem: "dumbbell" },
  { type: "well_fueled", title: "Well Fueled", condition: "Log 30 nutrition days.", rarity: "epic", emblem: "leaf" },
  { type: "tribe_pillar", title: "Tribe Pillar", condition: "Post 50 tribe check-ins.", rarity: "legendary", emblem: "users" },
];

const BY_TYPE = new Map(MEDAL_CATALOGUE.map((medal) => [medal.type, medal]));

/**
 * Look up display metadata for an earned medal. The medals API returns only
 * `medal_type`; this hydrates it with rarity/emblem/title for the artwork.
 */
export function medalDefinitionFor(type: string): MedalDefinition | undefined {
  return BY_TYPE.get(type);
}

// ── Medal artwork palettes (design-spec/medal-art.jsx `MEDAL_META`) ───────────
//
// Per-rarity metallic treatment: `rim` is the 3-stop coin gradient (light →
// mid → shadow), `core` the 2-stop center, `accent` the emblem/ray color,
// `glow` the halo, `rays` whether the back sunburst renders.
export interface MedalMeta {
  name: string;
  rim: readonly [string, string, string];
  core: readonly [string, string];
  accent: string;
  glow: string;
  rays: boolean;
}

export const MEDAL_META: Record<Rarity, MedalMeta> = {
  common: { name: "Steel", rim: ["#EEF2F6", "#9BA6B0", "#525B63"], core: ["#5B656E", "#262C32"], accent: "#C8CFD6", glow: "rgba(160,172,184,0.0)", rays: false },
  rare: { name: "Sapphire", rim: ["#CDEEFF", "#4FB8E8", "#13567C"], core: ["#1E5B86", "#08233A"], accent: "#8FE0FF", glow: "rgba(55,198,242,0.55)", rays: false },
  epic: { name: "Emerald", rim: ["#C2FFE6", "#34E2A0", "#0B6E4E"], core: ["#0F6B4C", "#04291C"], accent: "#73FFC8", glow: "rgba(52,226,160,0.6)", rays: true },
  legendary: { name: "Molten", rim: ["#FFEFB8", "#F4C45A", "#956216"], core: ["#E5402A", "#5E0F06"], accent: "#FFD680", glow: "rgba(229,64,42,0.66)", rays: true },
  mythic: { name: "Mythic", rim: ["#FFFFFF", "#D7C7FF", "#6E4FB0"], core: ["#3A2C66", "#120A28"], accent: "#F0E9FF", glow: "rgba(190,160,255,0.7)", rays: true },
};
