# การเชื่อมต่อ Authentication สำหรับ FE

BE-002 เชื่อมฟอร์ม `/login` และ `/signup` กับ email/password backend เดิมแล้ว
ใช้ Supabase SSR cookies ที่ browser client อ่านได้ตามที่ตกลง ไม่มี token storage
เพิ่ม และไม่มี Google Login UI ใน Task นี้

## เริ่มใช้งาน

ใช้ Node/npm ตาม `.nvmrc` แล้วติดตั้งด้วย `npm ci` เปิด Docker และ Local Supabase
ตาม [Backend Setup](backend-setup.md) ใช้ `.env` ที่มีอยู่ หรือคัดลอก
`.env.example` โดยไม่เขียนทับค่าของตัวเอง

กำหนด `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` และ
`NEXT_PUBLIC_SITE_URL` ให้ตรง environment ดูค่า Local ด้วย `npm run db:status`
โดยไม่เผยแพร่ output ที่มี credentials ห้ามใส่ secret/service-role key ใน browser

รัน `npm run dev` แล้วเปิด `/login` หรือ `/signup` ตั้ง redirect allowlist ของ
Supabase ให้รับ `<NEXT_PUBLIC_SITE_URL>/auth/callback` ตรงตาม environment
ลิงก์ยืนยันอีเมลใช้ PKCE: เปิดด้วย browser เดิมที่สมัครเพื่อให้มี verifier cookie
ใช้ callback เดิม ไม่ต้องสร้างระบบยืนยันอีเมลอีกชุด

Local port ตาม shared config คือ API 54321, DB 54322, Studio 54323 และ inbox
54324 หากเครื่องใช้ config/workdir ที่เปลี่ยน port ให้ดู Backend Setup และใช้
ค่าของ stack ที่กำลังทำงานจริง ห้าม reset ฐานที่ต้องเก็บข้อมูลเพื่อทดสอบ Auth

## Flow ของฟอร์ม

- Login ส่ง `{email, password}` ไป `signInWithPasswordAction` เมื่อสำเร็จ refresh
  current user แล้วไป `next` ที่เป็น path ภายใน หรือ Home ด้วย router replace
- Signup ใช้ schema เดียวกับ BE: ชื่อ trim แล้ว 2–50 ตัว รหัสผ่าน 8–100 ตัว
  ตรวจ confirmPassword ใน FE และส่งเฉพาะ `{name, email, password}`
- ถ้าสมัครแล้วได้ session จะไป Home ถ้าต้องยืนยันอีเมลจะแสดงข้อความที่หน้าสมัคร
  และล้างช่องรหัสผ่าน โดยไม่บอกว่า Login แล้ว
- ฟอร์มป้องกัน submit ซ้ำระหว่าง pending, ปิด field/button ชั่วคราว และมี
  `aria-busy`, status และ alert แก้ข้อมูลแล้ว retry ได้โดยไม่ reload
- Authentication failure ที่ใช้ใน flow นี้ส่งเฉพาะข้อความจากรายการที่อนุญาต
  network/server/configuration failure ใช้ข้อความทั่วไป ไม่ render provider
  message หรือ query-string error ที่ผู้ใช้กำหนดเอง
- `/auth/callback` แลก code เป็น session และใช้ redirect validator เดียวกับ Login
  ลิงก์ผิด/หมดอายุไป `/login?error=verification_failed`

ไม่มีการเพิ่ม mock account, mock profile หรือข้อมูล seed และไม่มี schema migration
ใน BE-002 การอ่าน profile ใช้ `users.auth_id = auth.users.id` และ RLS เดิม
ตั้ง `logging.serverFunctions: false` เพื่อไม่ให้ Next.js dev พิมพ์ arguments
ของ Server Actions ซึ่งมีรหัสผ่านลง terminal และฟอร์มระบุ method POST เพื่อไม่ให้
ข้อมูลรหัสผ่านหลุดเข้า query string หาก submit ก่อน JavaScript พร้อม

## Session และ Logout สำหรับ FE-017/FE-018

