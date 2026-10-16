import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกอีเมล")
  .pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    email: emailSchema,
    password: z
      .string()
      .min(1, "กรุณากรอกรหัสผ่าน")
      .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

export type SignupPayload = Omit<SignupValues, "confirmPassword">;
