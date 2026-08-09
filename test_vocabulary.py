"""
Automated Unit Tests for CEFR Vocabulary Database & Thai Translations
"""

import sys
from src.vocabulary import CEFRVocabulary

def test_vocab():
    vocab = CEFRVocabulary("data/cefr_dictionary.json")
    print(f"Loaded {len(vocab.word_info)} total English CEFR words.")

    # 1. Test Valid Word & Thai Meaning
    is_valid, msg, level, meaning_en, meaning_th = vocab.validate_word("APPLE", list("APPLE"))
    assert is_valid == True, f"Failed: {msg}"
    assert level == "A1"
    assert "แอปเปิ้ล" in meaning_th
    print(f"APPLE test passed: Level={level}, Meaning EN='{meaning_en}', Meaning TH='{meaning_th}'")

    # 2. Test Non-Dict Word
    is_valid, msg, level, meaning_en, meaning_th = vocab.validate_word("APPLES", list("APPLES"))
    assert is_valid == False
    assert "not in the CEFR dictionary" in msg
    print(f"APPLES non-dict test passed: Msg='{msg}'")

    # 3. Test Missing Letters
    is_valid, msg, level, meaning_en, meaning_th = vocab.validate_word("ABANDON", list("ABAN"))
    assert is_valid == False
    assert "Cannot form this word" in msg
    print(f"ABANDON failure test passed: Msg='{msg}'")

    # 4. Test Score Calculation
    score = vocab.calculate_score("ABANDON", "B2", portal_multiplier=1.5)
    assert score > 0
    print(f"Score for ABANDON (B2): {score}")

    # 5. Test Hint Finder
    collected = list("CREATIONRETAIN")
    possible = vocab.find_possible_words(collected, allowed_levels=["B1", "B2"])
    assert len(possible) > 0
    print(f"Possible words: {possible[:3]}")

    print("All vocabulary unit tests passed successfully!")

if __name__ == "__main__":
    test_vocab()
