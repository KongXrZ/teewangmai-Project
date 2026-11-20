"use client";

import { RedemptionFlow } from "./redemption-flow";
import { RewardsCatalogContainer } from "./rewards-catalog-container";

export function RewardsRedemptionContainer() {
  return (
    <RewardsCatalogContainer
      renderRedemption={(props) => (
        <RedemptionFlow key={props.rewardId} {...props} />
      )}
    />
  );
}
