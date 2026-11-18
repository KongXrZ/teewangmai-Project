"use client";

import { useState, type ReactNode } from "react";
import { useRewardsCatalog } from "../hooks/use-rewards-catalog";
import type { RewardCardModel, RewardId } from "../types";
import { RewardsPage } from "./rewards-page";

export interface RedemptionFlowProps {
  rewardId: RewardId;
  reward: RewardCardModel;
  points: number | null;
  onClose: () => void;
  onRedemptionConfirmed: () => void;
}

export interface RewardsCatalogContainerProps {
  renderRedemption?: (props: RedemptionFlowProps) => ReactNode;
}

export function RewardsCatalogContainer({
  renderRedemption,
}: RewardsCatalogContainerProps) {
  const { state, refresh, isRefreshing } = useRewardsCatalog();
  const [selected, setSelected] = useState<RewardCardModel | null>(null);

  return (
    <>
      <RewardsPage
        state={state}
        onSelectReward={renderRedemption ? setSelected : undefined}
        selectionDisabled={isRefreshing || selected !== null}
        vouchersHref="/rewards/vouchers"
      />
      {renderRedemption &&
        selected &&
        renderRedemption({
          rewardId: selected.id,
          reward: selected,
          points: state.status === "ready" ? state.points : null,
          onClose: () => setSelected(null),
          onRedemptionConfirmed: () => {
            setSelected(null);
            refresh();
          },
        })}
    </>
  );
}
