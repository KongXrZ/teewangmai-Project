"use client";

import { useState, type ReactNode } from "react";
import { useRewardsCatalog } from "../hooks/use-rewards-catalog";
import type { RewardCardModel, RewardId } from "../types";
import { RewardsPage } from "./rewards-page";

export interface RedemptionFlowProps {
  rewardId: RewardId;
  reward: RewardCardModel;
  /** Close the flow without a confirmed redemption. */
  onClose: () => void;
  /** Call only after the backend has confirmed the redemption result. */
  onRedemptionConfirmed: () => void;
}

export interface RewardsCatalogContainerProps {
  /**
   * Redemption confirmation/result UI (FE-010). Until it is provided,
   * the "แลก" buttons stay disabled because nothing can confirm a redemption.
   */
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
      />
      {renderRedemption &&
        selected &&
        renderRedemption({
          rewardId: selected.id,
          reward: selected,
          onClose: () => setSelected(null),
          onRedemptionConfirmed: () => {
            setSelected(null);
            refresh();
          },
        })}
    </>
  );
}
