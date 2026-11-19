import { BADGE_REQUIREMENT_TYPES } from "./models";

const errorBody = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    code: { type: "string" },
    error: { type: "string" },
  },
};

const badge = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    icon_url: { type: "string", nullable: true },
    requirement_type: { type: "string", enum: [...BADGE_REQUIREMENT_TYPES] },
    requirement_value: { type: "integer", minimum: 1 },
    requirement_text: { type: "string", nullable: true, example: "เช็กอินครบ 5 ครั้ง" },
    is_active: { type: "boolean", description: "Inactive badges appear only when already earned." },
    earned_at: { type: "string", format: "date-time", nullable: true, description: "Null means locked." },
  },
};

export const badgePaths = {
  "/api/badges": {
    get: {
      tags: ["Badges"],
      summary: "Own badge collection",
      description:
        "Active badges plus inactive badges the caller already earned, with the caller's earned_at. Earned first (newest), then locked. Badges are awarded only by the database after accepted check-ins; there is no client write endpoint. No query parameters.",
      security: [{ cookieAuth: [] }],
      responses: {
        200: {
          description: "Collection, possibly empty",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      badges: { type: "array", items: badge },
                      earned_count: { type: "integer" },
                      total_count: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Query parameters are not supported", content: { "application/json": { schema: errorBody } } },
        401: { description: "No session", content: { "application/json": { schema: errorBody } } },
        503: { description: "Database/configuration unavailable", content: { "application/json": { schema: errorBody } } },
      },
    },
  },
};
