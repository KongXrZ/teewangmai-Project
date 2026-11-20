"use client";

import { useRouter } from "next/navigation";
import { useVoucherCollection } from "../hooks/use-vouchers";
import { VoucherCollectionPage } from "./voucher-collection-page";

export function VoucherCollectionContainer() {
  const router = useRouter();
  const state = useVoucherCollection();

  return (
    <VoucherCollectionPage
      state={state}
      onBack={() => router.push("/rewards")}
      onBrowseRewards={() => router.push("/rewards")}
      onSelectVoucher={(voucher) =>
        router.push(`/rewards/vouchers/${voucher.id}`)
      }
    />
  );
}
