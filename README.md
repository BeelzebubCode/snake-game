# LexiSnake — เกมงูเก็บตัวอักษรและสร้างคำศัพท์

[![Download V 1.0.1](https://img.shields.io/badge/Download-V%201.0.1-43d9a3)](https://github.com/BeelzebubCode/snake-game/releases/tag/v1.0.1)

บังคับงูเก็บตัวอักษร เข้าประตูเขียว แล้วเรียงเป็นคำภาษาอังกฤษเพื่อรับคะแนน มีคำศัพท์ระดับ CEFR A1–C2 พร้อมคำแปลไทย เล่นแบบออฟไลน์ได้หลังติดตั้งหรือดาวน์โหลดไฟล์เกม

## V2 — เล่นบนเว็บ

เวอร์ชันเว็บอยู่ใน [Web/](Web/README.md): React + TypeScript + Phaser พร้อมแมพ 4 แบบ ตัวเลือกสีงู หัวใจฟื้นคืนชีพ และกล่องตัวอักษร

เปิดในเครื่องด้วย `cd Web && npm ci && npm run dev`

[GitHub Actions](https://github.com/BeelzebubCode/snake-game/actions/workflows/web-ci.yml) ตรวจเกมอัตโนมัติ และ Vercel เผยแพร่จาก main ดู [การตั้งค่า CI/CD](Web/DEPLOYMENT.md)

รายละเอียดด้านล่างเป็นรุ่น Python V1 สำหรับดาวน์โหลด

## ดาวน์โหลดแล้วเล่น (ไม่ต้องติดตั้ง Python)

### [V 1.0.1 — Download](https://github.com/BeelzebubCode/snake-game/releases/tag/v1.0.1)

เลือกดาวน์โหลดไฟล์เดียวให้ตรงกับเครื่อง ไม่ต้องเลือกจากประวัติ Actions และไม่ต้องเข้าสู่ระบบ GitHub

| ระบบ | ดาวน์โหลด |
| --- | --- |
| Windows 64 บิต (x64) | [ดาวน์โหลด Windows](https://github.com/BeelzebubCode/snake-game/releases/download/v1.0.1/LexiSnake-Windows-x64.zip) |
| macOS ชิป Apple (M1 ขึ้นไป) | [ดาวน์โหลด macOS Apple Silicon](https://github.com/BeelzebubCode/snake-game/releases/download/v1.0.1/LexiSnake-macOS-arm64.zip) |
| macOS ชิป Intel | [ดาวน์โหลด macOS Intel](https://github.com/BeelzebubCode/snake-game/releases/download/v1.0.1/LexiSnake-macOS-x64.zip) |
| Linux 64 บิต (x64) | [ดาวน์โหลด Linux](https://github.com/BeelzebubCode/snake-game/releases/download/v1.0.1/LexiSnake-Linux-x64.tar.gz) |

> ปุ่ม **Source code** และ **Code → Download ZIP** เป็นซอร์สโค้ด ไม่ใช่ตัวเกมพร้อมเล่น

### Windows

1. เลือก `LexiSnake-Windows-x64` สำหรับ Windows แบบ 64 บิต (x64)
2. แตก ZIP ด้วย **Extract All**
3. เปิด `LexiSnake.exe` ในโฟลเดอร์ `LexiSnake`
4. เก็บโฟลเดอร์ `_internal` ไว้ข้างไฟล์ EXE เสมอ ห้ามย้ายเฉพาะ EXE ออกมา

ไฟล์ยังไม่ได้เซ็นรับรองผู้เผยแพร่ Windows อาจแสดงคำเตือน ควรตรวจว่าดาวน์โหลดจาก repository นี้และ build ที่เชื่อถือได้ ไม่ต้องปิดระบบป้องกันของเครื่อง หากไม่สะดวกใช้ไฟล์ unsigned ให้เล่นจากซอร์สแทน

### macOS

1. เปิด **Apple menu → About This Mac** ดูว่าเป็นชิป Apple หรือ Intel แล้วเลือกไฟล์ดาวน์โหลดให้ตรง
2. แตก ZIP จะได้ `LexiSnake.app`
3. ลากแอปไปยัง `Applications` หรือโฟลเดอร์ที่ต้องการ แล้วเปิดแอป

ไฟล์ CI สร้างบน macOS 15 แยก Apple Silicon/Intel แนะนำ macOS 15 ขึ้นไป แอปยังไม่ได้ Developer ID signing/notarization จึงอาจถูก Gatekeeper เตือนหรือบล็อก อย่าปิดการป้องกันทั้งระบบ หากเปิดไม่ได้ให้ใช้วิธีรันจากซอร์สด้านล่าง

### Linux

ไฟล์ CI เป็น x64 สร้างบน Ubuntu 22.04 เหมาะกับ Ubuntu 22.04 ขึ้นไปหรือระบบ glibc ที่เข้ากันได้ ไม่ใช่ไฟล์สำหรับ ARM หรือ Alpine/musl ต้องมี graphical desktop เพื่อเล่นเกม

หลังดาวน์โหลด เปิด Terminal ในโฟลเดอร์ที่มี archive แล้วรัน:

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

## มีอะไรใหม่ใน V 1.0.1

- ประตูแสดงเฉพาะภาพและเวลาที่เหลือ เอา `×1 / -1` และขนาดประตูออกจากคำแนะนำ
- เมนู ตั้งค่า ข้อความตอบคำผิด และหน้าจบเกมเป็นภาษาไทย อ่านง่ายขึ้น
- ชื่อความเร็วใช้ ช้า / ปกติ / เร็ว / เร็วมาก ไม่แสดงค่าทางเทคนิค
- กติกา คะแนน และความเร็วจริงยังเหมือนเดิม

## วิธีเล่นและปุ่มควบคุม

- **WASD / ลูกศร**: เลี้ยวงู • **Shift / Space**: เร่งความเร็ว
- เก็บตัวอักษรไว้ในแผงขวา แล้วเข้าประตูสีเขียว
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
