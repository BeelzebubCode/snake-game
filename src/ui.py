"""Shared drawing, typography and bounded layouts for LexiSnake."""

import math
import os
import sys
import time
import unicodedata
from functools import lru_cache
from typing import List, Optional, Tuple

import pygame

from src.config import (
    CHALLENGE_TIME_LIMIT,
    COLOR_BG,
    COLOR_FOOD_BG,
    COLOR_FOOD_TEXT,
    COLOR_GRID_BG,
    COLOR_GRID_LINE,
    COLOR_PORTAL_GREEN,
    FOOTER_BAR_WIDTH,
    FOOTER_BAR_X,
    FOOTER_BAR_Y,
    GAME_AREA_HEIGHT,
    GAME_AREA_OFFSET_X,
    GAME_AREA_OFFSET_Y,
    GAME_AREA_WIDTH,
    GRID_SIZE,
    PORTAL_SPAWN_INTERVAL,
    WINDOW_HEIGHT,
    WINDOW_WIDTH,
)
from src.portal import PortalInstance

BUNDLED_FONT_REGULAR = "data/fonts/NotoSansThai-Regular.ttf"
BUNDLED_FONT_BOLD = "data/fonts/NotoSansThai-Bold.ttf"
BORDER = (48, 59, 76)
MUTED = (164, 179, 195)
PANEL = (22, 30, 43)
PRIMARY = (91, 224, 170)
DANGER = (255, 128, 133)
TEXT = (235, 243, 250)
INVENTORY_PAGE_SIZE = 28
INVENTORY_STEP = 7


