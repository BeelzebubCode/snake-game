"""
CEFR Vocabulary Manager with Thai Translation Engine
"""

import json
from typing import List, Tuple, Dict, Optional, Set

# Comprehensive Thai Translation Database for CEFR English Vocabulary
THAI_DICTIONARY: Dict[str, str] = {
    "APPLE": "แอปเปิ้ล (ผลไม้)",
    "ACTION": "การกระทำ / แอคชัน",
    "ACTIVITY": "กิจกรรม",
    "ACTOR": "นักแสดงชาย",
    "ACTRESS": "นักแสดงหญิง",
    "ADDRESS": "ที่อยู่ / ปราศรัย",
    "ADULT": "ผู้ใหญ่",
    "ADVICE": "คำแนะนำ",
    "ANIMAL": "สัตว์",
    "ANSWER": "คำตอบ / ตอบ",
    "BEAUTIFUL": "สวยงาม",
    "BICYCLE": "จักรยาน",
    "BOOK": "หนังสือ",
    "BROTHER": "พี่ชาย / น้องชาย",
    "BUILDING": "อาคาร / สิ่งปลูกสร้าง",
    "BUSINESS": "ธุรกิจ / การค้า",
    "CAMERA": "กล้องถ่ายรูป",
    "CHILDREN": "เด็กๆ",
    "COMPUTER": "คอมพิวเตอร์",
    "COUNTRY": "ประเทศ / ชนบท",
    "CREATION": "การสร้างสรรค์ / สิ่งที่ถูกสร้างขึ้น",
    "DANGER": "อันตราย",
    "DICTIONARY": "พจนานุกรม",
    "EDUCATION": "การศึกษา",
    "FAMILY": "ครอบครัว",
    "FATHER": "พ่อ",
    "FRIEND": "เพื่อน",
    "FUTURE": "อนาคต",
    "HOSPITAL": "โรงพยาบาล",
    "INFORMATION": "ข้อมูล / ข่าวสาร",
    "LANGUAGE": "ภาษา",
    "MOTHER": "แม่",
    "MOUNTAIN": "ภูเขา",
    "MUSIC": "ดนตรี / เพลง",
    "PICTURE": "รูปภาพ",
    "QUESTION": "คำถาม",
    "SCHOOL": "โรงเรียน",
    "SNAKE": "งู",
    "STUDENT": "นักเรียน / นักศึกษา",
    "TEACHER": "ครู / อาจารย์",
    "TELEPHONE": "โทรศัพท์",
    "UNIVERSITY": "มหาวิทยาลัย",
    "VACATION": "วันหยุดพักผ่อน",
    "WEATHER": "สภาพอากาศ",
    "WINDOW": "หน้าต่าง",
    "WORLD": "โลก",
    "ABANDON": "ละทิ้ง / สละ",
    "ADVOCATE": "ผู้สนับสนุน / ทนายความ",
    "RETAIN": "เก็บรักษา / จดจำไว้",
    "PANACEA": "ยารักษาทุกโรค / วิธีแก้ปัญหาทุกอย่าง",
    "CORE": "แกนกลาง / สาระสำคัญ",
    "CITE": "อ้างอิง / อ้างถึง",
    "NEAT": "เรียบร้อย / ประณีต"
}

class CEFRVocabulary:
    def __init__(self, dictionary_path: str = "data/cefr_dictionary.json"):
        self.dictionary_path = dictionary_path
        self.words_by_level: Dict[str, Dict[str, str]] = {
            "A1": {}, "A2": {}, "B1": {}, "B2": {}, "C1": {}, "C2": {}
        }
        self.all_words: Set[str] = set()
        self.word_info: Dict[str, Tuple[str, str, str]] = {} # word -> (level, meaning_en, meaning_th)
        self.load_dictionary()

    def _get_thai_meaning(self, word: str, level: str) -> str:
        """Returns Thai translation for an English word."""
        if word in THAI_DICTIONARY:
            return THAI_DICTIONARY[word]
        return f"คำศัพท์ระดับ [{level}]"

    def load_dictionary(self):
        try:
            with open(self.dictionary_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            for level, words_list in data.items():
                if level in self.words_by_level:
                    for entry in words_list:
                        word = entry["word"].upper()
                        meaning_en = entry.get("meaning", f"CEFR {level} word")
                        meaning_th = self._get_thai_meaning(word, level)

                        self.words_by_level[level][word] = meaning_en
                        self.all_words.add(word)
                        self.word_info[word] = (level, meaning_en, meaning_th)
            print(f"Loaded {len(self.all_words)} total English CEFR words into vocabulary database.")
        except Exception as e:
            print(f"Error loading vocabulary dictionary: {e}")

    def validate_word(
        self,
        word: str,
        collected_letters: List[str],
        allowed_levels: Optional[List[str]] = None
    ) -> Tuple[bool, str, Optional[str], Optional[str], Optional[str]]:
        """
        Validates if the user's formed word exists in dictionary and matches collected letters.
        Returns: (is_valid, message, level, meaning_en, meaning_th)
        """
        word = word.upper().strip()
        if not word:
            return False, "Please select or type a word!", None, None, None

        # Check letter inventory availability
        inventory_counts: Dict[str, int] = {}
        for char in collected_letters:
            char_upper = char.upper()
            inventory_counts[char_upper] = inventory_counts.get(char_upper, 0) + 1

        word_counts: Dict[str, int] = {}
        for char in word:
            word_counts[char] = word_counts.get(char, 0) + 1
            if word_counts[char] > inventory_counts.get(char, 0):
                return False, "Cannot form this word from your collected letters!", None, None, None

        # Check dictionary existence
        if word not in self.word_info:
            return False, f"'{word}' is not in the CEFR dictionary!", None, None, None

        level, meaning_en, meaning_th = self.word_info[word]

        # Check tier restrictions
        if allowed_levels and level not in allowed_levels:
            req = ", ".join(allowed_levels)
            return False, f"'{word}' is level [{level}], but this portal requires [{req}]!", None, None, None

        return True, "Word solved successfully!", level, meaning_en, meaning_th

    def find_possible_words(
        self,
        collected_letters: List[str],
        allowed_levels: Optional[List[str]] = None,
        max_results: int = 5
    ) -> List[Tuple[str, str, str, str]]:
        """
        Finds valid words that can be formed from collected letters matching tier requirements.
        Returns list of (word, level, meaning_en, meaning_th).
        """
        inventory_counts: Dict[str, int] = {}
        for char in collected_letters:
            char_upper = char.upper()
            inventory_counts[char_upper] = inventory_counts.get(char_upper, 0) + 1

        possible = []
        for word, (level, meaning_en, meaning_th) in self.word_info.items():
            if allowed_levels and level not in allowed_levels:
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
