# เปิด Local DB และทดสอบ API ของ TeeWangMai

คู่มือสำหรับทีม ใช้ PowerShell บน Windows และรันคำสั่งจากโฟลเดอร์หลักของโปรเจกต์
อัปเดต ณ 21 พฤศจิกายน 2026: migration ครบ 15 ไฟล์ (ล่าสุดของ BE-013) ชุดข้อมูลอาคารและชั้นมาจากงาน BE-004

สำหรับ macOS ใช้ Terminal และเปลี่ยน `npm.cmd` ในคู่มือนี้เป็น `npm`
คำสั่ง `docker` ใช้เหมือนกัน ส่วนคำสั่งสร้าง `.env.local` สำหรับ macOS อยู่ในขั้นตอนที่ 4

## 1. เตรียมเครื่องและโค้ด

- ติดตั้ง Node.js `24.14.0` ตาม `.nvmrc` พร้อม npm
- เปิด Docker Desktop และใช้ Linux containers
- ใช้โค้ดจาก `development` ล่าสุด

ตรวจ Node.js และการเชื่อมต่อ Docker

```powershell
node --version
docker version
```

## 2. ติดตั้ง dependencies และเปิด Local Supabase

```powershell
npm.cmd ci
npm.cmd run db:start
```

ครั้งแรก Docker จะดาวน์โหลด images และเตรียมบริการ ให้รอจนคำสั่งทำงานสำเร็จ

## 3. Apply migrations และนำเข้าข้อมูลตั้งต้น

```powershell
npm.cmd run supabase -- migration up --local
docker cp supabase/seed.sql supabase_db_teewangmai:/tmp/teewangmai-seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f /tmp/teewangmai-seed.sql
```

Seed จับคู่อาคารด้วย `building` และชั้นด้วย `(location_id, floor_name)`
อัปเดตข้อมูลตั้งต้น พร้อมรักษา ID และ QR identifier ของรายการเดิม
ตารางเวลาจะใช้ชุดชั่วคราวที่ระบุในไฟล์ seed

ข้อมูลที่ควรได้หลัง setup

| ตาราง | จำนวน | รายละเอียด |
| --- | --- | --- |
| `locations` | 35 | อาคาร S1–S15 และ N1–N20 โดย S7 เป็น inactive |
| `floors` | 224 | แต่ละชั้นมี `qr_code_id` แบบ UUID |
| `floor_hours` | 1,120 | เวลาชั่วคราว จันทร์–ศุกร์ 08:00–17:00 |

วันเสาร์และอาทิตย์ยังไม่มีแถวตารางเวลา ส่วนเวลาเปิดปิดจริงรายชั้นรอ CSV เพิ่มเติม

