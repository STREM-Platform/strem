/**
 * Detecting a progression "moment" — a rank-up or a newly earned medal — by
 * comparing a prior snapshot to the latest state. Pure, so it is easy to reason
 * about and race-free (callers compare settled states, not live events).
 */

import type { EarnedMedal, UserRank } from "@/lib/api/types";

const RANK_ORDER: UserRank[] = ["Initiate", "Builder", "Forged", "Hybrid", "Warrior"];

export interface ProgressionSnapshot {
  rank: UserRank;
  medalTypes: Set<string>;
}

export interface ProgressionMoment {
  /** The new rank when the user ranked up, else null. */
  rankUp: UserRank | null;
  /** Medals present now but not in the prior snapshot. */
  newMedals: EarnedMedal[];
}

/** Compare a prior snapshot to the latest state; null when nothing advanced. */
export function detectMoment(
  before: ProgressionSnapshot,
  after: { rank: UserRank; medals: EarnedMedal[] },
): ProgressionMoment | null {
  const rankedUp = RANK_ORDER.indexOf(after.rank) > RANK_ORDER.indexOf(before.rank);
  const newMedals = after.medals.filter((medal) => !before.medalTypes.has(medal.medal_type));
  if (!rankedUp && newMedals.length === 0) {
    return null;
  }
  return { rankUp: rankedUp ? after.rank : null, newMedals };
}

/** A short, identity-grounded coach line for a rank-up. */
export function rankUpLine(rank: UserRank): string {
  const lines: Record<UserRank, string> = {
    Initiate: "Every build starts here. You've begun.",
    Builder: "You're building now — the work is becoming who you are.",
    Forged: "Forged. The standard you hold is rising.",
    Hybrid: "Hybrid. Strength and endurance, held together by discipline.",
    Warrior: "Warrior. The identity you chose, made real.",
  };
  return lines[rank];
}
