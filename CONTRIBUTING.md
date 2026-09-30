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
  ├── FE-XXX-<short-desc> (Frontend Features)
  └── BE-XXX-<short-desc> (Backend / Database Features)
```

### รายละเอียดและกฎของแต่ละ Branch:

| Branch | แตกกิ่งมาจาก | Merge กลับเข้า | คำอธิบายและข้อบังคับ |
| :--- | :--- | :--- | :--- |
| **`main`** | — | — | **สำหรับ Production / Deploy เท่านั้น** นิ่งและเสถียรที่สุด **ห้าม Push ตรงเด็ดขาด** รับ Merge จาก `development` เท่านั้น |
| **`development`** | `main` | `main` | **ศูนย์รวมฟีเจอร์ล่าสุดของทีม** ใช้รับงานที่เสร็จแล้วจาก `FE-XXX` / `BE-XXX` ห้าม Push ตรง ต้องผ่าน Pull Request |
| **`FE-XXX-<desc>`** | `development` | `development` | งานพัฒนาฝั่ง Frontend ทั้งหมด **ห้ามแตกจาก main และห้าม Merge เข้า main เด็ดขาด** |
| **`BE-XXX-<desc>`** | `development` | `development` | งานพัฒนาฝั่ง Backend, API, Supabase Database **ห้ามแตกจาก main และห้าม Merge เข้า main เด็ดขาด** |

### รูปแบบการตั้งชื่อ Branch ย่อย (Sub-branches):

ตั้งชื่อโดยขึ้นต้นด้วยหมวดหมู่ ตามด้วยหมายเลข Ticket/Task และคำอธิบายสั้นๆ (kebab-case):

- `FE-001-campus-map-ui`
- `FE-002-crowd-report-slider`
- `BE-001-supabase-schema-migration`
- `BE-002-qr-gps-verification`

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

ก่อนจะสร้าง Pull Request เข้า branch `development` ต้องทดสอบคำสั่งเหล่านี้ผ่านฉลุยในเครื่องตนเองก่อน:

```bash
# 1. ตรวจสอบ Lint (ต้องไม่มี Error และ Warning)
npm run lint

# 2. ตรวจสอบ TypeScript Types
npm run typecheck

# 3. ทดสอบการ Build Production
npm run build
```

### ข้อควรระวังด้านความปลอดภัย:

สำหรับงาน BE ให้อ่าน [Backend Development Setup](docs/backend-setup.md) ก่อนเริ่ม:
ใช้ Supabase CLI เวอร์ชันที่ล็อกในโปรเจกต์ ทดสอบ migrations กับฐานข้อมูล local
ตรวจ constraints/RLS ตาม scope และ generate types ใหม่ก่อนส่ง PR
คำสั่ง `npm run db:reset` จะล้างข้อมูล local และสร้างใหม่จาก migrations/seed

- **ห้าม Commit Secret Key หรือรหัสผ่านเด็ดขาด:** ตรวจสอบให้แน่ใจว่าไฟล์ `.env.local` ไม่ถูก Track เข้า Git
- **โฟลเดอร์เอกสารภายใน:** โฟลเดอร์ `/*LocalDocs-dont-commit/` ถูกกำหนดไว้ใน `.gitignore` ห้ามบังคับ Force add (`git add -f`) เข้ามาเด็ดขาด

---

## 4. คำสั่งพิเศษสำหรับ AI Coding Assistants (Claude, Codex, Antigravity, etc.)

> [!IMPORTANT]
> หากคุณเป็นโมเดล AI ที่กำลังช่วยผู้พัฒนาในโปรเจกต์นี้:
>
> 1. **เคารพ Branching Rules เสมอ:** ตรวจสอบว่ากำลังอยู่บน branch `FE-XXX` หรือ `BE-XXX` ก่อนแก้ไขโค้ด ห้ามแนะนำให้ Push เข้า `main` หรือ `development` โดยตรง
> 2. **ใช้ Commit Naming ตามข้อ 2:** เขียนข้อความสั้นๆ กระชับ เช่น `feat: lorem ipsum` ไม่ต้องใส่ body เพิ่มเติม
> 3. **รักษา Mobile-First Layout:** ทุกหน้าจอ UI ที่สร้างต้องคำนึงถึงขนาดหน้าจอมือถือ (320px–430px) และ Safe Area เสมอ
> 4. **เคารพ Schema 9 ตาราง:** ยึด [Database Design](docs/database.md) ที่สรุป ER/DBML และมติล่าสุด โดย `users` ยังไม่มี `trust_score` และ `current_streak` และ `crowd_level` อยู่ในช่วง 1–5 ห้ามปรับโครงสร้างโดยไม่ได้รับความเห็นชอบจากเจ้าของโปรเจกต์
