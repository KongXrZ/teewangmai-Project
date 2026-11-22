import { z } from "zod";
import { signInSchema, signUpSchema } from "./schemas";

export const loginSchema = signInSchema;

export const signupSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

export type SignupPayload = Omit<SignupValues, "confirmPassword">;
