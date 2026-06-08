"""Rank derivation from total XP (MVP bands).

Rank bands come from `app.schemas.game.RANK_XP_FLOOR`, which mirrors
`strem-docs/product/game-systems.md` and the user contract. This module is the
single place ranks are derived, so the XP ledger (strem-user-service#4) and the
profile endpoint stay consistent.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.game import RANK_XP_FLOOR, UserRank

# Ranks ordered by ascending XP floor.
_RANKS_ASC: list[UserRank] = sorted(RANK_XP_FLOOR, key=lambda r: RANK_XP_FLOOR[r])


@dataclass(frozen=True)
class RankProgress:
    """A user's current rank position and progress toward the next rank."""

    rank: UserRank
    next_rank: UserRank | None
    rank_xp_floor: int
    rank_xp_ceiling: int
    xp_into_rank: int
    xp_to_next_rank: int


def rank_for_total_xp(total_xp: int) -> UserRank:
    """Return the rank band containing `total_xp`."""
    current = _RANKS_ASC[0]
    for rank in _RANKS_ASC:
        if total_xp >= RANK_XP_FLOOR[rank]:
            current = rank
        else:
            break
    return current


def rank_progress(total_xp: int) -> RankProgress:
    """Return full rank progress for a total XP value."""
    rank = rank_for_total_xp(total_xp)
    index = _RANKS_ASC.index(rank)
    floor = RANK_XP_FLOOR[rank]
    next_rank = _RANKS_ASC[index + 1] if index + 1 < len(_RANKS_ASC) else None

    if next_rank is None:
        # Top MVP rank: no ceiling, no XP-to-next.
        ceiling = floor
        xp_to_next = 0
    else:
        ceiling = RANK_XP_FLOOR[next_rank] - 1
        xp_to_next = RANK_XP_FLOOR[next_rank] - total_xp

    return RankProgress(
        rank=rank,
        next_rank=next_rank,
        rank_xp_floor=floor,
        rank_xp_ceiling=ceiling,
        xp_into_rank=total_xp - floor,
        xp_to_next_rank=xp_to_next,
    )
