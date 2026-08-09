"""
Multi-Portal Spawner & Dynamic Weighted Difficulty System (with Pause Time Adjustments)
"""

import time
import random
from typing import List, Tuple, Set, Optional
from src.config import (
    GAME_AREA_COLS, GAME_AREA_ROWS,
    PORTAL_SPAWN_INTERVAL, PORTAL_DESPAWN_TIME
)

class PortalInstance:
    def __init__(self, top_left: Tuple[int, int], tier: str):
        self.top_left: Tuple[int, int] = top_left # Top-left (x, y) of 3x3 grid portal
        self.tier: str = tier                     # "GREEN", "YELLOW", "RED"
        self.spawn_time: float = time.time()

        # Tier-specific Penalties & Victory Rewards
        if tier == "GREEN":
            self.penalty_tail_loss = 1
            self.bonus_score = 0
            self.bonus_tail_growth = 0
            self.reward_description = "Standard Points (1.0x)"
            self.penalty_description = "Tail shrank by 1 segment"
        elif tier == "YELLOW":
            self.penalty_tail_loss = 2
            self.bonus_score = 500
            self.bonus_tail_growth = 0
            self.reward_description = "1.5x Points + 500 Bonus PTS"
            self.penalty_description = "Tail shrank by 2 segments"
        elif tier == "RED":
            self.penalty_tail_loss = 4
            self.bonus_score = 1500
            self.bonus_tail_growth = 2
            self.reward_description = "2.5x Points + 1,500 Bonus PTS + 2 Tail Growth"
            self.penalty_description = "Tail shrank by 4 segments"

    def get_cells(self) -> Set[Tuple[int, int]]:
        """Returns the set of 9 grid cells occupied by this 3x3 portal."""
        tx, ty = self.top_left
        return {
            (tx + dx, ty + dy)
            for dx in range(3)
            for dy in range(3)
        }

    def get_remaining_time(self) -> float:
        elapsed = time.time() - self.spawn_time
        return max(0.0, PORTAL_DESPAWN_TIME - elapsed)

    def is_expired(self) -> bool:
        return self.get_remaining_time() <= 0.0

    def adjust_spawn_time(self, frozen_duration: float):
        """Freezes portal countdown timer while player is in word puzzle or pause menu."""
        self.spawn_time += frozen_duration

    def get_allowed_levels(self) -> List[str]:
        if self.tier == "GREEN":
            return ["A1", "A2", "B1", "B2", "C1", "C2"]
        elif self.tier == "YELLOW":
            return ["B1", "B2", "C1", "C2"]
        elif self.tier == "RED":
            return ["C1", "C2"]
        return ["A1", "A2", "B1", "B2", "C1", "C2"]

    def get_score_multiplier(self) -> float:
        if self.tier == "GREEN":
            return 1.0
        elif self.tier == "YELLOW":
            return 1.5
        elif self.tier == "RED":
            return 2.5
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

    def calculate_tier_weights(self, snake_length: int) -> str:
        tiers = ["GREEN", "YELLOW", "RED"]
        if snake_length < 6:
            weights = [90, 10, 0]
        elif snake_length < 12:
            weights = [60, 30, 10]
        elif snake_length < 20:
            weights = [35, 45, 20]
        else:
            weights = [20, 45, 35]

        selected_tier = random.choices(tiers, weights=weights, k=1)[0]
        return selected_tier

    def spawn_portal(self, occupied_positions: List[Tuple[int, int]], snake_length: int) -> Optional[PortalInstance]:
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
        tier = self.calculate_tier_weights(snake_length)
        
        new_portal = PortalInstance(top_left, tier)
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
