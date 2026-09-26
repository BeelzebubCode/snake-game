"""
LexiSnake: CEFR English Vocabulary Snake Game
Main Entry Point
"""

import os
import sys

# Ensure project root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from src.game import Game
except ModuleNotFoundError as exc:
    if exc.name in {"pygame", "pygame_gui", "i18n"}:
        print(
            f"Missing dependency: {exc.name}\n"
            "Install: .venv/bin/python -m pip install -r requirements.txt\n"
            "Run:     .venv/bin/python main.py\n"
            "Windows: .venv\\Scripts\\python.exe main.py",
            file=sys.stderr,
        )
        raise SystemExit(1) from None
    raise


def main():
    game = Game()
    game.run()


if __name__ == "__main__":
    main()
