"""Render UI fixtures without opening a desktop window or changing saved scores."""

import argparse
import os
import sys
from pathlib import Path

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pygame

from src.game import (
    STATE_GAME_OVER,
    STATE_MENU,
    STATE_OPTIONS,
    STATE_PAUSED,
    STATE_PLAYING,
    STATE_RESULT_POPUP,
    STATE_TUTORIAL,
    Game,
)
from src.portal import PortalInstance


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    game = Game()
    game.reset_game()
    game.score = 12500
    game.high_score = 98650
    game.snake.inventory = list("SNAKELEARNINGVOCABULARY" * 3)
    game.food.position = (18, 8)
    game.food.letter = "E"
    game.portal_mgr.portals = [
        PortalInstance((19, 15), "GREEN"),
        PortalInstance((9, 5), "GREEN"),
    ]
    for name, state in (
        ("menu", STATE_MENU),
        ("settings", STATE_OPTIONS),
        ("playing", STATE_PLAYING),
        ("pause", STATE_PAUSED),
    ):
        game.state = state
        game.render()
        pygame.image.save(game.screen, args.output / f"{name}.png")
    game.trigger_word_challenge(PortalInstance((12, 12), "GREEN"))
    game.modal_ui.auto_select_word("SNAKE")
    game.render()
    pygame.image.save(game.screen, args.output / "puzzle.png")
    game.state = STATE_RESULT_POPUP
    game.result_is_win = True
    game.result_word, game.result_level = "RANK", "B2"
    game.result_meaning_th = "อันดับ"
    game.result_score_earned = 1400
    game.render()
    pygame.image.save(game.screen, args.output / "result.png")
    game.state = STATE_GAME_OVER
    game.game_over_reason = "งูชนกำแพง ลองเลี้ยวก่อนถึงขอบสนามนะ"
    game.render()
    pygame.image.save(game.screen, args.output / "game-over.png")
    game.reset_tutorial_game()
    game.state = STATE_TUTORIAL
    game.tutorial_ctrl.step = 4
    game.render()
    pygame.image.save(game.screen, args.output / "tutorial.png")
    game.show_tutorial_help(STATE_TUTORIAL)
    game.render()
    pygame.image.save(game.screen, args.output / "tutorial-help.png")
    game.close_tutorial_help()
    game.render()
    pygame.image.save(game.screen, args.output / "countdown.png")
    game.reset_tutorial_game()
    game.tutorial_ctrl.step = 3
    game.tutorial_ctrl.snake.inventory = list("SNAKEL")
    game.trigger_word_challenge(PortalInstance((12, 12)))
    game.close_tutorial_help()
    game.fail_word_challenge()
    game.render()
    pygame.image.save(game.screen, args.output / "tutorial-retry.png")
    pygame.quit()
    print(f"Saved 11 UI screenshots to {args.output}")


if __name__ == "__main__":
    main()
