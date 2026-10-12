# คู่มือการเชื่อมต่อระบบสำหรับทีม Frontend (Frontend Integration Guide)

เอกสารนี้จัดทำขึ้นเพื่อให้ทีม **Frontend (FE)** สามารถเริ่มต้นพัฒนาหน้าจอ UI และเชื่อมต่อกับระบบ Backend / Authentication ได้ทันที

---

## 1. วิธีเริ่มรันระบบในเครื่อง (Quick Start)

1. **เตรียม Environment Variables:**
   คัดลอกไฟล์ `.env.example` หรือตั้งค่าใน `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **เปิดระบบ Local Database (Docker):**
   ```bash
   npm run db:start
   ```

3. **รัน Next.js Development Server:**
   ```bash
   npm run dev
   ```
   * แอปจะทำงานที่: **`http://localhost:3000`**

---

## 2. เครื่องมือสำหรับทดสอบและดูสเปก API (Interactive API Docs)

ทีม FE สามารถเปิดดูสเปกและกดยิงทดสอบ Request/Response ได้ที่:

* 📄 **Scalar API Reference (สไตล์ ACS):**
  👉 **`http://localhost:3000/api/swagger`**
* 📬 **กล่องข้อความอีเมลจำลอง (Mailpit):**
  👉 **`http://127.0.0.1:54324`** *(สำหรับเปิดดูอีเมลยืนยันตัวตนหรือลิงก์รีเซ็ตรหัสผ่านเวลาเทสต์ในเครื่อง)*
* 🗄️ **Supabase Studio (ดูข้อมูลในตาราง):**
  👉 **`http://127.0.0.1:54323`**

---

## 3. การเชื่อมต่อระบบ Authentication

ทีม FE สามารถเลือกเชื่อมต่อได้ **2 รูปแบบ** ตามความสะดวก:

### รูปแบบที่ 1: ใช้ Server Actions (แนะนำสำหรับ Next.js App Router) ⭐

ฟังก์ชันทั้งหมดอยู่ที่: `@/features/auth/server/actions`

| ฟังก์ชัน | Input | รายละเอียด |
| :--- | :--- | :--- |
| `signUpWithPasswordAction(input)` | `{ email, password, name }` | สมัครสมาชิกใหม่ (Profile ใน `public.users` จะถูกสร้างอัตโนมัติ) |
| `signInWithPasswordAction(input)` | `{ email, password }` | เข้าสู่ระบบ (เซ็ต Session cookies ลงใน Browser ให้อัตโนมัติ) |
| `getGoogleOAuthUrlAction(redirectTo?)` | `redirectTo?: string` | ขอ URL สำหรับพาผู้ใช้ไปหน้าล็อกอิน Google OAuth |
| `signOutAction()` | `-` | ออกจากระบบและเคลียร์ Cookies |
| `getCurrentUserAction()` | `-` | ดึงข้อมูล Auth User และ Profile ใน `public.users` ของผู้ใช้ปัจจุบัน |
| `forgotPasswordAction(input)` | `{ email }` | ส่งอีเมลขอรีเซ็ตรหัสผ่าน |
| `resetPasswordAction(input)` | `{ password, confirmPassword }` | บันทึกรหัสผ่านใหม่ (เรียกหลังผู้ใช้คลิกลิงก์ในอีเมล) |
| `updateProfileAction(input)` | `{ name?, avatar_url? }` | อัปเดตชื่อหรือรูปภาพตนเอง |

#### ตัวอย่างการผูกฟอร์มด้วย React Hook Form + Zod
```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@/features/auth/schemas';
import { signInWithPasswordAction } from '@/features/auth/server/actions';

export function LoginForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setErrorMsg(null);
    const res = await signInWithPasswordAction(data);
    if (!res.success) {
      setErrorMsg(res.error ?? 'เข้าสู่ระบบไม่สำเร็จ');
      return;
    }
    window.location.href = '/';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {errorMsg && <p className="text-red-500">{errorMsg}</p>}

      <input {...register('email')} placeholder="อีเมล (@kmutt.ac.th)" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" placeholder="รหัสผ่าน" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
```

#### ตัวอย่างปุ่ม Login ด้วย Google
```tsx
'use client';

import { getGoogleOAuthUrlAction } from '@/features/auth/server/actions';

export function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    const res = await getGoogleOAuthUrlAction('/');
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    }
  };

  return (
    <button onClick={handleGoogleLogin} type="button">
      เข้าสู่ระบบด้วย Google
    </button>
  );
}
```

---

### รูปแบบที่ 2: ใช้ REST API Route Handlers
หากต้องการยิงผ่าน `fetch()` ปกติ:
* `POST /api/auth/signup` : `{ email, password, name }`
* `POST /api/auth/login` : `{ email, password }`
* `POST /api/auth/logout` : เคลียร์ Session
* `GET /api/auth/me` : ดึง User ปัจจุบันและ Profile

---

## 4. โครงสร้างข้อมูลตาราง (Database Model)

Type definitions ทั้งหมดถูกสร้างไว้ที่: `@/types/database`

### ตาราง `public.users`
* **`id`** (`number`): รหัสลำดับผู้ใช้แบบตัวเลข **1, 2, 3... (Integer)** 👈 ใช้อ้างอิงเป็น Foreign Key ในตารางอื่น ๆ
* **`auth_id`** (`string / UUID`): รหัสอ้างอิงกับระบบ Auth ของ Supabase
* **`name`** (`string`): ชื่อผู้ใช้
* **`email`** (`string`): อีเมลผู้ใช้
* **`avatar_url`** (`string | null`): ลิงก์รูปโปรไฟล์
* **`points`** (`number`): แต้มสะสม (เริ่มต้น 0)
* **`created_at`** (`string`): วันที่สร้างบัญชี

### ตารางอื่น ๆ และ Foreign Key:
ทุกตารางที่ผูกกับผู้ใช้จะอ้างอิง `user_id` เป็น **`number` (Integer)** ทั้งหมด:
* `checkins.user_id` ➡️ `users.id` (`number`)
* `user_badges.user_id` ➡️ `users.id` (`number`)
* `redemptions.user_id` ➡️ `users.id` (`number`)

---

## 5. รายการหน้าจอ UI ที่แนะนำสำหรับทีม FE

| Route | หน้าที่ |
| :--- | :--- |
| `/login` | หน้าเข้าสู่ระบบ (มีฟอร์ม Email/Password และปุ่ม Google Login) |
| `/signup` | หน้าสมัครสมาชิก (Email, Password, Name) |
| `/forgot-password` | หน้าขอลิงก์รีเซ็ตรหัสผ่าน |
| `/reset-password` | หน้าตั้งรหัสผ่านใหม่ (รับ session จากลิงก์ในอีเมล) |
| `/profile` | หน้าดู/แก้ไขข้อมูลส่วนตัว และแต้มสะสม |
