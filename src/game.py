"""
LexiSnake Main Game Engine with Decoupled TutorialController Integration
"""

import sys
import os
import pygame
import random
import time
from typing import List, Tuple, Optional, Set

from src.config import (
    WINDOW_WIDTH, WINDOW_HEIGHT, FPS,
    GAME_AREA_OFFSET_X, GAME_AREA_OFFSET_Y,
    GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GRID_SIZE,
    GAME_AREA_COLS, GAME_AREA_ROWS,
    COLOR_CEFR, CHALLENGE_TIME_LIMIT,
    PORTAL_SPAWN_INTERVAL, PORTAL_DESPAWN_TIME
)
from src.snake import Snake
from src.food import LetterFood
from src.portal import PortalManager, PortalInstance
from src.vocabulary import CEFRVocabulary
from src.ui import UIRenderer, WordSolvingModalUI
from src.sound import SoundManager
from src.tutorial import TutorialController

# Game States
STATE_MENU = 0
STATE_PLAYING = 1
STATE_PAUSED = 2
STATE_WORD_SOLVING = 3
STATE_GAME_OVER = 4
STATE_OPTIONS = 5
STATE_RESULT_POPUP = 6
STATE_TUTORIAL = 7

HIGHSCORE_FILE = "data/highscore.txt"

def load_high_score(file_path: str = HIGHSCORE_FILE) -> int:
    """Loads high score from text file."""
    try:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val.isdigit():
                    return int(val)
    except Exception:
        pass
    return 0

