export interface CrowdRow {
  location_id: number;
  floor_id: number;
  floor_name: string;
  capacity: number | null;
  report_count: number | null;
  average_score: number | null;
  density_percent: number | null;
  latest_report_at: string | null;
  calculated_at: string | null;
}

export function floorSummary(row: CrowdRow, now = new Date()) {
  const stale = row.calculated_at !== null &&
    now.getTime() - Date.parse(row.calculated_at) >= 20 * 60_000;
  const available = row.calculated_at !== null && !stale;
  const hasReports = available && (row.report_count ?? 0) > 0;
  const score = hasReports ? row.average_score : null;
  return {
    floor_id: row.floor_id,
    floor_name: row.floor_name,
    capacity: row.capacity,
    status: !available ? (stale ? "stale" : "pending") : hasReports ? "ready" : "unknown",
    estimated_people: available ? row.report_count : null,
    report_count: available ? row.report_count : null,
    current_crowd_level: score,
    level: score === null ? null : score < 2.5 ? "low" : score < 3.5 ? "medium" : "high",
    density_percent: hasReports ? row.density_percent : null,
    latest_report_at: available ? row.latest_report_at : null,
    calculated_at: row.calculated_at,
    window_start: row.calculated_at === null ? null :
      new Date(Date.parse(row.calculated_at) - 30 * 60_000).toISOString(),
  };
}

export function buildingSummary(rows: CrowdRow[], now = new Date()) {
  const floors = rows.map(row => floorSummary(row, now)).sort((a, b) =>
    a.floor_name.localeCompare(b.floor_name, "en", { numeric: true }) || a.floor_id - b.floor_id);
  // Rank by count, never percentage or score. Ties keep natural floor order.
  const busiest = floors.reduce<(typeof floors)[number] | null>((best, floor) =>
    best === null || (floor.estimated_people ?? -1) > (best.estimated_people ?? -1) ? floor : best, null);
  return {
    location_id: rows[0]?.location_id,
    default_floor_id: floors.find(floor => floor.floor_name.trim() === "1")?.floor_id ?? floors[0]?.floor_id ?? null,
    busiest_floor: busiest,
    floors,
  };
}

export function buildingCards(rows: CrowdRow[], now = new Date()) {
  const groups = new Map<number, CrowdRow[]>();
  for (const row of rows) {
    const group = groups.get(row.location_id) ?? [];
    group.push(row);
    groups.set(row.location_id, group);
  }
  return [...groups.values()].map(group => {
    const { location_id, default_floor_id, busiest_floor } = buildingSummary(group, now);
    return { location_id, default_floor_id, busiest_floor };
  });
}
