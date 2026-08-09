"""
Snake Entity Logic with Smooth Movement Interpolation and Inventory Retention
"""

import time
from typing import List, Tuple
from src.config import (
    GAME_AREA_COLS, GAME_AREA_ROWS,
    DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT,
    INITIAL_SNAKE_LENGTH, INITIAL_SNAKE_SPEED
)

class Snake:
    def __init__(self, start_x: int = 10, start_y: int = 12):
        self.reset(start_x, start_y)

    def reset(self, start_x: int = 10, start_y: int = 12):
        self.direction = DIR_RIGHT
        self.next_direction = DIR_RIGHT
        
        self.segments: List[Tuple[int, int]] = []
        for i in range(INITIAL_SNAKE_LENGTH):
            self.segments.append((start_x - i, start_y))
            
        self.prev_segments: List[Tuple[int, int]] = list(self.segments)
        
        self.body_letters: List[str] = ["S", "N", "A", "K"]
        self.inventory: List[str] = ["S", "N", "A", "K"]
        
        self.eaten_count_since_last_challenge = 0
        self.is_alive = True
        self.last_move_time = time.time()
        self.move_interval = 1.0 / INITIAL_SNAKE_SPEED

    def respawn_tutorial_position(self, start_x: int = 8, start_y: int = 12):
        """Respawns snake to safe tutorial coordinates while preserving inventory & status."""
        self.direction = DIR_RIGHT
        self.next_direction = DIR_RIGHT
        self.is_alive = True
        
        curr_len = max(3, len(self.segments))
        self.segments = [(start_x - i, start_y) for i in range(curr_len)]
        self.prev_segments = list(self.segments)
        self.last_move_time = time.time()

    def change_direction(self, new_dir: Tuple[int, int]):
        """Sets new direction avoiding immediate 180 degree reversal."""
        dx, dy = self.direction
        ndx, ndy = new_dir
        if (dx + ndx != 0) or (dy + ndy != 0):
            self.next_direction = new_dir

    def move(self) -> Tuple[bool, bool]:
        """
        Moves the snake forward 1 step.
        Returns (wall_collision, self_collision).
        """
        if not self.is_alive:
            return False, False

        self.direction = self.next_direction
        head_x, head_y = self.segments[0]
        dx, dy = self.direction
        
        new_head = (head_x + dx, head_y + dy)

        self.prev_segments = list(self.segments)
        self.last_move_time = time.time()

        # Wall Collision
        if (new_head[0] < 0 or new_head[0] >= GAME_AREA_COLS or
            new_head[1] < 0 or new_head[1] >= GAME_AREA_ROWS):
            self.is_alive = False
            return True, False

        # Self Collision
        if new_head in self.segments[:-1]:
            self.is_alive = False
            return False, True

        # Move body
        self.segments.insert(0, new_head)
        self.segments.pop()

        return False, False

    def grow(self, letter: str):
        """Grow snake body by 1 segment at tail and record letter."""
        tail_x, tail_y = self.segments[-1]
        self.prev_segments.append((tail_x, tail_y))
        self.segments.append((tail_x, tail_y))
        
        letter = letter.upper()
        self.body_letters.append(letter)
        self.inventory.append(letter)
        self.eaten_count_since_last_challenge += 1

    def shrink(self, count: int) -> bool:
        """
        Reduces snake length by `count` segments as a penalty.
        Inventory letters are KEPT/RETAINED as requested!
        Returns True if snake survived, False if Game Over.
        """
        for _ in range(count):
            if len(self.segments) > 0:
                self.segments.pop()
            if len(self.prev_segments) > 0:
                self.prev_segments.pop()
            if len(self.body_letters) > 0:
                self.body_letters.pop()

        if len(self.segments) < 3:
            self.is_alive = False
            return False
        return True

    def remove_used_letters(self, used_letters: List[str]):
        """Remove specified letters used in word puzzle from inventory and snake body."""
        for char in used_letters:
            char = char.upper()
            if char in self.inventory:
                self.inventory.remove(char)
            if char in self.body_letters:
                self.body_letters.remove(char)
