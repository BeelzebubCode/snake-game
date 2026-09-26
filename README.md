# LexiSnake — เกมงูเก็บตัวอักษรและสร้างคำศัพท์

[![Build](https://github.com/BeelzebubCode/snake-game/actions/workflows/build.yml/badge.svg)](https://github.com/BeelzebubCode/snake-game/actions/workflows/build.yml)

บังคับงูเก็บตัวอักษร เข้าประตูเขียว แล้วเรียงเป็นคำภาษาอังกฤษเพื่อรับคะแนน มีคำศัพท์ระดับ CEFR A1–C2 พร้อมคำแปลไทย เล่นแบบออฟไลน์ได้หลังติดตั้งหรือดาวน์โหลดไฟล์เกม

## ดาวน์โหลดแล้วเล่น (ไม่ต้องติดตั้ง Python)

ไฟล์เกมสำเร็จรูปอยู่ใน **GitHub Actions → Artifacts** ไม่ใช่ปุ่ม **Code → Download ZIP** ซึ่งดาวน์โหลดเฉพาะซอร์สโค้ด

1. เข้าสู่ระบบ GitHub แล้วเปิด [หน้า Build](https://github.com/BeelzebubCode/snake-game/actions/workflows/build.yml)
2. เลือกรอบ build ล่าสุดของ branch `main` ที่สำเร็จ (เครื่องหมายถูกสีเขียว) ตรวจ commit ให้ตรงกับเวอร์ชันที่ต้องการ
3. เลื่อนลงไปที่ **Artifacts** แล้วเลือกไฟล์ตรงกับระบบและชิปตามตาราง
4. แตก ZIP ที่ GitHub ดาวน์โหลดให้ จะได้ archive ของเกมอีกชั้น จากนั้นแตก archive นั้นตามวิธีด้านล่าง

| ระบบ | Artifact | ไฟล์เกมภายใน |
| --- | --- | --- |
| Windows x64 | `LexiSnake-Windows-x64` | `LexiSnake-Windows-x64.zip` → `LexiSnake/LexiSnake.exe` |
| macOS Apple Silicon (M1/M2/M3/รุ่นใหม่กว่า) | `LexiSnake-macOS-arm64` | `LexiSnake-macOS-arm64.zip` → `LexiSnake.app` |
| macOS Intel | `LexiSnake-macOS-x64` | `LexiSnake-macOS-x64.zip` → `LexiSnake.app` |
| Linux x64 | `LexiSnake-Linux-x64` | `LexiSnake-Linux-x64.tar.gz` → `LexiSnake/LexiSnake` |

Artifact เก็บไว้ 30 วันตาม workflow นี้ หากไฟล์หมดอายุ เจ้าของ repository สามารถกด **Run workflow** เพื่อสร้างใหม่ หรือเล่นจากซอร์สตามหัวข้อถัดไปได้ ต้องเข้าสู่ระบบและมีสิทธิ์อ่าน repository จึงดาวน์โหลด Artifact ได้ ([คู่มือ GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts))

> รอบ build เก่ามีชื่อ `LexiSnake-Windows`, `LexiSnake-macOS` หรือ `LexiSnake-Windows-Executable` ให้เลือกชื่อใหม่จากรอบล่าสุดเพื่อใช้ UI และกติกาปัจจุบัน การ push ไม่ได้สร้าง GitHub Release อัตโนมัติ

### Windows

1. เลือก `LexiSnake-Windows-x64` สำหรับ Windows แบบ 64 บิต (x64)
2. แตก ZIP ทั้งสองชั้นด้วย **Extract All**
3. เปิด `LexiSnake.exe` ในโฟลเดอร์ `LexiSnake`
4. เก็บโฟลเดอร์ `_internal` ไว้ข้างไฟล์ EXE เสมอ ห้ามย้ายเฉพาะ EXE ออกมา

ไฟล์ยังไม่ได้เซ็นรับรองผู้เผยแพร่ Windows อาจแสดงคำเตือน ควรตรวจว่าดาวน์โหลดจาก repository นี้และ build ที่เชื่อถือได้ ไม่ต้องปิดระบบป้องกันของเครื่อง หากไม่สะดวกใช้ไฟล์ unsigned ให้เล่นจากซอร์สแทน

### macOS

1. เปิด **Apple menu → About This Mac** ดูว่าเป็นชิป Apple หรือ Intel แล้วเลือก Artifact ให้ตรง
2. แตก ZIP ทั้งสองชั้น จะได้ `LexiSnake.app`
3. ลากแอปไปยัง `Applications` หรือโฟลเดอร์ที่ต้องการ แล้วเปิดแอป

ไฟล์ CI สร้างบน macOS 15 แยก Apple Silicon/Intel แนะนำ macOS 15 ขึ้นไป แอปยังไม่ได้ Developer ID signing/notarization จึงอาจถูก Gatekeeper เตือนหรือบล็อก อย่าปิดการป้องกันทั้งระบบ หากเปิดไม่ได้ให้ใช้วิธีรันจากซอร์สด้านล่าง

### Linux

ไฟล์ CI เป็น x64 สร้างบน Ubuntu 22.04 เหมาะกับ Ubuntu 22.04 ขึ้นไปหรือระบบ glibc ที่เข้ากันได้ ไม่ใช่ไฟล์สำหรับ ARM หรือ Alpine/musl ต้องมี graphical desktop เพื่อเล่นเกม

หลังแตก ZIP ชั้นแรก เปิด Terminal ในโฟลเดอร์ที่มี archive แล้วรัน:

```bash
tar -xzf LexiSnake-Linux-x64.tar.gz
cd LexiSnake
./LexiSnake
```

ต้องเก็บ `_internal/` ไว้คู่กับตัวเกม หากไม่มีสิทธิ์เรียกใช้ให้รัน `chmod +x LexiSnake` เฉพาะตัวเกม หากเครื่องไม่ตรงกับ binary ที่แจก ให้ใช้ซอร์สหรือ build บนเครื่องนั้นเอง

## เล่นจากซอร์ส (Windows / macOS / Linux)

แนะนำ **Python 3.12** พร้อม pip และ venv ดาวน์โหลดซอร์สด้วย [Code → Download ZIP](https://github.com/BeelzebubCode/snake-game/archive/refs/heads/main.zip) แล้วแตกไฟล์ หรือใช้ Git:

```bash
git clone https://github.com/BeelzebubCode/snake-game.git
cd snake-game
```

หากโหลด ZIP ให้เปิด Terminal/PowerShell ในโฟลเดอร์ที่มี `main.py` และ `requirements.txt` ก่อน ใช้ virtual environment แยกจาก Python ของระบบ โดยไม่จำเป็นต้อง activate:

### Windows — PowerShell

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

### macOS — Terminal

ติดตั้ง Python 3.12 ที่มี pip จาก [python.org](https://www.python.org/downloads/macos/) ก่อน แล้วรัน:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python main.py
```

### Linux — Terminal

ใช้ Python 3.12 หรือ Python 3.10 ขึ้นไปที่มี pip/venv หาก `venv` ใช้งานไม่ได้ ให้ติดตั้งแพ็กเกจ venv ของ Python เวอร์ชันนั้นผ่าน package manager ของระบบ แล้วรัน:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python main.py
```

ถ้า prompt ขึ้น `(venv)` อยู่แล้ว ให้ใช้ `python -m pip install -r requirements.txt` และ `python main.py` ได้ทันที ชื่อไฟล์ต้องเป็น `requirements.txt` ครบทั้งนามสกุล

Dependencies หลักคือ `pygame-ce` และ `pygame_gui` ฟอนต์ภาษาไทย/อังกฤษและพจนานุกรมรวมอยู่ในโครงการ ไม่ต้องดาวน์โหลดเพิ่มขณะเล่น

หากเจอ `ModuleNotFoundError: No module named 'pygame_gui'` หรือ `pygame` ให้ตรวจว่าใช้ Python ตัวเดียวกับที่ติดตั้ง dependencies: บน macOS/Linux รัน `.venv/bin/python -m pip install -r requirements.txt` แล้ว `.venv/bin/python main.py`; บน Windows ใช้ `.venv\Scripts\python.exe` แทน `python3` เครื่องหมาย `(.venv)` ที่พรอมป์ไม่จำเป็นเมื่อเรียก Python ใน `.venv` โดยตรง

## วิธีเล่นและปุ่มควบคุม

- **WASD / ลูกศร**: เลี้ยวงู • **Shift / Space**: เร่งความเร็ว
- เก็บตัวอักษรไว้ในแผงขวา แล้วเข้าประตูเขียวขนาด 3×3 ช่อง
- พิมพ์ **A–Z** หรือคลิกตัวอักษร • **Enter**: ส่งคำ • **Backspace**: ลบตัวท้าย • **Esc**: ล้างคำ
- **F1**: ช่วยเรียงคำ • **Page Up / Page Down**: เปลี่ยนหน้าตัวอักษร
- **P / Esc**: พักขณะบังคับงู • **F3 / ปุ่มพัก**: พักขณะเรียงคำ
- สลับหน้าต่างแล้วเกมพักอัตโนมัติ เมื่อพร้อมให้กดเล่นต่อ
- เมนูใช้ **Tab / ลูกศร** เลือกและ **Enter** ยืนยัน
- Tutorial: แต่ละบทเรียนมีป๊อปอัปพักเกมให้อ่าน กด **× / Enter** หรือปุ่ม “เข้าใจแล้ว” เพื่อปิด; **Esc** ปิดป๊อปอัป และออกจากบทเรียนเมื่ออยู่บนสนาม; หมดเวลาสร้างคำแล้วลองใหม่ได้โดยไม่หักหาง
- ช่วงนับถอยหลังมีลูกศรที่หัวงูและด้านบน แสดงทิศทางที่จะเดินจริงตาม WASD / ลูกศร (ห้ามกลับหลังเข้าลำตัว)

มีเฉพาะประตูเขียว: ได้คะแนนคำศัพท์ปกติ ×1; หมดเวลาหางลด 1 ข้อ แต่ตัวอักษรยังอยู่ หางต้องเหลืออย่างน้อย 3 ข้อ เลือกระดับคำศัพท์ ความเร็ว เวลา 15/30/45 วินาที สีงู เส้นตาราง และเสียงได้ใน Settings

## Build ไฟล์เกมเอง

ต้อง build บนระบบปลายทาง: Windows สร้าง EXE, macOS สร้าง APP, Linux สร้าง ELF ไม่ใช่การ cross-compile ข้ามระบบ

หลังติดตั้ง dependencies สำหรับเล่นแล้ว:

**Windows (PowerShell)**

```powershell
.\.venv\Scripts\python.exe build_game.py --archive
```

**macOS / Linux**

```bash
.venv/bin/python build_game.py --archive
```

สคริปต์ติดตั้ง PyInstaller จาก `requirements-build.txt`, ตรวจ executable และไฟล์ฟอนต์/พจนานุกรม/theme ที่จำเป็น แล้วสร้าง archive ใน `dist/` ตาม OS และสถาปัตยกรรมเครื่อง หรือเปิด `build_windows.bat` บน Windows ได้

ตัวเลือก:

- `--skip-install`: ใช้ dependencies ที่ติดตั้งแล้ว
- `--onefile`: รวมเป็น executable เดียว (CI ใช้แบบโฟลเดอร์)
- `--output-dir PATH` / `--work-dir PATH`: เปลี่ยนตำแหน่ง output และไฟล์ชั่วคราว

ดูรายละเอียดการจัดวางและฟอนต์ใน [UI/UX notes](docs/UI_UX.md) และ [Font licenses](data/fonts/README.md)
