export const BADGE_REQUIREMENT_TYPES = ["checkin_count", "streak_days"] as const;

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

export function requirementText(type: string, value: number): string | null {
  if (type === "checkin_count") {
    return `เช็กอินครบ ${value} ครั้ง`;
  }
  if (type === "streak_days") {
    return `เช็กอินต่อเนื่อง ${value} วัน`;
  }
  return null;
}

export function toBadgeDto(row: BadgeRow): BadgeDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon_url: row.icon_url?.trim() || null,
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
