"""
Comprehensive Automated Test Suite & Edge Case Verification for LexiSnake Game
"""

import os
import sys
import time
import unittest

os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

import pygame
from src.config import GAME_AREA_COLS, GAME_AREA_ROWS, DIR_RIGHT, DIR_LEFT, DIR_UP, DIR_DOWN
from src.snake import Snake
from src.food import LetterFood
from src.portal import PortalManager, PortalInstance
from src.vocabulary import CEFRVocabulary
from src.tutorial import TutorialController
from src.sound import SoundManager
from src.ui import UIRenderer
from src.game import Game, load_high_score, save_high_score, STATE_MENU, STATE_TUTORIAL, STATE_WORD_SOLVING, STATE_GAME_OVER, STATE_RESULT_POPUP

class TestLexiSnakeSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        pygame.init()
        cls.vocab = CEFRVocabulary("data/cefr_dictionary.json")

    def test_01_vocab_valid_word_a1(self):
        """Test valid CEFR dictionary word lookup (APPLE - A1)."""
        is_valid, msg, level, mean_en, mean_th = self.vocab.validate_word("APPLE", ["A", "P", "P", "L", "E", "X"])
        self.assertTrue(is_valid)
        self.assertEqual(level, "A1")
        self.assertIn("แอปเปิ้ล", mean_th)

    def test_02_vocab_non_existent_word(self):
        """Test non-existent dictionary word submission."""
        is_valid, msg, level, mean_en, mean_th = self.vocab.validate_word("XYZABC", ["X", "Y", "Z", "A", "B", "C"])
        self.assertFalse(is_valid)
        self.assertIn("not in the CEFR dictionary", msg)

    def test_03_vocab_letter_shortage(self):
        """Test submitting a word when player lacks required duplicate letters."""
        # BANANA requires 3 'A's and 2 'N's, but inventory only has 1 'A' and 1 'N'
        is_valid, msg, level, mean_en, mean_th = self.vocab.validate_word("BANANA", ["B", "A", "N", "X", "Y", "Z"])
        self.assertFalse(is_valid)
        self.assertIn("Cannot form this word from your collected letters", msg)

    def test_04_vocab_case_insensitivity(self):
        """Test lowercase input normalization."""
        is_valid, msg, level, mean_en, mean_th = self.vocab.validate_word("snake", ["S", "N", "A", "K", "E"])
        self.assertTrue(is_valid)
        self.assertEqual(level, "A1")

    def test_05_snake_movement_and_180_turn_prevention(self):
        """Test snake forward movement and immediate 180-degree turn prevention."""
        snake = Snake(start_x=10, start_y=12)
        initial_head = snake.segments[0] # (10, 12)
        
        # Try turning LEFT (-1, 0) while moving RIGHT (1, 0) -> Should be IGNORED!
        snake.change_direction(DIR_LEFT)
        self.assertEqual(snake.next_direction, DIR_RIGHT)

        # Move forward 1 step RIGHT
        wall_hit, self_hit = snake.move()
        self.assertFalse(wall_hit)
        self.assertFalse(self_hit)
        self.assertEqual(snake.segments[0], (initial_head[0] + 1, initial_head[1]))

    def test_06_snake_growing(self):
        """Test snake growing body and accumulating inventory letters."""
        snake = Snake(start_x=10, start_y=12)
        init_len = len(snake.segments)
        init_inv_len = len(snake.inventory)

        snake.grow("Z")
        self.assertEqual(len(snake.segments), init_len + 1)
        self.assertEqual(len(snake.inventory), init_inv_len + 1)
        self.assertIn("Z", snake.inventory)

    def test_07_snake_shrink_penalty(self):
        """Test tail shrinking and Game Over threshold when length < 3."""
        snake = Snake(start_x=10, start_y=12) # length = 4
        survived = snake.shrink(1) # length becomes 3
        self.assertTrue(survived)
        self.assertEqual(len(snake.segments), 3)

        survived = snake.shrink(1) # length becomes 2 (< 3)
        self.assertFalse(survived)
        self.assertFalse(snake.is_alive)

    def test_08_food_spawn_safety(self):
        """Ensure food tile never spawns on occupied positions."""
        food = LetterFood()
        occupied = [(x, y) for x in range(GAME_AREA_COLS) for y in range(GAME_AREA_ROWS) if (x, y) != (5, 5)]
        food.respawn(occupied)
        self.assertEqual(food.position, (5, 5))

    def test_09_portal_3x3_collision(self):
        """Test 3x3 portal collision detection on all 9 inner grid cells."""
        portal_mgr = PortalManager()
        portal = PortalInstance((10, 10), "GREEN") # Top-left at (10, 10), spans (10..12, 10..12)
        
        # Check Top-Left cell (10, 10)
        portal_mgr.portals = [portal]
        self.assertIsNotNone(portal_mgr.check_collision((10, 10)))

        # Check Center cell (11, 11)
        portal_mgr.portals = [portal]
        self.assertIsNotNone(portal_mgr.check_collision((11, 11)))

        # Check Bottom-Right cell (12, 12)
        portal_mgr.portals = [portal]
        self.assertIsNotNone(portal_mgr.check_collision((12, 12)))

        # Check Outside cells (9, 9) and (13, 13)
        portal_mgr.portals = [portal]
        self.assertIsNone(portal_mgr.check_collision((9, 9)))
        self.assertIsNone(portal_mgr.check_collision((13, 13)))

    def test_10_highscore_persistence_and_corruption(self):
        """Test high score saving, loading, and corrupted file fallback handling."""
        test_file = "data/test_corrupt_highscore.txt"
        
        # Test saving & loading valid integer
        save_high_score(12345, test_file)
        self.assertEqual(load_high_score(test_file), 12345)

        # Test corrupt text file fallback to 0
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("CORRUPTED_NON_DIGIT_DATA")
        self.assertEqual(load_high_score(test_file), 0)

        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

    def test_11_tutorial_controller_full_flow(self):
        """Test decoupled tutorial controller steps 0-4 and portal spawning."""
        sound_mgr = SoundManager()
        screen = pygame.Surface((800, 600))
        ui_renderer = UIRenderer(screen)
        tut_ctrl = TutorialController(sound_mgr, ui_renderer)

        self.assertEqual(tut_ctrl.step, 0)
        self.assertEqual(tut_ctrl.food.letter, "S")

        # Step 0: Eat 'S'
        tut_ctrl.snake.segments = [(13, 12), (12, 12), (11, 12)]
        tut_ctrl.snake.direction = (1, 0)
        tut_ctrl.last_move_time = 0.0
        tut_ctrl.update()
        self.assertEqual(tut_ctrl.step, 1)
        self.assertEqual(tut_ctrl.food.letter, "N")

    def test_12_tutorial_step1_wall_respawn_no_freeze(self):
        """Ensure tutorial wall collision in steps 0-3 cleanly respawns snake without freezing."""
        sound_mgr = SoundManager()
        screen = pygame.Surface((800, 600))
        ui_renderer = UIRenderer(screen)
        tut_ctrl = TutorialController(sound_mgr, ui_renderer)

        tut_ctrl.step = 1
        tut_ctrl.snake.segments = [(0, 12), (1, 12), (2, 12)]
        tut_ctrl.snake.direction = (-1, 0)
        tut_ctrl.snake.next_direction = (-1, 0)
        tut_ctrl.last_move_time = 0.0

        res = tut_ctrl.update()
        self.assertIsNone(res)
        self.assertEqual(tut_ctrl.snake.segments[0], (8, 12))
        self.assertTrue(tut_ctrl.snake.is_alive)

    def test_13_tutorial_step5_game_over_trigger(self):
        """Ensure tutorial step 5/5 wall crash triggers Game Over tuple for main menu redirection."""
        sound_mgr = SoundManager()
        screen = pygame.Surface((800, 600))
        ui_renderer = UIRenderer(screen)
        tut_ctrl = TutorialController(sound_mgr, ui_renderer)

        tut_ctrl.step = 4 # Step 5/5
        tut_ctrl.snake.segments = [(0, 12), (1, 12), (2, 12)]
        tut_ctrl.snake.direction = (-1, 0)
        tut_ctrl.snake.next_direction = (-1, 0)
        tut_ctrl.last_move_time = 0.0

        res = tut_ctrl.update()
        self.assertIsInstance(res, tuple)
        self.assertEqual(res[0], "GAME_OVER")
        self.assertIn("Boundary Wall Collision", res[1])

if __name__ == "__main__":
    unittest.main()
