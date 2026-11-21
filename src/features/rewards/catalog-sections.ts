import type { RewardCardModel } from "./types";

export interface RewardCatalogSections {
  redeemable: RewardCardModel[];
  locked: RewardCardModel[];
  upcoming: RewardCardModel[];
}

export function groupRewardsForCatalog(
  rewards: RewardCardModel[],
): RewardCatalogSections {
  const sections: RewardCatalogSections = {
    redeemable: [],
    locked: [],
    upcoming: [],
  };
  for (const reward of rewards) {
    if (reward.availability === "redeemable") {
      sections.redeemable.push(reward);
    } else if (reward.availability === "upcoming") {
      sections.upcoming.push(reward);
    } else {
      sections.locked.push(reward);
    }
  }
  return sections;
}
