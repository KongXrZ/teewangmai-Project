# Contributing Guidelines — TeeWangMai? (ที่ว่างไหม?)

เพื่อความเป็นระเบียบและลดข้อผิดพลาดในการทำงานร่วมกัน โปรดปฏิบัติตามข้อกำหนดด้าน Git Branch, Commit Message และแนวทางการพัฒนาด้านล่างนี้อย่างเคร่งครัด

---

## 1. ข้อกำหนดการตั้งและจัดการ Branch (Branching Strategy)

โครงสร้าง Branch ของโปรเจกต์นี้ใช้โมเดลแบบ **Git Feature Branching**:

```text
main (Production / Deployment)
  ▲
  │ (Pull Request เมื่อพร้อม Release)
development (Integration / Staging)
  ▲
  ├── FE-XXX-<short-desc> (Frontend Features)
  ├── BE-XXX-<short-desc> (Backend / Database Features)
  └── CHORE-XXX / DOCS-XXX (Infra, Config, Documentation)

main
  └── hotfix-XXX-<short-desc> (กรณีแก้บั๊กวิกฤตบน Production)
```

### รายละเอียดและกฎของแต่ละ Branch:

| Branch                       | แตกกิ่งมาจาก  | Merge กลับเข้า         | คำอธิบายและข้อบังคับ                                                                                                                    |
| :--------------------------- | :------------ | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **`main`**                   | —             | —                      | **สำหรับ Production / Deploy เท่านั้น** นิ่งและเสถียรที่สุด **ห้าม Push ตรงเด็ดขาด** รับ Merge จาก `development` หรือ `hotfix` เท่านั้น |
| **`development`**            | `main`        | `main`                 | **ศูนย์รวมฟีเจอร์ล่าสุดของทีม** ใช้รับงานที่เสร็จแล้วจาก `FE-XXX` / `BE-XXX` ห้าม Push ตรง ต้องผ่าน Pull Request                        |
| **`FE-XXX-<desc>`**          | `development` | `development`          | งานพัฒนาฝั่ง Frontend ทั้งหมด **ห้ามแตกจาก main และห้าม Merge เข้า main เด็ดขาด**                                                       |
| **`BE-XXX-<desc>`**          | `development` | `development`          | งานพัฒนาฝั่ง Backend, API, Supabase Database **ห้ามแตกจาก main และห้าม Merge เข้า main เด็ดขาด**                                        |
| **`hotfix-XXX-<desc>`**      | `main`        | `main` & `development` | ใช้เฉพาะกรณีพบบั๊กวิกฤตบน Production แก้เสร็จแล้วต้อง Merge เข้าทั้งสองกิ่ง                                                             |
| **`CHORE-XXX` / `DOCS-XXX`** | `development` | `development`          | งานจิปาถะ, CI/CD Pipeline, Config รวม หรืออัปเดตเอกสาร                                                                                  |

### รูปแบบการตั้งชื่อ Branch ย่อย (Sub-branches):

ตั้งชื่อโดยขึ้นต้นด้วยหมวดหมู่ ตามด้วยหมายเลข Ticket/Task และคำอธิบายสั้นๆ (kebab-case):

- `FE-001-campus-map-ui`
- `FE-002-crowd-report-slider`
- `BE-001-supabase-schema-migration`
- `BE-002-qr-gps-verification`
- `DOCS-001-update-architecture-guide`

---

## 2. มาตรฐานการตั้งชื่อ Commit (Conventional Commits)

โปรเจกต์นี้ใช้มาตรฐาน **Conventional Commits** เพื่อให้ประวัติ Git อ่านเข้าใจง่ายและสามารถสร้าง Release Notes ได้อัตโนมัติ

### โครงสร้างคำสั่ง Commit:

```text
<type>(<scope>): <คำอธิบายสั้นๆ เป็นภาษาอังกฤษ>
```

### ประเภทของ Commit (Types):

- **`feat`**: เพิ่มฟีเจอร์ใหม่ให้กับผู้ใช้ (เช่น `feat(map): render campus mockup zones`)
- **`fix`**: แก้ไขบั๊กหรือปัญหาการทำงาน (เช่น `fix(auth): handle missing GPS permission`)
- **`docs`**: เขียนหรืออัปเดตเอกสาร (เช่น `docs: update 9-entity database schema guide`)
- **`style`**: ปรับแต่ง formatting, จัดหน้า, เว้นวรรค ที่ไม่มีผลต่อ logic การทำงาน
- **`refactor`**: ปรับปรุงโครงสร้างโค้ดภายในโดยไม่เพิ่มฟีเจอร์และไม่แก้บั๊กเดิม
- **`perf`**: ปรับปรุงประสิทธิภาพความเร็ว (Performance)
- **`test`**: เพิ่มหรือแก้ไข Unit Test / Integration Test
- **`chore`**: งานตั้งค่าระบบ, Build tool, Config, ติดตั้ง Package, อัปเดต `.gitignore`

### กฎสำคัญในการเขียน Description:

1. **ใช้ Imperative Mood (คำกริยาช่อง 1):** ใช้ `add`, `fix`, `update`, `remove` (ห้ามใช้ `added`, `fixing`)
2. **ตัวพิมพ์เล็กหลังเครื่องหมายโคลอน:** เช่น `feat: add ...` ไม่ใช้ `feat: Add ...`
3. **ห้ามใส่จุด (`.`) ปิดท้ายประโยค**
4. **ความยาวกระชับ:** แนะนำไม่เกิน 50–72 ตัวอักษร
5. **Scope (ตัวเลือกเสริมแต่แนะนำ):** สามารถระบุโมดูล `(map)`, `(checkin)`, `(ui)` หรือระบุ Ticket ID เช่น `feat(FE-001): create location card`

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

- **ห้าม Commit Secret Key หรือรหัสผ่านเด็ดขาด:** ตรวจสอบให้แน่ใจว่าไฟล์ `.env.local` ไม่ถูก Track เข้า Git
- **โฟลเดอร์เอกสารภายใน:** โฟลเดอร์ `/*LocalDocs-dont-commit/` ถูกกำหนดไว้ใน `.gitignore` ห้ามบังคับ Force add (`git add -f`) เข้ามาเด็ดขาด

---

## 4. คำสั่งพิเศษสำหรับ AI Coding Assistants (Claude, Codex, Antigravity, etc.)

> [!IMPORTANT]
> หากคุณเป็นโมเดล AI ที่กำลังช่วยผู้พัฒนาในโปรเจกต์นี้:
>
> 1. **เคารพ Branching Rules เสมอ:** ตรวจสอบว่ากำลังอยู่บน branch `FE-XXX` หรือ `BE-XXX` ก่อนแก้ไขโค้ด ห้ามแนะนำให้ Push เข้า `main` หรือ `development` โดยตรง
> 2. **ใช้ Conventional Commits เสมอ:** เขียน Commit message ตามโครงสร้างในข้อ 2
> 3. **รักษา Mobile-First Layout:** ทุกหน้าจอ UI ที่สร้างต้องคำนึงถึงขนาดหน้าจอมือถือ (320px–430px) และ Safe Area เสมอ
> 4. **เคารพ Schema 9 ตาราง:** ยึด [Database Design](docs/database.md) ที่สรุป ER/DBML และมติล่าสุด โดย `users` ยังไม่มี `trust_score` และ `current_streak` และ `crowd_level` อยู่ในช่วง 1–5 ห้ามปรับโครงสร้างโดยไม่ได้รับความเห็นชอบจากเจ้าของโปรเจกต์
