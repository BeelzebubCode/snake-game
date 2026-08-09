# 🐍 LexiSnake - CEFR Anagram Snake Game

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![Pygame-CE](https://img.shields.io/badge/Pygame--CE-2.5.7-green?style=flat)](https://pyga.me)
[![Build Executables](https://github.com/BeelzebubCode/snake-game/actions/workflows/build.yml/badge.svg)](https://github.com/BeelzebubCode/snake-game/actions/workflows/build.yml)

An action-packed educational Snake game that combines classic arcade mechanics with **Oxford 3000 CEFR English Anagram Decoding**! Eat floating letters on the grid, accumulate them into your Foot Bar inventory, and enter dynamic **3x3 Isekai Portals** (Green, Yellow, Red) to unlock anagram word challenges!

---

## 🌟 Key Features

- 🐍 **Ultra-Modern 3D Neon Snake Skins**:
  - Expressive directional eyes with sparkle pupils.
  - 4 Dynamic Skin Color Palettes (`NEON MINT`, `CYBER PURPLE`, `GOLDEN FIRE`, `OCEAN BLUE`).
  - Glossy 3D glass highlight aesthetics & 60 FPS sub-pixel smooth movement.
- 📚 **3,000+ Oxford CEFR Vocabulary Database**:
  - Full CEFR levels (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`) with English definitions & Thai translations.
  - Anagram solver engine & F1 Thai Clue / Hint system.
- 🌀 **3x3 Isekai Portals (Green, Yellow, Red)**:
  - **Green Portal**: Standard points (1.0x). Shrinks tail by 1 segment on failure.
  - **Yellow Portal**: 1.5x Multiplier + 500 Bonus PTS. Shrinks tail by 2 segments on failure.
  - **Red Portal**: 2.5x Multiplier + 1,500 Bonus PTS + Tail Growth (+2). Shrinks tail by 4 segments on failure.
- 🎒 **Inventory Retention System**:
  - Letter inventory in Foot Bar is **retained** even if a portal challenge is lost! Collect letters continuously to build massive high-scoring words.
- 🎓 **Interactive 5-Step Guided Tutorial**:
  - Decoupled `TutorialController` architecture. Safe respawn teleports in steps 1-4 and real Game Over death rules in Step 5/5.
- 🏆 **High Score Persistence**:
  - High score automatically saved to `data/highscore.txt` and preserved across game launches.
- ⚙️ **6-Option Settings & Customization**:
  - Snake Speed (`SLOW 6 FPS`, `NORMAL 8 FPS`, `FAST 12 FPS`, `TURBO 16 FPS`).
  - Puzzle Timer (`15s`, `30s`, `45s`).
  - Vocab Difficulty (`ALL CEFR`, `BEGINNER`, `ADVANCED`).
  - Grid Guidelines (`SHOW GRID`, `CLEAN GRID`).
  - Audio & Sound Effects (`ON`, `MUTED`).

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- `pygame-ce`

### 2. Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the Game
```bash
python3 main.py
```

---

## 🧪 Automated Unit & Integration Tests

Run the full automated test suite (13 Test Cases):
```bash
python3 test_suite.py
```

---

## 📦 Building Standalone Executables (Windows & macOS)

### Automated Build Script:
```bash
python3 build_game.py
```
Output files will be generated in `dist/LexiSnake`.

### GitHub Actions CI/CD:
Every push or release automatically triggers `.github/workflows/build.yml` to compile **`LexiSnake-Windows.zip`** (`.exe`) and **`LexiSnake-macOS.zip`** (`.app`) binaries in the GitHub Actions / Releases tab!

---

## 📄 License
MIT License. Created by [BeelzebubCode](https://github.com/BeelzebubCode).
