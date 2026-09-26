"""
Green portals with pause-aware lifetime timers
"""

import random
import time
from typing import List, Optional, Set, Tuple

from src.config import (
    GAME_AREA_COLS,
    GAME_AREA_ROWS,
    PENALTY_TAIL_REDUCTION,
    PORTAL_DESPAWN_TIME,
    PORTAL_SPAWN_INTERVAL,
)


class PortalInstance:
    def __init__(self, top_left: Tuple[int, int], tier: str = "GREEN"):
        if tier != "GREEN":
            raise ValueError("Only green portals are supported")
        self.top_left: Tuple[int, int] = top_left
        self.tier = "GREEN"
        self.spawn_time = time.time()
        self.penalty_tail_loss = PENALTY_TAIL_REDUCTION

    def get_cells(self) -> Set[Tuple[int, int]]:
        """Returns the set of 9 grid cells occupied by this 3x3 portal."""
        tx, ty = self.top_left
        return {(tx + dx, ty + dy) for dx in range(3) for dy in range(3)}

    def get_remaining_time(self, now: Optional[float] = None) -> float:
        elapsed = (time.time() if now is None else now) - self.spawn_time
        return max(0.0, PORTAL_DESPAWN_TIME - elapsed)

    def is_expired(self) -> bool:
        return self.get_remaining_time() <= 0.0

    def adjust_spawn_time(self, frozen_duration: float):
        """Freezes portal countdown timer while player is in word puzzle or pause menu."""
        self.spawn_time += frozen_duration

    def get_allowed_levels(self) -> List[str]:
        return ["A1", "A2", "B1", "B2", "C1", "C2"]

    def get_score_multiplier(self) -> float:
        return 1.0


class PortalManager:
    def __init__(self):
        self.portals: List[PortalInstance] = []
        self.last_spawn_time: float = time.time()

    def reset(self):
        self.portals = []
        self.last_spawn_time = time.time()

    def adjust_timers_for_pause(self, frozen_duration: float):
        """Freezes all portal timers during Word Solve modal or Pause state."""
        self.last_spawn_time += frozen_duration
        for p in self.portals:
            p.adjust_spawn_time(frozen_duration)

    def spawn_portal(
        self,
        occupied_positions: List[Tuple[int, int]],
    ) -> Optional[PortalInstance]:
        existing_portal_cells: Set[Tuple[int, int]] = set()
        for p in self.portals:
            existing_portal_cells.update(p.get_cells())

        all_occupied = set(occupied_positions) | existing_portal_cells

        valid_coords = []
        for x in range(0, GAME_AREA_COLS - 2):
            for y in range(0, GAME_AREA_ROWS - 2):
                portal_cells = {(x + dx, y + dy) for dx in range(3) for dy in range(3)}
                if not (portal_cells & all_occupied):
                    valid_coords.append((x, y))

        if not valid_coords:
            return None

        top_left = random.choice(valid_coords)
        new_portal = PortalInstance(top_left)
        self.portals.append(new_portal)
        self.last_spawn_time = time.time()
        return new_portal

    def update(self):
        self.portals = [p for p in self.portals if not p.is_expired()]

    def check_collision(self, head_pos: Tuple[int, int]) -> Optional[PortalInstance]:
        for p in list(self.portals):
            if head_pos in p.get_cells():
                self.portals.remove(p)
                return p
        return None

    def get_time_until_next_spawn(self) -> float:
        elapsed = time.time() - self.last_spawn_time
        return max(0.0, PORTAL_SPAWN_INTERVAL - elapsed)
