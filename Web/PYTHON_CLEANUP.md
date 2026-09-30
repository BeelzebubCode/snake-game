# บันทึกจัดไฟล์หลังย้ายเป็นเว็บ

สถานะ: ดำเนินการตามขอบเขตที่ผู้ใช้ยืนยันแล้ว วันที่ 30 กันยายน 2026

## เตรียมเสร็จแล้ว

- สำรองซอร์สเดิมบน GitHub ที่ [python-v1-archive](https://github.com/BeelzebubCode/snake-game/tree/python-v1-archive)
- คัดลอกพจนานุกรม 2 ไฟล์ไว้ใน `Web/data-source/` และให้ `npm run data:build` ใช้ที่นี่
- สร้างคำศัพท์เว็บ 32,991 คำจากตำแหน่งใหม่ ผลลัพธ์ตรงกับไฟล์เดิมทุกไบต์
- ฟอนต์และใบอนุญาตที่เว็บใช้อยู่ใน `Web/public/fonts/` แล้ว

## การจัดไฟล์ที่ทำแล้ว

1. ลบไฟล์ Python และทรัพยากรเก่าที่ tracked จำนวน 54 ไฟล์ตามรายการด้านล่างจาก main โดยเรียกคืนได้จาก tag
2. ย้ายไฟล์ local ที่ไม่อยู่ใน Git ได้แก่ `.venv/`, `venv/`, `build/`, `dist/`, cache, `tests/`, ไฟล์ `.spec` และ `data/highscore.txt` เข้า `.legacy-local/python-v1/` ซึ่งอยู่ใน gitignore ไม่มีการทิ้งไฟล์เหล่านี้
3. เปลี่ยน README หลักให้ชี้เว็บ และเก็บลิงก์ซอร์ส/ดาวน์โหลด Python เดิม ปรับเอกสาร CI/CD ให้ตรงกับโครงสร้างที่เหลือเว็บ
4. ตรวจว่าไม่มี path เว็บอ้างไฟล์ Python เก่า จากนั้น build/test และ deploy ตามเดิม

โฟลเดอร์หลักหลังจัด: `Web/`, `.github/`, `.git/`, `.gitignore`, `README.md` และโฟลเดอร์ซ่อน `.legacy-local/`

Environment ที่ย้ายเป็นไฟล์สำรอง ถ้าต้องการใช้ launcher เดิมให้คืนที่เดิมก่อน เพราะมี absolute path เดิมอยู่ภายใน

## รายการไฟล์ tracked ที่นำออกจาก main

- `.github/workflows/build.yml`
- `build_game.py`
- `build_windows.bat`
- `data/build_cefr_dict.py`
- `data/build_en_th_dictionary.py`
- `data/cefr_dictionary.json`
- `data/cefr_words.txt`
- `data/csv/th-en_accommodation.csv`
- `data/csv/th-en_adjective.csv`
- `data/csv/th-en_color.csv`
- `data/csv/th-en_communication.csv`
- `data/csv/th-en_food.csv`
- `data/csv/th-en_health.csv`
- `data/csv/th-en_numbers.csv`
- `data/csv/th-en_orientation.csv`
- `data/csv/th-en_personal-information.csv`
- `data/csv/th-en_shopping.csv`
- `data/csv/th-en_surrounding.csv`
- `data/csv/th-en_technology.csv`
- `data/csv/th-en_time.csv`
- `data/csv/th-en_transport.csv`
- `data/csv/th-en_verb.csv`
- `data/en_th.json`
- `data/extract_oxford_cefr.py`
- `data/fix_ascii_thai.py`
- `data/fonts/ChakraPetch-Bold.ttf`
- `data/fonts/NotoSansThai-Bold.ttf`
- `data/fonts/NotoSansThai-Regular.ttf`
- `data/fonts/OFL-ChakraPetch.txt`
- `data/fonts/OFL-Noto.txt`
- `data/fonts/README.md`
- `data/fonts/Sarabun-Bold.ttf`
- `data/fonts/Sarabun-Regular.ttf`
- `data/integrate_csv_and_nectec.py`
- `data/oxford_ocr_data.py`
- `data/ui_theme.json`
- `data/update_dictionary_meanings.py`
- `docs/UI_UX.md`
- `main.py`
- `requirements-build.txt`
- `requirements.txt`
- `scripts/preview_ui.py`
- `src/__init__.py`
- `src/config.py`
- `src/food.py`
- `src/game.py`
- `src/menus.py`
- `src/portal.py`
- `src/snake.py`
- `src/sound.py`
- `src/tutorial.py`
- `src/ui.py`
- `src/viewport.py`
- `src/vocabulary.py`

## เรียกคืน Python ใน checkout แยก

```bash
git fetch origin tag python-v1-archive
git worktree add ../snake-game-python python-v1-archive
```

อ่านวิธีเปิดเกมและ build ใน README ของ checkout ดังกล่าว
