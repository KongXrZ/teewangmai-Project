import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
    .max(100, 'รหัสผ่านยาวเกินไป'),
  name: z
    .string()
    .trim()
    .min(2, 'ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร')
    .max(50, 'ชื่อต้องไม่เกิน 50 ตัวอักษร'),
});

export const signInSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
      .max(100, 'รหัสผ่านยาวเกินไป')
      .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว')
      .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านยืนยันไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร').max(50),
  avatar_url: z
    .string()
    .url('รูปแบบ URL รูปภาพไม่ถูกต้อง')
    .refine((value) => /^https?:\/\//i.test(value), 'URL รูปภาพต้องขึ้นต้นด้วย http:// หรือ https://')
    .optional()
    .nullable(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
