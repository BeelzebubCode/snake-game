"""
Automated Integration Test for High Score Persistence & Decoupled TutorialController Architecture
"""

import os
import sys
import time
os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

import pygame
from src.game import Game, STATE_MENU, STATE_TUTORIAL, STATE_WORD_SOLVING, STATE_RESULT_POPUP, STATE_GAME_OVER, load_high_score, save_high_score, HIGHSCORE_FILE
from src.portal import PortalInstance

def test_highscore_persistence():
    test_file = "data/test_highscore.txt"
    if os.path.exists(test_file):
        os.remove(test_file)

    assert load_high_score(test_file) == 0

    save_high_score(9999, test_file)
    assert load_high_score(test_file) == 9999

    if os.path.exists(test_file):
        os.remove(test_file)

    print("High Score TXT Persistence Test Passed 100%!")

def test_decoupled_tutorial_controller():
    pygame.init()
    game = Game()
    
    # 1. Reset Playable Interactive Tutorial
    game.reset_tutorial_game()
    game.state = STATE_TUTORIAL
    
    assert game.is_interactive_tutorial == True
    assert game.tutorial_ctrl.step == 0
    assert game.tutorial_ctrl.food.letter == "S"
    print("Decoupled Tutorial Init Passed! Step 0, Food='S'")

    # 2. Steer snake right to eat 'S' at (14, 12)
    game.tutorial_ctrl.snake.segments = [(13, 12), (12, 12), (11, 12)]
    game.tutorial_ctrl.snake.direction = (1, 0)
    game.tutorial_ctrl.snake.next_direction = (1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    
    game.update()
    assert game.tutorial_ctrl.step == 1
    assert game.tutorial_ctrl.food.letter == "N"
    print("Decoupled Tutorial Step 1 Passed! Ate 'S', next Food='N'")

    # Test Wall Collision Respawn in Step 1 (Must respawn at (8, 12) safely)
    game.tutorial_ctrl.snake.segments = [(0, 12), (1, 12), (2, 12)]
    game.tutorial_ctrl.snake.direction = (-1, 0)
    game.tutorial_ctrl.snake.next_direction = (-1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()

    assert game.tutorial_ctrl.snake.segments[0] == (8, 12)
    assert game.tutorial_ctrl.snake.is_alive == True
    print("Step 1 Wall Collision Respawn Test Passed!")

    # 3. Eat 'N', 'A', 'K', 'E'
    game.tutorial_ctrl.snake.segments = [(14, 9), (14, 10), (14, 11)] # Eat N at (14, 8)
    game.tutorial_ctrl.snake.direction = (0, -1)
    game.tutorial_ctrl.snake.next_direction = (0, -1)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()
    assert game.tutorial_ctrl.food.letter == "A"

    game.tutorial_ctrl.snake.segments = [(11, 8), (12, 8), (13, 8)] # Eat A at (10, 8)
    game.tutorial_ctrl.snake.direction = (-1, 0)
    game.tutorial_ctrl.snake.next_direction = (-1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()
    assert game.tutorial_ctrl.food.letter == "K"

    game.tutorial_ctrl.snake.segments = [(10, 15), (10, 14), (10, 13)] # Eat K at (10, 16)
    game.tutorial_ctrl.snake.direction = (0, 1)
    game.tutorial_ctrl.snake.next_direction = (0, 1)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()
    assert game.tutorial_ctrl.food.letter == "E"

    game.tutorial_ctrl.snake.segments = [(15, 16), (14, 16), (13, 16)] # Eat E at (16, 16)
    game.tutorial_ctrl.snake.direction = (1, 0)
    game.tutorial_ctrl.snake.next_direction = (1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()

    # Step 2: Food should despawn (-100, -100) and Portal spawn!
    assert game.tutorial_ctrl.step == 2
    assert game.tutorial_ctrl.food.position == (-100, -100)
    assert len(game.tutorial_ctrl.portal_mgr.portals) == 1
    print("Decoupled Tutorial Step 2 Passed! Ate all letters for 'SNAKE', Food Despawned & 3x3 Portal Spawned!")

    # 4. Steer snake to enter 3x3 Portal at (12, 12)
    game.tutorial_ctrl.snake.segments = [(11, 12), (10, 12), (9, 12)]
    game.tutorial_ctrl.snake.direction = (1, 0)
    game.tutorial_ctrl.snake.next_direction = (1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()

    assert game.tutorial_ctrl.step == 3
    assert game.state == STATE_WORD_SOLVING
    print("Decoupled Tutorial Step 3 Passed! Entered Portal -> Word Challenge Triggered!")

    # 5. Form & Submit 'SNAKE'
    game.modal_ui.inventory = ["S", "N", "A", "K", "E", "L"]
    game.modal_ui.formed_word = "SNAKE"
    game.submit_word_challenge()

    assert game.tutorial_ctrl.step == 4
    assert game.state == STATE_RESULT_POPUP
    print("Decoupled Tutorial Step 4 Passed! Solved 'SNAKE' -> Tutorial Completed!")

    # 6. Test Step 5/5 Real Game Over Death Trigger
    game.state = STATE_TUTORIAL
    game.tutorial_ctrl.snake.segments = [(0, 12), (1, 12), (2, 12)]
    game.tutorial_ctrl.snake.direction = (-1, 0)
    game.tutorial_ctrl.snake.next_direction = (-1, 0)
    game.tutorial_ctrl.last_move_time = 0.0
    game.update()

    assert game.state == STATE_GAME_OVER
    assert "Boundary Wall Collision" in game.game_over_reason
    print("Step 5/5 Real Game Over Death Trigger Test Passed!")

    print("All Decoupled TutorialController integration tests passed 100%!")

if __name__ == "__main__":
    test_highscore_persistence()
    test_decoupled_tutorial_controller()
