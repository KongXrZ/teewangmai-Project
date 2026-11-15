import { z } from "zod";

export const locationIdSchema = z.string().regex(/^[1-9]\d*$/).pipe(
  z.coerce.number<string>().int().max(2147483647),
);

const pageNumber = z.string().regex(/^[1-9]\d*$/).pipe(z.coerce.number<string>().int());

export const locationQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  category: z.string().trim().min(1).max(100).optional(),
  page: pageNumber.pipe(z.number().max(100000)).default(1),
  limit: pageNumber.pipe(z.number().max(50)).default(20),
});

export function parseLocationQuery(params: URLSearchParams) {
  const input: Record<string, string> = {};
  for (const [key, value] of params) {
    if (!["q", "category", "page", "limit"].includes(key) || key in input) {
      return null;
    }
    input[key] = value;
  }
  const result = locationQuerySchema.safeParse(input);
  return result.success ? result.data : null;
}
