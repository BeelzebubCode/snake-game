"""
Game Configuration and Constants (Refined UI/UX, Portals & 2-Row Foot Bar)
"""

import pygame

# Window & Grid Dimensions
WINDOW_WIDTH = 760
WINDOW_HEIGHT = 815  # Height expanded for 2-row Foot Bar
FPS = 60

GRID_SIZE = 25
GAME_AREA_COLS = 28
GAME_AREA_ROWS = 24
GAME_AREA_WIDTH = GAME_AREA_COLS * GRID_SIZE   # 700 px
GAME_AREA_HEIGHT = GAME_AREA_ROWS * GRID_SIZE # 600 px

GAME_AREA_OFFSET_X = 30
GAME_AREA_OFFSET_Y = 65

FOOTER_BAR_X = GAME_AREA_OFFSET_X
FOOTER_BAR_Y = GAME_AREA_OFFSET_Y + GAME_AREA_HEIGHT + 12 # 677 px
FOOTER_BAR_WIDTH = GAME_AREA_WIDTH                         # 700 px
FOOTER_BAR_HEIGHT = 115                                    # 115 px (Fits 2 rows + scroll controls)

# Refined Premium Dark Theme Colors
COLOR_BG = (15, 15, 23)             # #0F0F17 Deep Space Dark
COLOR_PANEL_BG = (22, 22, 34)       # #161622 Card Background
COLOR_GRID_BG = (18, 18, 28)        # #12121C Game Board Background
COLOR_GRID_LINE = (28, 28, 42)      # #1C1C2A Subtle fainted grid line

COLOR_SNAKE_HEAD = (46, 204, 113)   # Neon Emerald Green
COLOR_SNAKE_BODY = (26, 188, 156)   # Smooth Turquoise / Cyan
COLOR_SNAKE_TEXT = (15, 15, 23)

COLOR_FOOD_BG = (241, 196, 15)      # Bright Vibrant Amber / Gold
COLOR_FOOD_TEXT = (20, 20, 30)     # Dark contrast letter text

COLOR_TEXT_WHITE = (240, 243, 246)  # High Contrast Pure Light
COLOR_TEXT_MUTED = (140, 148, 165)  # Muted Subtext
COLOR_ACCENT = (52, 152, 219)       # Vivid Sky Blue
COLOR_ACCENT_HOVER = (93, 173, 226)

COLOR_MODAL_BG = (22, 22, 34)
COLOR_MODAL_BORDER = (52, 152, 219)

# Portal Colors & Config
COLOR_PORTAL_GREEN = (46, 204, 113)   # A1 - C2
COLOR_PORTAL_YELLOW = (241, 196, 15)  # B1 - C2
COLOR_PORTAL_RED = (231, 76, 60)     # C1 - C2

PORTAL_SPAWN_INTERVAL = 30 # Spawn new portal every 30 seconds
PORTAL_DESPAWN_TIME = 60    # Despawn portal after 60 seconds if unentered

# CEFR Badge Colors
COLOR_CEFR = {
    "A1": (46, 204, 113),  # Emerald Green
    "A2": (26, 188, 156),  # Turquoise
    "B1": (241, 196, 15),  # Gold
    "B2": (230, 126, 34),  # Warm Orange
    "C1": (231, 76, 60),   # Coral Red
    "C2": (155, 89, 182)   # Vibrant Purple
}

CEFR_BASE_SCORES = {
    "A1": 100,
    "A2": 250,
    "B1": 500,
    "B2": 900,
    "C1": 1500,
    "C2": 2500
}

# Game Timers & Rules
INITIAL_SNAKE_SPEED = 8         # Grid moves per second
CHALLENGE_TIME_LIMIT = 20        # Seconds allowed in word challenge
PENALTY_TAIL_REDUCTION = 3       # Tails lost on timeout/failed word
INITIAL_SNAKE_LENGTH = 4

# Direction Vectors
DIR_UP = (0, -1)
DIR_DOWN = (0, 1)
DIR_LEFT = (-1, 0)
DIR_RIGHT = (1, 0)
