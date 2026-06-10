/**
 * The ten MVP medals (game-systems.md), mirrored from strem-user-service
 * (`app/medals.py` earn conditions + `MEDAL_TITLES`). Static product data so the
 * gallery can show unearned medals as aspiration alongside earned ones.
 */

export interface MedalDefinition {
  type: string;
  title: string;
  /** How it is earned — shown on aspirational (not-yet-earned) medals. */
  condition: string;
}

export const MEDAL_CATALOGUE: MedalDefinition[] = [
  { type: "first_steps", title: "First Steps", condition: "Log your first training or running session." },
  { type: "first_iron", title: "First Iron", condition: "Log your first strength session." },
  { type: "first_mile", title: "First Mile", condition: "Log your first run." },
  { type: "tribe_member", title: "Tribe Member", condition: "Join a tribe and post your first check-in." },
  { type: "committed", title: "Committed", condition: "Stay active 7 days in a row." },
  { type: "nutrition_consistent", title: "Nutrition Consistent", condition: "Log nutrition 14 days in a row." },
  { type: "iron_week", title: "Iron Week", condition: "Train, run, and log nutrition in the same week." },
  { type: "accountability_anchor", title: "Accountability Anchor", condition: "Post 14 tribe check-ins." },
  { type: "thirty_day_mark", title: "30-Day Mark", condition: "Log activity on 30 different days." },
  { type: "identity_forged", title: "Identity Forged", condition: "Finish onboarding and reach 30 active days." },
  // --- Phase 2 expanded catalogue ---
  { type: "unbroken", title: "Unbroken", condition: "Stay active 14 days in a row." },
  { type: "relentless", title: "Relentless", condition: "Stay active 30 days in a row." },
  { type: "long_hauler", title: "Long Hauler", condition: "Log 25 running sessions." },
  { type: "iron_devotee", title: "Iron Devotee", condition: "Log 25 strength sessions." },
  { type: "well_fueled", title: "Well Fueled", condition: "Log 30 nutrition days." },
  { type: "tribe_pillar", title: "Tribe Pillar", condition: "Post 50 tribe check-ins." },
];
