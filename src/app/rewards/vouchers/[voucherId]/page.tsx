import { redirect } from "next/navigation";
import {
  buildVoucherCollectionHref,
  parseVoucherIdParam,
} from "@/features/rewards/vouchers";

export default async function VoucherDetail({
  params,
  searchParams,
}: {
  params: Promise<{ voucherId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ voucherId }, query] = await Promise.all([params, searchParams]);
  const from = typeof query.from === "string" ? query.from : undefined;
  const parsedId = parseVoucherIdParam(voucherId);

  redirect(buildVoucherCollectionHref(from, parsedId));
}
