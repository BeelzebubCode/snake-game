"""
Dedicated Interactive Tutorial Controller with Single-Line Step 5 Banner Guidance
"""

import time
import pygame
from typing import List, Tuple, Optional, Union
from src.snake import Snake
from src.food import LetterFood
from src.portal import PortalManager, PortalInstance
from src.sound import SoundManager
from src.ui import UIRenderer

class TutorialController:
    def __init__(self, sound_mgr: SoundManager, ui_renderer: UIRenderer):
        self.sound_mgr = sound_mgr
        self.ui_renderer = ui_renderer
        self.reset()

    def reset(self):
        self.step = 0 # 0 to 4
        self.snake = Snake(start_x=8, start_y=12)
        self.snake.inventory = []
        self.snake.body_letters = []

        self.food = LetterFood()
        self.food.position = (14, 12)
        self.food.letter = "S"

        self.portal_mgr = PortalManager()
        self.last_move_time = time.time()
        self.prev_snake_segments = list(self.snake.segments)

        self.titles = [
            "1. MOVEMENT & EATING",
            "2. FOOT BAR INVENTORY",
            "3. 3x3 ISEKAI PORTAL",
            "4. SOLVING PUZZLES & HINTS",
            "5. GAME OVER RULES & TUTORIAL COMPLETE!"
        ]
        self.ths = [
            "กด W/A/S/D หรือลูกศร บังคับงูเลี้ยวกินตัวอักษร 'S' ที่อยู่ด้านหน้า",
            "ตัวอักษรจะเก็บเข้า Foot Bar ด้านล่าง เลี้ยวงูกินตัว 'N', 'A', 'K', 'E' จนครบคำว่า SNAKE",
            "ประตูมิติต่างโลก 3x3 ปรากฏขึ้นแล้ว! บังคับงูเข้าประตูมิติสีเขียวตรงกลางสนาม",
            "กด HINT [F1] ดูคำแปลภาษาไทย หรือคลิกเรียงคำว่า 'SNAKE' แล้วกด SUBMIT [Enter]",
            "กฎการแพ้: 1.ชนกำแพง/ตัวเอง 2.หางหดสั้นกว่า 3 ข้อ (ทดลองชนดูได้)"
        ]
        self.ens = [
            "Press W/A/S/D or Arrow keys to steer snake to eat letter 'S'",
            "Eaten letters accumulate safely into Foot Bar. Eat letters 'N', 'A', 'K', 'E' for SNAKE",
            "A 3x3 Portal spawned! Steer snake into the Green Portal in grid center",
            "Press HINT [F1] for Thai clues, select 'SNAKE' and press SUBMIT!",
            "Game Over Rules: 1. Wall/Self Collision 2. Tail shrunk below 3 segments (Try crashing!)"
        ]

    def handle_keydown(self, key: int) -> bool:
        """Returns True if player wants to exit tutorial via ESC."""
        if key in (pygame.K_UP, pygame.K_w):
            self.snake.change_direction((0, -1))
        elif key in (pygame.K_DOWN, pygame.K_s):
            self.snake.change_direction((0, 1))
        elif key in (pygame.K_LEFT, pygame.K_a):
            self.snake.change_direction((-1, 0))
        elif key in (pygame.K_RIGHT, pygame.K_d):
            self.snake.change_direction((1, 0))
        elif key == pygame.K_ESCAPE:
            return True
        return False

    def update(self) -> Union[None, PortalInstance, Tuple[str, str]]:
        """
        Updates tutorial snake movement.
        Steps 0-3: Respawns snake safely on wall hit.
        Step 4 (Step 5/5): Triggers real GAME OVER if snake crashes so player learns death rules!
        """
        now = time.time()
        move_delay = 0.12

        if now - self.last_move_time >= move_delay:
            self.prev_snake_segments = list(self.snake.segments)
            wall_hit, self_hit = self.snake.move()
            self.last_move_time = now

            if wall_hit or self_hit:
                if self.step == 4:
                    cause = "Boundary Wall Collision" if wall_hit else "Snake Body Collision"
                    return ("GAME_OVER", cause)
                else:
                    self.snake.respawn_tutorial_position(8, 12)
                    return None

            head = self.snake.segments[0]

            # Eat Food
            if head == self.food.position:
                self.snake.grow(self.food.letter)
                self.sound_mgr.play_eat()

                if self.step == 0:
                    self.step = 1
                    self.food.position = (14, 8)
                    self.food.letter = "N"
                elif self.step == 1:
                    if self.food.letter == "N":
                        self.food.position = (10, 8)
                        self.food.letter = "A"
                    elif self.food.letter == "A":
                        self.food.position = (10, 16)
                        self.food.letter = "K"
                    elif self.food.letter == "K":
                        self.food.position = (16, 16)
                        self.food.letter = "E"
                    elif self.food.letter == "E":
                        self.step = 2
                        self.food.position = (-100, -100)
                        portal_inst = PortalInstance((12, 12), "GREEN")
                        self.portal_mgr.portals = [portal_inst]

            # Portal Collision
            hit_portal = self.portal_mgr.check_collision(head)
            if hit_portal:
                self.sound_mgr.play_portal()
                self.step = 3
                self.snake.inventory = ["S", "N", "A", "K", "E", "L"]
                return hit_portal

        return None

    def render_banner(self, mouse_pos: Tuple[int, int]):
        step_idx = min(4, max(0, self.step))
        self.ui_renderer.draw_interactive_tutorial_banner(
            step_index=step_idx,
            title=self.titles[step_idx],
            instruction_th=self.ths[step_idx],
            instruction_en=self.ens[step_idx],
            mouse_pos=mouse_pos
        )