`AuthProvider` ครอบ root layout แล้ว ใช้ hook จาก
`@/features/auth/components/auth-provider`:

```tsx
const { status, user, profile, error, refresh, signOut, isSigningOut } = useAuth();
```

| ค่า | ความหมาย |
| --- | --- |
| `status` | `loading`, `authenticated`, `unauthenticated` หรือ `error` |
| `user` | `{ id: string, email: string | null }` หรือ null |
| `profile` | โปรไฟล์ตัวเอง 7 fields ตามตารางด้านล่าง หรือ null |
| `error` | ข้อความปลอดภัย หรือ null |
| `refresh()` | ตรวจ current user ใหม่ผ่าน GET /api/auth/me; ไม่มี cache |
| `signOut()` | คืน AuthActionResult; เมื่อสำเร็จล้าง state แล้วไป /login |
| `isSigningOut` | ใช้ disable ปุ่ม Logout ระหว่างส่ง |

Provider ตรวจ session ตอน mount, เมื่อกลับเข้า tab/page และเมื่อ Supabase แจ้ง
auth change ฝั่ง server ใช้ `getUser()` ยืนยันตัวตน ไม่เชื่อ user object จาก
`getSession()` เพื่ออนุญาตข้อมูล Proxy ต่ออายุ cookies และส่ง cache headers ของ SSR

401 หมายถึง signed out ส่วน network/503 หมายถึงตรวจไม่สำเร็จ: state เป็น
`error` และไม่ค้าง user/profile เก่า อย่าแสดงว่า Login แล้วขณะ `loading/error`
การอนุญาตข้อมูลต้องตรวจบน server/RLS เสมอ hook ไม่ใช่ security boundary

Logout ใช้ existing `signOutAction` แบบ local scope จัดการกรณีไม่มี session/
หมดอายุ/เรียกซ้ำได้ ไม่ revoke session บนอุปกรณ์อื่น หาก network ล้มเหลวจะคืน
error ให้ UI retry โดยไม่อ้างว่าออกจากระบบสำเร็จ Task นี้ไม่เพิ่มหน้า Profile หรือ
ปุ่มใหม่ลง Home; หน้า Profile นำ hook ไปผูกกับปุ่ม Logout ของตัวเองได้

## Server Action contract

ฟังก์ชันอยู่ใน `@/features/auth/server/actions` และ types อยู่ใน
`@/features/auth/types`

```ts
type AuthActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: "validation" | "unauthorized" | "rejected" | "rate_limited" | "unavailable";
};
```

| Action | Input | ผลสำเร็จ |
| --- | --- | --- |
| signInWithPasswordAction | {email, password} | success/message; session อยู่ใน cookie |
| signUpWithPasswordAction | {name, email, password} | data: {requiresEmailConfirmation: boolean} |
| getCurrentUserAction | ไม่มี | data: {user, profile}; ไม่มี session = ทั้งคู่ null |
| signOutAction | ไม่มี | success/message; ออกจาก browser session นี้ |

ไม่ส่ง access/refresh token หรือ raw Supabase Auth user ในผลของสี่ action นี้
REST routes เรียก action ชุดเดียวกัน ไม่มี Supabase query ซ้ำใน page component

## REST API contract

ใช้ same-origin cookies อัตโนมัติ ไม่รองรับ Bearer header สำหรับ routes นี้
JSON POST ต้องใช้ `Content-Type: application/json` ทุก response เป็น
`Cache-Control: private, no-store` ดู API reference ที่ `/api/swagger`

| Endpoint | Request | HTTP 200 |
| --- | --- | --- |
| POST /api/auth/login | {email, password} | {success: true, message} |
| POST /api/auth/signup | {name, email, password} | {success: true, message, requiresEmailConfirmation} |
| GET /api/auth/me | ไม่มี body | {success: true, user, profile} |
| POST /api/auth/logout | ไม่มี body | {success: true, message} |

Error response เป็น `{success: false, error, code?}` โดย code เป็นรหัสของแอป:
400 validation/rejected, 401 unauthorized, 415 content type ไม่ถูกต้อง,
429 rate limited และ 503 บริการไม่พร้อม JSON ที่ parse ไม่ได้คืน 400
me ที่ไม่มี/หมด session คืน 401; Auth/DB ล้มเหลวคืน 503 ไม่ตีความเป็น guest เงียบ ๆ

