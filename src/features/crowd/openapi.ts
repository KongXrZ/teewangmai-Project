const integerId = { type: "integer", minimum: 1 };
const nullableDate = { type: "string", format: "date-time", nullable: true };
const floor = {
  type: "object",
  properties: {
    floor_id: integerId,
    floor_name: { type: "string" },
    capacity: { type: "integer", nullable: true },
    status: { type: "string", enum: ["ready", "unknown", "pending", "stale"] },
    estimated_people: { type: "integer", nullable: true, description: "Check-in count in (T-30min, T], an occupancy estimate." },
    report_count: { type: "integer", nullable: true },
    current_crowd_level: { type: "number", nullable: true, minimum: 1, maximum: 5 },
    level: { type: "string", nullable: true, enum: ["low", "medium", "high", null], description: "Mean score: <2.5 low; <3.5 medium; otherwise high." },
    density_percent: { type: "number", nullable: true, description: "Count / capacity * 100, not capped at 100; null without reports/capacity." },
    latest_report_at: nullableDate,
    calculated_at: nullableDate,
    window_start: nullableDate,
  },
};
const card = {
  type: "object",
  properties: { location_id: integerId, default_floor_id: { ...integerId, nullable: true }, busiest_floor: { ...floor, nullable: true } },
};
const locationParam = { name: "locationId", in: "path", required: true, schema: integerId };

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: {
    type: "object",
    required: ["success", "code", "error"],
    properties: {
      success: { type: "boolean", example: false },
      code: { type: "string", enum: ["validation", "not_found", "unavailable"] },
      error: { type: "string" },
    },
  } } },
});

function operation(summary: string, schema: object, parameters: object[] = []) {
  return { get: {
    tags: ["Crowd"], summary, parameters,
    description: "Public snapshot, 30-minute lookback, refreshed every 10 minutes. No query parameters. Overdue snapshots become stale after 20 minutes.",
    responses: {
      200: { description: "Aggregate snapshot", content: { "application/json": { schema: {
        type: "object", properties: { success: { type: "boolean" }, data: schema, meta: { type: "object", properties: {
          lookback_minutes: { type: "integer", example: 30 }, refresh_minutes: { type: "integer", example: 10 },
          stale_after_minutes: { type: "integer", example: 20 }, timezone: { type: "string", example: "Asia/Bangkok" },
        } } },
      } } } },
      400: errorResponse(parameters.length
        ? "Invalid ID or unexpected query parameter (code: validation)"
        : "Unexpected query parameter (code: validation)"),
      ...(parameters.length ? { 404: errorResponse("No active floor summaries for this resource (code: not_found)") } : {}),
      503: errorResponse("Database or configuration unavailable (code: unavailable)"),
    },
  } };
}

export const crowdPaths = {
  "/api/crowd/locations": operation("Building cards: select the floor with the greatest check-in count", { type: "array", items: card }),
  "/api/crowd/locations/{locationId}": operation("Building crowd detail; default floor 1", {
    ...card, properties: { ...card.properties, floors: { type: "array", items: floor } },
  }, [locationParam]),
  "/api/crowd/locations/{locationId}/floors/{floorId}": operation("Selected floor crowd summary", floor,
    [locationParam, { name: "floorId", in: "path", required: true, schema: integerId }]),
};
