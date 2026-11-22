"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useVoucherCollection } from "../hooks/use-vouchers";
import {
  buildVoucherDetailHref,
  parseVoucherEntrySource,
  resolveVoucherCollectionBackHref,
} from "../vouchers";
import { VoucherCollectionPage } from "./voucher-collection-page";

export function VoucherCollectionContainer() {
  const router = useRouter();
  const from = useSearchParams().get("from");
  const entrySource = parseVoucherEntrySource(from);
  const state = useVoucherCollection();

  return (
    <VoucherCollectionPage
      state={state}
      entrySource={entrySource}
      onBack={() => router.push(resolveVoucherCollectionBackHref(from))}
      onBrowseRewards={() => router.push("/rewards")}
      onSelectVoucher={(voucher) =>
        router.push(buildVoucherDetailHref(voucher.id, from))
      }
    />
  );
}