โปรไฟล์เป็นข้อมูลส่วนตัวของเจ้าของเท่านั้น:

| Field | Type |
| --- | --- |
| id | number (application user ID) |
| auth_id | string (Auth UUID) |
| name | string |
| email | string |
| avatar_url | string หรือ null |
| points | number |
| created_at | string |

## Recovery และ Profile actions ที่มีอยู่

FE-018/FE-019 ใช้ `updateProfileSchema`, `forgotPasswordSchema`,
`resetPasswordSchema`, `resendVerificationSchema` จาก `features/auth/schemas`
และ actions เดิม ไม่สร้าง backend ซ้ำ:

| Action | Input |
| --- | --- |
| updateProfileAction | {name, avatar_url?}; ชื่อ 2–50 ตัว, รูปเป็น HTTP/HTTPS หรือ null |
| forgotPasswordAction | {email}; ตอบทั่วไปเพื่อไม่เปิดเผยว่ามีบัญชีหรือไม่ |
| resetPasswordAction | {password, confirmPassword}; ต้องมี recovery session |
| resendVerificationEmailAction | {email} |

BE-002 ไม่เพิ่มหน้ากู้รหัสผ่าน/แก้โปรไฟล์ และไม่เปลี่ยน recovery validation
ตอนเชื่อมหน้าเหล่านั้นต้องตรวจ UX, authorization และ error handling ของ action
ที่เกี่ยวข้องเพิ่มเติม ไม่ถือว่าเสร็จเพียงเพราะมี action อยู่แล้ว

## การตรวจสอบ

รัน lint, typecheck, tests และ build ก่อน PR ทดสอบด้วยบัญชีจริงที่ได้รับอนุญาต:
Login/Signup สำเร็จทั้งแบบได้ session และรอยืนยัน, เปิดลิงก์ยืนยันใน browser เดิม,
navigation/reload, session หมดอายุ, Logout และออกซ้ำ ห้ามสร้างข้อมูลจำลองหรือ
ข้าม verification เพื่อทำให้ผลทดสอบผ่าน

unit tests ครอบคลุม schema/redirect/error contract และตรวจ HTTP/browser failure
paths แล้ว ทดสอบด้วยบัญชีจริงที่เจ้าของอนุญาตยืนยัน Login ผ่านฟอร์ม, safe redirect,
session หลัง navigation/reload, current-user/profile DTO และ Logout ผ่าน
AuthProvider/Server Action รวมการ Logout ซ้ำ โดยไม่สร้างบัญชีใหม่

ทดสอบเพิ่มเติมผ่านสำเนาแอปและ Auth/DB ที่แยกจาก Local หลัก ด้วยข้อมูลบัญชีจริง
ที่เจ้าของอนุญาต: Signup แบบได้ session ทันที, แบบรอยืนยันผ่าน Local SMTP,
เปิดลิงก์จริงเข้า callback และแลก PKCE code ได้สำเร็จ โปรไฟล์ถูกสร้างจาก trigger
และ session ใช้งานได้หลัง reload ทั้งสองโหมด

ตรวจ refresh หลัง access token หมดอายุจริงโดยตั้งอายุ 120 วินาทีเฉพาะ Auth QA
พักหน้า browser เพื่อหยุด auto-refresh แล้วส่ง cookie ของ session เดิมหลัง JWT
หมดอายุ server ต่ออายุผ่าน refresh token และส่ง cookie/JWT ใหม่ที่หมดอายุช้ากว่า
ให้ browser ใช้ต่อได้ หลัง reload ยังอ่านโปรไฟล์ได้ และ Logout สำเร็จ
ไม่มีการปลอม token หรือข้าม verification และไม่ได้เปลี่ยนอายุ token/ข้อมูลบัญชี
ของ Local หลัก การทดสอบนี้เป็น Local integration ไม่ใช่ผลยืนยันการ deploy Cloud
