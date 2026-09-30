# LexiSnake — เกมงูเก็บอักษรและเรียงคำ

## [เล่นบนเว็บ](https://lexisnake.vercel.app)

เกมเว็บ React + TypeScript + Phaser บังคับงูเก็บอักษร เปิดกล่องสมบัติ แล้วเข้าประตูเพื่อเรียงคำภาษาอังกฤษ พร้อมคำแปลไทย

- บทฝึก 7 ขั้นพร้อมภาพ มีช่วงให้ทดลองและกดไปต่อเอง
- ความเร็วเริ่มต้น “ช้า” 6 ช่องต่อวินาที ตรงกับระดับช้าของ Python
- แมพ 4 แบบ สกินงู 4 ชุด ตั้งค่าผ่าน popup ที่แบ่งหมวด
- หัวใจฟื้นคืนชีพ 3 ดวง กล่องเงิน/ทอง/ม่วง/แดง และสมุดคำศัพท์
- รองรับคีย์บอร์ด ปุ่มสัมผัส และการบันทึกในเบราว์เซอร์

## เปิดในเครื่อง

ใช้ Node.js 22.12 ขึ้นไปในสาย 22.x

```bash
cd Web
npm ci
npm run dev
```

ตรวจและ build:

```bash
npm run verify
npm run test:e2e
```

## โครงสร้าง

| ตำแหน่ง | เนื้อหา |
| --- | --- |
| `Web/src/` | หน้าจอ กติกาเกม และตัววาดสนาม |
| `Web/public/` | คลังศัพท์ที่ใช้ในเกม ฟอนต์ และใบอนุญาต |
| `Web/data-source/` | พจนานุกรมต้นทาง สร้างข้อมูลเว็บด้วย `npm run data:build` |
| `Web/tests/`, `Web/e2e/` | ชุดทดสอบกติกาและการเล่นผ่านเบราว์เซอร์ |
| `.github/workflows/web-ci.yml` | ตรวจเว็บอัตโนมัติบน GitHub |

อ่าน [คู่มือเว็บ](Web/README.md), [กติกา V2](Web/V2_SPEC.md) และ [CI/CD บน GitHub + Vercel](Web/DEPLOYMENT.md)

## Python รุ่นเดิม

ซอร์ส Python เก็บไว้ที่ [tag python-v1-archive](https://github.com/BeelzebubCode/snake-game/tree/python-v1-archive) และยังดาวน์โหลดเกมเดิมได้จาก [Release v1.0.1](https://github.com/BeelzebubCode/snake-game/releases/tag/v1.0.1)

เปิดซอร์สเดิมใน checkout แยก:

```bash
git fetch origin tag python-v1-archive
git worktree add ../snake-game-python python-v1-archive
```

ไฟล์ local เดิมของเครื่องนี้เก็บใน `.legacy-local/python-v1/` และไม่ขึ้น Git รายละเอียดอยู่ใน [บันทึกการจัดไฟล์](Web/PYTHON_CLEANUP.md)