def save_high_score(score: int, file_path: str = HIGHSCORE_FILE):
    """Saves high score to text file."""
    try:
        dir_name = os.path.dirname(file_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(str(score))
    except Exception as e:
        print(f"Error saving high score: {e}")

class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("LexiSnake - CEFR Anagram Snake")
        
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.clock = pygame.time.Clock()

        self.sound_mgr = SoundManager()
        self.ui_renderer = UIRenderer(self.screen)
        self.modal_ui = WordSolvingModalUI(self.screen)
        self.vocab = CEFRVocabulary("data/cefr_dictionary.json")
        self.tutorial_ctrl = TutorialController(self.sound_mgr, self.ui_renderer)

        self.high_score = load_high_score()
        self.menu_selected_index = 0
        self.is_interactive_tutorial = False
        self.state = STATE_MENU

        # Rich Customization & Options Settings
        self.opt_skin_index = 0
        self.skin_names = ["NEON MINT", "CYBER PURPLE", "GOLDEN FIRE", "OCEAN BLUE"]

        self.opt_vocab_index = 0
        self.vocab_names = ["ALL CEFR (A1-C2)", "BEGINNER (A1-B1)", "ADVANCED (B2-C2)"]

        self.opt_show_grid = True

        self.opt_speed_index = 1
        self.speed_labels = ["SLOW (6 FPS)", "NORMAL (8 FPS)", "FAST (12 FPS)", "TURBO (16 FPS)"]
        self.speed_delays = [0.16, 0.12, 0.08, 0.05]

        self.opt_timer_index = 1
        self.timer_labels = ["15 SECONDS", "30 SECONDS", "45 SECONDS"]
        self.timer_values = [15.0, 30.0, 45.0]

        self.opt_sound_enabled = True

        self.last_move_time = 0.0
        self.prev_snake_segments: List[Tuple[int, int]] = []
        self.inventory_scroll_offset = 0

        # Result Popup Data
        self.result_is_win = False
        self.result_portal_tier = "GREEN"
        self.result_word = ""
        self.result_level = ""
        self.result_meaning_en = ""
        self.result_meaning_th = ""
        self.result_score_earned = 0
        self.result_reward_info = ""
        self.result_penalty_info = ""

    def reset_game(self):
        self.is_interactive_tutorial = False
        self.snake = Snake()
        self.prev_snake_segments = list(self.snake.segments)
        
        self.food = LetterFood()
        self.portal_mgr = PortalManager()
        
        self.food.respawn(self.snake.segments + self.get_all_portal_cells())

        self.score = 0
        self.last_move_time = time.time()
        self.inventory_scroll_offset = 0

    def reset_tutorial_game(self):
        """Initializes the Decoupled Tutorial Controller."""
        self.is_interactive_tutorial = True
        self.tutorial_ctrl.reset()
        self.score = 0
        self.inventory_scroll_offset = 0

    def get_all_portal_cells(self) -> List[Tuple[int, int]]:
        if not self.portal_mgr.portals:
            return []
        cells = set()
        for p in self.portal_mgr.portals:
            cells.update(p.get_cells())
        return list(cells)

    def trigger_word_challenge(self, portal: PortalInstance):
        self.active_portal = portal
        self.state = STATE_WORD_SOLVING
        self.modal_start_time = time.time()
        
        score_multiplier = portal.get_score_multiplier()
        allowed_levels = portal.get_allowed_levels()

        inv = self.tutorial_ctrl.snake.inventory if self.is_interactive_tutorial else self.snake.inventory
        self.modal_ui.reset(
            inventory=inv,
            portal_tier=portal.tier,
            allowed_levels=allowed_levels,
            score_multiplier=score_multiplier
        )

    def submit_word_challenge(self):
        word = self.modal_ui.formed_word.strip().upper()

        if not word:
            self.modal_ui.status_message = "Please enter a word first!"
            self.modal_ui.status_is_error = True
            return

        is_valid, msg, level, meaning_en, meaning_th = self.vocab.validate_word(
            word,
            self.modal_ui.inventory
        )

        if not is_valid:
            self.modal_ui.status_message = msg
            self.modal_ui.status_is_error = True
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        if level not in self.modal_ui.allowed_levels:
            req_str = ", ".join(self.modal_ui.allowed_levels)
            self.modal_ui.status_message = f"Word '{word}' is [{level}], but this portal requires [{req_str}]!"
            self.modal_ui.status_is_error = True
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        earned_score = self.vocab.calculate_score(
            word,
            level,
            portal_multiplier=self.modal_ui.score_multiplier
        )
        self.score += earned_score
        if self.score > self.high_score:
            self.high_score = self.score
            save_high_score(self.high_score)

        tier = self.modal_ui.portal_tier
        reward_desc = f"Standard Points ({self.modal_ui.score_multiplier:.1f}x)"
        
        if tier == "YELLOW":
            self.score += 500
            earned_score += 500
            reward_desc = "1.5x Points + 500 Bonus PTS!"
        elif tier == "RED":
            self.score += 1500
            earned_score += 1500
            if not self.is_interactive_tutorial:
                self.snake.grow("R")
                self.snake.grow("D")
            reward_desc = "2.5x Points + 1,500 Bonus PTS + Snake Tail Extended (+2)!"

        if self.score > self.high_score:
            self.high_score = self.score
            save_high_score(self.high_score)

        pause_duration = time.time() - getattr(self, "modal_start_time", time.time())
        pmgr = self.tutorial_ctrl.portal_mgr if self.is_interactive_tutorial else self.portal_mgr
        pmgr.adjust_timers_for_pause(pause_duration)

        if self.is_interactive_tutorial:
            self.tutorial_ctrl.step = 4

        self.result_is_win = True
        self.result_portal_tier = tier
        self.result_word = word
        self.result_level = level
        self.result_meaning_en = meaning_en
        self.result_meaning_th = meaning_th
        self.result_score_earned = earned_score
        self.result_reward_info = reward_desc

        if self.opt_sound_enabled:
            self.sound_mgr.play_victory()

        self.state = STATE_RESULT_POPUP

    def fail_word_challenge(self, reason: str = "Time Expired"):
        tier = self.active_portal.tier
        penalty_desc = ""

        active_snake = self.tutorial_ctrl.snake if self.is_interactive_tutorial else self.snake

        if tier == "GREEN":
            survived = active_snake.shrink(1)
            penalty_desc = "Snake Tail Shrink (-1 Segment)"
        elif tier == "YELLOW":
            survived = active_snake.shrink(2)
            penalty_desc = "Snake Tail Shrink (-2 Segments)"
        elif tier == "RED":
            survived = active_snake.shrink(4)
            penalty_desc = "Snake Tail Shrink (-4 Segments - Heavy Penalty!)"

        pause_duration = time.time() - getattr(self, "modal_start_time", time.time())
        pmgr = self.tutorial_ctrl.portal_mgr if self.is_interactive_tutorial else self.portal_mgr
        pmgr.adjust_timers_for_pause(pause_duration)

        if len(active_snake.segments) < 3 or not active_snake.is_alive:
            self.state = STATE_GAME_OVER
            self.game_over_reason = f"Portal Failure ({tier} Tier Penalty): Tail shrunk below minimum length!"
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        self.result_is_win = False
        self.result_portal_tier = tier
        self.result_penalty_info = penalty_desc
        
        if self.opt_sound_enabled:
            self.sound_mgr.play_defeat()

        self.state = STATE_RESULT_POPUP

    def handle_events(self):
        mouse_pos = pygame.mouse.get_pos()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if self.opt_sound_enabled:
                    self.sound_mgr.play_click()

            # STATE_MENU
            if self.state == STATE_MENU:
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_UP, pygame.K_w):
                        self.menu_selected_index = (self.menu_selected_index - 1) % 4
                    elif event.key in (pygame.K_DOWN, pygame.K_s):
                        self.menu_selected_index = (self.menu_selected_index + 1) % 4
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        if self.menu_selected_index == 0:
                            self.reset_game()
                            self.state = STATE_PLAYING
                        elif self.menu_selected_index == 1:
                            self.reset_tutorial_game()
                            self.state = STATE_TUTORIAL
                        elif self.menu_selected_index == 2:
                            self.state = STATE_OPTIONS
                        elif self.menu_selected_index == 3:
                            return False

                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.ui_renderer.menu_btn_play.collidepoint(mouse_pos):
                        self.reset_game()
                        self.state = STATE_PLAYING
                    elif self.ui_renderer.menu_btn_tutorial.collidepoint(mouse_pos):
                        self.reset_tutorial_game()
                        self.state = STATE_TUTORIAL
                    elif self.ui_renderer.menu_btn_options.collidepoint(mouse_pos):
                        self.state = STATE_OPTIONS
                    elif self.ui_renderer.menu_btn_exit.collidepoint(mouse_pos):
                        return False

            # STATE_TUTORIAL (Decoupled Tutorial Controller)
            elif self.state == STATE_TUTORIAL:
                if event.type == pygame.KEYDOWN:
                    want_exit = self.tutorial_ctrl.handle_keydown(event.key)
                    if want_exit:
                        self.state = STATE_MENU

                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.ui_renderer.tut_btn_exit.collidepoint(mouse_pos):
                        self.state = STATE_MENU
                    elif self.tutorial_ctrl.step == 4 and getattr(self.ui_renderer, "tut_btn_start_game", pygame.Rect(0,0,0,0)).collidepoint(mouse_pos):
                        self.reset_game()
                        self.state = STATE_PLAYING

            # STATE_OPTIONS
            elif self.state == STATE_OPTIONS:
                if event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_RETURN):
                    self.state = STATE_MENU
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.ui_renderer.opt_btn_skin.collidepoint(mouse_pos):
                        self.opt_skin_index = (self.opt_skin_index + 1) % len(self.skin_names)
                    elif self.ui_renderer.opt_btn_vocab.collidepoint(mouse_pos):
                        self.opt_vocab_index = (self.opt_vocab_index + 1) % len(self.vocab_names)
                    elif self.ui_renderer.opt_btn_grid.collidepoint(mouse_pos):
                        self.opt_show_grid = not self.opt_show_grid
                    elif self.ui_renderer.opt_btn_speed.collidepoint(mouse_pos):
                        self.opt_speed_index = (self.opt_speed_index + 1) % len(self.speed_labels)
                    elif self.ui_renderer.opt_btn_timer.collidepoint(mouse_pos):
                        self.opt_timer_index = (self.opt_timer_index + 1) % len(self.timer_labels)
                    elif self.ui_renderer.opt_btn_sound.collidepoint(mouse_pos):
                        self.opt_sound_enabled = not self.opt_sound_enabled
                    elif self.ui_renderer.opt_btn_back.collidepoint(mouse_pos):
                        self.state = STATE_MENU

            # STATE_PLAYING
            elif self.state == STATE_PLAYING:
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_UP, pygame.K_w):
                        self.snake.change_direction((0, -1))
                    elif event.key in (pygame.K_DOWN, pygame.K_s):
                        self.snake.change_direction((0, 1))
                    elif event.key in (pygame.K_LEFT, pygame.K_a):
                        self.snake.change_direction((-1, 0))
                    elif event.key in (pygame.K_RIGHT, pygame.K_d):
                        self.snake.change_direction((1, 0))
                    elif event.key in (pygame.K_p, pygame.K_ESCAPE):
                        self.state = STATE_PAUSED
                        self.pause_start_time = time.time()

                elif event.type == pygame.MOUSEBUTTONDOWN:
                    if event.button == 1 and self.ui_renderer.header_pause_btn_rect.collidepoint(mouse_pos):
                        self.state = STATE_PAUSED
                        self.pause_start_time = time.time()
                    elif event.button == 4:
                        self.inventory_scroll_offset = max(0, self.inventory_scroll_offset - 14)
                    elif event.button == 5:
                        max_offset = max(0, len(self.snake.inventory) - 28)
                        self.inventory_scroll_offset = min(max_offset, self.inventory_scroll_offset + 14)
                    elif event.button == 1:
                        if self.ui_renderer.footbar_scroll_prev_rect.collidepoint(mouse_pos):
                            self.inventory_scroll_offset = max(0, self.inventory_scroll_offset - 14)
                        elif self.ui_renderer.footbar_scroll_next_rect.collidepoint(mouse_pos):
                            max_offset = max(0, len(self.snake.inventory) - 28)
                            self.inventory_scroll_offset = min(max_offset, self.inventory_scroll_offset + 14)

            # STATE_PAUSED
            elif self.state == STATE_PAUSED:
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_p, pygame.K_ESCAPE):
                        pause_duration = time.time() - getattr(self, "pause_start_time", time.time())
                        self.portal_mgr.adjust_timers_for_pause(pause_duration)
                        self.state = STATE_PLAYING
                    elif event.key == pygame.K_r:
                        self.reset_game()
                        self.state = STATE_PLAYING

                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.ui_renderer.pause_btn_resume.collidepoint(mouse_pos):
                        pause_duration = time.time() - getattr(self, "pause_start_time", time.time())
                        self.portal_mgr.adjust_timers_for_pause(pause_duration)
                        self.state = STATE_PLAYING
                    elif self.ui_renderer.pause_btn_restart.collidepoint(mouse_pos):
                        self.reset_game()
                        self.state = STATE_PLAYING
                    elif self.ui_renderer.pause_btn_quit.collidepoint(mouse_pos):
                        self.state = STATE_MENU

            # STATE_WORD_SOLVING
            elif self.state == STATE_WORD_SOLVING:
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                        self.submit_word_challenge()
                    elif event.key == pygame.K_ESCAPE:
                        self.modal_ui.handle_clear()
                    elif event.key == pygame.K_BACKSPACE:
                        self.modal_ui.handle_backspace()
                    elif event.key == pygame.K_F1:
                        possible = self.vocab.find_possible_words(
                            self.modal_ui.inventory,
                            self.modal_ui.allowed_levels
                        )
                        if possible:
                            w, lvl, mean_en, mean_th = possible[0]
                            self.modal_ui.status_message = f"[HINT] Try forming a word starting with '{w[:2]}...' ({len(w)} letters)"
                            self.modal_ui.status_is_error = False
                            self.modal_ui.status_cefr = lvl
                            self.modal_ui.status_meaning_en = mean_en
                            self.modal_ui.status_meaning_th = mean_th
                        else:
                            self.modal_ui.status_message = "[HINT] No matching words found with current letters!"
                            self.modal_ui.status_is_error = True
                    elif event.unicode and event.unicode.isalpha():
                        self.modal_ui.handle_keyboard_char(event.unicode)

                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.modal_ui.btn_submit_rect.collidepoint(mouse_pos):
                        self.submit_word_challenge()
                    elif self.modal_ui.btn_clear_rect.collidepoint(mouse_pos):
                        self.modal_ui.handle_clear()
                    elif self.modal_ui.btn_shuffle_rect.collidepoint(mouse_pos):
                        random.shuffle(self.modal_ui.inventory)
                        self.modal_ui.selected_indices = []
                        self.modal_ui.formed_word = ""
                    elif self.modal_ui.btn_hint_rect.collidepoint(mouse_pos):
                        possible = self.vocab.find_possible_words(
                            self.modal_ui.inventory,
                            self.modal_ui.allowed_levels
                        )
                        if possible:
                            w, lvl, mean_en, mean_th = possible[0]
                            self.modal_ui.status_message = f"[HINT] Try forming a word starting with '{w[:2]}...' ({len(w)} letters)"
                            self.modal_ui.status_is_error = False
                            self.modal_ui.status_cefr = lvl
                            self.modal_ui.status_meaning_en = mean_en
                            self.modal_ui.status_meaning_th = mean_th
                        else:
                            self.modal_ui.status_message = "[HINT] No matching words found with current letters!"
                            self.modal_ui.status_is_error = True
                    else:
                        for i, tile_r in enumerate(self.modal_ui.tile_rects):
                            if tile_r.collidepoint(mouse_pos):
                                self.modal_ui.toggle_tile_select(i)
                                break

            # STATE_RESULT_POPUP
            elif self.state == STATE_RESULT_POPUP:
                if event.type == pygame.KEYDOWN and event.key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_ESCAPE):
                    if self.is_interactive_tutorial and self.tutorial_ctrl.step == 4:
                        pass
                    else:
                        self.state = STATE_PLAYING if not self.is_interactive_tutorial else STATE_TUTORIAL
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if self.ui_renderer.result_btn_continue.collidepoint(mouse_pos):
                        self.state = STATE_PLAYING if not self.is_interactive_tutorial else STATE_TUTORIAL

            # STATE_GAME_OVER
            elif self.state == STATE_GAME_OVER:
                if self.is_interactive_tutorial:
                    if event.type == pygame.KEYDOWN or (event.type == pygame.MOUSEBUTTONDOWN and event.button == 1):
                        self.state = STATE_MENU
                else:
                    if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                        self.reset_game()
                        self.state = STATE_PLAYING
                    elif event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_RETURN):
                        self.state = STATE_MENU

        return True

    def update(self):
        if self.state not in (STATE_PLAYING, STATE_TUTORIAL):
            return

        if self.state == STATE_TUTORIAL:
            res = self.tutorial_ctrl.update()
            if isinstance(res, PortalInstance):
                self.trigger_word_challenge(res)
            elif isinstance(res, tuple) and res[0] == "GAME_OVER":
                self.state = STATE_GAME_OVER
                self.game_over_reason = f"Tutorial Lesson: {res[1]}"
                if self.opt_sound_enabled:
                    self.sound_mgr.play_defeat()
            return

        now = time.time()
        move_delay = self.speed_delays[self.opt_speed_index]

        self.portal_mgr.update()

        if self.portal_mgr.get_time_until_next_spawn() <= 0:
            if len(self.portal_mgr.portals) < 3:
                self.portal_mgr.spawn_portal(
                    occupied_positions=self.snake.segments + [self.food.position],
                    snake_length=len(self.snake.segments)
                )

        if now - self.last_move_time >= move_delay:
            self.prev_snake_segments = list(self.snake.segments)
            wall_hit, self_hit = self.snake.move()
            self.last_move_time = now

            if wall_hit:
                self.state = STATE_GAME_OVER
                self.game_over_reason = "Snake Collided with Boundary Wall!"
                if self.opt_sound_enabled:
                    self.sound_mgr.play_defeat()
                return

            if self_hit:
                self.state = STATE_GAME_OVER
                self.game_over_reason = "Snake Collided with its own Body!"
                if self.opt_sound_enabled:
                    self.sound_mgr.play_defeat()
                return

            head = self.snake.segments[0]

            # Eating Food
            if head == self.food.position:
                self.snake.grow(self.food.letter)
                if self.opt_sound_enabled:
                    self.sound_mgr.play_eat()
                self.food.respawn(self.snake.segments + self.get_all_portal_cells())

            # Portal Collision
            hit_portal = self.portal_mgr.check_collision(head)
            if hit_portal:
                if self.opt_sound_enabled:
                    self.sound_mgr.play_portal()
                self.trigger_word_challenge(hit_portal)

    def render(self):
        self.ui_renderer.draw_background(show_grid=self.opt_show_grid)

        if self.state == STATE_MENU:
            self.ui_renderer.draw_main_menu(self.menu_selected_index, pygame.mouse.get_pos())

        elif self.state == STATE_OPTIONS:
            self.ui_renderer.draw_options_menu(
                skin_name=self.skin_names[self.opt_skin_index],
                vocab_diff=self.vocab_names[self.opt_vocab_index],
                show_grid=self.opt_show_grid,
                speed_label=self.speed_labels[self.opt_speed_index],
                timer_label=self.timer_labels[self.opt_timer_index],
                sound_enabled=self.opt_sound_enabled,
                mouse_pos=pygame.mouse.get_pos()
            )

        elif self.state in (STATE_PLAYING, STATE_TUTORIAL, STATE_PAUSED, STATE_WORD_SOLVING, STATE_RESULT_POPUP, STATE_GAME_OVER):
            move_delay = self.speed_delays[self.opt_speed_index]

            if self.is_interactive_tutorial:
                active_snake = self.tutorial_ctrl.snake
                prev_segs = self.tutorial_ctrl.prev_snake_segments
                last_t = self.tutorial_ctrl.last_move_time
                f_pos = self.tutorial_ctrl.food.position
                f_let = self.tutorial_ctrl.food.letter
                ports = self.tutorial_ctrl.portal_mgr.portals
            else:
                active_snake = self.snake
                prev_segs = self.prev_snake_segments
                last_t = self.last_move_time
                f_pos = self.food.position
                f_let = self.food.letter
                ports = self.portal_mgr.portals

            self.ui_renderer.draw_snake_food_and_portals_smooth(
                segments=active_snake.segments,
                prev_segments=prev_segs,
                last_move_time=last_t,
                move_interval=move_delay,
                food_pos=f_pos,
                food_letter=f_let,
                portals=ports,
                body_letters=active_snake.body_letters,
                skin_name=self.skin_names[self.opt_skin_index]
            )

            self.ui_renderer.draw_hud(
                score=self.score,
                high_score=self.high_score,
                snake_len=len(active_snake.segments),
                active_portals_count=len(ports),
                next_portal_timer=self.portal_mgr.get_time_until_next_spawn() if not self.is_interactive_tutorial else 30.0,
                inventory=active_snake.inventory,
                scroll_offset=self.inventory_scroll_offset
            )

            if self.is_interactive_tutorial and self.state != STATE_WORD_SOLVING:
                self.tutorial_ctrl.render_banner(pygame.mouse.get_pos())

            if self.state == STATE_PAUSED:
                self.ui_renderer.draw_pause_menu()

            elif self.state == STATE_WORD_SOLVING:
                max_timer = self.timer_values[self.opt_timer_index]
                rem_time = self.active_portal.get_remaining_time()
                self.modal_ui.draw(remaining_time=rem_time, max_time=max_timer)
                if self.active_portal.is_expired():
                    self.fail_word_challenge(reason="Portal Timer Expired")

            elif self.state == STATE_RESULT_POPUP:
                self.ui_renderer.draw_result_popup(
                    is_win=self.result_is_win,
                    portal_tier=self.result_portal_tier,
                    word=self.result_word,
                    level=self.result_level,
                    meaning_en=self.result_meaning_en,
                    meaning_th=self.result_meaning_th,
                    score_earned=self.result_score_earned,
                    reward_info=self.result_reward_info,
                    penalty_info=self.result_penalty_info
                )

            elif self.state == STATE_GAME_OVER:
                self.render_game_over_overlay()

        pygame.display.flip()

    def render_game_over_overlay(self):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 220))
        self.screen.blit(overlay, (0, 0))

        card_w, card_h = 500, 320
        card_x = (WINDOW_WIDTH - card_w) // 2
        card_y = (WINDOW_HEIGHT - card_h) // 2
        card_rect = pygame.Rect(card_x, card_y, card_w, card_h)

        pygame.draw.rect(self.screen, (22, 22, 34), card_rect, border_radius=14)
        pygame.draw.rect(self.screen, (231, 76, 60), card_rect, width=2, border_radius=14)

        FONTS = ("dejavusans", "liberationsans", "arial", "sans", None)
        font_large = pygame.font.SysFont(FONTS, 36, bold=True)
        font_med = pygame.font.SysFont(FONTS, 16, bold=True)
        font_small = pygame.font.SysFont(FONTS, 14)

        curr_y = card_y + 35
        t1 = font_large.render("GAME OVER", True, (231, 76, 60))
        self.screen.blit(t1, t1.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        curr_y += 45
        reason_str = getattr(self, "game_over_reason", "Snake Collided!")
        r_surf = font_med.render(f"REASON: {reason_str}", True, (241, 196, 15))
        self.screen.blit(r_surf, r_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        curr_y += 35
        sc_surf = font_med.render(f"FINAL SCORE: {self.score:,} PTS", True, (255, 255, 255))
        self.screen.blit(sc_surf, sc_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        if self.is_interactive_tutorial:
            curr_y += 40
            h_surf = font_med.render("Click or Press Any Key to Return to Main Menu", True, (46, 204, 113))
            self.screen.blit(h_surf, h_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))
        else:
            curr_y += 40
            hint1 = font_small.render("Press [R] to Restart Game", True, (46, 204, 113))
            self.screen.blit(hint1, hint1.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 24
            hint2 = font_small.render("Press [Esc] for Main Menu", True, (160, 160, 180))
            self.screen.blit(hint2, hint2.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.render()
            self.clock.tick(FPS)

        pygame.quit()
        sys.exit()
