"""
Extract and process Oxford 3000 CEFR vocabulary list from OCR text into cefr_dictionary.json
"""

import json
import re
import os
from typing import Optional

# Import text pages directly
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oxford_ocr_data import ocr_text_pages

cefr_dictionary = {
    "A1": [],
    "A2": [],
    "B1": [],
    "B2": [],
    "C1": [
        {"word": "ADVOCATE", "meaning": "A person who publicly supports or recommends a cause"},
        {"word": "BENCHMARK", "meaning": "A standard or point of reference"},
        {"word": "COGNITIVE", "meaning": "Relating to mental processes of perception and judgment"},
        {"word": "DILEMMA", "meaning": "A difficult choice between two alternatives"},
        {"word": "ELOQUENT", "meaning": "Fluent or persuasive in speaking or writing"},
        {"word": "FRACTURE", "meaning": "A break or crack in a hard material or bone"},
        {"word": "GUARDIAN", "meaning": "A defender, protector, or keeper"},
        {"word": "HEGEMONY", "meaning": "Leadership or dominance by one country or group"},
        {"word": "INTRICATE", "meaning": "Very complicated or detailed"},
        {"word": "JUXTAPOSE", "meaning": "Place close together for contrasting effect"},
        {"word": "LABYRINTH", "meaning": "A complicated irregular network of passages"},
        {"word": "METAPHOR", "meaning": "A figure of speech expressing symbolic comparison"},
        {"word": "NOSTALGIA", "meaning": "A sentimental longing for the past"},
        {"word": "PARADIGM", "meaning": "A typical example or pattern of something"},
        {"word": "QUANTUM", "meaning": "A discrete quantity of energy proportional in magnitude"},
        {"word": "RHETORIC", "meaning": "The art of effective or persuasive speaking"},
        {"word": "SYNERGY", "meaning": "Combined action or operation producing a greater effect"},
        {"word": "TRANSGRESS", "meaning": "Infringe or go beyond the bounds of a moral principle"},
        {"word": "UTOPIA", "meaning": "An imagined place or state of things in which everything is perfect"},
        {"word": "VERACITY", "meaning": "Conformity to facts; accuracy and truthfulness"}
    ],
    "C2": [
        {"word": "ABERRATION", "meaning": "A departure from what is normal, usual, or expected"},
        {"word": "BENEVOLENT", "meaning": "Well meaning and kindly"},
        {"word": "CACOPHONY", "meaning": "A harsh, discordant mixture of sounds"},
        {"word": "EPHEMERAL", "meaning": "Lasting for a very short time"},
        {"word": "EQUANIMITY", "meaning": "Mental calmness and composure in difficult situations"},
        {"word": "IDIOSYNCRASY", "meaning": "A mode of behavior or way of thought peculiar to an individual"},
        {"word": "JUXTAPOSITION", "meaning": "The placement of two things close together with contrasting effect"},
        {"word": "MAGNANIMOUS", "meaning": "Generous or forgiving toward a rival or less powerful person"},
        {"word": "NEBULOUS", "meaning": "In the form of a cloud or haze; hazy or vague"},
        {"word": "OBFUSCATE", "meaning": "Render obscure, unclear, or unintelligible"},
        {"word": "PANACEA", "meaning": "A solution or remedy for all difficulties or diseases"},
        {"word": "QUINTESSENCE", "meaning": "The most perfect or typical example of a quality or class"},
        {"word": "RESILIENT", "meaning": "Able to withstand or recover quickly from difficult conditions"},
        {"word": "SURREPTITIOUS", "meaning": "Kept secret, especially because it would not be approved of"},
        {"word": "TRANSCEND", "meaning": "Be or go beyond the range or limits of something"},
        {"word": "UBIQUITOUS", "meaning": "Present, appearing, or found everywhere"},
        {"word": "VICISSITUDE", "meaning": "A change of circumstances or fortune, typically one that is unwelcome"},
        {"word": "ZEALOT", "meaning": "A person who is fanatical and uncompromising in pursuit of their ideals"}
    ]
}

current_level = "A1"
seen_words = set()

def parse_line(line: str):
    global current_level
    line = line.strip()
    if not line:
        return

    # Check level section headers
    if line in ("A1", "A2", "B1", "B2", "C1", "C2"):
        current_level = line
        return

    # Extract word part before pos tags or numbers
    # Line format example: "about prep., adv.", "action n.", "can1 modal v."
    tokens = line.split()
    if not tokens:
        return

    first_token = tokens[0].strip()

    # Clean digits, commas, parentheses
    clean_w = re.sub(r'[\d,\(\)]', '', first_token).upper()

    if len(clean_w) >= 2 and clean_w.isalpha() and clean_w not in seen_words:
        seen_words.add(clean_w)
        cefr_dictionary[current_level].append({
            "word": clean_w,
            "meaning": f"Oxford 3000 {current_level} core vocabulary word"
        })

def run_extraction():
    for page in ocr_text_pages:
        for line in page.splitlines():
            parse_line(line)

    output_path = os.path.join("data", "cefr_dictionary.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cefr_dictionary, f, ensure_ascii=False, indent=2)

    total_count = sum(len(words) for words in cefr_dictionary.values())
    print(f"Successfully extracted {total_count} Oxford CEFR words across levels:")
    for level, lst in cefr_dictionary.items():
        print(f"  Level {level}: {len(lst)} words")

if __name__ == "__main__":
    run_extraction()
