import { z } from "zod";
import { updateProfileSchema } from "../auth/schemas.ts";

export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ-นามสกุล")
    .max(50, "ชื่อต้องไม่เกิน 50 ตัวอักษร")
    .pipe(updateProfileSchema.shape.name),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;
