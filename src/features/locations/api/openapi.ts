const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const integer = { type: "integer" };
const text = { type: "string" };
const stringArray = { type: "array", items: text };
const hour = {
  type: "object",
  required: ["day_of_week", "open_time", "close_time", "is_active"],
  properties: {
    day_of_week: { type: "integer", minimum: 1, maximum: 7, description: "Monday=1, Sunday=7" },
    open_time: text, close_time: text, is_active: { type: "boolean" },
  },
};
const buildingProperties = {
  id: integer, building: text, name: text, category: stringArray, aliases: stringArray,
  image_url: { type: "string", nullable: true }, details: { type: "object", additionalProperties: true },
  floor_count: integer, availability: ref("LocationAvailability"),
};

export const locationSchemas = {
  LocationAvailability: {
    type: "object",
    required: ["status", "today_intervals", "display_hours"],
    properties: {
      status: { type: "string", enum: ["open", "closed", "unknown"] },
      today_intervals: {
        type: "array", items: {
          type: "object", required: ["open_time", "close_time"],
          properties: { open_time: text, close_time: text },
        },
        description: "Merged calendar-day coverage in Bangkok; 24:00:00 is the end of today. Building coverage means at least one floor is scheduled open.",
      },
      display_hours: { type: "string", nullable: true, description: "Display coverage separately from current status; null when no known intervals." },
    },
  },
  LocationMeta: {
    type: "object", required: ["timezone", "day_of_week", "evaluated_at"],
    properties: {
      timezone: { type: "string", enum: ["Asia/Bangkok"] },
      day_of_week: { type: "integer", minimum: 1, maximum: 7 },
      evaluated_at: { type: "string", format: "date-time" },
    },
  },
  CatalogFloor: {
    type: "object", required: ["id", "location_id", "floor_name", "capacity", "hours", "availability"],
    properties: {
      id: integer, location_id: integer, floor_name: text,
      capacity: { type: "integer", nullable: true },
      hours: { type: "array", items: hour }, availability: ref("LocationAvailability"),
    },
  },
  CatalogBuilding: {
    type: "object", required: Object.keys(buildingProperties), properties: buildingProperties,
  },
  CatalogBuildingDetail: {
    type: "object", required: [...Object.keys(buildingProperties), "floors"],
    properties: { ...buildingProperties, floors: { type: "array", items: ref("CatalogFloor") } },
  },
  LocationError: {
    type: "object", required: ["success", "code", "error"],
    properties: {
      success: { type: "boolean", enum: [false] },
      code: { type: "string", enum: ["validation", "not_found", "unavailable"] }, error: text,
    },
  },
};

function response(description: string, schema: object) {
  return { description, content: { "application/json": { schema } } };
}
function success(data: object, extra: Record<string, object> = {}) {
  return {
    type: "object", required: ["success", "data", "meta", ...Object.keys(extra)],
    properties: { success: { type: "boolean", enum: [true] }, data, meta: ref("LocationMeta"), ...extra },
  };
}
const errors = {
  400: response("Invalid ID, unknown/duplicate query key or invalid query value", ref("LocationError")),
  503: response("Catalog service unavailable; no internal error details", ref("LocationError")),
};
const notFound = response("Missing or inactive building/floor, or floor belongs to another building", ref("LocationError"));
const pathId = (name: string) => ({
  name, in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 2147483647 },
});

export const locationPaths = {
  "/api/locations": {
    get: {
      tags: ["Locations"], summary: "Search active buildings", security: [],
      description: "Public read. Literal case-insensitive substring search across code/name/aliases/category. Ordered by id ASC. Array metadata stays arrays. No QR identifiers, user activity or crowd estimates.",
      parameters: [
        { name: "q", in: "query", schema: { type: "string", maxLength: 200 }, description: "Trimmed literal search, e.g. N16 or LX" },
        { name: "category", in: "query", schema: { type: "string", minLength: 1, maxLength: 100 }, description: "Case-insensitive exact category member" },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 100000, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        200: response("Results; empty or out-of-range pages return data=[] and exact total", success(
          { type: "array", items: ref("CatalogBuilding") },
          { pagination: {
            type: "object", required: ["page", "limit", "total", "total_pages"],
            properties: { page: integer, limit: integer, total: integer, total_pages: integer },
          } },
        )),
        ...errors,
      },
    },
  },
  "/api/locations/{locationId}": {
    get: {
      tags: ["Locations"], summary: "Read a building and its active floors", security: [],
      description: "Weekly floor hours ordered Monday-Sunday; floors use natural name order then id. Missing hours mean unknown; disabled day rows mean closed. Availability uses server time in Bangkok, including yesterday's overnight carry-over.",
      parameters: [pathId("locationId")],
      responses: { 200: response("Building detail", success(ref("CatalogBuildingDetail"))), 404: notFound, ...errors },
    },
  },
  "/api/locations/{locationId}/floors/{floorId}": {
    get: {
      tags: ["Locations"], summary: "Read a selected floor and its weekly hours", security: [],
      parameters: [pathId("locationId"), pathId("floorId")],
      responses: { 200: response("Selected floor", success(ref("CatalogFloor"))), 404: notFound, ...errors },
    },
  },
};
