"""pygame_gui menus with explicit keyboard focus and shared typography."""

import json

import pygame
import pygame_gui
from pygame_gui.elements import UIButton

from src.config import WINDOW_HEIGHT, WINDOW_WIDTH
from src.ui import (
    BUNDLED_FONT_BOLD,
    BUNDLED_FONT_REGULAR,
    MUTED,
    PRIMARY,
    label,
    panel,
    resolve_asset_path,
)


class CanvasUIManager(pygame_gui.UIManager):
    def __init__(self, mouse_provider, theme):
        self.mouse_provider = mouse_provider
        super().__init__(
            (WINDOW_WIDTH, WINDOW_HEIGHT), theme, enable_live_theme_updates=False
        )

    def _update_mouse_position(self):
        self.mouse_position = self.mouse_provider()


class MenuUI:
    def __init__(self, renderer, mouse_provider):
        self.renderer = renderer
        with open(resolve_asset_path("data/ui_theme.json"), encoding="utf-8") as stream:
            theme = json.load(stream)
        for element in ("button",):
            theme[element]["font"]["regular_path"] = resolve_asset_path(
                BUNDLED_FONT_REGULAR
            )
            theme[element]["font"]["bold_path"] = resolve_asset_path(BUNDLED_FONT_BOLD)
        self.manager = CanvasUIManager(mouse_provider, theme)
        self.scene = None
        self.buttons = {}
        self.focus_keys = []
        self.focus = 0

    def sync(self, scene, game):
        if scene == self.scene:
            self.refresh(game)
            return
        self.manager.clear_and_reset()
        self.buttons = {}
        self.focus_keys = []
        self.focus = 0
        self.scene = scene
        if scene == "menu":
            for i, (key, text) in enumerate(
                (
                    ("play", "เริ่มเล่น"),
                    ("tutorial", "เรียนรู้วิธีเล่น"),
                    ("options", "ตั้งค่า"),
                    ("exit", "ออกจากเกม"),
                )
            ):
                self.add(key, text, (766, 276 + i * 68, 352, 52), key == "play")
        elif scene == "options":
            for i, key in enumerate(
                ("skin", "vocab", "speed", "timer", "grid", "sound")
            ):
                y = 196 + i * 66
                self.add(key + "_prev", "<", (658, y, 48, 48), focusable=False)
                self.add(key, "", (714, y, 354, 48))
                self.add(key + "_next", ">", (1076, y, 48, 48), focusable=False)
            self.add("back", "กลับเมนู  [Esc]", (658, 626, 466, 52), True)
        elif scene == "pause":
            for i, (key, text) in enumerate(
                (
                    ("resume", "เล่นต่อ  [P]"),
                    ("restart", "เริ่มใหม่  [R]"),
                    ("back", "กลับเมนู"),
                )
            ):
                self.add(key, text, (440, 310 + i * 68, 400, 52), i == 0)
        self.refresh(game)
        self.select()

    def add(self, key, text, rect, primary=False, focusable=True):
        self.buttons[key] = UIButton(
            pygame.Rect(rect),
            text,
            self.manager,
            object_id="#primary" if primary else "#secondary",
        )
        if focusable:
            self.focus_keys.append(key)

    def refresh(self, game):
        if self.scene != "options":
            return
        values = dict(
            skin=("เขียวมิ้นต์", "ม่วงนีออน", "ทองอร่าม", "ฟ้ามหาสมุทร")[game.opt_skin_index],
            vocab=game.vocab_names[game.opt_vocab_index],
            speed=game.speed_labels[game.opt_speed_index],
            timer=game.timer_labels[game.opt_timer_index],
            grid="เปิด" if game.opt_show_grid else "ปิด",
            sound="เปิด" if game.opt_sound_enabled else "ปิด",
        )
        for key, value in values.items():
            if self.buttons[key].text != value:
                self.buttons[key].set_text(value)

    def select(self):
        for key in self.focus_keys:
            if key == self.focus_keys[self.focus]:
                self.buttons[key].select()
            else:
                self.buttons[key].unselect()

    def process(self, event):
        if not self.scene:
            return None
        if event.type == pygame_gui.UI_BUTTON_PRESSED:
            for key, widget in self.buttons.items():
                if event.ui_element == widget:
                    action = key.removesuffix("_prev").removesuffix("_next")
                    if action in self.focus_keys:
                        self.focus = self.focus_keys.index(action)
                        self.select()
                    return (action, -1 if key.endswith("_prev") else 1)
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_TAB, pygame.K_DOWN, pygame.K_UP):
                delta = (
                    -1
                    if event.key == pygame.K_UP
                    or (
                        event.key == pygame.K_TAB
                        and getattr(event, "mod", 0) & pygame.KMOD_SHIFT
                    )
                    else 1
                )
                self.focus = (self.focus + delta) % len(self.focus_keys)
                self.select()
                return None
            if event.key in (
                pygame.K_RETURN,
                pygame.K_KP_ENTER,
                pygame.K_SPACE,
                pygame.K_LEFT,
                pygame.K_RIGHT,
            ):
                key = self.focus_keys[self.focus]
                if event.key in (pygame.K_LEFT, pygame.K_RIGHT) and (
                    self.scene != "options" or key == "back"
                ):
                    return None
                return (key, -1 if event.key == pygame.K_LEFT else 1)
            if event.key == pygame.K_ESCAPE:
                return ("resume" if self.scene == "pause" else "back", 1)
            if self.scene == "pause" and event.key in (
                pygame.K_p,
                pygame.K_r,
                pygame.K_F3,
                pygame.K_PAUSE,
            ):
                return ("restart" if event.key == pygame.K_r else "resume", 1)
        self.manager.process_events(event)
        return None

    def draw(self, game, dt):
        r, s = self.renderer, self.renderer.surface
        if self.scene == "menu":
            panel(s, pygame.Rect(112, 144, 1056, 512))
            label(s, "LEXISNAKE", r.font_logo, (160, 204), PRIMARY)
            label(s, "เล่นงู เก็บตัวอักษร เปิดโลกคำศัพท์", r.font_title, (160, 270))
            for i, (num, title, detail) in enumerate(
                (
                    ("01", "เก็บตัวอักษร", "เลี้ยวงูด้วย WASD หรือปุ่มลูกศร"),
                    ("02", "เข้าประตูเขียว", "เริ่มเรียงคำจากตัวอักษรที่สะสม"),
                    ("03", "เรียงคำ รับคะแนน", "พิมพ์หรือคลิกตัวอักษรเพื่อสร้างคำ"),
                )
            ):
                y = 346 + i * 80
                label(s, num, r.font_header, (160, y), PRIMARY)
                label(s, title, r.font_header, (206, y))
                label(s, detail, r.font_small, (206, y + 29), MUTED)
            label(s, "เริ่มการผจญภัย", r.font_title, (766, 206))
            label(s, "Tab / ลูกศร เลือก  •  Enter ยืนยัน", r.font_small, (766, 582), MUTED)
        elif self.scene == "options":
            panel(s, pygame.Rect(112, 112, 1056, 600))
            label(s, "ตั้งค่า", r.font_modal_title, (152, 138), PRIMARY)
            items = (
                ("รูปลักษณ์งู", "เลือกสีที่มองเห็นง่าย"),
                ("ระดับคำศัพท์", "เลือกระดับคำที่ใช้ตอบในประตูเขียว"),
                ("ความเร็วงู", "เลือกจังหวะที่เล่นถนัด"),
                ("เวลาสร้างคำ", "เริ่มนับใหม่เมื่อเข้าประตู"),
                ("เส้นตาราง", "ช่วยกะระยะการเลี้ยว"),
                ("เสียงเอฟเฟกต์", "เสียงกินตัวอักษรและตอบคำศัพท์"),
            )
            for i, (title, detail) in enumerate(items):
                y = 192 + i * 66
                label(s, title, r.font_header, (152, y))
                label(s, detail, r.font_small, (152, y + 30), MUTED)
            label(s, "Tab เลือกหัวข้อ • ซ้าย/ขวา เปลี่ยนค่า", r.font_small, (152, 642), MUTED)
        elif self.scene == "pause":
            rect = r.overlay(560, 400)
            label(
                s,
                "พักเกม",
                r.font_modal_title,
                (rect.centerx, rect.y + 46),
                PRIMARY,
                True,
            )
            label(
                s,
                "พร้อมแล้วค่อยไปต่อ",
                r.font_body,
                (rect.centerx, rect.y + 94),
                MUTED,
                True,
            )
        else:
            return
        self.manager.update(dt)
        self.manager.draw_ui(s)
        # Strong keyboard focus ring remains visible independent of mouse hover.
        if self.focus_keys:
            rect = self.buttons[self.focus_keys[self.focus]].rect.inflate(6, 6)
            pygame.draw.rect(s, PRIMARY, rect, 2, border_radius=12)
