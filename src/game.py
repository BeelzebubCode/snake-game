"""
LexiSnake Main Game Engine with Decoupled TutorialController Integration
"""

import os
import time
from typing import List, Set, Tuple

import pygame

from src.config import FPS, PORTAL_SPAWN_INTERVAL
from src.food import LetterFood
from src.menus import MenuUI
from src.portal import PortalInstance, PortalManager
from src.snake import Snake
from src.sound import SoundManager
from src.tutorial import TutorialController
from src.ui import INVENTORY_PAGE_SIZE, INVENTORY_STEP, UIRenderer, WordSolvingModalUI
from src.viewport import Viewport
from src.vocabulary import CEFRVocabulary

# Game States
STATE_MENU = 0
STATE_PLAYING = 1
STATE_PAUSED = 2
STATE_WORD_SOLVING = 3
STATE_GAME_OVER = 4
STATE_OPTIONS = 5
STATE_RESULT_POPUP = 6
STATE_TUTORIAL = 7
STATE_COUNTDOWN = 8

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

        self.viewport = Viewport()
        self.screen = self.viewport.canvas
        self.clock = pygame.time.Clock()

        self.sound_mgr = SoundManager()
        self.ui_renderer = UIRenderer(self.screen)
        self.modal_ui = WordSolvingModalUI(self.screen)
        self.menus = MenuUI(self.ui_renderer, self.viewport.mouse_pos)
        self.frame_dt = 1.0 / FPS
        self._frozen_since = None
        self._pause_return_state = None
        self._pause_started = None
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
        self.vocab_names = [
            "ALL WORDS (A1-C2)",
            "EASY (A1-A2)",
            "MEDIUM (B1-B2)",
            "HARD (C1-C2)",
        ]

        self.opt_show_grid = True

        self.opt_speed_index = 1
        self.speed_labels = [
            "SLOW (6/s)",
            "NORMAL (10/s)",
            "FAST (13/s)",
            "TURBO (16/s)",
        ]
        self.speed_delays = [1.0 / 6.0, 0.10, 1.0 / 13.0, 0.0625]

        self.opt_timer_index = 1
        self.timer_labels = ["15 SECONDS", "30 SECONDS", "45 SECONDS"]
        self.timer_values = [15.0, 30.0, 45.0]

        self.opt_sound_enabled = True

        self.last_move_time = 0.0
        self.prev_snake_segments: List[Tuple[int, int]] = []
        self.inventory_scroll_offset = 0

        # Used words tracker to prevent farming duplicate points
        self.used_words: Set[str] = set()

        # Result Popup Data
        self.result_is_win = False
        self.result_word = ""
        self.result_level = ""
        self.result_meaning_th = ""
        self.result_score_earned = 0
        self.result_penalty_info = ""

    def start_countdown(self, next_state=STATE_PLAYING):
        """Starts 3-second countdown buffer to let player pre-steer before snake moves."""
        self.freeze_world()
        self.state = STATE_COUNTDOWN
        self.countdown_target_state = next_state
        self.countdown_start_time = time.time()
        self.last_move_time = time.time()

    def reset_game(self):
        self.is_interactive_tutorial = False
        self._frozen_since = None
        self.snake = Snake()
        self.prev_snake_segments = list(self.snake.segments)

        self.food = LetterFood()
        self.portal_mgr = PortalManager()

        self.food.respawn(self.snake.segments + self.get_all_portal_cells())

        self.score = 0
        self.used_words = set()
        self.last_move_time = time.time()
        self.inventory_scroll_offset = 0

    def reset_tutorial_game(self):
        """Initializes the Decoupled Tutorial Controller."""
        self.is_interactive_tutorial = True
        self.tutorial_ctrl.reset()
        self.score = 0
        self.used_words = set()
        self._frozen_since = None
        self.inventory_scroll_offset = 0

    def get_all_portal_cells(self) -> List[Tuple[int, int]]:
        if not self.portal_mgr.portals:
            return []
        cells = set()
        for p in self.portal_mgr.portals:
            cells.update(p.get_cells())
        return list(cells)

    def trigger_word_challenge(self, portal: PortalInstance):
        self.freeze_world()
        self.active_portal = portal
        self.challenge_limit = (
            45.0
            if self.is_interactive_tutorial
            else self.timer_values[self.opt_timer_index]
        )
        self.ui_renderer.result_scroll = 0
        self.state = STATE_WORD_SOLVING
        self.modal_start_time = time.time()

        score_multiplier = portal.get_score_multiplier()
        allowed_levels = portal.get_allowed_levels()
        vocab_sets = [
            ["A1", "A2", "B1", "B2", "C1", "C2"],
            ["A1", "A2"],
            ["B1", "B2"],
            ["C1", "C2"],
        ]
        selected_levels = vocab_sets[
            0 if self.is_interactive_tutorial else self.opt_vocab_index
        ]
        filtered = [lv for lv in allowed_levels if lv in selected_levels]
        if filtered:
            allowed_levels = filtered

        inv = (
            self.tutorial_ctrl.snake.inventory
            if self.is_interactive_tutorial
            else self.snake.inventory
        )
        self.modal_ui.reset(
            inventory=inv,
            allowed_levels=allowed_levels,
            score_multiplier=score_multiplier,
        )

    def submit_word_challenge(self):
        self.modal_ui.status_scroll = 0
        word = self.modal_ui.formed_word.strip().upper()

        if not word:
            self.modal_ui.status_message = "กรุณาเลือกตัวอักษรเพื่อสร้างคำก่อน!"
            self.modal_ui.status_is_error = True
            self.modal_ui.status_meaning_th = None
            return

        if word in self.used_words:
            self.modal_ui.status_message = f"คำว่า '{word}' ถูกใช้ผสมคำไปแล้ว! กรุณาเลือกคำอื่น"
            self.modal_ui.status_is_error = True
            self.modal_ui.status_meaning_th = None
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        is_valid, msg, level, _meaning_en, meaning_th = self.vocab.validate_word(
            word, self.modal_ui.inventory
        )

        if not is_valid:
            self.modal_ui.status_message = msg
            self.modal_ui.status_is_error = True
            self.modal_ui.status_meaning_th = None
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        if level not in self.modal_ui.allowed_levels:
            self.modal_ui.status_message = f"คำนี้อยู่ระดับ {level} กรุณาใช้ระดับ {' / '.join(self.modal_ui.allowed_levels)}"
            self.modal_ui.status_is_error = True
            return

        # 1. Track used word to prevent farming duplicate points
        self.used_words.add(word)

        # 2. Consume used letters from snake inventory and body (do NOT reduce physical snake length!)
        active_snake = (
            self.tutorial_ctrl.snake if self.is_interactive_tutorial else self.snake
        )
        active_snake.remove_used_letters(list(word))
        self.inventory_scroll_offset = min(
            self.inventory_scroll_offset,
            max(0, len(active_snake.inventory) - INVENTORY_PAGE_SIZE),
        )

        earned_score = self.vocab.calculate_score(
            word, level, portal_multiplier=self.modal_ui.score_multiplier
        )
        self.score += earned_score
        if self.score > self.high_score:
            self.high_score = self.score
            save_high_score(self.high_score)

        if self.is_interactive_tutorial:
            self.tutorial_ctrl.step = 4

        self.result_is_win = True
        self.result_word = word
        self.result_level = level
        self.result_meaning_th = meaning_th
        self.result_score_earned = earned_score

        if self.opt_sound_enabled:
            self.sound_mgr.play_victory()

        self.state = STATE_RESULT_POPUP

    def fail_word_challenge(self, reason: str = "Time Expired"):
        active_snake = (
            self.tutorial_ctrl.snake if self.is_interactive_tutorial else self.snake
        )
        if self.is_interactive_tutorial:
            penalty_desc = "บทเรียนนี้ไม่หักหาง ลองเรียงคำใหม่ได้เลย"
        else:
            active_snake.shrink(self.active_portal.penalty_tail_loss)
            penalty_desc = "หมดเวลา: หางลด 1 ข้อ"

        if len(active_snake.segments) < 3 or not active_snake.is_alive:
            self.state = STATE_GAME_OVER
            self.game_over_reason = "หมดเวลาสร้างคำ: หางเหลือน้อยกว่า 3 ข้อ"
            if self.opt_sound_enabled:
                self.sound_mgr.play_defeat()
            return

        self.result_is_win = False
        self.result_penalty_info = penalty_desc
        if self.opt_sound_enabled:
            self.sound_mgr.play_defeat()
        self.state = STATE_RESULT_POPUP

    def continue_result(self):
        if self.is_interactive_tutorial and not self.result_is_win:
            self.trigger_word_challenge(self.active_portal)
        else:
            self.start_countdown(
                STATE_TUTORIAL if self.is_interactive_tutorial else STATE_PLAYING
            )

    def pause_game(self):
        """Pause movement or a word challenge without consuming either timer."""
        if self.state not in (
            STATE_PLAYING,
            STATE_TUTORIAL,
            STATE_COUNTDOWN,
            STATE_WORD_SOLVING,
        ):
            return
        self._pause_return_state = (
            self.countdown_target_state if self.state == STATE_COUNTDOWN else self.state
        )
        self._pause_started = time.time()
        self.freeze_world()
        self.state = STATE_PAUSED

    def resume_game(self):
        if self._pause_return_state == STATE_WORD_SOLVING:
            self.modal_start_time += time.time() - self._pause_started
            self.state = STATE_WORD_SOLVING
        else:
            self.start_countdown(
                self._pause_return_state
                or (STATE_TUTORIAL if self.is_interactive_tutorial else STATE_PLAYING)
            )
        self._pause_return_state = None
        self._pause_started = None

    def freeze_world(self):
        if self._frozen_since is None:
            self._frozen_since = time.time()

    def thaw_world(self):
        now = time.time()
        manager = (
            self.tutorial_ctrl.portal_mgr
            if self.is_interactive_tutorial
            else self.portal_mgr
        )
        if self._frozen_since is not None:
            manager.adjust_timers_for_pause(now - self._frozen_since)
        self._frozen_since = None
        self.last_move_time = now
        snake = self.tutorial_ctrl.snake if self.is_interactive_tutorial else self.snake
        snake.prev_segments = list(snake.segments)
        if self.is_interactive_tutorial:
            self.tutorial_ctrl.last_move_time = now

    def menu_scene(self):
        return {
            STATE_MENU: "menu",
            STATE_OPTIONS: "options",
            STATE_PAUSED: "pause",
        }.get(self.state)

    def menu_action(self, action, delta=1):
        if action == "exit":
            return False
        if action in ("play", "restart"):
            self.reset_game()
            self.start_countdown()
        elif action == "tutorial":
            self.reset_tutorial_game()
            self.start_countdown(STATE_TUTORIAL)
        elif action == "options":
            self.state = STATE_OPTIONS
        elif action == "resume":
            self.resume_game()
        elif action == "back":
            self.state = STATE_MENU
        elif action in ("skin", "vocab", "speed", "timer"):
            attr, values = {
                "skin": ("opt_skin_index", self.skin_names),
                "vocab": ("opt_vocab_index", self.vocab_names),
                "speed": ("opt_speed_index", self.speed_labels),
                "timer": ("opt_timer_index", self.timer_labels),
            }[action]
            setattr(self, attr, (getattr(self, attr) + delta) % len(values))
        elif action == "grid":
            self.opt_show_grid = not self.opt_show_grid
        elif action == "sound":
            self.opt_sound_enabled = not self.opt_sound_enabled
        return True

    def show_hint(self):
        possible = self.vocab.find_possible_words(
            self.modal_ui.inventory,
            self.modal_ui.allowed_levels,
            exclude_words=self.used_words,
        )
        self.modal_ui.status_scroll = 0
        if possible:
            word, level, _meaning_en, meaning_th = possible[0]
            self.modal_ui.auto_select_word(word)
            self.modal_ui.status_message = (
                f"ช่วยเรียงคำ: {word} ({level}) — {meaning_th or 'ยังไม่มีคำแปลไทย'}"
            )
            self.modal_ui.status_is_error = False
        else:
            self.modal_ui.status_message = "ยังไม่มีคำที่สร้างได้ในระดับนี้จากตัวอักษรปัจจุบัน"
            self.modal_ui.status_is_error = True

    def challenge_remaining(self):
        now = (
            self._pause_started
            if self.state == STATE_PAUSED
            and self._pause_return_state == STATE_WORD_SOLVING
            else time.time()
        )
        return max(0.0, self.challenge_limit - (now - self.modal_start_time))

    def handle_events(self):
        self.menus.sync(self.menu_scene(), self)
        for raw_event in pygame.event.get():
            if raw_event.type == pygame.QUIT:
                return False
            if raw_event.type in (pygame.VIDEORESIZE, pygame.WINDOWSIZECHANGED):
                self.viewport.update_rect()
                continue
            if raw_event.type == pygame.WINDOWFOCUSLOST:
                self.pause_game()
                continue
            event = self.viewport.event(raw_event)
            mouse_pos = getattr(event, "pos", self.viewport.mouse_pos())
            key = event.key if event.type == pygame.KEYDOWN else None
            click = event.type == pygame.MOUSEBUTTONDOWN and event.button == 1
            if self.state == STATE_WORD_SOLVING and self.challenge_remaining() <= 0:
                self.fail_word_challenge()
                continue
            if self.menu_scene():
                self.menus.sync(self.menu_scene(), self)
                action = self.menus.process(event)
                if action:
                    if self.opt_sound_enabled:
                        self.sound_mgr.play_click()
                    if not self.menu_action(*action):
                        return False
                    self.menus.sync(self.menu_scene(), self)
                continue
            if click and self.opt_sound_enabled:
                self.sound_mgr.play_click()
            if self.state in (STATE_PLAYING, STATE_TUTORIAL, STATE_COUNTDOWN):
                snake = (
                    self.tutorial_ctrl.snake
                    if self.is_interactive_tutorial
                    else self.snake
                )
                directions = {
                    pygame.K_UP: (0, -1),
                    pygame.K_w: (0, -1),
                    pygame.K_DOWN: (0, 1),
                    pygame.K_s: (0, 1),
                    pygame.K_LEFT: (-1, 0),
                    pygame.K_a: (-1, 0),
                    pygame.K_RIGHT: (1, 0),
                    pygame.K_d: (1, 0),
                }
                if key in directions:
                    snake.change_direction(directions[key])
                if self.state == STATE_COUNTDOWN and (
                    key in (pygame.K_p, pygame.K_ESCAPE, pygame.K_F3, pygame.K_PAUSE)
                    or (
                        click
                        and self.ui_renderer.header_pause_btn_rect.collidepoint(
                            mouse_pos
                        )
                    )
                ):
                    self.pause_game()
                elif self.state != STATE_COUNTDOWN:
                    if self.is_interactive_tutorial and (
                        key == pygame.K_ESCAPE
                        or (
                            click
                            and self.ui_renderer.tut_btn_exit.collidepoint(mouse_pos)
                        )
                    ):
                        self.state = STATE_MENU
                    elif (
                        self.is_interactive_tutorial
                        and self.tutorial_ctrl.step == 4
                        and click
                        and self.ui_renderer.tut_btn_start_game.collidepoint(mouse_pos)
                    ):
                        self.reset_game()
                        self.start_countdown()
                    elif key in (
                        pygame.K_p,
                        pygame.K_ESCAPE,
                        pygame.K_F3,
                        pygame.K_PAUSE,
                    ) or (
                        click
                        and self.ui_renderer.header_pause_btn_rect.collidepoint(
                            mouse_pos
                        )
                    ):
                        self.pause_game()
                    else:
                        delta = 0
                        if event.type == pygame.MOUSEWHEEL:
                            delta = -event.y * INVENTORY_STEP
                        elif click:
                            if self.ui_renderer.footbar_scroll_prev_rect.collidepoint(
                                mouse_pos
                            ):
                                delta = -INVENTORY_STEP
                            elif self.ui_renderer.footbar_scroll_next_rect.collidepoint(
                                mouse_pos
                            ):
                                delta = INVENTORY_STEP
                        self.inventory_scroll_offset = max(
                            0,
                            min(
                                max(0, len(snake.inventory) - INVENTORY_PAGE_SIZE),
                                self.inventory_scroll_offset + delta,
                            ),
                        )
            elif self.state == STATE_WORD_SOLVING:
                modal = self.modal_ui
                if key in (pygame.K_F3, pygame.K_PAUSE) or (
                    click and modal.btn_pause_rect.collidepoint(mouse_pos)
                ):
                    self.pause_game()
                elif key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                    self.submit_word_challenge()
                elif key == pygame.K_ESCAPE:
                    modal.handle_clear()
                elif key == pygame.K_BACKSPACE:
                    modal.handle_backspace()
                elif key == pygame.K_F1:
                    self.show_hint()
                elif key in (pygame.K_PAGEUP, pygame.K_PAGEDOWN):
                    modal.turn_page(-1 if key == pygame.K_PAGEUP else 1)
                elif (
                    event.type == pygame.KEYDOWN
                    and getattr(event, "unicode", "").isascii()
                    and getattr(event, "unicode", "").isalpha()
                ):
                    modal.handle_keyboard_char(event.unicode)
                elif event.type == pygame.MOUSEWHEEL:
                    if modal.status_rect.collidepoint(mouse_pos):
                        modal.status_scroll = max(
                            0,
                            min(
                                modal.status_scroll_max,
                                modal.status_scroll - event.y * 30,
                            ),
                        )
                    else:
                        modal.turn_page(-event.y)
                elif click:
                    if (
                        modal.btn_submit_rect.collidepoint(mouse_pos)
                        and modal.formed_word
                    ):
                        self.submit_word_challenge()
                    elif modal.btn_clear_rect.collidepoint(mouse_pos):
                        modal.handle_clear()
                    elif modal.btn_shuffle_rect.collidepoint(mouse_pos):
                        modal.shuffle()
                    elif modal.btn_hint_rect.collidepoint(mouse_pos):
                        self.show_hint()
                    elif modal.btn_prev_rect.collidepoint(mouse_pos):
                        modal.turn_page(-1)
                    elif modal.btn_next_rect.collidepoint(mouse_pos):
                        modal.turn_page(1)
                    else:
                        for index, tile in zip(modal.visible_indices, modal.tile_rects):
                            if tile.collidepoint(mouse_pos):
                                modal.toggle_tile_select(index)
                                break
            elif self.state == STATE_RESULT_POPUP:
                if key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_ESCAPE) or (
                    click
                    and self.ui_renderer.result_btn_continue.collidepoint(mouse_pos)
                ):
                    self.continue_result()
                elif event.type == pygame.MOUSEWHEEL or key in (
                    pygame.K_PAGEUP,
                    pygame.K_PAGEDOWN,
                ):
                    ui = self.ui_renderer
                    delta = (
                        -event.y * 32
                        if event.type == pygame.MOUSEWHEEL
                        else (-120 if key == pygame.K_PAGEUP else 120)
                    )
                    ui.result_scroll = max(
                        0, min(ui.result_scroll_max, ui.result_scroll + delta)
                    )
            elif self.state == STATE_GAME_OVER:
                if self.is_interactive_tutorial:
                    if key is not None or click:
                        self.state = STATE_MENU
                elif (
                    key in (pygame.K_r, pygame.K_SPACE)
                    or (
                        event.type == pygame.KEYDOWN
                        and getattr(event, "unicode", "").lower() in ("r", "พ")
                    )
                    or (
                        click
                        and getattr(
                            self.ui_renderer,
                            "gameover_restart",
                            pygame.Rect(0, 0, 0, 0),
                        ).collidepoint(mouse_pos)
                    )
                ):
                    self.reset_game()
                    self.start_countdown()
                elif key in (pygame.K_ESCAPE, pygame.K_RETURN) or (
                    click
                    and getattr(
                        self.ui_renderer, "gameover_menu", pygame.Rect(0, 0, 0, 0)
                    ).collidepoint(mouse_pos)
                ):
                    self.state = STATE_MENU
        return True

    def update(self):
        if self.state == STATE_COUNTDOWN:
            self.last_move_time = time.time()
            elapsed = time.time() - getattr(self, "countdown_start_time", time.time())
            if elapsed >= 3.0:
                self.state = getattr(self, "countdown_target_state", STATE_PLAYING)
                self.thaw_world()
            return

        if self.state == STATE_WORD_SOLVING:
            if self.challenge_remaining() <= 0:
                self.fail_word_challenge()
            return

        if self.state not in (STATE_PLAYING, STATE_TUTORIAL):
            return

        if self.state == STATE_TUTORIAL:
            self.tutorial_ctrl.sound_enabled = self.opt_sound_enabled
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
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT] or keys[pygame.K_SPACE]:
            move_delay *= 0.5

        self.portal_mgr.update()

        if self.portal_mgr.get_time_until_next_spawn() <= 0:
            if len(self.portal_mgr.portals) < 3:
                self.portal_mgr.spawn_portal(
                    occupied_positions=self.snake.segments + [self.food.position],
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
        ui = self.ui_renderer
        ui.mouse_pos = self.viewport.mouse_pos()
        self.modal_ui.mouse_pos = ui.mouse_pos
        ui.draw_background(show_grid=self.opt_show_grid)
        self.menus.sync(self.menu_scene(), self)
        if self.state not in (STATE_MENU, STATE_OPTIONS):
            tutorial = self.is_interactive_tutorial
            snake = self.tutorial_ctrl.snake if tutorial else self.snake
            food = self.tutorial_ctrl.food if tutorial else self.food
            manager = self.tutorial_ctrl.portal_mgr if tutorial else self.portal_mgr
            delay = 0.12 if tutorial else self.speed_delays[self.opt_speed_index]
            keys = pygame.key.get_pressed()
            if not tutorial and (
                keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT] or keys[pygame.K_SPACE]
            ):
                delay *= 0.5
            ui.draw_snake_food_and_portals_smooth(
                snake.segments,
                snake.prev_segments
                if self.state in (STATE_PLAYING, STATE_TUTORIAL)
                else snake.segments,
                self.tutorial_ctrl.last_move_time if tutorial else self.last_move_time,
                delay,
                food.position,
                food.letter,
                manager.portals,
                body_letters=snake.inventory,
                skin_name=self.skin_names[self.opt_skin_index],
                world_time=self._frozen_since,
            )
            next_timer = manager.get_time_until_next_spawn()
            if self._frozen_since is not None:
                next_timer = max(
                    0,
                    PORTAL_SPAWN_INTERVAL
                    - (self._frozen_since - manager.last_spawn_time),
                )
            ui.draw_hud(
                self.score,
                self.high_score,
                len(snake.segments),
                len(manager.portals),
                next_timer,
                snake.inventory,
                self.inventory_scroll_offset,
            )
            if tutorial and self.state == STATE_TUTORIAL:
                self.tutorial_ctrl.render_banner(ui.mouse_pos)
            if self.state == STATE_COUNTDOWN:
                ui.draw_countdown_overlay(
                    max(1, 3 - int(time.time() - self.countdown_start_time)), snake
                )
            elif self.state == STATE_WORD_SOLVING:
                self.modal_ui.draw(self.challenge_remaining(), self.challenge_limit)
            elif self.state == STATE_RESULT_POPUP:
                ui.draw_result_popup(
                    self.result_is_win,
                    self.result_word,
                    self.result_level,
                    self.result_meaning_th,
                    self.result_score_earned,
                    self.result_penalty_info,
                    retry_tutorial=self.is_interactive_tutorial
                    and not self.result_is_win,
                )
            elif self.state == STATE_GAME_OVER:
                self.render_game_over_overlay()
        self.menus.draw(self, self.frame_dt)
        self.viewport.present()

    def render_game_over_overlay(self):
        self.ui_renderer.draw_game_over(
            self.score,
            getattr(self, "game_over_reason", "ชนกำแพงหรือตัวเอง"),
            self.is_interactive_tutorial,
        )

    def run(self):
        running = True
        while running:
            self.frame_dt = min(self.clock.tick(FPS) / 1000.0, 0.1)
            running = self.handle_events()
            if not running:
                break
            self.update()
            self.render()
        pygame.quit()
