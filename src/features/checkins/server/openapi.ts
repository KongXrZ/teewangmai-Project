const integerId = { type: "integer", minimum: 1 };
const floorQr = {
  type: "string",
  format: "uuid",
  description: "floor-uuid-v1 payload: the floor's qr_code_id exactly as printed",
};
const errorBody = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    code: { type: "string" },
    error: { type: "string" },
  },
};
const locationSummary = {
  type: "object",
  properties: { id: integerId, building: { type: "string" }, name: { type: "string" } },
};
const location = {
  type: "object",
  properties: { ...locationSummary.properties, image_url: { type: "string", nullable: true } },
};
const floor = { type: "object", properties: { id: integerId, name: { type: "string" } } };

function json(schema: object) {
  return { content: { "application/json": { schema } } };
}

function ok(description: string, data: object) {
  return {
    description,
    ...json({ type: "object", properties: { success: { type: "boolean" }, data } }),
  };
}

function error(description: string, extra: object = {}) {
  return {
    description,
    ...json({ ...errorBody, properties: { ...errorBody.properties, ...extra } }),
  };
}

const common = { tags: ["Check-in"], security: [{ cookieAuth: [] }] };

export const checkinPaths = {
  "/api/checkins/resolve": {
    post: {
      ...common,
      summary: "Resolve a scanned floor QR to its building and floor; creates nothing and starts no cooldown",
      requestBody: {
        required: true,
        ...json({ type: "object", required: ["qr"], properties: { qr: floorQr } }),
      },
      responses: {
        200: ok("Resolved", {
          type: "object",
          properties: { floor_ref: floorQr, location, floor },
        }),
        400: error("Missing qr, extra fields or a query string (code: validation)"),
        401: error("No session or no profile (code: unauthorized)"),
        404: error("Not a floor-uuid-v1 payload, unknown QR, inactive floor or inactive building (code: invalid_qr)"),
        415: error("Not application/json"),
        503: error("Database or Auth unavailable (code: unavailable)"),
      },
    },
  },
  "/api/checkins": {
    post: {
      ...common,
      summary: "Submit one verified crowd report for the scanned floor",
      description:
        "Accepted when the GPS accuracy is at most 100 m and the distance to the building is at most 100 m plus min(accuracy, 50 m) (never above 150 m). One report per user and floor every 30 minutes. Coordinates are checked, never stored. No points are awarded this round.",
      requestBody: {
        required: true,
        ...json({
          type: "object",
          required: ["qr", "crowd_level", "latitude", "longitude", "accuracy_meters"],
          properties: {
            qr: floorQr,
            crowd_level: { type: "integer", minimum: 1, maximum: 5 },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            accuracy_meters: { type: "number", exclusiveMinimum: 0 },
          },
        }),
      },
      responses: {
        201: ok("Recorded", {
          type: "object",
          properties: {
            id: integerId,
            location: locationSummary,
            floor,
            crowd_level: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            next_eligible_at: { type: "string", format: "date-time" },
          },
        }),
        400: error("Invalid body (code: validation)"),
        401: error("No session (code: unauthorized)"),
        404: error("Unknown QR, inactive floor or inactive building (code: invalid_qr)"),
        409: error("Reported this floor in the last 30 minutes (code: cooldown)", {
          next_eligible_at: { type: "string", format: "date-time" },
        }),
        415: error("Not application/json"),
        422: error("GPS accuracy above 100 m (code: gps_inaccurate) or too far from the building (code: out_of_range, with distance_meters)", {
          distance_meters: { type: "integer", description: "Only for out_of_range" },
        }),
        503: error("Database or Auth unavailable (code: unavailable)"),
      },
    },
  },
};
