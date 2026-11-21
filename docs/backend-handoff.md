# Backend Handoff

Snapshot: November 21, 2026. All 15 migrations (latest from BE-013) are applied to Local.
The 35 approved buildings and 224 floors are imported along with 1,120
temporary dummy weekday `floor_hours` rows (Mon–Fri `08:00:00`–`17:00:00`, active),
with database types regenerated for the current schema. Real floor hours from CSV
and approved reward/badge records are not in `supabase/seed.sql`. No mock
application data is provided by the migrations.

## Implemented interfaces

| Interface | Current responsibility |
| --- | --- |
| `POST /api/auth/signup` | Email/password signup |
| `POST /api/auth/login` | Email/password login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current identity and own profile |
| `GET /auth/callback` | Auth code exchange and safe internal redirect |
| `GET /api/health` | Application health response; not a database connectivity test |
| `GET /api/swagger` | API documentation |
| `GET /api/locations` | Public active building search/list with pagination and derived opening hours |
| `GET /api/locations/{locationId}` | Active building detail and floor schedules |
| `GET /api/locations/{locationId}/floors/{floorId}` | Selected active floor belonging to the building |
| `GET /api/crowd/locations` | Building cards using the greatest-count floor |
| `GET /api/crowd/locations/{locationId}` | Crowd summaries of active floors; default floor 1 |
| `GET /api/crowd/locations/{locationId}/floors/{floorId}` | Selected floor crowd summary |
| `POST /api/checkins/resolve` | Resolve a floor QR to its active building/floor for the signed-in user (BE-008) |
| `POST /api/checkins` | Verified check-in: QR, GPS accuracy/distance, score 1–5, 30-minute user/floor cooldown (BE-008) |
| `GET /api/profile/checkins` | Own check-in history, newest first with cursor pagination (BE-009) |
| `POST /api/profile/avatar` | Upload own profile photo to the `avatars` bucket (BE-010) |
| `DELETE /api/profile/avatar` | Delete own profile photo and clear `avatar_url`; idempotent (BE-015) |
| `GET /api/rewards` | Reward catalog with own points and per-reward availability (BE-011) |
| `POST /api/rewards/{rewardId}/redeem` | Atomic idempotent redemption using an `Idempotency-Key` header (BE-011) |
| `GET /api/vouchers` | Own vouchers with available/used/expired status (BE-011) |
| `POST /api/vouchers/{voucherId}/use` | Owner uses a voucher and receives a one-time code for the shop QR (BE-012) |
| `POST /api/vouchers/verify` | Shop verifies a voucher code once; no account needed (BE-012) |
| `GET /api/badges` | Own badge collection; awarding happens only in the database after accepted check-ins (BE-013) |

Auth Server Actions also cover password recovery/reset, resend verification,
current user, logout and own-profile name/avatar updates. Existing Auth UI/session
integration is documented in [Frontend Integration](frontend-integration.md).
Google UI integration is deferred. Keep browser-readable cookie sessions and
server identity verification; do not implement a second password store.

Contracts: [Location API](location-api.md) (BE-005), [Crowd API](crowd-api.md)
(BE-006), [Check-in Rules](check-in-rules.md) (BE-008/BE-009), [Rewards API](rewards-api.md)
(BE-011/BE-012) and [Frontend Integration](frontend-integration.md) (profile,
avatar and badges). `/api/swagger` lists every API interface above except the
`/auth/callback` page route and `/api/swagger` itself.

## Backend task order

BE-004 tracks approved CSV reference-data import. For API tasks, agree
request/response contracts and update Swagger during implementation.

| Task | Main responsibility / boundary |
| --- | --- |
| BE-004 | Building/floor/hour CSV import; 35 buildings and 224 floors imported, temporary weekday hours seeded, real hour CSV pending |
| BE-005 | Building search/list and selected-floor detail; search code/name/category-array members/aliases, building hours derived from floors, floor capacity and metadata |
| BE-006 | Scheduled floor summaries: 30-minute lookback, refresh every 10 minutes; count estimates and capacity percentage, score-based labels, busiest-floor building cards. Timing configuration deferred. See [Crowd API](crowd-api.md) |
| BE-007 | Operator CLI `npm run qr:generate`; SVG/PNG, A4 print HTML and manifest from existing floor UUIDs. See [Floor QR](floor-qr.md) |
| BE-008 | QR resolution and verified check-in: Auth, active reference data, GPS, integer score 1–5, atomic independent 30-minute user/floor cooldown |
| BE-009 | Own check-in history only, retained logs, pagination ordered by created_at DESC then id DESC; no reward/badge responsibilities |
| BE-010 | Authorized profile-photo upload and avatar update |
| BE-011 | Rewards catalog, immediate atomic idempotent exchange, per-user limits and own voucher history; voucher expiry counted from redemption (`valid_days`) |
| BE-012 | Owner uses a voucher (marked used immediately, one-time QR) and the shop verifies the QR is genuine |
| BE-013 | Badge catalog, requirement evaluation and own earned badges |
| BE-015 | Owner deletes the profile photo (database `avatar_url` and own storage folder) |
| BE-014 | Approved reward/badge CSV import, preserving catalog identities, balances, stock and existing activity |

Task numbers follow the current plan. BE-004 is In progress because building/floor
import is verified and real floor hours are still pending. Reward/badge import
belongs to BE-014. BE-003's
floor migration is already complete.

Check-in awarding **+10 points is deferred** for this round. BE-008 must not
introduce that award by copying an older task description. `users.points` remains
for existing balances and redemption eligibility; a separate approved earning
rule is needed. Reward exchange still deducts points and stock atomically.

## Before implementing v4 queries

1. Apply pending migrations to Local without resetting needed accounts.
2. Obtain approved reference records using [Reference Data](reference-data.md).
3. Generated types now match the Local schema, including `locations.category`
   as `string[]`. Regenerate/review after further schema changes. Building IDs
   are database-generated; resolve references using the stable building code.
4. Read [Database Design](database.md) and [Check-in Rules](check-in-rules.md).
   Preserve RLS and server-only business writes. Define public catalog reads and
   own-history authorization with their API tasks; no broad client-write policy.
5. Add contract/error/concurrency tests appropriate to the implemented operation.
   Run the schema SQL checks and normal lint/typecheck/test/build checks.

Unresolved runtime decisions include GPS tolerance/accuracy, display rounding,
admin settings, badge requirement vocabulary, voucher consumption authorization,
point earning and retention. Do not infer these from schema defaults.

Local SQL validation covers schema replay/upgrade, constraints and access. It does
not establish real GPS/camera behavior, concurrency correctness of future APIs,
or Cloud readiness. Deploy and production configuration are separate work.
