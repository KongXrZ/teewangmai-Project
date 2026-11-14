import type { BadgeFilter, BadgeModel } from "./types";

export const badgeFilters: readonly { id: BadgeFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "earned", label: "ได้รับแล้ว" },
  { id: "locked", label: "ยังไม่ได้รับ" },
];

export const REQUIREMENT_FALLBACK = "ยังไม่มีรายละเอียดเงื่อนไข";

export interface BadgeCollectionView {
  earned: BadgeModel[];
  locked: BadgeModel[];
  total: number;
  showEarned: boolean;
  showLocked: boolean;
}

export function isEarned(badge: BadgeModel): boolean {
  return badge.earnedAt !== null;
}

export function getBadgeCollectionView(
  badges: readonly BadgeModel[],
  filter: BadgeFilter,
): BadgeCollectionView {
  const earned = badges.filter(isEarned);
  const locked = badges.filter((badge) => !isEarned(badge));

  return {
    earned,
    locked,
    total: badges.length,
    showEarned: filter !== "locked",
    showLocked: filter !== "earned",
  };
}

export function getRequirementText(badge: BadgeModel): string {
  const text = badge.requirement.description?.trim();
  return text ? text : REQUIREMENT_FALLBACK;
}

const earnedDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

export function formatEarnedDate(earnedAt: string | null): string | null {
  if (earnedAt === null) {
    return null;
  }
  const date = new Date(earnedAt);
  return Number.isNaN(date.getTime()) ? null : earnedDateFormatter.format(date);
}
