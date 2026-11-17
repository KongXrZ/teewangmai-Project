export const BADGE_REQUIREMENT_TYPES = ["checkin_count", "distinct_building_count"] as const;

export type BadgeRequirementType = (typeof BADGE_REQUIREMENT_TYPES)[number];

export interface BadgeRow {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  earned_at: string | null;
}

export interface BadgeDto extends BadgeRow {
  requirement_text: string | null;
}

const requirementUnits: Record<BadgeRequirementType, string> = {
  checkin_count: "ครั้ง",
  distinct_building_count: "อาคาร",
};

export function requirementText(type: string, value: number): string | null {
  if (!(BADGE_REQUIREMENT_TYPES as readonly string[]).includes(type)) return null;
  return `เช็กอินครบ ${value} ${requirementUnits[type as BadgeRequirementType]}`;
}

export function toBadgeDto(row: BadgeRow): BadgeDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon_url: row.icon_url,
    requirement_type: row.requirement_type,
    requirement_value: row.requirement_value,
    requirement_text: requirementText(row.requirement_type, row.requirement_value),
    is_active: row.is_active,
    earned_at: row.earned_at,
  };
}

export function badgeCollection(rows: BadgeRow[]) {
  const badges = rows.map(toBadgeDto);
  const earned = badges.filter((badge) => badge.earned_at !== null).length;
  return { badges, earned_count: earned, total_count: badges.length };
}
