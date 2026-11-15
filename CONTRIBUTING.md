# Contributing Guidelines — TeeWangMai? (ที่ว่างไหม?)

เพื่อความเป็นระเบียบและลดข้อผิดพลาดในการทำงานร่วมกัน โปรดปฏิบัติตามข้อกำหนดด้าน Git Branch, Commit Message และแนวทางการพัฒนาด้านล่างนี้อย่างเคร่งครัด

---

## 1. ข้อกำหนดการตั้งและจัดการ Branch (Branching Strategy)

โครงสร้าง Branch ของโปรเจกต์นี้กำหนดให้แบ่งลำดับชั้นอย่างชัดเจนดังนี้:

```text
main (Production / Deployment)
  ▲
  │ (Pull Request เมื่อพร้อม Release)
development (Integration / Staging)
  ▲
  ├── FE-XXX (ตัวอย่าง branch ฐานที่มี implementation)
  │     ▲
  │     └── FE-YYY (Ticket ลูก เฉพาะเมื่อพึ่งโค้ดฐานจริง)
  ├── FE-ZZZ (Frontend Ticket อิสระ)
  └── BE-XXX (Backend / Database Features)
```

### รายละเอียดและกฎของแต่ละ Branch:

| Branch | แตกกิ่งมาจาก | Merge กลับเข้า | คำอธิบายและข้อบังคับ |
| :--- | :--- | :--- | :--- |
| **`main`** | — | — | **สำหรับ Production / Deploy เท่านั้น** นิ่งและเสถียรที่สุด **ห้าม Push ตรงเด็ดขาด** รับ Merge จาก `development` เท่านั้น |
| **`development`** | `main` | `main` | **ศูนย์รวมฟีเจอร์ล่าสุดของทีม** ใช้รับงานที่เสร็จแล้วจาก `FE-XXX` / `BE-XXX` ห้าม Push ตรง ต้องผ่าน Pull Request |
| **Epic `FE-XXX`** | `development` | `development` | มี implementation ตั้งต้นและ commits ของตัวเองก่อนแตก Ticket ลูก ไม่สร้าง Epic เป็นเพียง branch ว่าง |
| **Ticket ลูก `FE-XXX` / `BE-XXX`** | commit ฐานของ Epic หรือ Ticket แม่ที่พึ่งพาจริง | PR ตั้ง base เป็น branch แม่ระหว่างรอรีวิว แล้ว retarget เข้า `development` หลัง PR แม่ merge | ระบุ PR แม่, SHA ฐาน และขอบเขต diff; ระบุ Epic เมื่อมี; **ห้าม Merge เข้า main** |
| **Ticket อิสระ `FE-XXX` / `BE-XXX`** | `development` | `development` | งานที่ไม่มี code dependency ไม่ต้องต่อ stack; **ห้ามแตกจาก main และห้าม Merge เข้า main** |

### รูปแบบการตั้งชื่อ Branch ย่อย (Sub-branches):

ชื่อ branch งานใช้เฉพาะรหัส Ticket/Task ไม่เติมคำอธิบายต่อท้าย:

- `FE-013` — ตัวอย่างงาน UI ตามแผนปัจจุบัน
- `BE-005` — ตัวอย่างงาน API

รายละเอียดงานให้ระบุในชื่อและ description ของ PR แทนชื่อ branch
กติกานี้ใช้กับการตั้งชื่อ branch งานใหม่ ไม่เปลี่ยนชื่อ branch เก่าของทีมโดยอัตโนมัติ

ใช้รหัสและขอบเขตจาก Ticket ที่รับจริง ไม่สร้าง Ticket ใหม่ให้ chore/docs โดยอัตโนมัติ
งาน UI กับเชื่อม API แยกกัน งาน UI ไม่ต้องรอ endpoint และไม่เพิ่ม mock data
แผนงานที่ยังไม่เริ่มปัจจุบันเป็น Ticket แยก ไม่บังคับสร้าง Epic หรือ stack ทุกงาน
ใช้ stacked PR เมื่อมี code dependency จริงเท่านั้น เลข Task ไม่ได้กำหนด dependency

### Epic และ stacked PR

1. เจ้าของ Epic แตก branch จาก `development` ทำฟีเจอร์ตั้งต้นตาม Acceptance
   Criteria ของ Epic ให้มีโค้ดจริง เช่น หน้า UI, components และ props/callback
   boundary โดยไม่มี mock data หาก Ticket ฐานไม่ใช่ Epic ก็ใช้ขั้นตอน stack เดียวกันได้
2. เมื่อฐาน UI พร้อมและมี commit ที่ตรวจได้ เปิด PR ของ Epic เข้า `development`
   จากนั้นจึงแตก Ticket ลูกจาก commit ฐานนั้น ไม่ต้องรอ API หรือให้ Epic เป็น Done