ตรวจข้อมูลผ่าน [Supabase Studio](http://127.0.0.1:54323) ใน SQL Editor

```sql
select 'locations' as table_name, count(*) as rows from public.locations
union all
select 'floors', count(*) from public.floors
union all
select 'floor_hours', count(*) from public.floor_hours;
```

หากใช้ Dataflare ให้สร้าง PostgreSQL connection ตามค่าจาก Local ของตนเอง
Shared config ใช้ host `127.0.0.1`, port `54322`, database `postgres`
ดู username/password จาก connection URL ในขั้นตอนถัดไป

## 4. ตั้งค่า environment ของเว็บ

ดู URL และ keys ของ Local

```powershell
npm.cmd run db:status
```

สร้าง `.env.local` จากตัวอย่างเมื่อยังไม่มีไฟล์

```powershell
if (-not (Test-Path -LiteralPath '.env.local')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
```

สำหรับ macOS ใช้คำสั่งนี้แทน โดยไม่ทับไฟล์เดิม

```bash
[ -f .env.local ] || cp .env.example .env.local
```

เปิด `.env.local` แล้วตั้งค่าสามตัวนี้ แทนค่าตัวอย่างของ publishable key ด้วยค่าจาก
`db:status` ของเครื่องตนเอง

เลือกแถว **Publishable** ใต้หัวข้อ **Authentication Keys**
ไม่ใช้แถว Secret หรือ Access Key ใน Storage (S3)
แต่ละคนใช้ key จาก Local Supabase ของเครื่องตัวเอง

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-your-local-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Signup ใช้ `NEXT_PUBLIC_SITE_URL` สร้าง callback URL
เมื่อแก้ environment ให้ restart Next.js dev server
เก็บรหัสผ่าน DB และ secret/service-role keys ไว้ฝั่ง server
ข้อมูล connection และไฟล์ `.env.local` เป็นข้อมูลเฉพาะเครื่อง

## 5. เปิดเว็บและ API reference

```powershell
npm.cmd run dev
```

เปิด [เว็บ Local](http://localhost:3000) และ
[Swagger / API reference](http://localhost:3000/api/swagger)
ใช้ `http://localhost:3000` เป็น origin เดียวกันตลอดการทดสอบ Auth

บัญชีผู้ใช้เป็นของ Local แต่ละเครื่อง ให้สมัครบัญชีทดสอบของตนเองผ่าน
[หน้า Signup](http://localhost:3000/signup) หรือ `POST /api/auth/signup`

## 6. ทดสอบ Auth API

ส่ง JSON POST ด้วย `Content-Type: application/json`
Auth ใช้ session cookie ของ browser และส่งผลผู้ใช้ผ่าน `/api/auth/me`
หากใช้ Postman ให้เปิด cookie jar และใช้ host เดิมทุก request

| ลำดับ | Request | ผลที่ควรได้ |
| --- | --- | --- |
| 1 | `GET /api/health` | HTTP 200 พร้อมสถานะบริการ |
| 2 | `GET /api/auth/me` ก่อนเข้าสู่ระบบ | HTTP 401 |
| 3 | `POST /api/auth/signup` | HTTP 200 พร้อม `requiresEmailConfirmation` |
| 4 | `POST /api/auth/login` | HTTP 200 และ session cookie |
| 5 | `GET /api/auth/me` | HTTP 200 พร้อม user และโปรไฟล์ของบัญชีนั้น |
| 6 | `POST /api/auth/logout` | HTTP 200 |
| 7 | `GET /api/auth/me` หลัง Logout | HTTP 401 |

ข้อมูลที่ส่งตอน Signup

```json
{
  "name": "ชื่อผู้ทดสอบ",
  "email": "your-email@example.com",
  "password": "your-own-password"
}
```

เปลี่ยนอีเมลและรหัสผ่านเป็นค่าของผู้ทดสอบ ชื่อใช้ 2–50 ตัวอักษร
และรหัสผ่านใช้ 8–100 ตัวอักษร
Login ส่งเฉพาะ `email` และ `password` ชุดเดียวกับที่สมัคร

Shared Local config ปัจจุบันปิด email confirmation หากเครื่องใดเปิด confirmation
ให้เปิดลิงก์ยืนยันใน [Local email inbox](http://127.0.0.1:54324)
ด้วย browser เดียวกับที่สมัคร แล้วทดสอบ Login ต่อ

การอ่านโปรไฟล์หลัง Login และ query ตรวจข้อมูลใช้ยืนยันการเชื่อมต่อ DB ร่วมกับผล
ของ health endpoint ได้ API อาคาร/ชั้น (BE-005), crowd summary (BE-006), เช็คอิน
(BE-008/BE-009), รูปโปรไฟล์ (BE-010/BE-015), รางวัลและคูปอง (BE-011/BE-012) และ
badge (BE-013) มีครบแล้ว ดูรายการทั้งหมดที่ [Backend Handoff](backend-handoff.md)
และลองเรียกได้จาก [Swagger](http://localhost:3000/api/swagger)

## 7. ตรวจงานและปิดบริการ

ก่อนส่ง PR ให้รัน checks ของโปรเจกต์

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

เมื่อทดสอบเสร็จ กด `Ctrl+C` ใน terminal ที่รัน Next.js แล้วหยุด Local Supabase
คำสั่งนี้เก็บข้อมูล Local ไว้สำหรับครั้งถัดไป

```powershell
npm.cmd run db:stop
```

## จุดตรวจเมื่อมีปัญหา

| อาการ | จุดที่ควรตรวจ |
| --- | --- |
| `db:start` เชื่อม Docker ไม่ได้ | เปิด Docker Desktop และตรวจ `docker version` |
| Dataflare เชื่อมไม่ได้ | ดู published port จาก `docker ps` และ connection URL จาก `db:status` |
| Signup/Login ได้ 503 | ตรวจบริการ Supabase และ environment ทั้งสามตัว แล้วอ่าน Next.js terminal |
| `/api/auth/me` ได้ 401 หลัง Login | ใช้ browser/origin เดิม และตรวจว่าคำขอส่ง session cookie |
| ข้อมูลอาคารหรือชั้นยังไม่ครบ | ตรวจ migration history และผลรัน seed ก่อน query จำนวนแถวอีกครั้ง |

คู่มือเพิ่มเติมอยู่ใน [Backend Setup](backend-setup.md) และ
[Auth API contract](frontend-integration.md#rest-api-contract)
