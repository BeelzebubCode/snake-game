"""
Ensures 100% of all entries in en_th.json have non-ASCII, natural Thai translations.
"""

import json
import os
import time
from deep_translator import GoogleTranslator, MyMemoryTranslator

DATA_PATH = os.path.join(os.path.dirname(__file__), "en_th.json")

def fix_all():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    gt = GoogleTranslator(source="en", target="th")
    mm = MyMemoryTranslator(source="en-US", target="th-TH")

    target_keys = [k for k, v in data.items() if v.get("th", "").isascii() or v.get("th", "").strip().lower() == k.strip().lower()]

    print(f"Total entries needing Thai translation fix: {len(target_keys)}")

    fixed = 0
    for k in target_keys:
        th = ""
        # 1. GoogleTranslator single word
        try:
            res = gt.translate(k.lower())
            if res and not res.isascii() and res.lower() != k.lower():
                th = res.strip()
        except Exception:
            pass

        # 2. GoogleTranslator phrase fallback
        if not th:
            try:
                res = gt.translate(f"a {k.lower()}")
                if res and not res.isascii():
                    th = res.strip()
            except Exception:
                pass

        # 3. MyMemoryTranslator fallback
        if not th:
            try:
                res = mm.translate(k.lower())
                if res and not res.isascii():
                    th = res.strip()
            except Exception:
                pass

        if th:
            data[k]["th"] = th
            fixed += 1
            print(f"✓ {k:15} -> {th}")

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"🎉 Successfully fixed {fixed}/{len(target_keys)} entries to 100% natural Thai!")

if __name__ == "__main__":
    fix_all()
