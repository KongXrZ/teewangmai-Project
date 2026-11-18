const integerId = { type: "integer", minimum: 1, maximum: 2147483647 };
const dateTime = { type: "string", format: "date-time" };
const nullableDateTime = { ...dateTime, nullable: true };
const errorBody = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    code: { type: "string" },
    error: { type: "string" },
  },
};

function ok(description: string, data: object) {
  return {
    description,
    content: {
      "application/json": {
        schema: { type: "object", properties: { success: { type: "boolean" }, data } },
      },
    },
  };
}

function error(description: string) {
  return { description, content: { "application/json": { schema: errorBody } } };
}

const reward = {
  type: "object",
  properties: {
    id: integerId,
    title: { type: "string" },
    description: { type: "string", nullable: true },
    image_url: { type: "string", nullable: true },
    points_required: { type: "integer", minimum: 0 },
    stock: { type: "integer", minimum: 0 },
    starts_at: nullableDateTime,
    expires_at: { ...dateTime, description: "Last moment the reward can be redeemed" },
    valid_days: { type: "integer", minimum: 1, description: "Voucher lifetime counted from redemption" },
    max_per_user: { type: "integer", minimum: 1 },
    redeemed_count: { type: "integer", minimum: 0, description: "All vouchers this user ever redeemed for the reward" },
    availability: {
      type: "string",
      enum: ["redeemable", "insufficient_points", "out_of_stock", "limit_reached", "upcoming"],
    },
  },
};

const voucher = {
  type: "object",
  properties: {
    id: integerId,
    reward_id: integerId,
    title: { type: "string" },
    image_url: { type: "string", nullable: true },
    used_points: { type: "integer", minimum: 0 },
    redeemed_at: dateTime,
    expires_at: dateTime,
    used_at: nullableDateTime,
    status: { type: "string", enum: ["available", "used", "expired"] },
  },
};

const common = {
  tags: ["Rewards"],
  security: [{ cookieAuth: [] }],
};

export const rewardPaths = {
  "/api/rewards": {
    get: {
      ...common,
      summary: "Points and redeemable catalog; expired rewards are hidden",
      responses: {
        200: ok("Catalog", {
          type: "object",
          properties: { points: { type: "integer" }, rewards: { type: "array", items: reward } },
        }),
        400: error("Query parameters are not accepted"),
        401: error("Not signed in"),
        503: error("Rewards unavailable"),
      },
    },
  },
  "/api/rewards/{rewardId}/redeem": {
    post: {
      ...common,
      summary: "Redeem one voucher atomically; retries with the same Idempotency-Key return the same voucher",
      parameters: [
        { name: "rewardId", in: "path", required: true, schema: integerId },
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "New UUID per redemption attempt; reuse it only when retrying the same attempt",
        },
      ],
      responses: {
        200: ok("Redeemed or replayed", {
          type: "object",
          properties: {
            replayed: { type: "boolean" },
            points: { type: "integer", description: "Current balance (after this redemption, or now for a replay)" },
            voucher: {
              type: "object",
              properties: {
                id: integerId,
                reward_id: integerId,
                used_points: { type: "integer" },
                redeemed_at: dateTime,
                expires_at: dateTime,
              },
            },
          },
        }),
        400: error("Invalid reward ID, missing or non-UUID Idempotency-Key"),
        401: error("Not signed in"),
        404: error("Reward not found"),
        409: error("insufficient_points, out_of_stock, limit_reached, upcoming or expired"),
        422: error("key_conflict: the key was already used for another reward"),
        503: error("Rewards unavailable"),
      },
    },
  },
  "/api/vouchers": {
    get: {
      ...common,
      summary: "Own vouchers, newest first",
      responses: {
        200: ok("Vouchers", { type: "array", items: voucher }),
        400: error("Query parameters are not accepted"),
        401: error("Not signed in"),
        503: error("Rewards unavailable"),
      },
    },
  },
  "/api/vouchers/{voucherId}/use": {
    post: {
      ...common,
      summary: "Use a voucher now and return its QR code; a retry with the same Idempotency-Key gets the code again for 30 minutes until the shop verifies it",
      parameters: [
        { name: "voucherId", in: "path", required: true, schema: integerId },
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "New UUID per tap on use; reuse it only to retry a lost response",
        },
      ],
      responses: {
        200: ok("Used", {
          type: "object",
          properties: { id: integerId, used_at: dateTime, use_code: { type: "string", pattern: "^[0-9a-f]{32}$" } },
        }),
        400: error("Invalid voucher ID, missing or non-UUID Idempotency-Key"),
        401: error("Not signed in"),
        404: error("Voucher not found for this user"),
        409: error("already_used or expired"),
        503: error("Rewards unavailable"),
      },
    },
  },
  "/api/vouchers/verify": {
    post: {
      tags: ["Rewards"],
      summary: "Shop checks a scanned voucher QR is genuine; the first check marks it verified",
      description: "No login needed. Never returns who owns the voucher.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["code"], properties: { code: { type: "string", pattern: "^[0-9a-f]{32}$" } } },
          },
        },
      },
      responses: {
        200: ok("Genuine, verified now", {
          type: "object",
          properties: { reward_title: { type: "string" }, used_points: { type: "integer" }, used_at: dateTime, verified_at: dateTime },
        }),
        400: error("Missing code or extra fields"),
        404: error("Unknown or malformed code"),
        409: error("already_verified: genuine but checked before (data has the earlier verified_at); expired: shown more than 30 minutes ago or after the voucher expired"),
        503: error("Rewards unavailable"),
      },
    },
  },
};
