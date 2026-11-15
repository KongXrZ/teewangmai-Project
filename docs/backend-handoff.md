# Backend Handoff

Snapshot: November 15, 2026. Schema v4 plus category-array migration is applied
to Local. The 35 approved buildings and 224 floors are imported, with database
types regenerated for the current schema. Hours/reward/badge records remain
pending. UI implementation and API integration are separate work;
an existing page does not imply its data API exists. No mock application data is
provided by this migration.

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

Auth Server Actions also cover password recovery/reset, resend verification,
current user, logout and own-profile name/avatar updates. Existing Auth UI/session
integration is documented in [Frontend Integration](frontend-integration.md).
Google UI integration is deferred. Keep browser-readable cookie sessions and
server identity verification; do not implement a second password store.

## Backend task order

BE-004 tracks approved CSV reference-data import. For API tasks, agree
request/response contracts and update Swagger during implementation.

| Task | Main responsibility / boundary |
| --- | --- |
| BE-004 | Approved CSV data import; 35 buildings and 224 floors imported locally, with hour/reward/badge datasets pending |
| BE-005 | Building search/list and selected-floor detail; search code/name/category-array members/aliases, building hours derived from floors, floor capacity and metadata |
| BE-006 | Per-floor crowd summaries: 30-minute lookback, refresh every 10 minutes, unknown when empty; configurable timing |
| BE-007 | Floor QR generation and printable assets; 224 stable floor identifiers are provisioned in Local |
| BE-008 | QR resolution and verified check-in: Auth, active reference data, GPS, integer score 1–5, atomic independent 30-minute user/floor cooldown |
| BE-009 | Own check-in history only, retained logs, pagination ordered by created_at DESC then id DESC; no reward/badge responsibilities |
| BE-010 | Authorized profile-photo upload and avatar update |
| BE-011 | Rewards catalog, immediate atomic exchange and own voucher history; fixed reward deadline copied at issuance |
| BE-012 | Authorized voucher QR verification and single atomic consumption before deadline |
| BE-013 | Badge catalog, requirement evaluation and own earned badges |

Task numbers follow the current plan. BE-004 is In progress because building/floor
import is verified and hours/reward/badge datasets are still pending. BE-003's
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

Unresolved runtime decisions include GPS tolerance/accuracy, summary timestamp
boundaries, rounding/labels, storage/scheduler/admin settings, building-wide crowd
aggregation, badge requirement vocabulary, voucher consumption authorization,
point earning and retention. Do not infer these from schema defaults.

Local SQL validation covers schema replay/upgrade, constraints and access. It does
not establish real GPS/camera behavior, concurrency correctness of future APIs,
or Cloud readiness. Deploy and production configuration are separate work.
