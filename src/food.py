"""
Letter Food Spawner Logic
"""

import random
from typing import List, Tuple
from src.config import GAME_AREA_COLS, GAME_AREA_ROWS

VOWELS = ["A", "E", "I", "O", "U"]
COMMON_CONSONANTS = ["T", "N", "S", "R", "H", "L", "D", "C", "M", "P"]
RARE_CONSONANTS = ["B", "F", "G", "J", "K", "V", "W", "X", "Y", "Z", "Q"]

class LetterFood:
    def __init__(self):
        self.position: Tuple[int, int] = (0, 0)
        self.letter: str = "A"

    def getRandomLetter(self) -> str:
        """Returns a weighted random uppercase English letter."""
        pool_type = random.choices(
            population=["VOWEL", "COMMON", "RARE"],
            weights=[38, 42, 20],
            k=1
        )[0]

        if pool_type == "VOWEL":
            return random.choice(VOWELS)
        elif pool_type == "COMMON":
            return random.choice(COMMON_CONSONANTS)
        else:
            return random.choice(RARE_CONSONANTS)

    def respawn(self, occupied_positions: List[Tuple[int, int]]):
        """Finds a random grid coordinate not occupied by snake and picks a new letter."""
        occupied_set = set(occupied_positions)
        all_positions = [
            (x, y)
            for x in range(GAME_AREA_COLS)
            for y in range(GAME_AREA_ROWS)
            if (x, y) not in occupied_set
        ]

        if all_positions:
            self.position = random.choice(all_positions)
        else:
            self.position = (0, 0)
            
        self.letter = self.getRandomLetter()