def resolve_asset_path(relative_path):
    base = getattr(
        sys, "_MEIPASS", os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return os.path.join(base, relative_path)


def load_ui_font(size, bold=False):
    if not pygame.font.get_init():
        pygame.font.init()
    path = resolve_asset_path(BUNDLED_FONT_BOLD if bold else BUNDLED_FONT_REGULAR)
    font = pygame.font.Font(path, size)
    font.set_script("Thai")
    return font


load_english_font = load_ui_font
load_thai_font = load_ui_font


@lru_cache(maxsize=512)
def wrap_lines(text, font, width):
    """Prefer spaces; break unspaced Thai without detaching combining marks."""
    lines = []
    for paragraph in (text or "").split("\n"):
        clusters = []
        for char in paragraph:
            if clusters and (
                unicodedata.category(char).startswith("M") or char == "\u0e33"
            ):
                clusters[-1] += char
            elif clusters and "\u0e40" <= clusters[-1][-1] <= "\u0e44":
                clusters[-1] += char
            else:
                clusters.append(char)
        line = ""
        for cluster in clusters:
            if line and font.size(line + cluster)[0] > width:
                split = line.rfind(" ")
                if split > len(line) // 2:
                    lines.append(line[:split].rstrip())
                    line = line[split + 1 :] + cluster
                else:
                    lines.append(line.rstrip())
                    line = cluster.lstrip()
            else:
                line += cluster
        lines.append(line.rstrip())
    return tuple(lines)


def render_wrapped_text(surface, text, font, color, x, y, max_width, line_spacing=4):
    for line in wrap_lines(text, font, max_width):
        surface.blit(font.render(line, True, color), (x, y))
        y += font.get_linesize() + line_spacing
    return y


def render_wrapped_text_centered(
    surface, text, font, color, center_x, y, max_width, line_spacing=4
):
    for line in wrap_lines(text, font, max_width):
        image = font.render(line, True, color)
        surface.blit(image, image.get_rect(midtop=(center_x, y)))
        y += font.get_linesize() + line_spacing
    return y


def label(surface, text, font, pos, color=TEXT, center=False, max_width=None):
    value = str(text)
    if max_width:
        while len(value) > 1 and font.size(value)[0] > max_width:
            value = value[:-2] + "…"
    image = font.render(value, True, color)
    surface.blit(image, image.get_rect(center=pos) if center else pos)


def panel(surface, rect, color=PANEL, border=BORDER):
    pygame.draw.rect(surface, color, rect, border_radius=12)
    pygame.draw.rect(surface, border, rect, 1, border_radius=12)


def button(surface, rect, text, font, primary=False, mouse_pos=(-1, -1), enabled=True):
    hover = enabled and rect.collidepoint(mouse_pos)
    bg = PRIMARY if primary and enabled else ((43, 60, 78) if hover else (30, 41, 56))
    panel(surface, rect, bg, PRIMARY if hover else BORDER)
    label(
        surface,
        text,
        font,
        rect.center,
        (12, 31, 28) if primary and enabled else (TEXT if enabled else MUTED),
        True,
        rect.width - 16,
    )


def scroll_text(surface, text, font, rect, offset=0, color=TEXT):
    lines = wrap_lines(text, font, rect.width - 16)
    step = font.get_linesize() + 6
    maximum = max(0, len(lines) * step - rect.height)
    offset = max(0, min(maximum, offset))
    old_clip = surface.get_clip()
    surface.set_clip(rect)
    for i, line in enumerate(lines):
        label(surface, line, font, (rect.x, rect.y + i * step - offset), color)
    surface.set_clip(old_clip)
    if maximum:
        track = pygame.Rect(rect.right - 5, rect.y, 3, rect.height)
        pygame.draw.rect(surface, BORDER, track)
        thumb = max(20, int(rect.height * rect.height / (len(lines) * step)))
        pygame.draw.rect(
            surface,
            MUTED,
            (track.x, rect.y + int((rect.height - thumb) * offset / maximum), 3, thumb),
        )
    return maximum


class UIRenderer:
    def __init__(self, surface):
        self.surface = surface
        self.mouse_pos = (-1, -1)
        self.font_logo = pygame.font.Font(
            resolve_asset_path("data/fonts/ChakraPetch-Bold.ttf"), 38
        )
        self.font_score = pygame.font.Font(
            resolve_asset_path("data/fonts/ChakraPetch-Bold.ttf"), 28
        )
        self.font_title = load_ui_font(24, True)
        self.font_header = load_ui_font(18, True)
        self.font_menu = load_ui_font(20, True)
        self.font_body = load_ui_font(18)
        self.font_small = load_ui_font(14)
        self.font_tile = load_ui_font(17, True)
        self.font_badge = load_ui_font(14, True)
        self.font_portal_label = load_ui_font(12, True)
        self.font_modal_title = load_ui_font(28, True)
        self.font_thai_body = self.font_body
        self.font_thai_small = load_ui_font(16)
        for name in (
            "pause_btn_resume",
            "pause_btn_restart",
            "pause_btn_quit",
            "header_pause_btn_rect",
            "tut_btn_exit",
            "tut_btn_start_game",
            "result_btn_continue",
            "footbar_scroll_prev_rect",
            "footbar_scroll_next_rect",
        ):
            setattr(self, name, pygame.Rect(0, 0, 0, 0))
        self.result_scroll = 0
        self.result_scroll_max = 0

    def draw_background(self, show_grid=True):
        self.surface.fill(COLOR_BG)
        board = pygame.Rect(
            GAME_AREA_OFFSET_X, GAME_AREA_OFFSET_Y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT
        )
        panel(self.surface, board, COLOR_GRID_BG)
        if show_grid:
            for x in range(board.x + GRID_SIZE, board.right, GRID_SIZE):
                pygame.draw.line(
                    self.surface,
                    COLOR_GRID_LINE,
                    (x, board.y + 1),
                    (x, board.bottom - 1),
                )
            for y in range(board.y + GRID_SIZE, board.bottom, GRID_SIZE):
                pygame.draw.line(
                    self.surface,
                    COLOR_GRID_LINE,
                    (board.x + 1, y),
                    (board.right - 1, y),
                )
        label(
            self.surface,
            "WASD / ลูกศร  เลี้ยว      Shift  เร่งความเร็ว      P / Esc  พักเกม",
            self.font_small,
            (32, 755),
            MUTED,
        )

    def draw_hud(
        self,
        score,
        high_score,
        snake_len,
        active_portals_count,
        next_portal_timer,
        inventory,
        scroll_offset=0,
    ):
        label(self.surface, "LEXISNAKE", self.font_logo, (32, 27), PRIMARY)
        label(self.surface, "เก็บตัวอักษร • สร้างคำศัพท์", self.font_small, (34, 77), MUTED)
        for x, title, value in (
            (340, "คะแนน", score),
            (595, "สถิติสูงสุด", high_score),
            (865, "ความยาวงู", snake_len),
        ):
            label(self.surface, title, self.font_small, (x, 26), MUTED)
            label(
                self.surface,
                f"{value:,}",
                self.font_score,
                (x, 50),
                TEXT,
                max_width=235,
            )
        self.header_pause_btn_rect = pygame.Rect(1092, 30, 156, 48)
        button(
            self.surface,
            self.header_pause_btn_rect,
            "พักเกม  [P]",
            self.font_header,
            mouse_pos=self.mouse_pos,
        )

        x, y, w = FOOTER_BAR_X, FOOTER_BAR_Y, FOOTER_BAR_WIDTH
        panel(self.surface, pygame.Rect(x, y, w, 142))
        label(self.surface, "ประตูคำศัพท์", self.font_header, (x + 24, y + 18))
        label(
            self.surface,
            f"เปิดอยู่ {active_portals_count} ประตู",
            self.font_body,
            (x + 24, y + 54),
            PRIMARY,
        )
        label(
            self.surface,
            f"ประตูถัดไปใน {math.ceil(next_portal_timer)} วินาที",
            self.font_small,
            (x + 24, y + 89),
            MUTED,
        )
        progress = min(1, max(0, 1 - next_portal_timer / PORTAL_SPAWN_INTERVAL))
        pygame.draw.rect(
            self.surface, BORDER, (x + 24, y + 118, w - 48, 6), border_radius=3
        )
        if progress:
            pygame.draw.rect(
                self.surface,
                PRIMARY,
                (x + 24, y + 118, int((w - 48) * progress), 6),
                border_radius=3,
            )

        iy = y + 158
        panel(self.surface, pygame.Rect(x, iy, w, 324))
        label(self.surface, "ตัวอักษรสะสม", self.font_header, (x + 24, iy + 16))
        label(
            self.surface,
            f"{len(inventory)} ตัว • ใช้เมื่อเข้าประตู",
            self.font_small,
            (x + 24, iy + 46),
            MUTED,
        )
        scroll_offset = min(scroll_offset, max(0, len(inventory) - INVENTORY_PAGE_SIZE))
        for i, char in enumerate(
            inventory[scroll_offset : scroll_offset + INVENTORY_PAGE_SIZE]
        ):
            rect = pygame.Rect(x + 24 + i % 7 * 58, iy + 80 + i // 7 * 46, 48, 38)
            panel(self.surface, rect, (48, 48, 32), (112, 103, 55))
            label(
                self.surface, char, self.font_tile, rect.center, (248, 216, 121), True
            )
        if not inventory:
            label(
                self.surface,
                "กินตัวอักษรบนสนามเพื่อเริ่มสะสม",
                self.font_body,
                (x + 24, iy + 116),
                MUTED,
            )
        self.footbar_scroll_prev_rect = pygame.Rect(0, 0, 0, 0)
        self.footbar_scroll_next_rect = pygame.Rect(0, 0, 0, 0)
        if len(inventory) > INVENTORY_PAGE_SIZE:
            self.footbar_scroll_prev_rect = pygame.Rect(x + 24, iy + 270, 48, 44)
            self.footbar_scroll_next_rect = pygame.Rect(x + w - 72, iy + 270, 48, 44)
            button(
                self.surface,
                self.footbar_scroll_prev_rect,
                "<",
                self.font_body,
                mouse_pos=self.mouse_pos,
                enabled=scroll_offset > 0,
            )
            button(
                self.surface,
                self.footbar_scroll_next_rect,
                ">",
                self.font_body,
                mouse_pos=self.mouse_pos,
                enabled=scroll_offset + INVENTORY_PAGE_SIZE < len(inventory),
            )
            label(
                self.surface,
                f"{scroll_offset + 1}–{min(len(inventory), scroll_offset + INVENTORY_PAGE_SIZE)} / {len(inventory)}",
                self.font_small,
                (x + w // 2, iy + 292),
                MUTED,
                True,
            )

        panel(self.surface, pygame.Rect(x, y + 498, w, 126))
        label(
            self.surface,
            "เข้าประตูเพื่อเรียงคำ",
            self.font_header,
            (x + 24, y + 509),
        )
        for i, (text, color) in enumerate(
            (
                ("เข้าประตูแล้วพิมพ์คำ หรือกด F1 ช่วยเรียง", PRIMARY),
                ("ตอบไม่ทัน หางจะสั้นลง • ตัวอักษรยังอยู่", MUTED),
                ("อย่าให้หางสั้นเกินไปนะ", MUTED),
            )
        ):
            label(
                self.surface, text, self.font_small, (x + 24, y + 547 + i * 23), color
            )

    def draw_isekai_portal_vortex(self, portal: PortalInstance, world_time=None):
        top_left = portal.top_left
        rem_time = portal.get_remaining_time(world_time)

        px = GAME_AREA_OFFSET_X + top_left[0] * GRID_SIZE
        py = GAME_AREA_OFFSET_Y + top_left[1] * GRID_SIZE
        size = GRID_SIZE * 3

        center_x = px + size // 2
        center_y = py + size // 2

        portal_rect = pygame.Rect(px, py, size, size)

        primary_color = COLOR_PORTAL_GREEN
        secondary_color = (166, 227, 161)
        badge_text = f"{math.ceil(rem_time)}s"

        now = time.time()
        pulse = math.sin(now * 5) * 3

        pygame.draw.rect(self.surface, (20, 20, 32), portal_rect, border_radius=12)
        pygame.draw.rect(
            self.surface, primary_color, portal_rect, width=2, border_radius=12
        )

        r1 = max(10, int(size // 2 - 4 + pulse))
        r2 = max(6, int(size // 3 + pulse * 0.5))
        r3 = max(3, int(size // 6))

        pygame.draw.circle(
            self.surface, primary_color, (center_x, center_y), r1, width=2
        )
        pygame.draw.circle(
            self.surface, secondary_color, (center_x, center_y), r2, width=2
        )
        pygame.draw.circle(self.surface, (255, 255, 255), (center_x, center_y), r3)

        angle1 = now * 4
        angle2 = now * 4 + math.pi
        px1 = center_x + math.cos(angle1) * (r1 - 4)
        py1 = center_y + math.sin(angle1) * (r1 - 4)
        px2 = center_x + math.cos(angle2) * (r1 - 4)
        py2 = center_y + math.sin(angle2) * (r1 - 4)

        pygame.draw.circle(self.surface, (255, 255, 255), (int(px1), int(py1)), 3)
        pygame.draw.circle(self.surface, (255, 255, 255), (int(px2), int(py2)), 3)

        lbl_surf = self.font_portal_label.render(badge_text, True, (15, 15, 23))
        lbl_bg = pygame.Rect(0, 0, lbl_surf.get_width() + 10, lbl_surf.get_height() + 4)
        lbl_bg.center = (center_x, py + 12)

        pygame.draw.rect(self.surface, secondary_color, lbl_bg, border_radius=4)
        self.surface.blit(lbl_surf, lbl_surf.get_rect(center=lbl_bg.center))

    def draw_snake_food_and_portals_smooth(
        self,
        segments: List[Tuple[int, int]],
        prev_segments: List[Tuple[int, int]],
        last_move_time: float,
        move_interval: float,
        food_pos: Tuple[int, int],
        food_letter: str,
        portals: List[PortalInstance],
        body_letters: Optional[List[str]] = None,
        skin_name: str = "NEON MINT",
        world_time: Optional[float] = None,
    ):
        dt = time.time() - last_move_time
        t = max(0.0, min(1.0, dt / move_interval)) if move_interval > 0 else 1.0

        # Draw Food Tile
        fx = GAME_AREA_OFFSET_X + food_pos[0] * GRID_SIZE
        fy = GAME_AREA_OFFSET_Y + food_pos[1] * GRID_SIZE
        f_rect = pygame.Rect(fx + 2, fy + 2, GRID_SIZE - 4, GRID_SIZE - 4)

        pygame.draw.rect(self.surface, COLOR_FOOD_BG, f_rect, border_radius=6)
        pygame.draw.rect(
            self.surface, (255, 255, 255), f_rect, width=1, border_radius=6
        )
        letter_surf = self.font_tile.render(food_letter, True, COLOR_FOOD_TEXT)
        letter_rect = letter_surf.get_rect(center=f_rect.center)
        self.surface.blit(letter_surf, letter_rect)

        for portal in portals:
            self.draw_isekai_portal_vortex(portal, world_time)

        smooth_coords: List[Tuple[float, float]] = []
        for i, curr in enumerate(segments):
            prev = prev_segments[i] if i < len(prev_segments) else curr

            interp_x = prev[0] + (curr[0] - prev[0]) * t
            interp_y = prev[1] + (curr[1] - prev[1]) * t

            sx = GAME_AREA_OFFSET_X + interp_x * GRID_SIZE
            sy = GAME_AREA_OFFSET_Y + interp_y * GRID_SIZE
            smooth_coords.append((sx, sy))

        if not smooth_coords:
            return

        # Skin Palette Definitions (Head -> Tail)
        if skin_name == "CYBER PURPLE":
            head_c = (236, 72, 153)
            tail_c = (147, 51, 234)
        elif skin_name == "GOLDEN FIRE":
            head_c = (251, 191, 36)
            tail_c = (239, 68, 68)
        elif skin_name == "OCEAN BLUE":
            head_c = (56, 189, 248)
            tail_c = (30, 58, 138)
        else:  # NEON MINT
            head_c = (46, 230, 160)
            tail_c = (0, 180, 216)

        # 1. Draw Connecting Fluid Joints
        total_segs = max(1, len(smooth_coords))
        for i in range(len(smooth_coords) - 1):
            p1 = (
                smooth_coords[i][0] + GRID_SIZE / 2,
                smooth_coords[i][1] + GRID_SIZE / 2,
            )
            p2 = (
                smooth_coords[i + 1][0] + GRID_SIZE / 2,
                smooth_coords[i + 1][1] + GRID_SIZE / 2,
            )

            ratio = i / max(1, total_segs - 1)
            r = int(head_c[0] * (1 - ratio) + tail_c[0] * ratio)
            g = int(head_c[1] * (1 - ratio) + tail_c[1] * ratio)
            b = int(head_c[2] * (1 - ratio) + tail_c[2] * ratio)
            color = (r, g, b)

            pygame.draw.line(self.surface, color, p1, p2, width=GRID_SIZE - 4)

        # 2. Draw Segment Capsules
        for i, (sx, sy) in enumerate(smooth_coords):
            s_rect = pygame.Rect(int(sx) + 1, int(sy) + 1, GRID_SIZE - 2, GRID_SIZE - 2)
            ratio = i / max(1, total_segs - 1)

            r = int(head_c[0] * (1 - ratio) + tail_c[0] * ratio)
            g = int(head_c[1] * (1 - ratio) + tail_c[1] * ratio)
            b = int(head_c[2] * (1 - ratio) + tail_c[2] * ratio)
            base_color = (r, g, b)

            if i == 0:
                # HEAD
                pygame.draw.rect(self.surface, head_c, s_rect, border_radius=10)
                pygame.draw.rect(
                    self.surface, (255, 255, 255), s_rect, width=1, border_radius=10
                )

                dx, dy = 1, 0
                if len(smooth_coords) > 1:
                    dx = smooth_coords[0][0] - smooth_coords[1][0]
                    dy = smooth_coords[0][1] - smooth_coords[1][1]
                    if dx != 0:
                        dx = 1 if dx > 0 else -1
                    if dy != 0:
                        dy = 1 if dy > 0 else -1

                if dx == 1:
                    eye1 = (int(sx) + GRID_SIZE - 7, int(sy) + 8)
                    eye2 = (int(sx) + GRID_SIZE - 7, int(sy) + GRID_SIZE - 8)
                elif dx == -1:
                    eye1 = (int(sx) + 7, int(sy) + 8)
                    eye2 = (int(sx) + 7, int(sy) + GRID_SIZE - 8)
                elif dy == -1:
                    eye1 = (int(sx) + 8, int(sy) + 7)
                    eye2 = (int(sx) + GRID_SIZE - 8, int(sy) + 7)
                else:
                    eye1 = (int(sx) + 8, int(sy) + GRID_SIZE - 7)
                    eye2 = (int(sx) + GRID_SIZE - 8, int(sy) + GRID_SIZE - 7)

                pygame.draw.circle(self.surface, (255, 255, 255), eye1, 5)
                pygame.draw.circle(self.surface, (255, 255, 255), eye2, 5)
                pygame.draw.circle(self.surface, (15, 15, 23), eye1, 3)
                pygame.draw.circle(self.surface, (15, 15, 23), eye2, 3)
                pygame.draw.circle(
                    self.surface, (255, 255, 255), (eye1[0] + 1, eye1[1] - 1), 1
                )
                pygame.draw.circle(
                    self.surface, (255, 255, 255), (eye2[0] + 1, eye2[1] - 1), 1
                )

            else:
                pygame.draw.rect(self.surface, base_color, s_rect, border_radius=7)
                gloss_line_y = int(sy) + 3
                pygame.draw.line(
                    self.surface,
                    (255, 255, 255),
                    (int(sx) + 4, gloss_line_y),
                    (int(sx) + GRID_SIZE - 5, gloss_line_y),
                    width=1,
                )

    def draw_interactive_tutorial_banner(
        self, step_index, title, instruction_th, instruction_en, mouse_pos=(0, 0)
    ):
        # Dedicated side-panel area: no text distortion or board occlusion.
        x, y, w = FOOTER_BAR_X, FOOTER_BAR_Y + 498, FOOTER_BAR_WIDTH
        panel(self.surface, pygame.Rect(x, y, w, 126), PANEL, (209, 182, 95))
        label(
            self.surface,
            f"บทเรียน {step_index + 1}/5",
            self.font_small,
            (x + 16, y + 6),
            (248, 216, 121),
        )
        render_wrapped_text(
            self.surface,
            instruction_th,
            self.font_thai_small,
            TEXT,
            x + 16,
            y + 31,
            w - 32,
            1,
        )
        pygame.draw.rect(self.surface, COLOR_BG, (0, 744, 780, 56))
        label(
            self.surface,
            "WASD / ลูกศร เลี้ยว • P พักเกม",
            self.font_small,
            (32, 761),
            MUTED,
        )
        self.tut_btn_exit = pygame.Rect(596, 744, 164, 48)
        button(
            self.surface,
            self.tut_btn_exit,
            "ออกจากบทเรียน",
            self.font_small,
            mouse_pos=mouse_pos,
        )
        self.tut_btn_start_game = pygame.Rect(0, 0, 0, 0)
        if step_index == 4:
            self.tut_btn_start_game = pygame.Rect(412, 744, 172, 48)
            button(
                self.surface,
                self.tut_btn_start_game,
                "เริ่มเกม",
                self.font_header,
                True,
                mouse_pos,
            )

    def overlay(self, width=720, height=570):
        shade = pygame.Surface(self.surface.get_size(), pygame.SRCALPHA)
        shade.fill((5, 10, 18, 220))
        self.surface.blit(shade, (0, 0))
        rect = pygame.Rect(
            (WINDOW_WIDTH - width) // 2, (WINDOW_HEIGHT - height) // 2, width, height
        )
        panel(self.surface, rect)
        return rect

    def draw_result_popup(
        self,
        is_win,
        word="",
        level="",
        meaning_th="",
        score_earned=0,
        penalty_info="",
        retry_tutorial=False,
    ):
        rect = self.overlay(height=470 if is_win else 570)
        color = PRIMARY if is_win or retry_tutorial else DANGER
        label(
            self.surface,
            "ถูกต้อง!" if is_win else "ลองอีกครั้ง" if retry_tutorial else "หมดเวลา",
            self.font_modal_title,
            (rect.x + 32, rect.y + 24),
            color,
        )
        if is_win:
            label(
                self.surface,
                word,
                self.font_logo,
                (rect.x + 32, rect.y + 84),
                TEXT,
                max_width=rect.width - 64,
            )
            text = f"ระดับ {level}   •   +{score_earned:,} คะแนน\n\nคำแปลไทย\n{meaning_th or 'ยังไม่มีคำแปลไทย'}"
        elif retry_tutorial:
            text = (
                "หมดเวลาแล้ว แต่บทเรียนนี้ไม่หักหางหรือตัวอักษร\n\n"
                "กดลองอีกครั้งเพื่อเริ่มใหม่ด้วยเวลา 45 วินาที\n"
                "ลองพิมพ์ SNAKE แล้วกด Enter หรือใช้ F1 ช่วยเรียงคำ"
            )
        else:
            text = f"{penalty_info}\n\nตัวอักษรสะสมยังอยู่ครบ\nเก็บตัวอักษรเพิ่มแล้วลองใหม่ได้เลย"
        self.result_text_rect = pygame.Rect(
            rect.x + 32, rect.y + 150, rect.width - 64, rect.height - 268
        )
        self.result_scroll_max = scroll_text(
            self.surface,
            text,
            self.font_body,
            self.result_text_rect,
            self.result_scroll,
        )
        label(
            self.surface,
            "เลื่อนเมาส์เพื่ออ่านข้อความเพิ่มเติม"
            if self.result_scroll_max
            else "พร้อมแล้วกด Enter หรือ Space เพื่อเล่นต่อ",
            self.font_small,
            (rect.x + 32, rect.bottom - 108),
            MUTED,
        )
        self.result_btn_continue = pygame.Rect(
            rect.x + 32, rect.bottom - 76, rect.width - 64, 48
        )
        button(
            self.surface,
            self.result_btn_continue,
            "ลองอีกครั้ง  [Enter]" if retry_tutorial else "เล่นต่อ  [Enter]",
            self.font_header,
            True,
            self.mouse_pos,
        )

    def draw_tutorial_help(self, step, instruction):
        rect = self.overlay(720, 450)
        titles = (
            "บังคับงูให้กินตัวอักษร",
            "สะสมตัวอักษรให้ครบคำ",
            "เข้าประตูสีเขียว",
            "เรียงคำเพื่อรับคะแนน",
            "พร้อมเล่นแล้ว!",
        )
        label(
            self.surface,
            f"บทเรียน {step + 1} / 5",
            self.font_header,
            (rect.x + 32, rect.y + 24),
            PRIMARY,
        )
        for index in range(5):
            pygame.draw.rect(
                self.surface,
                PRIMARY if index <= step else BORDER,
                (rect.x + 32 + index * 62, rect.y + 62, 50, 5),
                border_radius=2,
            )
        self.tutorial_close_rect = pygame.Rect(rect.right - 76, rect.y + 16, 48, 48)
        button(
            self.surface,
            self.tutorial_close_rect,
            "",
            self.font_body,
            mouse_pos=self.mouse_pos,
        )
        cx, cy = self.tutorial_close_rect.center
        pygame.draw.line(self.surface, TEXT, (cx - 8, cy - 8), (cx + 8, cy + 8), 3)
        pygame.draw.line(self.surface, TEXT, (cx - 8, cy + 8), (cx + 8, cy - 8), 3)
        label(
            self.surface,
            titles[step],
            self.font_modal_title,
            (rect.x + 32, rect.y + 90),
        )
        render_wrapped_text(
            self.surface,
            instruction,
            self.font_body,
            TEXT,
            rect.x + 32,
            rect.y + 154,
            rect.width - 64,
            8,
        )
        label(
            self.surface,
            "เกมหยุดรอให้อ่าน • กด × หรือ Enter เมื่อพร้อม",
            self.font_small,
            (rect.x + 32, rect.bottom - 118),
            MUTED,
        )
        self.tutorial_continue_rect = pygame.Rect(
            rect.x + 32, rect.bottom - 80, rect.width - 64, 48
        )
        button(
            self.surface,
            self.tutorial_continue_rect,
            "เข้าใจแล้ว ไปต่อ  [Enter]",
            self.font_header,
            True,
            self.mouse_pos,
        )

    def draw_direction_arrow(self, center, direction, size=18):
        dx, dy = direction
        cx, cy = center
        tip = (cx + dx * size, cy + dy * size)
        tail = (cx - dx * size, cy - dy * size)
        base = (cx + dx * (size - 10), cy + dy * (size - 10))
        pygame.draw.line(self.surface, PRIMARY, tail, base, 5)
        pygame.draw.polygon(
            self.surface,
            PRIMARY,
            (
                tip,
                (base[0] - dy * 9, base[1] + dx * 9),
                (base[0] + dy * 9, base[1] - dx * 9),
            ),
        )

    def draw_countdown_overlay(self, seconds_left, snake=None):
        rect = pygame.Rect(330, 20, 720, 80)
        panel(self.surface, rect)
        label(
            self.surface,
            f"{seconds_left}",
            self.font_logo,
            (rect.x + 28, rect.y + 10),
            PRIMARY,
        )
        label(
            self.surface,
            "เตรียมตัว! เลือกทิศทางด้วย WASD / ลูกศร",
            self.font_header,
            (rect.x + 90, rect.y + 12),
        )
        label(
            self.surface,
            (
                f"ทิศทาง: { {(1, 0): 'ขวา', (-1, 0): 'ซ้าย', (0, -1): 'ขึ้น', (0, 1): 'ลง'}[snake.next_direction] } • ห้ามกลับหลังเข้าลำตัว"
                if snake
                else "เกมจะเริ่มเมื่อการนับถอยหลังจบ"
            ),
            self.font_small,
            (rect.x + 90, rect.y + 47),
            MUTED,
        )
        if snake:
            hx, hy = snake.segments[0]
            r = pygame.Rect(
                GAME_AREA_OFFSET_X + hx * GRID_SIZE,
                GAME_AREA_OFFSET_Y + hy * GRID_SIZE,
                GRID_SIZE,
                GRID_SIZE,
            )
            pygame.draw.rect(self.surface, PRIMARY, r.inflate(6, 6), 2, border_radius=5)
            self.draw_direction_arrow(
                (rect.right - 44, rect.centery), snake.next_direction
            )
            center = (
                max(
                    GAME_AREA_OFFSET_X + 25,
                    min(GAME_AREA_OFFSET_X + GAME_AREA_WIDTH - 25, r.centerx),
                ),
                max(
                    GAME_AREA_OFFSET_Y + 25,
                    min(GAME_AREA_OFFSET_Y + GAME_AREA_HEIGHT - 25, r.centery),
                ),
            )
            pygame.draw.circle(self.surface, PANEL, center, 24)
            pygame.draw.circle(self.surface, PRIMARY, center, 24, 2)
            self.draw_direction_arrow(center, snake.next_direction, 15)

    def draw_game_over(self, score, reason, tutorial=False):
        rect = self.overlay(720, 460)
        label(
            self.surface,
            "จบเกม",
            self.font_modal_title,
            (rect.x + 32, rect.y + 26),
            DANGER,
        )
        scroll_text(
            self.surface,
            reason,
            self.font_body,
            pygame.Rect(rect.x + 32, rect.y + 92, rect.width - 64, 96),
            color=MUTED,
        )
        label(
            self.surface,
            f"{score:,} คะแนน",
            self.font_logo,
            (rect.x + 32, rect.y + 209),
            PRIMARY,
        )
        self.gameover_restart = pygame.Rect(rect.x + 32, rect.bottom - 90, 312, 52)
        self.gameover_menu = pygame.Rect(rect.x + 360, rect.bottom - 90, 328, 52)
        if tutorial:
            label(
                self.surface,
                "จบบทเรียนแล้ว เลือกกลับเมนูเพื่อเริ่มเกม",
                self.font_body,
                (rect.x + 32, rect.y + 282),
                MUTED,
            )
        else:
            button(
                self.surface,
                self.gameover_restart,
                "เล่นอีกครั้ง  [R / Space]",
                self.font_header,
                True,
                self.mouse_pos,
            )
        button(
            self.surface,
            self.gameover_menu,
            "กลับเมนู  [Esc]",
            self.font_header,
            mouse_pos=self.mouse_pos,
        )


class WordSolvingModalUI:
    PAGE_SIZE = 36

    def __init__(self, surface):
        self.surface = surface
        self.font_title = load_ui_font(24, True)
        self.font_body = load_ui_font(18)
        self.font_tile = load_ui_font(22, True)
        self.font_small = load_ui_font(14)
        self.font_badge = load_ui_font(14, True)
        self.font_thai_body = self.font_body
        self.font_thai_small = self.font_small
        self.modal_w = 840
        self.mouse_pos = (-1, -1)
        self.reset([])
        for name in (
            "btn_submit_rect",
            "btn_clear_rect",
            "btn_shuffle_rect",
            "btn_hint_rect",
            "btn_prev_rect",
            "btn_next_rect",
            "btn_pause_rect",
            "status_rect",
        ):
            setattr(self, name, pygame.Rect(0, 0, 0, 0))
        self.tile_rects = []
        self.visible_indices = []

    def reset(self, inventory, allowed_levels=None, score_multiplier=1.0):
        self.inventory = list(inventory)
        self.selected_indices = []
        self.formed_word = ""
        self.allowed_levels = allowed_levels or ["A1", "A2", "B1", "B2", "C1", "C2"]
        self.score_multiplier = score_multiplier
        self.page = 0
        self.status_scroll = 0
        self.status_scroll_max = 0
        self.status_message = "พิมพ์ A–Z หรือคลิกตัวอักษร แล้วกด Enter เพื่อส่งคำตอบ"
        self.status_is_error = False
        self.status_cefr = self.status_meaning_en = self.status_meaning_th = (
            self.hinted_word
        ) = None

    def turn_page(self, delta):
        self.page = max(
            0,
            min(max(0, (len(self.inventory) - 1) // self.PAGE_SIZE), self.page + delta),
        )

    def auto_select_word(self, word):
        self.selected_indices = []
        for char in word.upper():
            for idx, item in enumerate(self.inventory):
                if item == char and idx not in self.selected_indices:
                    self.selected_indices.append(idx)
                    break
        self.rebuild_formed_word()

    def handle_keyboard_char(self, char):
        for idx, item in enumerate(self.inventory):
            if idx not in self.selected_indices and item == char.upper():
                self.selected_indices.append(idx)
                self.page = idx // self.PAGE_SIZE
                self.rebuild_formed_word()
                return

    def handle_backspace(self):
        if self.selected_indices:
            self.selected_indices.pop()
            self.rebuild_formed_word()

    def handle_clear(self):
        self.selected_indices = []
        self.hinted_word = None
        self.rebuild_formed_word()

    def shuffle(self):
        import random

        random.shuffle(self.inventory)
        self.page = 0
        self.handle_clear()

    def toggle_tile_select(self, index):
        if not 0 <= index < len(self.inventory):
            return
        if index in self.selected_indices:
            self.selected_indices.remove(index)
        else:
            self.selected_indices.append(index)
        self.rebuild_formed_word()

    def rebuild_formed_word(self):
        self.formed_word = "".join(self.inventory[i] for i in self.selected_indices)
        self.status_message = ""
        self.status_meaning_th = None
        self.status_is_error = False
        self.status_scroll = 0

    def draw(self, remaining_time, max_time=CHALLENGE_TIME_LIMIT):
        shade = pygame.Surface(self.surface.get_size(), pygame.SRCALPHA)
        shade.fill((5, 10, 18, 225))
        self.surface.blit(shade, (0, 0))
        rect = pygame.Rect((WINDOW_WIDTH - self.modal_w) // 2, 48, self.modal_w, 704)
        panel(self.surface, rect)
        x, y = rect.x + 32, rect.y + 22
        label(self.surface, "เรียงคำ รับคะแนน", self.font_title, (x, y))
        label(
            self.surface,
            f"คำศัพท์ระดับ {'–'.join((self.allowed_levels[0], self.allowed_levels[-1])) if len(self.allowed_levels) > 1 else self.allowed_levels[0]}",
            self.font_small,
            (x, y + 39),
            MUTED,
        )
        ratio = min(1, max(0, remaining_time / max(1, max_time)))
        color = PRIMARY if ratio > 0.25 else DANGER
        label(
            self.surface,
            f"{math.ceil(remaining_time)} วินาที",
            self.font_title,
            (rect.right - 150, y),
            color,
        )
        pygame.draw.rect(
            self.surface, BORDER, (x, y + 74, rect.width - 64, 8), border_radius=4
        )
        if ratio:
            pygame.draw.rect(
                self.surface,
                color,
                (x, y + 74, int((rect.width - 64) * ratio), 8),
                border_radius=4,
            )
        slot = pygame.Rect(x, y + 102, rect.width - 64, 64)
        panel(self.surface, slot, (12, 20, 30), PRIMARY if self.formed_word else BORDER)
        # Tail stays visible when a long typed word exceeds the input width.
        text = self.formed_word
        while len(text) > 1 and self.font_title.size(text)[0] > slot.width - 48:
            text = text[1:]
        label(
            self.surface,
            text if text == self.formed_word else "…" + text,
            self.font_title,
            slot.center,
            TEXT,
            True,
        )
        if not self.formed_word:
            label(
                self.surface,
                "พิมพ์คำภาษาอังกฤษ หรือเลือกตัวอักษรด้านล่าง",
                self.font_body,
                slot.center,
                MUTED,
                True,
            )
        label(
            self.surface,
            f"ตัวอักษรสะสม {len(self.inventory)} ตัว",
            self.font_small,
            (x, y + 183),
            MUTED,
        )
        self.page = min(self.page, max(0, (len(self.inventory) - 1) // self.PAGE_SIZE))
        start = self.page * self.PAGE_SIZE
        self.visible_indices = list(
            range(start, min(len(self.inventory), start + self.PAGE_SIZE))
        )
        self.tile_rects = []
        for local, index in enumerate(self.visible_indices):
            tile = pygame.Rect(x + local % 12 * 64, y + 212 + local // 12 * 54, 56, 46)
            self.tile_rects.append(tile)
            chosen = index in self.selected_indices
            panel(
                self.surface,
                tile,
                (29, 65, 56) if chosen else (48, 48, 32),
                PRIMARY if chosen else (112, 103, 55),
            )
            label(
                self.surface,
                self.inventory[index],
                self.font_tile,
                tile.center,
                PRIMARY if chosen else (248, 216, 121),
                True,
            )
            if chosen:
                pygame.draw.line(
                    self.surface,
                    PRIMARY,
                    (tile.left + 10, tile.bottom - 5),
                    (tile.right - 10, tile.bottom - 5),
                    2,
                )
        if not self.inventory:
            label(
                self.surface,
                "ยังไม่มีตัวอักษรสำหรับสร้างคำ",
                self.font_body,
                (x, y + 258),
                MUTED,
            )
        py = y + 378
        self.btn_prev_rect = pygame.Rect(x, py, 48, 44)
        self.btn_next_rect = pygame.Rect(rect.right - 80, py, 48, 44)
        button(
            self.surface,
            self.btn_prev_rect,
            "<",
            self.font_body,
            mouse_pos=self.mouse_pos,
            enabled=self.page > 0,
        )
        button(
            self.surface,
            self.btn_next_rect,
            ">",
            self.font_body,
            mouse_pos=self.mouse_pos,
            enabled=start + self.PAGE_SIZE < len(self.inventory),
        )
        label(
            self.surface,
            f"หน้า {self.page + 1} / {max(1, math.ceil(len(self.inventory) / self.PAGE_SIZE))}  •  Page Up / Down",
            self.font_small,
            (rect.centerx, py + 22),
            MUTED,
            True,
        )
        self.btn_pause_rect = pygame.Rect(rect.right - 212, py, 120, 44)
        button(
            self.surface,
            self.btn_pause_rect,
            "พัก [F3]",
            self.font_body,
            mouse_pos=self.mouse_pos,
        )
        self.status_rect = pygame.Rect(x, y + 434, rect.width - 64, 110)
        self.status_scroll_max = scroll_text(
            self.surface,
            self.status_message or "Backspace ลบตัวท้าย • Esc ล้างคำ • F1 ช่วยเรียงคำ",
            self.font_body,
            self.status_rect,
            self.status_scroll,
            DANGER if self.status_is_error else MUTED,
        )
        if self.status_scroll_max:
            label(
                self.surface,
                "เลื่อนเมาส์บนข้อความเพื่ออ่านต่อ",
                self.font_small,
                (x, y + 558),
                MUTED,
            )
        by = rect.bottom - 80
        self.btn_clear_rect = pygame.Rect(x, by, 162, 48)
        self.btn_shuffle_rect = pygame.Rect(x + 174, by, 162, 48)
        self.btn_hint_rect = pygame.Rect(x + 348, by, 178, 48)
        self.btn_submit_rect = pygame.Rect(x + 538, by, 238, 48)
        for b, text in (
            (self.btn_clear_rect, "ล้างคำ [Esc]"),
            (self.btn_shuffle_rect, "สลับตัวอักษร"),
            (self.btn_hint_rect, "ช่วยเรียงคำ [F1]"),
        ):
            button(self.surface, b, text, self.font_body, mouse_pos=self.mouse_pos)
        button(
            self.surface,
            self.btn_submit_rect,
            "ส่งคำตอบ [Enter]",
            self.font_body,
            True,
            self.mouse_pos,
            bool(self.formed_word),
        )