3. PR ลูกตั้ง base เป็น branch แม่เพื่อให้ diff มีเฉพาะโค้ดของลูก ระบุ PR แม่และ
   commit ฐานที่แตกมา อย่า merge ลูกเข้าแม่ก่อน PR แม่ merge เพราะจะทำให้ scope
   ของ PR แม่รวมงานที่ยังไม่ได้ review
4. Merge PR แม่ก่อน แล้วปรับฐาน branch ลูกให้มีเฉพาะ commits ของลูกบน
   `origin/development` ล่าสุด จากนั้นเปลี่ยน base ของ PR ลูกเป็น `development`
   ตรวจ Files changed และรัน checks ใหม่ก่อน merge
5. ถ้าแม่ใช้ squash/rebase merge ต้องตัด commits เดิมของแม่ออกจาก stack เช่น
   `git rebase --onto origin/development <old-parent-base> <child-branch>`
   โดยตรวจ commit graph และเก็บ SHA ฐานเดิมก่อน rewrite อย่าใช้ rebase แบบเดา
   ถ้าจำเป็นต้องอัปเดต remote history ให้ใช้ `--force-with-lease` เฉพาะ branch
   ลูกที่ตนดูแลและประสานผู้ร่วมงานแล้ว ห้าม force push `development` หรือ `main`
6. เก็บ branch/SHA แม่ไว้จนลูกย้ายฐานครบ ถ้าลูกต้องพึ่ง Ticket ลูกอีกตัว ให้ต่อ
   stack เฉพาะ dependency นั้น ไม่บังคับงานอิสระให้เรียงเป็นสายเดียว

ตัวอย่างเชิงโครงสร้างระหว่างรอ PR แม่ (ไม่ใช่รหัส Task ที่นำไป assign):

| PR | Branch | Base |
| --- | --- | --- |
| UI ฐาน | `FE-XXX` | `development` |
| UI ส่วนต่อที่พึ่งฐานจริง | `FE-YYY` | `FE-XXX` |

PR ฐานของ Epic merge ได้เมื่อขอบเขต UI ที่ตกลงพร้อม ไม่ต้องรอ BE, SVG หรือ
Ticket ลูกทั้งหมด ถ้ามี Epic ใน Notion จะยังไม่ Done จนงานตั้งต้นและลูกครบ
API integration ใน Ticket ลูกต้องไม่ทำ UI ฐานของ Epic ซ้ำ และยังไม่แสดงผลสำเร็จ
หรือข้อมูลแอปจำลองระหว่างรอ BE

ก่อนนำ branch ลูกไปต่อ ต้องตรวจฐานปัจจุบัน ไม่อ้างอิงเลข Task จากตัวอย่างเก่า
งานที่จบหรือมีคนรับแล้วคงรหัสเดิม ดูขอบเขต BE ล่าสุดใน
[Backend Handoff](docs/backend-handoff.md) และใช้ Ticket ปัจจุบันเป็นเกณฑ์

---

## 2. มาตรฐานการตั้งชื่อ Commit (Commit Naming)

การตั้งชื่อ Commit ใช้รูปแบบที่สั้น กระชับ และเข้าใจง่าย ไม่จำเป็นต้องเขียนอธิบายเพิ่มเติม (body) ยาวๆ สามารถตั้งชื่อในบรรทัดเดียวได้เลย

### โครงสร้างคำสั่ง Commit:

```text
<type>: <คำอธิบายสั้นๆ>
```

*(ตัวอย่าง: `feat: lorem ipsum`, `fix: lorem ipsum`, `chore: lorem ipsum`)*

### ประเภทของ Commit (Types):

- **`feat`**: เพิ่มฟีเจอร์ใหม่ (เช่น `feat: add campus map zone component`)
- **`fix`**: แก้ไขบั๊ก (เช่น `fix: handle missing GPS permission`)
- **`docs`**: เอกสาร (เช่น `docs: update database schema guide`)
- **`style`**: ปรับแต่ง formatting, จัดหน้า, เว้นวรรค
- **`refactor`**: ปรับปรุงโครงสร้างโค้ดภายใน
- **`perf`**: ปรับปรุงประสิทธิภาพความเร็ว
- **`test`**: เพิ่มหรือแก้ไข Test
- **`chore`**: งานตั้งค่าระบบ, Config, ติดตั้ง Package, อัปเดต dependencies

> **หมายเหตุ:** สามารถใส่ Scope ในวงเล็บได้หากต้องการ เช่น `feat(map): lorem ipsum` หรือ `feat(FE-001): lorem ipsum` แต่ไม่บังคับ และไม่ต้องใส่คำอธิบายเพิ่มเติมยาวๆ เน้นเขียนสั้นกระชับให้สื่อความหมายในบรรทัดเดียว

