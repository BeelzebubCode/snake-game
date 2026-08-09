"""
UI Rendering Engine with Crisp Thai Font Hint & Auto-Wrapping Tutorial Banner (0% Text Cutoff)
"""

import os
import pygame
import math
import time
from typing import List, Tuple, Optional, Set
from src.config import (
    WINDOW_WIDTH, WINDOW_HEIGHT,
    GAME_AREA_OFFSET_X, GAME_AREA_OFFSET_Y,
    GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GRID_SIZE,
    FOOTER_BAR_X, FOOTER_BAR_Y, FOOTER_BAR_WIDTH, FOOTER_BAR_HEIGHT,
    COLOR_BG, COLOR_PANEL_BG, COLOR_GRID_BG, COLOR_GRID_LINE,
    COLOR_SNAKE_HEAD, COLOR_SNAKE_BODY, COLOR_SNAKE_TEXT,
    COLOR_FOOD_BG, COLOR_FOOD_TEXT,
    COLOR_TEXT_WHITE, COLOR_TEXT_MUTED, COLOR_ACCENT, COLOR_ACCENT_HOVER,
    COLOR_MODAL_BG, COLOR_MODAL_BORDER, COLOR_CEFR,
    COLOR_PORTAL_GREEN, COLOR_PORTAL_YELLOW, COLOR_PORTAL_RED,
    CHALLENGE_TIME_LIMIT
)
from src.portal import PortalInstance

THAI_FONT_PATHS = [
    "/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf",
    "/usr/share/fonts/truetype/tlwg/Waree-Bold.ttf",
    "/usr/share/fonts/truetype/tlwg/Loma-Bold.ttf",
    "/usr/share/fonts/truetype/tlwg/Umpush-Bold.ttf",
    "/usr/share/fonts/truetype/tlwg/Garuda.ttf",
    "/usr/share/fonts/truetype/tlwg/Waree.ttf"
]

def load_english_font(size: int, bold: bool = True) -> pygame.font.Font:
    sys_fonts = ("dejavusans", "liberationsans", "arial", "sans", None)
    return pygame.font.SysFont(sys_fonts, size, bold=bold)

def load_thai_font(size: int, bold: bool = True) -> pygame.font.Font:
    for path in THAI_FONT_PATHS:
        if os.path.exists(path):
            try:
                return pygame.font.Font(path, size)
            except Exception:
                pass
    sys_fonts = ("garuda", "waree", "loma", "umpush", "notosansthai", "dejavusans", "arial", "sans", None)
    return pygame.font.SysFont(sys_fonts, size, bold=bold)

def render_wrapped_text(
    surface: pygame.Surface,
    text: str,
    font: pygame.font.Font,
    color: Tuple[int, int, int],
    x: int,
    y: int,
    max_width: int,
    line_spacing: int = 4
) -> int:
    words = text.split(' ')
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        if font.size(test_line)[0] <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))

    curr_y = y
    for line in lines:
        surf = font.render(line, True, color)
        surface.blit(surf, (x, curr_y))
        curr_y += surf.get_height() + line_spacing

    return curr_y

