"""
CEFR Vocabulary Manager with bundled English-Thai glosses (offline, office-safe).
"""

import os
import sys
import json
from typing import List, Tuple, Dict, Optional, Set


def _resolve_data_path(relative_path: str) -> str:
    if getattr(sys, "frozen", False):
        base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        candidate = os.path.join(base_dir, relative_path)
        if os.path.exists(candidate):
            return candidate
    if os.path.exists(relative_path):
        return relative_path
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidate = os.path.join(base_dir, relative_path)
    if os.path.exists(candidate):
        return candidate
    return relative_path


class CEFRVocabulary:
    def __init__(
        self,
        dictionary_path: str = "data/cefr_dictionary.json",
        gloss_path: str = "data/en_th.json",
    ):
        self.dictionary_path = dictionary_path
        self.gloss_path = gloss_path
        self.words_by_level: Dict[str, Dict[str, str]] = {
            "A1": {}, "A2": {}, "B1": {}, "B2": {}, "C1": {}, "C2": {}
        }
        self.all_words: Set[str] = set()
        self.word_info: Dict[str, Tuple[str, str, str]] = {}
        self.glosses: Dict[str, Dict[str, str]] = {}
        self._load_glosses()
        self.load_dictionary()

    def _load_glosses(self) -> None:
        path = _resolve_data_path(self.gloss_path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.glosses = {str(k).upper(): v for k, v in data.items() if isinstance(v, dict)}
            print(f"Loaded {len(self.glosses)} English-Thai gloss entries.")
        except Exception as e:
            print(f"Warning: could not load Thai gloss dictionary: {e}")
            self.glosses = {}

    def _lookup_gloss(self, word: str, level: str, meaning_en: str) -> Tuple[str, str]:
        if meaning_en and meaning_en.startswith("CEFR"):
            meaning_en = f"English vocabulary word ({word.lower()})"

        entry = self.glosses.get(word)
        if entry:
            th = (entry.get("th") or "").strip()
            en = (entry.get("en") or "").strip()
            if en and not en.startswith("CEFR"):
                meaning_en = en
            if th:
                return meaning_en, th

        # Stem fallback for simple inflections already in the gloss table
        for suffix, cut in (("ING", 3), ("ED", 2), ("ES", 2), ("S", 1), ("LY", 2), ("ER", 2), ("EST", 3)):
            if len(word) > cut + 3 and word.endswith(suffix):
                stem = word[:-cut]
                stem_entry = self.glosses.get(stem)
                if stem_entry and stem_entry.get("th"):
                    en = (stem_entry.get("en") or meaning_en).strip()
                    if en and not en.startswith("CEFR"):
                        meaning_en = en
                    return meaning_en, stem_entry["th"]

        if meaning_en:
            return meaning_en, ""
        return "Vocabulary word", ""

    def load_dictionary(self):
        try:
            target_path = _resolve_data_path(self.dictionary_path)
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for level, words_list in data.items():
                if level not in self.words_by_level:
                    continue
                for entry in words_list:
                    word = entry["word"].upper()
                    meaning_en = entry.get("meaning", "English word")
                    meaning_en, meaning_th = self._lookup_gloss(word, level, meaning_en)

                    self.words_by_level[level][word] = meaning_en
                    self.all_words.add(word)
                    self.word_info[word] = (level, meaning_en, meaning_th)
            print(f"Loaded {len(self.all_words)} total English CEFR words into vocabulary database.")
        except Exception as e:
            print(f"Error loading vocabulary dictionary: {e}")

    def _resolve_word_stem(self, word: str) -> Optional[Tuple[str, str, str, str]]:
        """
        Attempts to resolve an inflected word or spelling variant to a base dictionary word entry.
        Returns (base_word, level, meaning_en, meaning_th) if found, else None.
        """
        word = word.upper().strip()
        if word in self.word_info:
            level, en, th = self.word_info[word]
            return word, level, en, th

        # 1. Common spelling variants / typos map
        aliases = {
            "JEWERLY": "JEWELRY",
            "JEWELLERY": "JEWELRY",
            "COLOUR": "COLOR",
            "FAVOURITE": "FAVORITE",
            "CENTRE": "CENTER",
            "THEATRE": "THEATER",
            "ORGANISATION": "ORGANIZATION",
            "DEFENCE": "DEFENSE",
            "HONOUR": "HONOR",
            "NEIGHBOUR": "NEIGHBOR",
            "BEHAVIOUR": "BEHAVIOR",
            "LABOUR": "LABOR",
            "TRAVELLER": "TRAVELER",
            "CANCELLED": "CANCELED",
            "PROGRAMME": "PROGRAM",
            "ANALYSE": "ANALYZE",
        }
        if word in aliases:
            target = aliases[word]
            if target in self.word_info:
                level, en, th = self.word_info[target]
                return target, level, en, th

        # 2. Irregular past/plural forms map
        irregulars = {
            "CHILDREN": "CHILD", "MEN": "MAN", "WOMEN": "WOMAN", "FEET": "FOOT", "TEETH": "TOOTH",
            "GEESE": "GOOSE", "MICE": "MOUSE", "RAN": "RUN", "SWAM": "SWIM", "DRANK": "DRINK",
            "ATE": "EAT", "WENT": "GO", "SAW": "SEE", "MET": "MEET", "BOUGHT": "BUY",
            "THOUGHT": "THINK", "BROUGHT": "BRING", "TAUGHT": "TEACH", "CAUGHT": "CATCH",
            "WROTE": "WRITE", "WRITTEN": "WRITE", "DROVE": "DRIVE", "DRIVEN": "DRIVE",
            "SPOKE": "SPEAK", "SPOKEN": "SPEAK", "BROKE": "BREAK", "BROKEN": "BREAK",
            "CHOSE": "CHOOSE", "CHOSEN": "CHOOSE", "FLEW": "FLY", "FLOWN": "FLY",
            "GREW": "GROW", "GROWN": "GROW", "KNEW": "KNOW", "KNOWN": "KNOW",
            "THREW": "THROW", "THROWN": "THROW", "BLEW": "BLOW", "BLOWN": "BLOW",
            "DREW": "DRAW", "DRAWN": "DRAW", "SANG": "SING", "SUNG": "SING",
            "SANK": "SINK", "SUNK": "SINK", "SWUNG": "SWING", "BEGAN": "BEGIN", "BEGUN": "BEGIN"
        }
        if word in irregulars:
            target = irregulars[word]
            if target in self.word_info:
                level, en, th = self.word_info[target]
                return target, level, en, th

        # 3. Rule-based inflection stemming
        n = len(word)
        candidate_stems = []

        # Suffix -ED / -D (e.g. DIED -> DIE, LIKED -> LIKE, WALKED -> WALK, CARRIED -> CARRY, STOPPED -> STOP)
        if word.endswith("ED") and n > 3:
            candidate_stems.append(word[:-1])  # DIED -> DIE, LIKED -> LIKE
            candidate_stems.append(word[:-2])  # WALKED -> WALK
            if word.endswith("IED") and n > 4:
                candidate_stems.append(word[:-3] + "Y")  # CARRIED -> CARRY
            if n > 4 and word[-3] == word[-4]:
                candidate_stems.append(word[:-3])  # STOPPED -> STOP
        elif word.endswith("D") and n > 3:
            candidate_stems.append(word[:-1])  # DIED -> DIE

        # Suffix -ING (e.g. PLAYING -> PLAY, MAKING -> MAKE, RUNNING -> RUN)
        if word.endswith("ING") and n > 4:
            candidate_stems.append(word[:-3])        # PLAYING -> PLAY
            candidate_stems.append(word[:-3] + "E")   # MAKING -> MAKE
            if n > 5 and word[-4] == word[-5]:
                candidate_stems.append(word[:-4])    # RUNNING -> RUN
            if word.endswith("YING") and n > 5:
                candidate_stems.append(word[:-4] + "IE") # DIEING/DYING -> DIE

        # Suffix -ES / -S (e.g. BOXES -> BOX, CITIES -> CITY, CATS -> CAT)
        if word.endswith("ES") and n > 3:
            candidate_stems.append(word[:-2])  # BOXES -> BOX
            candidate_stems.append(word[:-1])  # LIVES -> LIVE
            if word.endswith("IES") and n > 4:
                candidate_stems.append(word[:-3] + "Y")  # CITIES -> CITY
        elif word.endswith("S") and not word.endswith("SS") and n > 3:
            candidate_stems.append(word[:-1])  # CATS -> CAT

        # Suffix -LY (e.g. QUICKLY -> QUICK, HAPPILY -> HAPPY)
        if word.endswith("LY") and n > 4:
            candidate_stems.append(word[:-2])  # QUICKLY -> QUICK
            candidate_stems.append(word[:-2] + "E") # POLITELY -> POLITE
            if word.endswith("ILY") and n > 5:
                candidate_stems.append(word[:-3] + "Y") # HAPPILY -> HAPPY

        # Suffix -ER / -EST (e.g. FASTER -> FAST, HAPPIER -> HAPPY)
        if word.endswith("EST") and n > 4:
            candidate_stems.append(word[:-3]) # FASTEST -> FAST
            candidate_stems.append(word[:-2]) # NICEST -> NICE
            if word.endswith("IEST") and n > 5:
                candidate_stems.append(word[:-4] + "Y") # HAPPIEST -> HAPPY
        elif word.endswith("ER") and n > 3:
            candidate_stems.append(word[:-2]) # FASTER -> FAST
            candidate_stems.append(word[:-1]) # NICER -> NICE
            if word.endswith("IER") and n > 4:
                candidate_stems.append(word[:-3] + "Y") # HAPPIER -> HAPPY

        for stem in candidate_stems:
            if stem in self.word_info:
                level, en, th = self.word_info[stem]
                return stem, level, en, th

        return None

    def validate_word(
        self,
        word: str,
        collected_letters: List[str],
        allowed_levels: Optional[List[str]] = None
    ) -> Tuple[bool, str, Optional[str], Optional[str], Optional[str]]:
        word = word.upper().strip()
        if not word:
            return False, "พิมพ์คำหรือเลือกตัวอักษรก่อนนะ", None, None, None

        inventory_counts: Dict[str, int] = {}
        for char in collected_letters:
            char_upper = char.upper()
            inventory_counts[char_upper] = inventory_counts.get(char_upper, 0) + 1

        word_counts: Dict[str, int] = {}
        for char in word:
            word_counts[char] = word_counts.get(char, 0) + 1
            if word_counts[char] > inventory_counts.get(char, 0):
                return False, "ตัวอักษรที่สะสมยังไม่พอสำหรับคำนี้ ลองคำอื่นนะ", None, None, None

        res = self._resolve_word_stem(word)
        if not res:
            return False, f"ยังไม่พบคำว่า '{word}' ลองตรวจตัวสะกดหรือใช้คำอื่นนะ", None, None, None

        base_word, level, meaning_en, meaning_th = res

        if allowed_levels and level not in allowed_levels:
            return False, f"คำว่า '{word}' ไม่อยู่ในระดับที่เลือก ลองคำอื่นนะ", None, None, None

        return True, "เรียงคำถูกต้องแล้ว!", level, meaning_en, meaning_th

    def find_possible_words(
        self,
        collected_letters: List[str],
        allowed_levels: Optional[List[str]] = None,
        max_results: int = 5,
        exclude_words: Optional[Set[str]] = None
    ) -> List[Tuple[str, str, str, str]]:
        inventory_counts: Dict[str, int] = {}
        for char in collected_letters:
            char_upper = char.upper()
            inventory_counts[char_upper] = inventory_counts.get(char_upper, 0) + 1

        possible = []
        for word, (level, meaning_en, meaning_th) in self.word_info.items():
            if allowed_levels and level not in allowed_levels:
                continue
            if exclude_words and word in exclude_words:
                continue

            word_counts: Dict[str, int] = {}
            can_form = True
            for char in word:
                word_counts[char] = word_counts.get(char, 0) + 1
                if word_counts[char] > inventory_counts.get(char, 0):
                    can_form = False
                    break

            if can_form:
                possible.append((word, level, meaning_en, meaning_th))

        possible.sort(key=lambda x: len(x[0]), reverse=True)
        return possible[:max_results]

    def calculate_score(self, word: str, level: str, portal_multiplier: float = 1.0) -> int:
        base_points_per_letter = {
            "A1": 100, "A2": 150, "B1": 200, "B2": 300, "C1": 450, "C2": 600
        }
        multiplier = base_points_per_letter.get(level, 100)
        length_bonus = len(word) * 50
        raw_score = (len(word) * multiplier) + length_bonus
        return int(raw_score * portal_multiplier)
