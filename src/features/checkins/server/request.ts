import { z } from "zod";

const floorQr = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .transform((value) => value.toLowerCase());

export const resolveSchema = z.object({ qr: floorQr }).strict();

export const submitSchema = z
  .object({
    qr: floorQr,
    crowd_level: z.number().int().min(1).max(5),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy_meters: z.number().positive(),
  })
  .strict();