---

## 3. ขั้นตอนการตรวจสอบก่อนเปิด Pull Request (Pre-PR Checklist)

ก่อนสร้าง Pull Request เข้า `development` หรือ branch แม่ใน stack ต้องทดสอบคำสั่งเหล่านี้ผ่านในเครื่องตนเองก่อน:

```bash
# 1. ตรวจสอบ Lint (ต้องไม่มี Error และ Warning)
npm run lint

# 2. รัน Unit Tests
npm test

# 3. ตรวจสอบ TypeScript Types
npm run typecheck

# 4. ทดสอบการ Build Production
npm run build
```

GitHub Actions จะรันชุดตรวจนี้เมื่อ Push ไปยัง branch `FE-*` / `BE-*` และเมื่อ
เปิด, เพิ่ม commit หรือ reopen PR เข้า `development` / `main` ตาม
[workflow ปัจจุบัน](.github/workflows/ci.yml) ยังไม่มี PR trigger สำหรับ base
`FE-*` / `BE-*` หรือ event `edited` การเปลี่ยน base อย่างเดียวจึงไม่รับประกัน
ว่าจะรัน checks ใหม่ ต้องตรวจผลบน commits ปัจจุบันหลัง restack ก่อน merge
ให้ตั้ง Ruleset ของ `development` / `main` ให้ต้องผ่าน status check ชื่อ `verify`
ก่อน Merge; branch แม่ใน stack ต้องตั้ง Ruleset แยกหากต้องการบังคับด้วย
เอกสารนี้ไม่ได้เปลี่ยน workflow หรือ Ruleset ให้เอง GitHub ยังอนุญาตให้เปิด PR
ที่มี check ล้มเหลวได้ แต่จะแสดงสถานะไม่ผ่านและป้องกันการ Merge เมื่อบังคับใช้ Ruleset แล้ว

### ข้อควรระวังด้านความปลอดภัย:

สำหรับงาน BE ให้อ่าน [Backend Development Setup](docs/backend-setup.md) ก่อนเริ่ม:
ใช้ Supabase CLI เวอร์ชันที่ล็อกในโปรเจกต์ ทดสอบ migrations กับฐานข้อมูล local
ตรวจ constraints/RLS ตาม scope และ generate types ใหม่ก่อนส่ง PR
นำเข้าอาคารจริง 35 อาคารและ generate types ของ v4 พร้อม category แบบ array แล้ว
เมื่อแก้ schema รอบถัดไป ให้ generate และ review types ก่อนส่ง PR
ดู [Database Design](docs/database.md) และ [Reference Data](docs/reference-data.md)
คำสั่ง `npm run db:reset` จะล้างข้อมูล local และสร้างใหม่จาก migrations/seed

- **ห้าม Commit Secret Key หรือรหัสผ่านเด็ดขาด:** ตรวจสอบให้แน่ใจว่าไฟล์ `.env.local` ไม่ถูก Track เข้า Git
- **โฟลเดอร์เอกสารภายใน:** โฟลเดอร์ `/*LocalDocs-dont-commit/` ถูกกำหนดไว้ใน `.gitignore` ห้ามบังคับ Force add (`git add -f`) เข้ามาเด็ดขาด

---

## 4. คำสั่งพิเศษสำหรับ AI Coding Assistants (Claude, Codex, Antigravity, etc.)

> [!IMPORTANT]
> หากคุณเป็นโมเดล AI ที่กำลังช่วยผู้พัฒนาในโปรเจกต์นี้:
>
> 1. **เคารพ Branching Rules เสมอ:** ก่อนแก้ฟีเจอร์ให้ใช้ branch `FE-XXX` หรือ `BE-XXX` ตาม Epic/stack ข้างบน งานเอกสารหรือ CI ใช้ branch `docs/` หรือ `chore/` แยกได้ ห้ามแนะนำให้ Push เข้า `main` หรือ `development` โดยตรง
> 2. **ใช้ Commit Naming ตามข้อ 2:** เขียนข้อความสั้นๆ กระชับ เช่น `feat: lorem ipsum` ไม่ต้องใส่ body เพิ่มเติม
> 3. **รักษา Mobile-First Layout:** ทุกหน้าจอ UI ที่สร้างต้องคำนึงถึงขนาดหน้าจอมือถือ (320px–430px) และ Safe Area เสมอ
> 4. **เคารพ Schema 9 ตาราง:** ยึด [Database Design](docs/database.md) ที่สรุป ER/DBML และมติล่าสุด โดย `users` ยังไม่มี `trust_score` และ `current_streak` และ `crowd_level` อยู่ในช่วง 1–5 ห้ามปรับโครงสร้างโดยไม่ได้รับความเห็นชอบจากเจ้าของโปรเจกต์
