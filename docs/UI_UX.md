# UI/UX implementation

## Layout and visual language

- A 1280 × 800 logical canvas contains a 728 × 624 board (28 × 24 cells).
- The window fits the desktop on launch and can be resized. Letterboxing preserves the board aspect ratio; mouse input is mapped back into canvas coordinates.
- The header shows score, best score, snake length and Pause.
- The right panel contains portal timing, a 28-letter inventory page, and a green-portal guide. Tutorial instructions replace the guide without covering the board.
- Main actions use mint; secondary actions use neutral panels. Red is reserved for failures. Green portals have visible countdown and penalty labels; there are no other portal types.
- Menu, settings and pause buttons use pygame_gui. Gameplay, inventory and word tiles use Pygame drawing.

## Typography

Noto Sans Thai Regular/Bold is bundled for Thai and Latin. Chakra Petch Bold is bundled for the logo and score. Body text is 18 logical pixels, secondary text 14–16, headings 24–28. Text uses pygame.font (SDL_ttf shaping) and wraps without horizontally stretching glyphs.

The older Noto Sans Thai UI files were evaluated but lack Latin glyphs. The bundled Google Fonts Noto Sans Thai build covers both scripts. Font sources and licenses are in data/fonts/README.md.

Long status and result text has a clipped scroll area, with the action buttons outside it. Thai text with no spaces wraps by glyph clusters rather than being compressed; this is width wrapping, not dictionary-based Thai word segmentation.

## Interaction

- Menus: Tab / Shift+Tab / Up / Down to move focus; Enter / Space to activate.
- Settings: Left / Right or the visible arrow buttons to change a value. Settings apply to the current session.
- Movement: arrows / WASD; Shift or Space to accelerate; P to pause.
- Tutorial: Esc exits; P pauses. Completing the word challenge accepts both mouse and keyboard Continue.
- Word challenge: type A–Z or click tiles, Backspace removes the last letter, Esc clears, F1 auto-arranges an available word.
- Page Up / Down, mouse wheel, or arrow buttons access all collected letters.
- Restart and movement resume use a 3-second countdown with pre-steering. Arrows at the snake head and in the countdown panel show the accepted next direction, including rejected reverse turns.
- Each tutorial step opens a dismissible Thai instruction popup. Close (×), Enter/Space/Esc, or the Continue button acknowledges it. Movement and puzzle timers stay frozen while reading; movement resumes with a countdown and the puzzle starts with its full timer.
- F3 / Pause or the visible puzzle Pause button pauses word challenges without clearing input or consuming time. P remains a typeable letter in the puzzle.
- Losing window focus automatically pauses movement, countdowns and word challenges. Regaining focus does not resume automatically. Word challenges resume directly; moving snakes resume through the countdown.
- Game-over buttons support mouse clicks as well as keyboard shortcuts.

## Correctness fixes

- Fresh tutorials render their own snake, food and portal manager.
- Every challenge starts a new 15/30/45-second timer from the setting; tutorials allow 45 seconds.
- Pause, result screens and countdowns freeze world portal timers together.
- Rendering does not resolve expired challenges; the update/input path does.
- Inventory pages map visible tiles to their actual inventory indices.
- Selected vocabulary levels are enforced at submission.
- Only green portals spawn, regardless of snake length or vocabulary setting. They award standard word points (×1), no bonus tail growth, and cost one tail segment on timeout. Vocabulary settings filter accepted words only.
- Timed-out tutorial puzzles offer Retry with a fresh 45-second timer and no tail/letter penalty, keeping the tutorial completable.
- Tutorial sound respects the sound setting.

## Verification

Tests are intentionally local-only under the ignored `tests/` directory; fresh clones do not contain them. If you have the local suite, run from the repository root:

```sh
python -m unittest discover -s tests -p "test_*.py" -q
python -m tests.test_game
python -m tests.test_vocabulary
```

UI integration tests exercise pygame_gui button events, scaled mouse coordinates at three sizes, all inventory pages, challenge deadlines, timer freezing, focus-loss pause, puzzle pause/resume, repeated tutorial retries, green-only rules, tutorial transitions, game-over controls, font glyphs, Thai wrapping and long result text.

Generate reproducible screenshots:

```sh
python scripts/preview_ui.py --output /tmp/lexisnake-ui
```

Build scripts and CI install requirements.txt plus requirements-build.txt and collect pygame_gui / i18n data. The unified workflow builds Windows x64, macOS arm64/x64 and Linux x64, validates bundled assets, and uploads native archives as Actions artifacts. Manual appearance and native window behavior still need verification on the target operating systems.