class UIRenderer:
    def __init__(self, surface: pygame.Surface):
        self.surface = surface
        
        self.font_logo = load_english_font(34, bold=True)
        self.font_title = load_english_font(22, bold=True)
        self.font_header = load_english_font(16, bold=True)
        self.font_menu = load_english_font(18, bold=True)
        self.font_body = load_english_font(14, bold=True)
        self.font_small = load_english_font(12, bold=False)
        self.font_tile = load_english_font(16, bold=True)
        self.font_badge = load_english_font(11, bold=True)
        self.font_portal_label = load_english_font(11, bold=True)
        self.font_modal_title = load_english_font(24, bold=True)

        self.font_thai_body = load_thai_font(14, bold=True)
        self.font_thai_small = load_thai_font(12, bold=False)

        self.pause_btn_resume = pygame.Rect(0, 0, 0, 0)
        self.pause_btn_restart = pygame.Rect(0, 0, 0, 0)
        self.pause_btn_quit = pygame.Rect(0, 0, 0, 0)
        self.header_pause_btn_rect = pygame.Rect(0, 0, 0, 0)

        # 4 Main Menu Buttons
        self.menu_btn_play = pygame.Rect(0, 0, 0, 0)
        self.menu_btn_tutorial = pygame.Rect(0, 0, 0, 0)
        self.menu_btn_options = pygame.Rect(0, 0, 0, 0)
        self.menu_btn_exit = pygame.Rect(0, 0, 0, 0)

        self.opt_btn_speed = pygame.Rect(0, 0, 0, 0)
        self.opt_btn_timer = pygame.Rect(0, 0, 0, 0)
        self.opt_btn_sound = pygame.Rect(0, 0, 0, 0)
        self.opt_btn_back = pygame.Rect(0, 0, 0, 0)

        # Tutorial Banner Controls
        self.tut_btn_exit = pygame.Rect(0, 0, 0, 0)
        self.tut_btn_start_game = pygame.Rect(0, 0, 0, 0)

        self.result_btn_continue = pygame.Rect(0, 0, 0, 0)

        self.footbar_scroll_prev_rect = pygame.Rect(0, 0, 0, 0)
        self.footbar_scroll_next_rect = pygame.Rect(0, 0, 0, 0)

    def draw_background(self, show_grid: bool = True):
        self.surface.fill(COLOR_BG)

        rect_game = pygame.Rect(
            GAME_AREA_OFFSET_X, GAME_AREA_OFFSET_Y,
            GAME_AREA_WIDTH, GAME_AREA_HEIGHT
        )
        pygame.draw.rect(self.surface, COLOR_GRID_BG, rect_game, border_radius=10)
        pygame.draw.rect(self.surface, (35, 35, 52), rect_game, width=2, border_radius=10)

        if show_grid:
            for x in range(GAME_AREA_OFFSET_X + GRID_SIZE, GAME_AREA_OFFSET_X + GAME_AREA_WIDTH, GRID_SIZE):
                pygame.draw.line(self.surface, COLOR_GRID_LINE, (x, GAME_AREA_OFFSET_Y), (x, GAME_AREA_OFFSET_Y + GAME_AREA_HEIGHT))
            for y in range(GAME_AREA_OFFSET_Y + GRID_SIZE, GAME_AREA_OFFSET_Y + GAME_AREA_HEIGHT, GRID_SIZE):
                pygame.draw.line(self.surface, COLOR_GRID_LINE, (GAME_AREA_OFFSET_X, y), (GAME_AREA_OFFSET_X + GAME_AREA_WIDTH, y))

        rect_footer = pygame.Rect(
            FOOTER_BAR_X, FOOTER_BAR_Y,
            FOOTER_BAR_WIDTH, FOOTER_BAR_HEIGHT
        )
        pygame.draw.rect(self.surface, COLOR_PANEL_BG, rect_footer, border_radius=10)
        pygame.draw.rect(self.surface, (35, 35, 52), rect_footer, width=2, border_radius=10)

    def draw_hud(
        self,
        score: int,
        high_score: int,
        snake_len: int,
        active_portals_count: int,
        next_portal_timer: float,
        inventory: List[str],
        scroll_offset: int = 0
    ):
        top_y = 20
        
        logo_rect = pygame.Rect(GAME_AREA_OFFSET_X, top_y - 4, 150, 32)
        pygame.draw.rect(self.surface, (28, 40, 65), logo_rect, border_radius=6)
        pygame.draw.rect(self.surface, COLOR_ACCENT, logo_rect, width=1, border_radius=6)
        
        title_surf = self.font_title.render("LEXISNAKE", True, COLOR_ACCENT)
        self.surface.blit(title_surf, title_surf.get_rect(center=logo_rect.center))

        self.header_pause_btn_rect = pygame.Rect(GAME_AREA_OFFSET_X + 160, top_y - 4, 85, 32)
        pygame.draw.rect(self.surface, (35, 35, 52), self.header_pause_btn_rect, border_radius=6)
        pygame.draw.rect(self.surface, COLOR_TEXT_MUTED, self.header_pause_btn_rect, width=1, border_radius=6)
        p_txt = self.font_header.render("PAUSE [P]", True, COLOR_TEXT_WHITE)
        self.surface.blit(p_txt, p_txt.get_rect(center=self.header_pause_btn_rect.center))

        metrics_x = GAME_AREA_OFFSET_X + GAME_AREA_WIDTH
        
        len_surf = self.font_header.render(f"LEN: {snake_len}", True, COLOR_SNAKE_HEAD)
        len_rect = len_surf.get_rect(topright=(metrics_x, top_y + 2))
        self.surface.blit(len_surf, len_rect)

        hs_surf = self.font_header.render(f"HIGH: {high_score:,}", True, COLOR_ACCENT)
        hs_rect = hs_surf.get_rect(topright=(len_rect.left - 20, top_y + 2))
        self.surface.blit(hs_surf, hs_rect)

        sc_surf = self.font_header.render(f"SCORE: {score:,}", True, COLOR_TEXT_WHITE)
        sc_rect = sc_surf.get_rect(topright=(hs_rect.left - 20, top_y + 2))
        self.surface.blit(sc_surf, sc_rect)

        footer_inner_x = FOOTER_BAR_X + 15
        footer_inner_y = FOOTER_BAR_Y + 10

        pool_label = self.font_small.render(f"COLLECTED LETTERS ({len(inventory)} total):", True, COLOR_TEXT_MUTED)
        self.surface.blit(pool_label, (footer_inner_x, footer_inner_y))

        bar_w = 210
        bar_h = 14
        bar_x = FOOTER_BAR_X + FOOTER_BAR_WIDTH - bar_w - 15
        bar_y = footer_inner_y + 2

        lbl_str = f"PORTALS: {active_portals_count} ACTIVE  |  NEXT IN ({int(next_portal_timer)}s)"
        lbl_col = (46, 204, 113) if active_portals_count > 0 else COLOR_TEXT_MUTED
        progress = max(0.0, 1.0 - (next_portal_timer / 30.0))

        prog_label = self.font_small.render(lbl_str, True, lbl_col)
        prog_rect = prog_label.get_rect(bottomright=(bar_x + bar_w, bar_y - 2))
        self.surface.blit(prog_label, prog_rect)

        pygame.draw.rect(self.surface, (35, 35, 52), (bar_x, bar_y, bar_w, bar_h), border_radius=7)
        if progress > 0:
            pygame.draw.rect(self.surface, COLOR_ACCENT, (bar_x, bar_y, int(bar_w * progress), bar_h), border_radius=7)
        pygame.draw.rect(self.surface, (50, 50, 75), (bar_x, bar_y, bar_w, bar_h), width=1, border_radius=7)

        tile_size = 28
        gap = 5
        cols_per_row = 14
        max_visible_tiles = cols_per_row * 2
        
        visible_inventory = inventory[scroll_offset : scroll_offset + max_visible_tiles]

        tiles_start_y = footer_inner_y + 20
        for i, char in enumerate(visible_inventory):
            row = i // cols_per_row
            col = i % cols_per_row
            
            tx = footer_inner_x + col * (tile_size + gap)
            ty = tiles_start_y + row * (tile_size + gap)
            t_rect = pygame.Rect(tx, ty, tile_size, tile_size)
            
            pygame.draw.rect(self.surface, COLOR_FOOD_BG, t_rect, border_radius=5)
            pygame.draw.rect(self.surface, (255, 255, 255), t_rect, width=1, border_radius=5)
            
            char_surf = self.font_tile.render(char, True, COLOR_FOOD_TEXT)
            char_rect = char_surf.get_rect(center=t_rect.center)
            self.surface.blit(char_surf, char_rect)

        if len(inventory) > max_visible_tiles:
            ctrl_y = footer_inner_y - 2
            ctrl_x = footer_inner_x + 215
            
            self.footbar_scroll_prev_rect = pygame.Rect(ctrl_x, ctrl_y, 24, 18)
            pygame.draw.rect(self.surface, (45, 45, 65), self.footbar_scroll_prev_rect, border_radius=4)
            p_txt = self.font_small.render("<", True, COLOR_TEXT_WHITE)
            self.surface.blit(p_txt, p_txt.get_rect(center=self.footbar_scroll_prev_rect.center))

            page_str = f"{scroll_offset + 1}-{min(len(inventory), scroll_offset + max_visible_tiles)} / {len(inventory)}"
            pg_txt = self.font_small.render(page_str, True, COLOR_ACCENT)
            self.surface.blit(pg_txt, (ctrl_x + 30, ctrl_y + 1))

            self.footbar_scroll_next_rect = pygame.Rect(ctrl_x + 115, ctrl_y, 24, 18)
            pygame.draw.rect(self.surface, (45, 45, 65), self.footbar_scroll_next_rect, border_radius=4)
            n_txt = self.font_small.render(">", True, COLOR_TEXT_WHITE)
            self.surface.blit(n_txt, n_txt.get_rect(center=self.footbar_scroll_next_rect.center))

    def draw_isekai_portal_vortex(
        self,
        portal: PortalInstance
    ):
        top_left = portal.top_left
        portal_tier = portal.tier
        rem_time = portal.get_remaining_time()

        px = GAME_AREA_OFFSET_X + top_left[0] * GRID_SIZE
        py = GAME_AREA_OFFSET_Y + top_left[1] * GRID_SIZE
        size = GRID_SIZE * 3
        
        center_x = px + size // 2
        center_y = py + size // 2

        portal_rect = pygame.Rect(px, py, size, size)

        primary_color = (
            COLOR_PORTAL_GREEN if portal_tier == "GREEN" else
            COLOR_PORTAL_YELLOW if portal_tier == "YELLOW" else
            COLOR_PORTAL_RED
        )
        secondary_color = (
            (166, 227, 161) if portal_tier == "GREEN" else
            (254, 235, 120) if portal_tier == "YELLOW" else
            (255, 120, 120)
        )
        badge_text = f"{portal_tier} ({int(rem_time)}s)"

        now = time.time()
        pulse = math.sin(now * 5) * 3

        pygame.draw.rect(self.surface, (20, 20, 32), portal_rect, border_radius=12)
        pygame.draw.rect(self.surface, primary_color, portal_rect, width=2, border_radius=12)

        r1 = max(10, int(size // 2 - 4 + pulse))
        r2 = max(6, int(size // 3 + pulse * 0.5))
        r3 = max(3, int(size // 6))

        pygame.draw.circle(self.surface, primary_color, (center_x, center_y), r1, width=2)
        pygame.draw.circle(self.surface, secondary_color, (center_x, center_y), r2, width=2)
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
        skin_name: str = "NEON MINT"
    ):
        dt = time.time() - last_move_time
        t = max(0.0, min(1.0, dt / move_interval)) if move_interval > 0 else 1.0

        # Draw Food Tile
        fx = GAME_AREA_OFFSET_X + food_pos[0] * GRID_SIZE
        fy = GAME_AREA_OFFSET_Y + food_pos[1] * GRID_SIZE
        f_rect = pygame.Rect(fx + 2, fy + 2, GRID_SIZE - 4, GRID_SIZE - 4)
        
        pygame.draw.rect(self.surface, COLOR_FOOD_BG, f_rect, border_radius=6)
        pygame.draw.rect(self.surface, (255, 255, 255), f_rect, width=1, border_radius=6)
        letter_surf = self.font_tile.render(food_letter, True, COLOR_FOOD_TEXT)
        letter_rect = letter_surf.get_rect(center=f_rect.center)
        self.surface.blit(letter_surf, letter_rect)

        for portal in portals:
            self.draw_isekai_portal_vortex(portal)

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
        else: # NEON MINT
            head_c = (46, 230, 160)
            tail_c = (0, 180, 216)

        # 1. Draw Connecting Fluid Joints
        total_segs = max(1, len(smooth_coords))
        for i in range(len(smooth_coords) - 1):
            p1 = (smooth_coords[i][0] + GRID_SIZE / 2, smooth_coords[i][1] + GRID_SIZE / 2)
            p2 = (smooth_coords[i + 1][0] + GRID_SIZE / 2, smooth_coords[i + 1][1] + GRID_SIZE / 2)
            
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
                pygame.draw.rect(self.surface, (255, 255, 255), s_rect, width=1, border_radius=10)

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
                pygame.draw.circle(self.surface, (255, 255, 255), (eye1[0] + 1, eye1[1] - 1), 1)
                pygame.draw.circle(self.surface, (255, 255, 255), (eye2[0] + 1, eye2[1] - 1), 1)

            else:
                pygame.draw.rect(self.surface, base_color, s_rect, border_radius=7)
                gloss_line_y = int(sy) + 3
                pygame.draw.line(
                    self.surface,
                    (255, 255, 255),
                    (int(sx) + 4, gloss_line_y),
                    (int(sx) + GRID_SIZE - 5, gloss_line_y),
                    width=1
                )

    def draw_interactive_tutorial_banner(
        self,
        step_index: int,
        title: str,
        instruction_th: str,
        instruction_en: str,
        mouse_pos: Tuple[int, int] = (0, 0)
    ):
        """Renders tutorial banner at top header bar (0% Text Cutoff - Full Width!)."""
        banner_w = GAME_AREA_WIDTH
        banner_h = 48
        banner_x = GAME_AREA_OFFSET_X
        banner_y = 10

        banner_rect = pygame.Rect(banner_x, banner_y, banner_w, banner_h)
        pygame.draw.rect(self.surface, (20, 20, 34), banner_rect, border_radius=8)
        pygame.draw.rect(self.surface, (241, 196, 15), banner_rect, width=2, border_radius=8)

        # Step Pill Badge
        step_str = f"STEP {step_index + 1}/5"
        st_surf = self.font_badge.render(step_str, True, (15, 15, 23))
        st_rect = pygame.Rect(banner_x + 10, banner_y + 11, st_surf.get_width() + 10, 24)
        pygame.draw.rect(self.surface, (241, 196, 15), st_rect, border_radius=5)
        self.surface.blit(st_surf, st_surf.get_rect(center=st_rect.center))

        # Buttons Right Boundaries
        self.tut_btn_exit = pygame.Rect(banner_x + banner_w - 110, banner_y + 11, 98, 24)
        is_exit_hover = self.tut_btn_exit.collidepoint(mouse_pos)
        ex_bg = (231, 76, 60) if is_exit_hover else (45, 45, 65)
        pygame.draw.rect(self.surface, ex_bg, self.tut_btn_exit, border_radius=5)
        ex_txt = self.font_small.render("EXIT TUTORIAL", True, COLOR_TEXT_WHITE)
        self.surface.blit(ex_txt, ex_txt.get_rect(center=self.tut_btn_exit.center))

        right_boundary_x = self.tut_btn_exit.left - 10
        if step_index == 4:
            self.tut_btn_start_game = pygame.Rect(banner_x + banner_w - 245, banner_y + 11, 128, 24)
            is_start_hover = self.tut_btn_start_game.collidepoint(mouse_pos)
            st_bg = COLOR_SNAKE_HEAD if is_start_hover else (46, 204, 113)
            pygame.draw.rect(self.surface, st_bg, self.tut_btn_start_game, border_radius=5)
            st_txt = self.font_small.render("PLAY REAL GAME >", True, (15, 15, 23))
            self.surface.blit(st_txt, st_txt.get_rect(center=self.tut_btn_start_game.center))
            right_boundary_x = self.tut_btn_start_game.left - 10

        max_text_w = max(50, right_boundary_x - (st_rect.right + 10))

        # Render Guidance Text with Thai font and clean width bounds (Zero Frame Bleeding!)
        th_surf = self.font_thai_small.render(instruction_th, True, COLOR_TEXT_WHITE)
        if th_surf.get_width() > max_text_w:
            th_surf = pygame.transform.smoothscale(
                th_surf,
                (max_text_w, th_surf.get_height())
            )
        self.surface.blit(th_surf, (st_rect.right + 10, banner_y + 15))

    def draw_main_menu(self, selected_index: int = 0, mouse_pos: Tuple[int, int] = (0, 0)):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 230))
        self.surface.blit(overlay, (0, 0))

        card_w, card_h = 460, 420
        card_x = (WINDOW_WIDTH - card_w) // 2
        card_y = (WINDOW_HEIGHT - card_h) // 2
        card_rect = pygame.Rect(card_x, card_y, card_w, card_h)

        pygame.draw.rect(self.surface, (22, 22, 34), card_rect, border_radius=16)
        pygame.draw.rect(self.surface, COLOR_ACCENT, card_rect, width=2, border_radius=16)

        curr_y = card_y + 35
        logo_surf = self.font_logo.render("LEXISNAKE", True, COLOR_ACCENT)
        self.surface.blit(logo_surf, logo_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        sub_surf = self.font_small.render("CEFR Vocabulary Anagram Snake", True, COLOR_TEXT_MUTED)
        self.surface.blit(sub_surf, sub_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y + 30)))

        btn_w, btn_h = 290, 46
        btn_x = (WINDOW_WIDTH - btn_w) // 2

        self.menu_btn_play = pygame.Rect(btn_x, card_y + 110, btn_w, btn_h)
        self.menu_btn_tutorial = pygame.Rect(btn_x, card_y + 170, btn_w, btn_h)
        self.menu_btn_options = pygame.Rect(btn_x, card_y + 230, btn_w, btn_h)
        self.menu_btn_exit = pygame.Rect(btn_x, card_y + 290, btn_w, btn_h)

        is_play_hover = self.menu_btn_play.collidepoint(mouse_pos)
        is_tut_hover = self.menu_btn_tutorial.collidepoint(mouse_pos)
        is_opt_hover = self.menu_btn_options.collidepoint(mouse_pos)
        is_exit_hover = self.menu_btn_exit.collidepoint(mouse_pos)

        if is_play_hover or is_tut_hover or is_opt_hover or is_exit_hover:
            is_play_selected = is_play_hover
            is_tut_selected = is_tut_hover
            is_opt_selected = is_opt_hover
            is_exit_selected = is_exit_hover
        else:
            is_play_selected = (selected_index == 0)
            is_tut_selected = (selected_index == 1)
            is_opt_selected = (selected_index == 2)
            is_exit_selected = (selected_index == 3)

        play_bg = COLOR_SNAKE_HEAD if is_play_selected else (35, 35, 52)
        play_fg = (15, 15, 23) if is_play_selected else COLOR_TEXT_WHITE
        pygame.draw.rect(self.surface, play_bg, self.menu_btn_play, border_radius=10)
        p_str = "> PLAY GAME <" if is_play_selected else "PLAY GAME"
        p_txt = self.font_menu.render(p_str, True, play_fg)
        self.surface.blit(p_txt, p_txt.get_rect(center=self.menu_btn_play.center))

        tut_bg = (241, 196, 15) if is_tut_selected else (35, 35, 52)
        tut_fg = (15, 15, 23) if is_tut_selected else COLOR_TEXT_WHITE
        pygame.draw.rect(self.surface, tut_bg, self.menu_btn_tutorial, border_radius=10)
        t_str = "> PLAY TUTORIAL <" if is_tut_selected else "PLAY TUTORIAL"
        t_txt = self.font_menu.render(t_str, True, tut_fg)
        self.surface.blit(t_txt, t_txt.get_rect(center=self.menu_btn_tutorial.center))

        opt_bg = COLOR_ACCENT if is_opt_selected else (35, 35, 52)
        opt_fg = (15, 15, 23) if is_opt_selected else COLOR_TEXT_WHITE
        pygame.draw.rect(self.surface, opt_bg, self.menu_btn_options, border_radius=10)
        o_str = "> OPTIONS <" if is_opt_selected else "OPTIONS"
        o_txt = self.font_menu.render(o_str, True, opt_fg)
        self.surface.blit(o_txt, o_txt.get_rect(center=self.menu_btn_options.center))

        exit_bg = (231, 76, 60) if is_exit_selected else (35, 35, 52)
        exit_fg = (15, 15, 23) if is_exit_selected else COLOR_TEXT_WHITE
        pygame.draw.rect(self.surface, exit_bg, self.menu_btn_exit, border_radius=10)
        e_str = "> EXIT <" if is_exit_selected else "EXIT"
        e_txt = self.font_menu.render(e_str, True, exit_fg)
        self.surface.blit(e_txt, e_txt.get_rect(center=self.menu_btn_exit.center))

    def draw_options_menu(self, speed_fast: bool, timer_30s: bool, sound_enabled: bool, mouse_pos: Tuple[int, int] = (0, 0)):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 230))
        self.surface.blit(overlay, (0, 0))

        card_w, card_h = 520, 440
        card_x = (WINDOW_WIDTH - card_w) // 2
        card_y = (WINDOW_HEIGHT - card_h) // 2
        card_rect = pygame.Rect(card_x, card_y, card_w, card_h)

        pygame.draw.rect(self.surface, (22, 22, 34), card_rect, border_radius=16)
        pygame.draw.rect(self.surface, COLOR_ACCENT, card_rect, width=2, border_radius=16)

        curr_y = card_y + 30
        t_surf = self.font_modal_title.render("SETTINGS & OPTIONS", True, COLOR_ACCENT)
        self.surface.blit(t_surf, t_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        curr_y += 50
        bw, bh = 440, 42
        bx = (WINDOW_WIDTH - bw) // 2
        
        self.opt_btn_speed = pygame.Rect(bx, curr_y, bw, bh)
        pygame.draw.rect(self.surface, (35, 35, 52), self.opt_btn_speed, border_radius=8)
        spd_val = "FAST (12 FPS)" if speed_fast else "NORMAL (8 FPS)"
        spd_txt = self.font_header.render(f"SNAKE SPEED:  {spd_val}", True, COLOR_TEXT_WHITE)
        self.surface.blit(spd_txt, spd_txt.get_rect(center=self.opt_btn_speed.center))

        curr_y += 50
        self.opt_btn_timer = pygame.Rect(bx, curr_y, bw, bh)
        pygame.draw.rect(self.surface, (35, 35, 52), self.opt_btn_timer, border_radius=8)
        tm_val = "30 SECONDS" if timer_30s else "20 SECONDS"
        tm_txt = self.font_header.render(f"PUZZLE TIMER:  {tm_val}", True, COLOR_TEXT_WHITE)
        self.surface.blit(tm_txt, tm_txt.get_rect(center=self.opt_btn_timer.center))

        curr_y += 50
        self.opt_btn_sound = pygame.Rect(bx, curr_y, bw, bh)
        pygame.draw.rect(self.surface, (35, 35, 52), self.opt_btn_sound, border_radius=8)
        snd_val = "ON (AUDIO ACTIVE)" if sound_enabled else "MUTED (OFF)"
        snd_col = (46, 204, 113) if sound_enabled else (231, 76, 60)
        snd_txt = self.font_header.render(f"SOUND EFFECTS & AUDIO:  {snd_val}", True, snd_col)
        self.surface.blit(snd_txt, snd_txt.get_rect(center=self.opt_btn_sound.center))

        curr_y += 60
        h1 = self.font_small.render("HOW TO PLAY:", True, COLOR_TEXT_MUTED)
        h2 = self.font_small.render("1. Eat letters to collect them into your Foot Bar inventory.", True, COLOR_TEXT_WHITE)
        h3 = self.font_small.render("2. Enter 3x3 Portals (Green, Yellow, Red) to solve CEFR word puzzles!", True, (241, 196, 15))
        self.surface.blit(h1, (bx + 10, curr_y))
        self.surface.blit(h2, (bx + 10, curr_y + 20))
        self.surface.blit(h3, (bx + 10, curr_y + 38))

        curr_y += 85
        self.opt_btn_back = pygame.Rect(bx + 70, curr_y, 300, 42)
        is_back_hover = self.opt_btn_back.collidepoint(mouse_pos)
        back_bg = COLOR_SNAKE_HEAD if is_back_hover else (45, 45, 65)
        
        pygame.draw.rect(self.surface, back_bg, self.opt_btn_back, border_radius=8)
        b_txt = self.font_body.render("BACK TO MAIN MENU", True, (15, 15, 23) if is_back_hover else COLOR_TEXT_WHITE)
        self.surface.blit(b_txt, b_txt.get_rect(center=self.opt_btn_back.center))

    def draw_pause_menu(self):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 210))
        self.surface.blit(overlay, (0, 0))

        pw, ph = 380, 260
        px = (WINDOW_WIDTH - pw) // 2
        py = (WINDOW_HEIGHT - ph) // 2
        p_rect = pygame.Rect(px, py, pw, ph)

        pygame.draw.rect(self.surface, COLOR_MODAL_BG, p_rect, border_radius=12)
        pygame.draw.rect(self.surface, COLOR_MODAL_BORDER, p_rect, width=2, border_radius=12)

        t_surf = self.font_modal_title.render("GAME PAUSED", True, COLOR_ACCENT)
        self.surface.blit(t_surf, t_surf.get_rect(center=(px + pw // 2, py + 40)))

        bw, bh = 260, 42
        by = py + 95

        self.pause_btn_resume = pygame.Rect((WINDOW_WIDTH - bw) // 2, by, bw, bh)
        pygame.draw.rect(self.surface, COLOR_SNAKE_HEAD, self.pause_btn_resume, border_radius=8)
        r_txt = self.font_body.render("RESUME GAME [P / Esc]", True, (15, 15, 23))
        self.surface.blit(r_txt, r_txt.get_rect(center=self.pause_btn_resume.center))

        by += 52
        self.pause_btn_restart = pygame.Rect((WINDOW_WIDTH - bw) // 2, by, bw, bh)
        pygame.draw.rect(self.surface, COLOR_ACCENT, self.pause_btn_restart, border_radius=8)
        rs_txt = self.font_body.render("RESTART GAME [R]", True, (15, 15, 23))
        self.surface.blit(rs_txt, rs_txt.get_rect(center=self.pause_btn_restart.center))

        by += 52
        self.pause_btn_quit = pygame.Rect((WINDOW_WIDTH - bw) // 2, by, bw, bh)
        pygame.draw.rect(self.surface, (231, 76, 60), self.pause_btn_quit, border_radius=8)
        q_txt = self.font_body.render("QUIT TO MAIN MENU", True, (15, 15, 23))
        self.surface.blit(q_txt, q_txt.get_rect(center=self.pause_btn_quit.center))

    def draw_result_popup(
        self,
        is_win: bool,
        portal_tier: str,
        word: str = "",
        level: str = "",
        meaning_en: str = "",
        meaning_th: str = "",
        score_earned: int = 0,
        reward_info: str = "",
        penalty_info: str = ""
    ):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 220))
        self.surface.blit(overlay, (0, 0))

        card_w, card_h = 560, 400
        card_x = (WINDOW_WIDTH - card_w) // 2
        card_y = (WINDOW_HEIGHT - card_h) // 2
        card_rect = pygame.Rect(card_x, card_y, card_w, card_h)

        border_col = (46, 204, 113) if is_win else (231, 76, 60)
        pygame.draw.rect(self.surface, COLOR_MODAL_BG, card_rect, border_radius=14)
        pygame.draw.rect(self.surface, border_col, card_rect, width=2, border_radius=14)

        curr_y = card_y + 30
        title_str = "VICTORY! PUZZLE SOLVED!" if is_win else "PUZZLE FAILED!"
        title_surf = self.font_modal_title.render(title_str, True, border_col)
        self.surface.blit(title_surf, title_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        curr_y += 45

        if is_win:
            word_str = f"WORD:  {word}  [{level}]"
            w_surf = self.font_title.render(word_str, True, COLOR_TEXT_WHITE)
            self.surface.blit(w_surf, w_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 35
            th_str = f"คำแปลไทย: {meaning_th}"
            th_surf = self.font_thai_body.render(th_str, True, (241, 196, 15))
            self.surface.blit(th_surf, th_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 30
            curr_y = render_wrapped_text(
                self.surface,
                f"English: {meaning_en}",
                self.font_small,
                COLOR_TEXT_MUTED,
                card_x + 30,
                curr_y,
                max_width=card_w - 60
            ) + 8

            sc_surf = self.font_header.render(f"POINTS EARNED: +{score_earned:,} PTS", True, (46, 204, 113))
            self.surface.blit(sc_surf, sc_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 28
            rw_surf = self.font_body.render(f"REWARD: {reward_info}", True, COLOR_ACCENT)
            self.surface.blit(rw_surf, rw_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        else:
            cause_surf = self.font_title.render("Time Expired / Could Not Form Word", True, COLOR_TEXT_WHITE)
            self.surface.blit(cause_surf, cause_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 40
            pen_surf = self.font_header.render(f"PENALTY: {penalty_info}", True, (231, 76, 60))
            self.surface.blit(pen_surf, pen_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

            curr_y += 40
            note_surf = self.font_body.render("Collected letters remain safe in your Foot Bar!", True, COLOR_ACCENT)
            self.surface.blit(note_surf, note_surf.get_rect(center=(WINDOW_WIDTH // 2, curr_y)))

        btn_w, btn_h = 280, 46
        self.result_btn_continue = pygame.Rect((WINDOW_WIDTH - btn_w) // 2, card_y + card_h - 60, btn_w, btn_h)
        
        btn_bg = border_col
        pygame.draw.rect(self.surface, btn_bg, self.result_btn_continue, border_radius=10)
        c_txt = self.font_body.render("CONTINUE GAME [SPACE / ENTER]", True, (15, 15, 23))
        self.surface.blit(c_txt, c_txt.get_rect(center=self.result_btn_continue.center))


class WordSolvingModalUI:
    def __init__(self, surface: pygame.Surface):
        self.surface = surface
        
        self.font_title = load_english_font(20, bold=True)
        self.font_body = load_english_font(14, bold=True)
        self.font_tile = load_english_font(18, bold=True)
        self.font_small = load_english_font(12, bold=False)
        self.font_badge = load_english_font(12, bold=True)

        self.font_thai_body = load_thai_font(14, bold=True)
        self.font_thai_small = load_thai_font(12, bold=False)
        
        self.modal_w = 620
        self.selected_indices: List[int] = []
        self.formed_word: str = ""
        self.status_message: str = ""
        self.status_is_error: bool = False
        self.status_cefr: Optional[str] = None
        self.status_meaning_en: Optional[str] = None
        self.status_meaning_th: Optional[str] = None
        
        self.portal_tier: str = "GREEN"
        self.allowed_levels: List[str] = ["A1", "A2", "B1", "B2", "C1", "C2"]
        self.score_multiplier: float = 1.0
        
        self.btn_submit_rect = pygame.Rect(0, 0, 0, 0)
        self.btn_clear_rect = pygame.Rect(0, 0, 0, 0)
        self.btn_shuffle_rect = pygame.Rect(0, 0, 0, 0)
        self.btn_hint_rect = pygame.Rect(0, 0, 0, 0)
        self.tile_rects: List[pygame.Rect] = []

    def reset(self, inventory: List[str], portal_tier: str = "GREEN", allowed_levels: Optional[List[str]] = None, score_multiplier: float = 1.0):
        self.inventory = list(inventory)
        self.selected_indices = []
        self.formed_word = ""
        self.portal_tier = portal_tier
        self.allowed_levels = allowed_levels or ["A1", "A2", "B1", "B2", "C1", "C2"]
        self.score_multiplier = score_multiplier
        
        req_str = ", ".join(self.allowed_levels)
        self.status_message = f"Select letter tiles or type a word matching [{req_str}]!"
        self.status_is_error = False
        self.status_cefr = None
        self.status_meaning_en = None
        self.status_meaning_th = None

    def handle_keyboard_char(self, char: str):
        char = char.upper()
        for idx, item in enumerate(self.inventory):
            if idx not in self.selected_indices and item == char:
                self.selected_indices.append(idx)
                self.rebuild_formed_word()
                return

    def handle_backspace(self):
        if self.selected_indices:
            self.selected_indices.pop()
            self.rebuild_formed_word()

    def handle_clear(self):
        self.selected_indices = []
        self.formed_word = ""

    def toggle_tile_select(self, index: int):
        if index in self.selected_indices:
            self.selected_indices.remove(index)
        else:
            self.selected_indices.append(index)
        self.rebuild_formed_word()

    def rebuild_formed_word(self):
        self.formed_word = "".join([self.inventory[i] for i in self.selected_indices])
        self.status_message = ""

    def draw(self, remaining_time: float, max_time: float = CHALLENGE_TIME_LIMIT):
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 18, 210))
        self.surface.blit(overlay, (0, 0))

        cols_per_row = 12
        visible_tiles = self.inventory[:36]
        num_rows = max(1, math.ceil(len(visible_tiles) / cols_per_row))
        
        tile_size = 36
        gap = 6
        tiles_grid_height = num_rows * (tile_size + gap)

        status_lines_count = 1
        if self.status_cefr and self.status_meaning_th:
            status_lines_count = 3

        modal_h = 240 + tiles_grid_height + (status_lines_count * 22) + 70
        modal_x = (WINDOW_WIDTH - self.modal_w) // 2
        modal_y = (WINDOW_HEIGHT - modal_h) // 2

        modal_rect = pygame.Rect(modal_x, modal_y, self.modal_w, modal_h)
        pygame.draw.rect(self.surface, COLOR_MODAL_BG, modal_rect, border_radius=14)
        pygame.draw.rect(self.surface, COLOR_MODAL_BORDER, modal_rect, width=2, border_radius=14)

        curr_y = modal_y + 20

        p_col = (
            COLOR_PORTAL_GREEN if self.portal_tier == "GREEN" else
            COLOR_PORTAL_YELLOW if self.portal_tier == "YELLOW" else
            COLOR_PORTAL_RED
        )
        tier_title = f"{self.portal_tier} PORTAL PUZZLE ({self.score_multiplier:.1f}x REWARD)"
        title_surf = self.font_title.render(tier_title, True, p_col)
        self.surface.blit(title_surf, (modal_x + 25, curr_y))

        timer_w = self.modal_w - 50
        timer_h = 12
        timer_x = modal_x + 25
        timer_y = curr_y + 36

        time_ratio = min(1.0, max(0.0, remaining_time / max_time))
        bar_color = (46, 204, 113) if time_ratio > 0.5 else (241, 196, 15) if time_ratio > 0.25 else (231, 76, 60)
        
        pygame.draw.rect(self.surface, (35, 35, 52), (timer_x, timer_y, timer_w, timer_h), border_radius=6)
        if time_ratio > 0:
            pygame.draw.rect(self.surface, bar_color, (timer_x, timer_y, int(timer_w * time_ratio), timer_h), border_radius=6)
        
        timer_txt = self.font_small.render(f"Time Remaining: {int(remaining_time)}s", True, COLOR_TEXT_MUTED)
        self.surface.blit(timer_txt, (timer_x + timer_w - 130, timer_y - 20))

        curr_y = timer_y + 30

        slot_w = self.modal_w - 50
        slot_h = 50
        slot_rect = pygame.Rect(modal_x + 25, curr_y, slot_w, slot_h)
        pygame.draw.rect(self.surface, (14, 14, 22), slot_rect, border_radius=8)
        pygame.draw.rect(self.surface, COLOR_ACCENT if self.formed_word else (45, 45, 65), slot_rect, width=2, border_radius=8)

        if self.formed_word:
            word_surf = self.font_title.render(self.formed_word, True, COLOR_TEXT_WHITE)
            word_rect = word_surf.get_rect(center=slot_rect.center)
            self.surface.blit(word_surf, word_rect)
        else:
            placeholder = self.font_body.render("Select tiles below or type a word...", True, COLOR_TEXT_MUTED)
            p_rect = placeholder.get_rect(center=slot_rect.center)
            self.surface.blit(placeholder, p_rect)

        curr_y += 62

        tiles_label = self.font_small.render(f"YOUR COLLECTED LETTERS ({len(self.inventory)} total):", True, COLOR_TEXT_MUTED)
        self.surface.blit(tiles_label, (modal_x + 25, curr_y))

        curr_y += 18
        tiles_start_y = curr_y

        self.tile_rects = []
        for i, char in enumerate(visible_tiles):
            row = i // cols_per_row
            col = i % cols_per_row
            tx = modal_x + 25 + col * (tile_size + gap)
            ty = tiles_start_y + row * (tile_size + gap)
            
            t_rect = pygame.Rect(tx, ty, tile_size, tile_size)
            self.tile_rects.append(t_rect)

            is_selected = i in self.selected_indices
            bg_col = (45, 45, 65) if is_selected else COLOR_FOOD_BG
            text_col = COLOR_TEXT_MUTED if is_selected else COLOR_FOOD_TEXT

            pygame.draw.rect(self.surface, bg_col, t_rect, border_radius=6)
            if not is_selected:
                pygame.draw.rect(self.surface, (255, 255, 255), t_rect, width=1, border_radius=6)

            c_surf = self.font_tile.render(char, True, text_col)
            c_rect = c_surf.get_rect(center=t_rect.center)
            self.surface.blit(c_surf, c_rect)

        curr_y = tiles_start_y + tiles_grid_height + 12

        btn_h = 40
        btn_w = 120
        
        self.btn_submit_rect = pygame.Rect(modal_x + 25, curr_y, btn_w + 20, btn_h)
        pygame.draw.rect(self.surface, (46, 204, 113), self.btn_submit_rect, border_radius=8)
        s_txt = self.font_body.render("SUBMIT [Enter]", True, (15, 15, 23))
        self.surface.blit(s_txt, s_txt.get_rect(center=self.btn_submit_rect.center))

        self.btn_clear_rect = pygame.Rect(modal_x + 175, curr_y, btn_w, btn_h)
        pygame.draw.rect(self.surface, (231, 76, 60), self.btn_clear_rect, border_radius=8)
        c_txt = self.font_body.render("CLEAR [Esc]", True, (15, 15, 23))
        self.surface.blit(c_txt, c_txt.get_rect(center=self.btn_clear_rect.center))

        self.btn_shuffle_rect = pygame.Rect(modal_x + 305, curr_y, btn_w, btn_h)
        pygame.draw.rect(self.surface, COLOR_ACCENT, self.btn_shuffle_rect, border_radius=8)
        sh_txt = self.font_body.render("SHUFFLE", True, (15, 15, 23))
        self.surface.blit(sh_txt, sh_txt.get_rect(center=self.btn_shuffle_rect.center))

        self.btn_hint_rect = pygame.Rect(modal_x + 435, curr_y, btn_w + 25, btn_h)
        pygame.draw.rect(self.surface, (241, 196, 15), self.btn_hint_rect, border_radius=8)
        h_txt = self.font_body.render("HINT [F1]", True, (15, 15, 23))
        self.surface.blit(h_txt, h_txt.get_rect(center=self.btn_hint_rect.center))

        curr_y += 48
        if self.status_message:
            msg_color = (231, 76, 60) if self.status_is_error else (46, 204, 113)
            curr_y = render_wrapped_text(
                self.surface,
                self.status_message,
                self.font_thai_body,
                msg_color,
                modal_x + 25,
                curr_y,
                max_width=self.modal_w - 50
            ) + 2

            if self.status_cefr and self.status_meaning_th:
                badge_col = COLOR_CEFR.get(self.status_cefr, COLOR_ACCENT)
                detail_str = f"CEFR Level: [{self.status_cefr}]  |  คำแปลไทย: {self.status_meaning_th}"
                render_wrapped_text(
                    self.surface,
                    detail_str,
                    self.font_thai_body,
                    badge_col,
                    modal_x + 25,
                    curr_y,
                    max_width=self.modal_w - 50
                )
