"""
Integration script for LexiSnake vocabulary database.
1. Reads all CSV files in data/csv/*.csv (user added vocabulary).
2. Queries the NECTEC Open Data CKAN Action API for English-Thai dictionary entries.
3. Merges, cleans, and categorizes new words into CEFR levels (A1, A2, B1, B2, C1, C2).
4. Updates data/en_th.json, data/cefr_dictionary.json, and data/cefr_words.txt.
"""

import os
import sys
import glob
import json
import urllib.request
import time
from typing import Dict, List, Set, Tuple
import nltk
from nltk.corpus import wordnet

nltk.download("wordnet", quiet=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "csv")
EN_TH_PATH = os.path.join(BASE_DIR, "en_th.json")
CEFR_DICT_PATH = os.path.join(BASE_DIR, "cefr_dictionary.json")
CEFR_WORDS_PATH = os.path.join(BASE_DIR, "cefr_words.txt")

NECTEC_API_URL = "https://opend-portal.nectec.or.th/api/3/action/datastore_search?resource_id=200da962-2ffe-4cf4-a22d-6e173a5facbe"

def get_wordnet_definition(word: str) -> str:
    """Retrieve concise English definition using WordNet."""
    try:
        syns = wordnet.synsets(word.lower())
        if syns:
            for s in syns:
                d = s.definition()
                if d and not d.startswith("CEFR") and "vocabulary word" not in d.lower():
                    return d
    except Exception:
        pass
    return f"vocabulary word ({word.lower()})"

def assign_cefr_level(word: str) -> str:
    """Assign appropriate CEFR level based on length and complexity."""
    length = len(word)
    if length <= 4:
        return "A1"
    elif length == 5:
        return "A2"
    elif length == 6:
        return "B1"
    elif length == 7:
        return "B2"
    elif length <= 9:
        return "C1"
    else:
        return "C2"

def run_integration():
    print("🚀 Starting Vocabulary Integration (CSV Files + NECTEC API)...")
    start_time = time.time()

    # 1. Load existing data
    with open(EN_TH_PATH, "r", encoding="utf-8") as f:
        en_th_data: Dict[str, Dict[str, str]] = json.load(f)

    with open(CEFR_DICT_PATH, "r", encoding="utf-8") as f:
        cefr_dict_data: Dict[str, List[Dict[str, str]]] = json.load(f)

    existing_words: Set[str] = set(en_th_data.keys())
    print(f"📊 Existing vocabulary count: {len(existing_words)} words.")

    # Track existing levels
    word_levels: Dict[str, str] = {}
    for level, w_list in cefr_dict_data.items():
        for item in w_list:
            word_levels[item["word"].upper()] = level

    # 2. Process CSV files
    csv_words_added = 0
    csv_words_updated = 0

    if os.path.exists(CSV_DIR):
        csv_files = glob.glob(os.path.join(CSV_DIR, "*.csv"))
        print(f"📂 Found {len(csv_files)} CSV files in {CSV_DIR}...")
        for filepath in csv_files:
            filename = os.path.basename(filepath)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fp:
                for line in fp:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split(";")
                    if len(parts) >= 2:
                        raw_w = parts[0].strip().upper()
                        # Auto-clean prefixes like 'TO ', parentheses '(...)', and punctuation
                        if raw_w.startswith("TO "):
                            raw_w = raw_w[3:].strip()
                        import re
                        raw_w = re.sub(r"\(.*?\)", "", raw_w).strip()
                        raw_w = re.sub(r"[^A-ZÉÈÔa-zéèô]", "", raw_w).upper()

                        clean_w = raw_w.replace("É", "E").replace("È", "E").replace("Ô", "O")
                        th = parts[1].strip()

                        if clean_w and th and clean_w.isalpha() and 2 <= len(clean_w) <= 14:
                            en_def = get_wordnet_definition(clean_w)
                            en_th_data[clean_w] = {"en": en_def, "th": th}

                            if clean_w not in existing_words:
                                level = assign_cefr_level(clean_w)
                                cefr_dict_data.setdefault(level, []).append({
                                    "word": clean_w,
                                    "meaning": en_def
                                })
                                existing_words.add(clean_w)
                                word_levels[clean_w] = level
                                csv_words_added += 1
                            else:
                                csv_words_updated += 1
        print(f"✅ CSV Processing complete: {csv_words_added} new words added, {csv_words_updated} existing translations updated.")

    # 3. Fetch from NECTEC CKAN Action API
    print("🌐 Fetching NECTEC CKAN Action API dataset...")
    nectec_added = 0
    limit = 10000
    total_nectec_records = 83232

    for offset in range(0, total_nectec_records, limit):
        url = f"{NECTEC_API_URL}&limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                api_res = json.loads(resp.read().decode("utf-8"))
                records = api_res.get("result", {}).get("records", [])
                for r in records:
                    e_entry = (r.get("e-search") or r.get("e-entry") or "").strip().upper()
                    t_entry = (r.get("t-entry") or "").strip()

                    # Clean and validate single word
                    clean_w = e_entry.replace("É", "E").replace("È", "E")
                    if (
                        clean_w
                        and t_entry
                        and clean_w.isalpha()
                        and 3 <= len(clean_w) <= 12
                        and " " not in clean_w
                        and clean_w not in existing_words
                    ):
                        # Filter out noisy or overly long raw HTML/definitions
                        if len(t_entry) > 80:
                            continue

                        en_def = get_wordnet_definition(clean_w)
                        en_th_data[clean_w] = {"en": en_def, "th": t_entry}

                        level = assign_cefr_level(clean_w)
                        cefr_dict_data.setdefault(level, []).append({
                            "word": clean_w,
                            "meaning": en_def
                        })
                        existing_words.add(clean_w)
                        word_levels[clean_w] = level
                        nectec_added += 1

                print(f"  Offset {offset:5d}/{total_nectec_records} -> Total words in database: {len(existing_words)} (Added +{nectec_added} from NECTEC)")
        except Exception as e:
            print(f"⚠️ Error fetching NECTEC API offset {offset}: {e}")

    # 4. Save updated data files
    print("💾 Saving updated dataset to files...")

    # Save en_th.json
    with open(EN_TH_PATH, "w", encoding="utf-8") as f:
        json.dump(en_th_data, f, ensure_ascii=False, indent=2)

    # Save cefr_dictionary.json
    with open(CEFR_DICT_PATH, "w", encoding="utf-8") as f:
        json.dump(cefr_dict_data, f, ensure_ascii=False, indent=2)

    # Save cefr_words.txt
    sorted_words = sorted(list(existing_words))
    with open(CEFR_WORDS_PATH, "w", encoding="utf-8") as f:
        for w in sorted_words:
            f.write(f"{w}\n")

    elapsed = time.time() - start_time
    print("=" * 65)
    print(f"🎉 INTEGRATION COMPLETE in {elapsed:.2f} seconds!")
    print(f"📊 Final Vocabulary Stats:")
    print(f"   - Total Words in Game: {len(existing_words)}")
    print(f"   - CSV New Words: +{csv_words_added}")
    print(f"   - NECTEC API New Words: +{nectec_added}")
    print(f"   - CEFR Level Breakdown:")
    for lvl in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        print(f"     • {lvl}: {len(cefr_dict_data.get(lvl, []))} words")
    print("=" * 65)

if __name__ == "__main__":
    run_integration()
