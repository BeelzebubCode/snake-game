# CI/CD ของ LexiSnake Web

## เส้นทางการเผยแพร่

เว็บ production: [lexisnake.vercel.app](https://lexisnake.vercel.app)

- GitHub repository: [BeelzebubCode/snake-game](https://github.com/BeelzebubCode/snake-game)
- Vercel project: **lexisnake** ในทีม **beelzebubcodes-projects**
- Production branch: **main**
- Root Directory: **Web**
- Node.js: **22.x**
- Install: **npm ci**
- Build: **npm run verify**
- Output: **dist**

## GitHub Actions — CI

ไฟล์ ../.github/workflows/web-ci.yml ทำงานเมื่อ push หรือเปิด PR ที่เปลี่ยน Web/ หรือ workflow นี้ และสั่งรันเองผ่าน Actions ได้

ตรวจรูปแบบโค้ด → unit tests → TypeScript/production build → Playwright Chromium
เก็บ build artifact 7 วัน และเก็บ trace/screenshot เมื่อ browser test ไม่ผ่าน

รันในเครื่อง:

    cd Web
    npm ci
    npm run verify
    npm run test:e2e

## Vercel — CD

เชื่อม repository ด้วย Vercel Git Integration:

- Push branch อื่น → Preview deployment
- Push/merge เข้า main → Production deployment
- ดู URL และสถานะได้จาก Vercel Dashboard และ GitHub commit checks

Vercel รัน npm run verify ก่อนเผยแพร่ทุกครั้ง จึงต้องผ่าน format check, unit tests และ build ส่วน browser tests รันแยกบน GitHub Actions; integration นี้ไม่ได้รอผล browser tests ก่อนเริ่ม deployment

ไม่ต้องเก็บ VERCEL_TOKEN ใน GitHub Secrets สำหรับวิธีนี้ การเชื่อม GitHub ใช้สิทธิ์ของ Vercel Git Integration
ไฟล์ .vercel/ และ .env* เป็นข้อมูลเฉพาะเครื่องและถูก gitignore

## โครงสร้างรุ่นเก่า

Python อยู่ที่ root เพื่ออ้างอิงและใช้งานรุ่นเดิม Workflow แจกไฟล์ native ใช้เฉพาะ tag v1.* เวอร์ชันเว็บเผยแพร่ผ่าน Git โดยไม่ต้องสร้าง release tag

## เอกสารผู้ให้บริการ

- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- [เชื่อม Git ผ่าน Vercel CLI](https://vercel.com/docs/cli/git)
- [GitHub Actions สำหรับ Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
